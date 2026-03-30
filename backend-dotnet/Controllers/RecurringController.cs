using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/budget/recurring")]
[Authorize]
public class RecurringController : ControllerBase
{
    private readonly IDatabaseService _db;

    public RecurringController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/budget/recurring/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetRecurringItems(Guid userId, [FromQuery] string? type)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to view recurring items for this user" });

        var result = await _db.ExecuteQueryAsync(@"
            SELECT RecurringID, UserID, Username, ItemType, Description, TableName, Amount,
                   StartDate, EndDate, Frequency, Interval, NextOccurrence, IsActive,
                   CreationTime, LastEdit, Notes
            FROM RecurringItems
            WHERE UserID = @userId
              AND (@itemType IS NULL OR ItemType = @itemType)
            ORDER BY NextOccurrence, Description",
            SqlParamHelper.UniqueId("@userId", userId),
            SqlParamHelper.VarChar("@itemType", type, 10));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/budget/recurring
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateRecurring([FromBody] CreateRecurringRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to create recurring items for this user" });

        var nextOccurrence = req.NextOccurrence ?? req.StartDate;

        var result = await _db.ExecuteQueryAsync(@"
            INSERT INTO RecurringItems (
                UserID, Username, ItemType, Description, TableName, Amount,
                StartDate, EndDate, Frequency, Interval, NextOccurrence, IsActive, Notes
            )
            OUTPUT inserted.RecurringID
            VALUES (
                @userId, @username, @itemType, @description, @tableName, @amount,
                @startDate, @endDate, @frequency, @interval, @nextOccurrence, 1, @notes
            )",
            SqlParamHelper.UniqueId("@userId", req.UserID),
            SqlParamHelper.VarChar("@username", req.Username, 17),
            SqlParamHelper.VarChar("@itemType", req.ItemType, 10),
            SqlParamHelper.VarChar("@description", req.Description, 150),
            SqlParamHelper.VarChar("@tableName", req.TableName, 50),
            SqlParamHelper.Float("@amount", req.Amount),
            SqlParamHelper.Date("@startDate", req.StartDate),
            SqlParamHelper.Date("@endDate", req.EndDate),
            SqlParamHelper.VarChar("@frequency", req.Frequency, 20),
            SqlParamHelper.Int("@interval", req.Interval ?? 1),
            SqlParamHelper.Date("@nextOccurrence", nextOccurrence),
            SqlParamHelper.VarChar("@notes", req.Notes, 255));

        var row = result.FirstOrDefault();
        return StatusCode(201, new
        {
            success = true,
            message = "Recurring item created successfully",
            recurringId = row?.GetValueOrDefault("RecurringID")
        });
    }

    /// <summary>
    /// PUT /api/budget/recurring/{recurringId}
    /// </summary>
    [HttpPut("{recurringId:guid}")]
    public async Task<IActionResult> UpdateRecurring(Guid recurringId, [FromBody] UpdateRecurringRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to update this recurring item" });

        var result = await _db.ExecuteQueryAsync(@"
            SET NOCOUNT ON;
            UPDATE RecurringItems
            SET Description    = COALESCE(@description, Description),
                TableName      = COALESCE(@tableName, TableName),
                Amount         = COALESCE(@amount, Amount),
                StartDate      = COALESCE(@startDate, StartDate),
                EndDate        = COALESCE(@endDate, EndDate),
                Frequency      = COALESCE(@frequency, Frequency),
                Interval       = COALESCE(@interval, Interval),
                NextOccurrence = COALESCE(@nextOccurrence, NextOccurrence),
                IsActive       = COALESCE(@isActive, IsActive),
                Notes          = COALESCE(@notes, Notes),
                LastEdit       = GETDATE()
            WHERE RecurringID = @recurringId AND UserID = @userId;

            SELECT @@ROWCOUNT AS RowsAffected",
            SqlParamHelper.UniqueId("@recurringId", recurringId),
            SqlParamHelper.UniqueId("@userId", req.UserID),
            SqlParamHelper.VarChar("@description", req.Description, 150),
            SqlParamHelper.VarChar("@tableName", req.TableName, 50),
            SqlParamHelper.Float("@amount", req.Amount),
            SqlParamHelper.Date("@startDate", req.StartDate),
            SqlParamHelper.Date("@endDate", req.EndDate),
            SqlParamHelper.VarChar("@frequency", req.Frequency, 20),
            SqlParamHelper.Int("@interval", req.Interval),
            SqlParamHelper.Date("@nextOccurrence", req.NextOccurrence),
            SqlParamHelper.Bit("@isActive", req.IsActive),
            SqlParamHelper.VarChar("@notes", req.Notes, 255));

        var row = result.FirstOrDefault();
        var affected = row != null && row.TryGetValue("RowsAffected", out var ra) ? Convert.ToInt32(ra) : 0;

        if (affected == 0)
            return NotFound(new { success = false, error = "Recurring item not found" });

        return Ok(new { success = true, message = "Recurring item updated successfully" });
    }

    /// <summary>
    /// DELETE /api/budget/recurring/{recurringId}
    /// </summary>
    [HttpDelete("{recurringId:guid}")]
    public async Task<IActionResult> DeleteRecurring(Guid recurringId, [FromBody] DeleteRecurringRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to delete this recurring item" });

        var result = await _db.ExecuteQueryAsync(@"
            DELETE FROM RecurringItems WHERE RecurringID = @recurringId AND UserID = @userId;
            SELECT @@ROWCOUNT AS RowsAffected",
            SqlParamHelper.UniqueId("@recurringId", recurringId),
            SqlParamHelper.UniqueId("@userId", req.UserId));

        var row = result.FirstOrDefault();
        var affected = row != null && row.TryGetValue("RowsAffected", out var ra) ? Convert.ToInt32(ra) : 0;

        if (affected == 0)
            return NotFound(new { success = false, error = "Recurring item not found" });

        return Ok(new { success = true, message = "Recurring item deleted successfully" });
    }
}
