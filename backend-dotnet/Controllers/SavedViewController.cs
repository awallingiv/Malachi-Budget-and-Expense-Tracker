using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/budget/views")]
[Authorize]
public class SavedViewController : ControllerBase
{
    private readonly IDatabaseService _db;

    public SavedViewController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/budget/views/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetViews(Guid userId)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to view saved views for this user" });

        var result = await _db.ExecuteQueryAsync(
            "SELECT SavedViewID, UserID, Name, FilterConfig, CreationTime, LastEdit FROM SavedViews WHERE UserID = @userId ORDER BY CreationTime DESC",
            SqlParamHelper.UniqueId("@userId", userId));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/budget/views
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateView([FromBody] CreateSavedViewRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to create saved views for this user" });

        var result = await _db.ExecuteQueryAsync(@"
            INSERT INTO SavedViews (UserID, Name, FilterConfig)
            OUTPUT inserted.SavedViewID, inserted.UserID, inserted.Name, inserted.FilterConfig, inserted.CreationTime, inserted.LastEdit
            VALUES (@userId, @name, @filterConfig)",
            SqlParamHelper.UniqueId("@userId", req.UserID),
            SqlParamHelper.VarChar("@name", req.Name, 100),
            SqlParamHelper.NVarCharMax("@filterConfig", req.FilterConfig));

        return StatusCode(201, new
        {
            success = true,
            view = result.FirstOrDefault()
        });
    }

    /// <summary>
    /// PUT /api/budget/views/{viewId}
    /// </summary>
    [HttpPut("{viewId:guid}")]
    public async Task<IActionResult> UpdateView(Guid viewId, [FromBody] UpdateSavedViewRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to update this saved view" });

        var result = await _db.ExecuteQueryAsync(@"
            UPDATE SavedViews
            SET Name = COALESCE(@name, Name),
                FilterConfig = COALESCE(@filterConfig, FilterConfig),
                LastEdit = GETDATE()
            WHERE SavedViewID = @viewId AND UserID = @userId;

            SELECT @@ROWCOUNT AS RowsAffected",
            SqlParamHelper.UniqueId("@viewId", viewId),
            SqlParamHelper.UniqueId("@userId", req.UserID),
            SqlParamHelper.VarChar("@name", req.Name, 100),
            SqlParamHelper.NVarCharMax("@filterConfig", req.FilterConfig));

        var row = result.FirstOrDefault();
        var affected = row != null && row.TryGetValue("RowsAffected", out var ra) ? Convert.ToInt32(ra) : 0;

        if (affected == 0)
            return NotFound(new { success = false, error = "Saved view not found" });

        return Ok(new { success = true, message = "Saved view updated successfully" });
    }

    /// <summary>
    /// DELETE /api/budget/views/{viewId}
    /// </summary>
    [HttpDelete("{viewId:guid}")]
    public async Task<IActionResult> DeleteView(Guid viewId, [FromBody] DeleteSavedViewRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to delete this saved view" });

        var result = await _db.ExecuteQueryAsync(@"
            DELETE FROM SavedViews WHERE SavedViewID = @viewId AND UserID = @userId;
            SELECT @@ROWCOUNT AS RowsAffected",
            SqlParamHelper.UniqueId("@viewId", viewId),
            SqlParamHelper.UniqueId("@userId", req.UserId));

        var row = result.FirstOrDefault();
        var affected = row != null && row.TryGetValue("RowsAffected", out var ra) ? Convert.ToInt32(ra) : 0;

        if (affected == 0)
            return NotFound(new { success = false, error = "Saved view not found" });

        return Ok(new { success = true, message = "Saved view deleted successfully" });
    }
}
