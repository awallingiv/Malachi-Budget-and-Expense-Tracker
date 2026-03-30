using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/category-windows")]
[Authorize]
public class CategoryWindowsController : ControllerBase
{
    private readonly IDatabaseService _db;

    public CategoryWindowsController(IDatabaseService db) => _db = db;

    /// <summary>
    /// GET /api/category-windows/tables/{userId}
    /// </summary>
    [HttpGet("tables/{userId:guid}")]
    public async Task<IActionResult> GetTables(Guid userId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetTablesForUser",
            SqlParamHelper.UniqueId("@UserID", userId));

        return Ok(result);
    }

    /// <summary>
    /// GET /api/category-windows/windows/{userId}
    /// </summary>
    [HttpGet("windows/{userId:guid}")]
    public async Task<IActionResult> GetWindows(Guid userId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetCategoryWindows",
            SqlParamHelper.UniqueId("@UserID", userId));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/category-windows/windows
    /// </summary>
    [HttpPost("windows")]
    public async Task<IActionResult> CreateWindow([FromBody] CreateCategoryWindowRequest req)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_CreateCategoryWindow",
            SqlParamHelper.UniqueId("@UserID", req.UserId),
            SqlParamHelper.VarChar("@Username", req.Username, 17),
            SqlParamHelper.VarChar("@CategoryName", req.CategoryName, 50),
            SqlParamHelper.VarChar("@DisplayName", req.DisplayName, 100),
            SqlParamHelper.VarChar("@Description", req.Description, 255),
            SqlParamHelper.VarChar("@ColorTheme", req.ColorTheme ?? "blue", 20),
            SqlParamHelper.Int("@PositionX", req.PositionX ?? 100),
            SqlParamHelper.Int("@PositionY", req.PositionY ?? 100),
            SqlParamHelper.Int("@Width", req.Width ?? 400),
            SqlParamHelper.Int("@Height", req.Height ?? 300),
            SqlParamHelper.VarChar("@TableName", req.TableName, 20));

        var row = result.FirstOrDefault();
        var success = row?.TryGetValue("Success", out var s) == true && Convert.ToBoolean(s);

        if (!success)
            return BadRequest(row);

        return StatusCode(201, row);
    }

    /// <summary>
    /// PUT /api/category-windows/windows/{windowId}
    /// </summary>
    [HttpPut("windows/{windowId:guid}")]
    public async Task<IActionResult> UpdateWindow(Guid windowId, [FromBody] UpdateCategoryWindowRequest req)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateCategoryWindow",
            SqlParamHelper.UniqueId("@WindowID", windowId),
            SqlParamHelper.UniqueId("@UserID", req.UserId),
            SqlParamHelper.VarChar("@DisplayName", req.DisplayName, 100),
            SqlParamHelper.VarChar("@Description", req.Description, 255),
            SqlParamHelper.VarChar("@ColorTheme", req.ColorTheme, 20),
            SqlParamHelper.Int("@PositionX", req.PositionX),
            SqlParamHelper.Int("@PositionY", req.PositionY),
            SqlParamHelper.Int("@Width", req.Width),
            SqlParamHelper.Int("@Height", req.Height),
            SqlParamHelper.Bit("@IsMinimized", req.IsMinimized),
            SqlParamHelper.Int("@ZIndex", req.ZIndex),
            SqlParamHelper.VarChar("@TableName", req.TableName, 20));

        var row = result.FirstOrDefault();
        var success = row?.TryGetValue("Success", out var s) == true && Convert.ToBoolean(s);

        if (!success)
            return BadRequest(row);

        return Ok(row);
    }

    /// <summary>
    /// DELETE /api/category-windows/windows/{windowId}
    /// </summary>
    [HttpDelete("windows/{windowId:guid}")]
    public async Task<IActionResult> DeleteWindow(Guid windowId, [FromBody] DeleteCategoryWindowRequest req)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_DeleteCategoryWindow",
            SqlParamHelper.UniqueId("@WindowID", windowId),
            SqlParamHelper.UniqueId("@UserID", req.UserId));

        var row = result.FirstOrDefault();
        var success = row?.TryGetValue("Success", out var s) == true && Convert.ToBoolean(s);

        if (!success)
            return BadRequest(row);

        return Ok(row);
    }
}
