using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Middleware;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IDatabaseService _db;

    public UserController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    private void ValidateOwnership(Guid routeUserId)
    {
        if (routeUserId != GetUserId())
            throw new UnauthorizedAccessException("Not authorized to access this resource");
    }

    /// <summary>
    /// GET /api/user/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetUser(Guid userId)
    {
        ValidateOwnership(userId);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetUserById",
            SqlParamHelper.UniqueId("@UserId", userId));

        var user = result.FirstOrDefault();
        if (user == null)
            return NotFound(new { success = false, error = "User not found" });

        // Remove sensitive fields
        user.Remove("Pass");
        user.Remove("ValidationCode");

        return Ok(new { success = true, user });
    }

    /// <summary>
    /// PUT /api/user/{userId}
    /// </summary>
    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] UpdateUserRequest req)
    {
        ValidateOwnership(userId);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateUser",
            SqlParamHelper.UniqueId("@UserId", userId),
            SqlParamHelper.VarChar("@Pass", null, 16),
            SqlParamHelper.VarChar("@Email", req.Email, 45),
            SqlParamHelper.VarChar("@Name", req.Name, 25),
            SqlParamHelper.TinyInt("@Validated", null),
            SqlParamHelper.UniqueId("@ValidationCode", null));

        var row = result.FirstOrDefault();
        var success = row != null && row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : "";

        if (!success)
            return BadRequest(new { success = false, error = message });

        return Ok(new { success = true, message });
    }

    /// <summary>
    /// PUT /api/user/{userId}/password
    /// </summary>
    [HttpPut("{userId:guid}/password")]
    public async Task<IActionResult> UpdatePassword(Guid userId, [FromBody] UpdatePasswordRequest req)
    {
        ValidateOwnership(userId);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateUserPassword",
            SqlParamHelper.UniqueId("@UserID", userId),
            SqlParamHelper.VarChar("@NewPassword", req.NewPassword, 16));

        var row = result.FirstOrDefault();
        var success = row != null && row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : "";

        if (!success)
            return BadRequest(new { success = false, error = message });

        return Ok(new { success = true, message });
    }

    /// <summary>
    /// DELETE /api/user/{userId}
    /// </summary>
    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        ValidateOwnership(userId);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_DeleteUser",
            SqlParamHelper.UniqueId("@UserId", userId));

        var row = result.FirstOrDefault();
        var success = row != null && row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : "";

        if (!success)
            return NotFound(new { success = false, error = message });

        return Ok(new { success = true, message });
    }

    /// <summary>
    /// GET /api/user/{userId}/validation
    /// </summary>
    [HttpGet("{userId:guid}/validation")]
    public async Task<IActionResult> GetValidationInfo(Guid userId)
    {
        ValidateOwnership(userId);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetValidationInfo",
            SqlParamHelper.UniqueId("@UserID", userId));

        var row = result.FirstOrDefault();
        if (row == null)
            return NotFound(new { success = false, error = "User validation info not found" });

        return Ok(new
        {
            success = true,
            validationCode = row.GetValueOrDefault("ValidationCode"),
            creationTime = row.GetValueOrDefault("CreationTime")
        });
    }
}
