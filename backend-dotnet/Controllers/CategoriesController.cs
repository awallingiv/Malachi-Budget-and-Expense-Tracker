using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly IDatabaseService _db;

    public CategoriesController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/categories/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetCategories(Guid userId)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, message = "Access denied" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetUserCategories",
            SqlParamHelper.UniqueId("@UserID", userId));

        return Ok(result);
    }

    /// <summary>
    /// GET /api/categories/grouping/{groupingId}
    /// </summary>
    [HttpGet("grouping/{groupingId:guid}")]
    public async Task<IActionResult> GetCategoriesInGrouping(Guid groupingId)
    {
        var userId = GetUserId();
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetCategoriesInGrouping",
            SqlParamHelper.UniqueId("@GroupingID", groupingId),
            SqlParamHelper.UniqueId("@UserID", userId));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/categories
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, message = "Access denied" });

        var username = User.FindFirst("Username")?.Value ?? "";

        try
        {
            var result = await _db.ExecuteStoredProcedureAsync("spmb_CreateCategory",
                SqlParamHelper.UniqueId("@GroupingID", req.GroupingId),
                SqlParamHelper.UniqueId("@UserID", req.UserId),
                SqlParamHelper.VarChar("@Username", username, 17),
                SqlParamHelper.NVarChar("@CategoryName", req.CategoryName, 50),
                SqlParamHelper.Int("@DisplayOrder", req.DisplayOrder ?? 999),
                SqlParamHelper.VarChar("@Color", req.Color, 20),
                SqlParamHelper.VarChar("@Icon", req.Icon, 50));

            return Ok(result.FirstOrDefault());
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Message.Contains("UNIQUE"))
        {
            return Conflict(new { success = false, message = "Category name already exists in this grouping" });
        }
    }

    /// <summary>
    /// PUT /api/categories/{categoryId}
    /// </summary>
    [HttpPut("{categoryId:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid categoryId, [FromBody] UpdateCategoryRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, message = "Access denied" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateCategory",
            SqlParamHelper.UniqueId("@CategoryID", categoryId),
            SqlParamHelper.UniqueId("@UserID", req.UserId),
            SqlParamHelper.NVarChar("@CategoryName", req.CategoryName, 50),
            SqlParamHelper.UniqueId("@GroupingID", req.GroupingId),
            SqlParamHelper.Int("@DisplayOrder", req.DisplayOrder),
            SqlParamHelper.VarChar("@Color", req.Color, 20),
            SqlParamHelper.VarChar("@Icon", req.Icon, 50));

        if (result.Count == 0)
            return NotFound(new { success = false, message = "Category not found" });

        return Ok(result.FirstOrDefault());
    }

    /// <summary>
    /// DELETE /api/categories/{categoryId}
    /// </summary>
    [HttpDelete("{categoryId:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid categoryId, [FromBody] DeleteCategoryRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, message = "Access denied" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_DeleteCategory",
            SqlParamHelper.UniqueId("@CategoryID", categoryId),
            SqlParamHelper.UniqueId("@UserID", req.UserId));

        var row = result.FirstOrDefault();
        var affected = row != null && row.TryGetValue("RowsAffected", out var ra) ? Convert.ToInt32(ra) : 0;

        if (affected == 0)
            return NotFound(new { success = false, message = "Category not found" });

        return Ok(new { success = true, message = "Category deleted successfully", rowsAffected = affected });
    }
}
