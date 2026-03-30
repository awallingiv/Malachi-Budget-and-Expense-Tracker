using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/groupings")]
[Authorize]
public class GroupingsController : ControllerBase
{
    private readonly IDatabaseService _db;

    public GroupingsController(IDatabaseService db) => _db = db;

    /// <summary>
    /// GET /api/groupings/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetGroupings(Guid userId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetUserGroupings",
            SqlParamHelper.UniqueId("@UserID", userId));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/groupings
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateGrouping([FromBody] CreateGroupingRequest req)
    {
        var username = User.FindFirst("username")?.Value ?? User.FindFirst("Username")?.Value ?? "";

        var result = await _db.ExecuteStoredProcedureAsync("spmb_CreateGrouping",
            SqlParamHelper.UniqueId("@UserID", req.UserId),
            SqlParamHelper.VarChar("@Username", username, 17),
            SqlParamHelper.VarChar("@GroupingName", req.GroupingName, 50),
            SqlParamHelper.Int("@DisplayOrder", req.DisplayOrder ?? 0),
            SqlParamHelper.VarChar("@Color", req.Color ?? "#0066cc", 20),
            SqlParamHelper.NVarChar("@Icon", req.Icon, 50));

        var row = result.FirstOrDefault();
        if (row == null)
            return StatusCode(500, new { success = false, message = "Failed to create grouping - no result returned" });

        return Ok(row);
    }

    /// <summary>
    /// PUT /api/groupings/{groupingId}
    /// </summary>
    [HttpPut("{groupingId:guid}")]
    public async Task<IActionResult> UpdateGrouping(Guid groupingId, [FromBody] UpdateGroupingRequest req)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateGrouping",
            SqlParamHelper.UniqueId("@GroupingID", groupingId),
            SqlParamHelper.UniqueId("@UserID", req.UserId),
            SqlParamHelper.VarChar("@GroupingName", req.GroupingName, 50),
            SqlParamHelper.Int("@DisplayOrder", req.DisplayOrder),
            SqlParamHelper.VarChar("@Color", req.Color, 20),
            SqlParamHelper.NVarChar("@Icon", req.Icon, 50));

        var row = result.FirstOrDefault();
        return Ok(row);
    }

    /// <summary>
    /// DELETE /api/groupings/{groupingId}
    /// </summary>
    [HttpDelete("{groupingId:guid}")]
    public async Task<IActionResult> DeleteGrouping(Guid groupingId, [FromBody] DeleteGroupingRequest req)
    {
        await _db.ExecuteStoredProcedureAsync("spmb_DeleteGrouping",
            SqlParamHelper.UniqueId("@GroupingID", groupingId),
            SqlParamHelper.UniqueId("@UserID", req.UserId));

        return Ok(new { success = true, message = "Grouping deleted" });
    }

    /// <summary>
    /// GET /api/groupings/{userId}/{groupingId}/categories
    /// </summary>
    [HttpGet("{userId:guid}/{groupingId:guid}/categories")]
    public async Task<IActionResult> GetCategoriesInGrouping(Guid userId, Guid groupingId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetCategoriesInGrouping",
            SqlParamHelper.UniqueId("@UserID", userId),
            SqlParamHelper.UniqueId("@GroupingID", groupingId));

        var categories = result.Select(r =>
            r.TryGetValue("Category", out var c) ? c : null).ToList();

        return Ok(categories);
    }
}
