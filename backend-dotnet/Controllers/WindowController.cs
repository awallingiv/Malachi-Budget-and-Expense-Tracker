using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/budget/windows")]
[Authorize]
public class WindowController : ControllerBase
{
    private readonly IDatabaseService _db;

    public WindowController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/budget/windows/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetWindows(Guid userId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetCategoryWindows",
            SqlParamHelper.UniqueId("@UserID", userId));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/budget/windows
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateWindow([FromBody] CreateWindowRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to create window for this user" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_CreateCategoryWindow",
            SqlParamHelper.UniqueId("@UserID", req.UserID),
            SqlParamHelper.VarChar("@Username", req.Username, 17),
            SqlParamHelper.VarChar("@CategoryName", req.CategoryName, 50),
            SqlParamHelper.VarChar("@DisplayName", req.DisplayName, 100),
            SqlParamHelper.VarChar("@Description", req.Description, 255),
            SqlParamHelper.VarChar("@ColorTheme", req.ColorTheme ?? "blue", 20),
            SqlParamHelper.Int("@PositionX", req.PositionX ?? 100),
            SqlParamHelper.Int("@PositionY", req.PositionY ?? 100),
            SqlParamHelper.Int("@Width", req.Width ?? 300),
            SqlParamHelper.Int("@Height", req.Height ?? 200));

        var row = result.FirstOrDefault();
        return StatusCode(201, new
        {
            success = row?.TryGetValue("Success", out var s) == true && Convert.ToBoolean(s),
            message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : "",
            windowId = row?.GetValueOrDefault("NewWindowID")
        });
    }

    /// <summary>
    /// PUT /api/budget/windows/{windowId}
    /// </summary>
    [HttpPut("{windowId:guid}")]
    public async Task<IActionResult> UpdateWindow(Guid windowId, [FromBody] UpdateWindowRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to update this window" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateCategoryWindow",
            SqlParamHelper.UniqueId("@WindowID", windowId),
            SqlParamHelper.UniqueId("@UserID", req.UserID),
            SqlParamHelper.VarChar("@DisplayName", req.DisplayName, 100),
            SqlParamHelper.VarChar("@Description", req.Description, 255),
            SqlParamHelper.VarChar("@ColorTheme", req.ColorTheme, 20),
            SqlParamHelper.Int("@PositionX", req.PositionX),
            SqlParamHelper.Int("@PositionY", req.PositionY),
            SqlParamHelper.Int("@Width", req.Width),
            SqlParamHelper.Int("@Height", req.Height),
            SqlParamHelper.Bit("@IsMinimized", req.IsMinimized),
            SqlParamHelper.Int("@ZIndex", req.ZIndex));

        var row = result.FirstOrDefault();
        return Ok(new
        {
            success = row?.TryGetValue("Success", out var s) == true && Convert.ToBoolean(s),
            message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : ""
        });
    }

    /// <summary>
    /// DELETE /api/budget/windows/{windowId}
    /// </summary>
    [HttpDelete("{windowId:guid}")]
    public async Task<IActionResult> DeleteWindow(Guid windowId, [FromBody] DeleteWindowRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to delete this window" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_DeleteCategoryWindow",
            SqlParamHelper.UniqueId("@WindowID", windowId),
            SqlParamHelper.UniqueId("@UserID", req.UserId));

        var row = result.FirstOrDefault();
        return Ok(new
        {
            success = row?.TryGetValue("Success", out var s) == true && Convert.ToBoolean(s),
            message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : ""
        });
    }

    /// <summary>
    /// GET /api/budget/windows/{userId}/transactions/{categoryName}
    /// </summary>
    [HttpGet("{userId:guid}/transactions/{categoryName}")]
    public async Task<IActionResult> GetWindowTransactions(Guid userId, string categoryName,
        [FromQuery] string? startDate, [FromQuery] string? endDate, [FromQuery] int? limit)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetWindowTransactions",
            SqlParamHelper.UniqueId("@UserID", userId),
            SqlParamHelper.VarChar("@CategoryName", categoryName, 50),
            SqlParamHelper.Date("@StartDate", string.IsNullOrEmpty(startDate) ? null : DateTime.Parse(startDate)),
            SqlParamHelper.Date("@EndDate", string.IsNullOrEmpty(endDate) ? null : DateTime.Parse(endDate)),
            SqlParamHelper.Int("@Limit", limit));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/budget/windows/positions
    /// </summary>
    [HttpPost("positions")]
    public async Task<IActionResult> UpdateWindowPositions([FromBody] UpdateWindowPositionsRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to update windows for this user" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateWindowPositions",
            SqlParamHelper.UniqueId("@UserID", req.UserID),
            SqlParamHelper.NVarCharMax("@WindowUpdates", JsonSerializer.Serialize(req.WindowUpdates)));

        var row = result.FirstOrDefault();
        return Ok(new
        {
            success = row?.TryGetValue("Success", out var s) == true && Convert.ToBoolean(s),
            message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : ""
        });
    }
}
