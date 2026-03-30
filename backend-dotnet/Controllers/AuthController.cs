using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IDatabaseService _db;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IDatabaseService db,
        ITokenService tokenService,
        IEmailService emailService,
        ILogger<AuthController> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _emailService = emailService;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/auth/register
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(req.Password, 10);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_InsertUser",
            SqlParamHelper.VarChar("@Username", req.Username, 17),
            SqlParamHelper.VarChar("@Pass", hashedPassword, 255),
            SqlParamHelper.VarChar("@Email", req.Email, 45),
            SqlParamHelper.VarChar("@Name", req.Name, 25));

        var row = result.FirstOrDefault();
        if (row == null)
            return StatusCode(500, new { Success = false, Message = "No response from database" });

        var success = row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row.TryGetValue("Message", out var m) ? m?.ToString() : "";
        var userId = row.TryGetValue("UserId", out var u) ? u : null;
        var validationCode = row.TryGetValue("ValidationCode", out var v) ? v : null;

        if (!success)
            return BadRequest(new { Success = false, Message = message });

        // Initialize default groupings (best-effort)
        try
        {
            await _db.ExecuteStoredProcedureNonQueryAsync("spmb_InitializeDefaultGroupings",
                SqlParamHelper.UniqueId("@UserID", Guid.Parse(userId!.ToString()!)),
                SqlParamHelper.VarChar("@Username", req.Username, 17),
                SqlParamHelper.Bit("@EnableTithe", req.EnableTitheTracking == true));
            _logger.LogInformation("Default groupings initialized for user: {Username}", req.Username);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize groupings for {Username}", req.Username);
        }

        // Set tithe preference if enabled (best-effort)
        if (req.EnableTitheTracking == true)
        {
            try
            {
                await _db.ExecuteStoredProcedureNonQueryAsync("spmb_UpdateUserPreferences",
                    SqlParamHelper.UniqueId("@UserId", Guid.Parse(userId!.ToString()!)),
                    SqlParamHelper.Bit("@TitheTrackingEnabled", true));
                _logger.LogInformation("Tithe tracking enabled for user: {Username}", req.Username);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to set tithe preference for {Username}", req.Username);
            }
        }

        // Send validation email (fire-and-forget)
        _ = Task.Run(async () =>
        {
            try
            {
                var sent = await _emailService.SendValidationEmailAsync(
                    req.Email, validationCode?.ToString() ?? "", req.Username);
                if (sent)
                    _logger.LogInformation("Validation email sent to {Email}", req.Email);
                else
                    _logger.LogWarning("Failed to send validation email to {Email}", req.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email service error for {Email}", req.Email);
            }
        });

        return StatusCode(201, new
        {
            Success = true,
            Message = message + " A validation email has been sent to your email address.",
            UserId = userId,
            ValidationCode = validationCode
        });
    }

    /// <summary>
    /// POST /api/auth/validate
    /// </summary>
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidateRequest req)
    {
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(req.Password, 10);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_RegisterUser",
            SqlParamHelper.VarChar("@UsernameOrEmail", req.UsernameOrEmail, 50),
            SqlParamHelper.VarChar("@Pass", hashedPassword, 255),
            SqlParamHelper.UniqueId("@ValidationCode", req.ValidationCode));

        var row = result.FirstOrDefault();
        if (row == null)
            return StatusCode(500, new { Success = false, Message = "No response from database" });

        return Ok(new
        {
            Success = row.TryGetValue("Success", out var s) && Convert.ToBoolean(s),
            Message = row.TryGetValue("Message", out var m) ? m?.ToString() : ""
        });
    }

    /// <summary>
    /// POST /api/auth/login
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var isEmail = req.UsernameOrEmail.Contains('@');

        var query = isEmail
            ? "SELECT UserId, Username, Name, Email, Pass, Validated FROM Users WHERE Email = @identifier"
            : "SELECT UserId, Username, Name, Email, Pass, Validated FROM Users WHERE Username = @identifier";

        var result = await _db.ExecuteQueryAsync(query,
            SqlParamHelper.VarChar("@identifier", req.UsernameOrEmail, 50));

        var user = result.FirstOrDefault();

        if (user == null)
            return Unauthorized(new { Success = false, Message = "Invalid username or password." });

        var validated = user.TryGetValue("Validated", out var val) && Convert.ToBoolean(val);
        if (!validated)
            return Unauthorized(new { Success = false, Message = "User has not been validated." });

        var storedHash = user.TryGetValue("Pass", out var p) ? p?.ToString() ?? "" : "";
        if (!BCrypt.Net.BCrypt.Verify(req.Password, storedHash))
            return Unauthorized(new { Success = false, Message = "Invalid username or password." });

        var userId = Guid.Parse(user["UserId"]!.ToString()!);
        var token = _tokenService.GenerateToken(userId);

        return Ok(new
        {
            Success = true,
            Message = "Login successful.",
            UserId = userId,
            Username = user.GetValueOrDefault("Username"),
            Name = user.GetValueOrDefault("Name"),
            Email = user.GetValueOrDefault("Email"),
            token
        });
    }

    /// <summary>
    /// POST /api/auth/forgot-password
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateValidationCode",
            SqlParamHelper.VarChar("@UsernameOrEmail", req.UsernameOrEmail, 50));

        var row = result.FirstOrDefault();
        var success = row != null && row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : "User not found";
        var validationCode = row?.TryGetValue("ValidationCode", out var vc) == true ? vc?.ToString() : null;

        if (!success)
            return NotFound(new { Success = false, Message = message });

        // Look up user email to send reset link (fire-and-forget)
        _ = Task.Run(async () =>
        {
            try
            {
                var userResult = await _db.ExecuteQueryAsync(
                    "SELECT TOP 1 Email, Username FROM Users WHERE Username = @ue OR Email = @ue",
                    SqlParamHelper.VarChar("@ue", req.UsernameOrEmail, 50));

                var user = userResult.FirstOrDefault();
                if (user != null && user.TryGetValue("Email", out var email) && email != null)
                {
                    var username = user.TryGetValue("Username", out var un) ? un?.ToString() ?? "" : "";
                    var sent = await _emailService.SendPasswordResetEmailAsync(
                        email.ToString()!, validationCode ?? "", username);
                    if (sent)
                        _logger.LogInformation("Password reset email sent to {Email}", email);
                    else
                        _logger.LogWarning("Failed to send password reset email to {Email}", email);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending password reset email");
            }
        });

        return Ok(new { Success = true, Message = message });
    }

    /// <summary>
    /// GET /api/auth/verify-email-link?email=...&code=...
    /// </summary>
    [HttpGet("verify-email-link")]
    public async Task<IActionResult> VerifyEmailLink(
        [FromQuery] string email,
        [FromQuery] Guid code)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_VerifyEmailWithCode",
            SqlParamHelper.VarChar("@Email", email, 45),
            SqlParamHelper.UniqueId("@ValidationCode", code));

        var row = result.FirstOrDefault();
        if (row == null)
            return StatusCode(500, new { Success = false, Message = "Verification failed: no response from database" });

        return Ok(new
        {
            Success = row.TryGetValue("Success", out var s) && Convert.ToBoolean(s),
            Message = row.TryGetValue("Message", out var m) ? m?.ToString() : "",
            UserId = row.TryGetValue("UserId", out var u) ? u : null
        });
    }

    /// <summary>
    /// POST /api/auth/reset-password-link
    /// </summary>
    [HttpPost("reset-password-link")]
    public async Task<IActionResult> ResetPasswordLink([FromBody] ResetPasswordLinkRequest req)
    {
        // Verify the code is valid and not expired
        var verifyResult = await _db.ExecuteStoredProcedureAsync("spmb_VerifyEmailWithCode",
            SqlParamHelper.VarChar("@Email", req.Email, 45),
            SqlParamHelper.UniqueId("@ValidationCode", req.Code));

        var verifyRow = verifyResult.FirstOrDefault();
        var verifySuccess = verifyRow != null
            && verifyRow.TryGetValue("Success", out var vs) && Convert.ToBoolean(vs);
        var verifyUserId = verifyRow?.TryGetValue("UserId", out var vu) == true ? vu : null;

        if (!verifySuccess || verifyUserId == null)
        {
            var msg = verifyRow?.TryGetValue("Message", out var vm) == true ? vm?.ToString() : "Invalid or expired reset link.";
            return BadRequest(new { Success = false, Message = msg });
        }

        // Hash new password and update
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, 10);

        var updateResult = await _db.ExecuteStoredProcedureAsync("spmb_UpdateUserPassword",
            SqlParamHelper.UniqueId("@UserID", Guid.Parse(verifyUserId.ToString()!)),
            SqlParamHelper.VarChar("@NewPassword", hashedPassword, 255));

        var updateRow = updateResult.FirstOrDefault();
        var updateSuccess = updateRow != null
            && updateRow.TryGetValue("Success", out var us) && Convert.ToBoolean(us);

        if (!updateSuccess)
        {
            var msg = updateRow?.TryGetValue("Message", out var um) == true ? um?.ToString() : "Failed to update password.";
            return StatusCode(500, new { Success = false, Message = msg });
        }

        var successMsg = updateRow?.TryGetValue("Message", out var sm) == true ? sm?.ToString() : "Password updated successfully.";
        return Ok(new { Success = true, Message = successMsg });
    }
}
