using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/budget/budgets")]
[Authorize]
public class BudgetPlanController : ControllerBase
{
    private readonly IDatabaseService _db;

    public BudgetPlanController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/budget/budgets/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetBudgets(Guid userId,
        [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to view budgets for this user" });

        var now = DateTime.Now;
        var start = string.IsNullOrEmpty(startDate)
            ? new DateTime(now.Year, now.Month, 1) : DateTime.Parse(startDate);
        var end = string.IsNullOrEmpty(endDate)
            ? new DateTime(now.Year, now.Month, 1).AddMonths(1).AddDays(-1) : DateTime.Parse(endDate);

        var result = await _db.ExecuteQueryAsync(@"
            SELECT BudgetID, UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency, CreationTime, LastEdit
            FROM Budgets
            WHERE UserID = @userId
              AND PeriodStart >= @startDate
              AND PeriodEnd <= @endDate
            ORDER BY PeriodStart, CategoryName",
            SqlParamHelper.UniqueId("@userId", userId),
            SqlParamHelper.Date("@startDate", start),
            SqlParamHelper.Date("@endDate", end));

        return Ok(result);
    }

    /// <summary>
    /// POST /api/budget/budgets (upsert)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateBudget([FromBody] CreateBudgetRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to modify budgets for this user" });

        var result = await _db.ExecuteQueryAsync(@"
            SET NOCOUNT ON;
            IF EXISTS (
                SELECT 1 FROM Budgets
                WHERE UserID = @userId AND CategoryName = @categoryName
                  AND PeriodStart = @periodStart AND PeriodEnd = @periodEnd
            )
            BEGIN
                UPDATE Budgets SET Amount = @amount, Currency = @currency, LastEdit = GETDATE()
                WHERE UserID = @userId AND CategoryName = @categoryName
                  AND PeriodStart = @periodStart AND PeriodEnd = @periodEnd;
            END
            ELSE
            BEGIN
                INSERT INTO Budgets (UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency)
                VALUES (@userId, @username, @categoryName, @periodStart, @periodEnd, @amount, @currency);
            END

            SELECT TOP 1 BudgetID, UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency, CreationTime, LastEdit
            FROM Budgets
            WHERE UserID = @userId AND CategoryName = @categoryName
              AND PeriodStart = @periodStart AND PeriodEnd = @periodEnd",
            SqlParamHelper.UniqueId("@userId", req.UserID),
            SqlParamHelper.VarChar("@username", req.Username, 17),
            SqlParamHelper.VarChar("@categoryName", req.CategoryName, 50),
            SqlParamHelper.Date("@periodStart", req.PeriodStart),
            SqlParamHelper.Date("@periodEnd", req.PeriodEnd),
            SqlParamHelper.Float("@amount", req.Amount),
            SqlParamHelper.VarChar("@currency", req.Currency ?? "USD", 10));

        return StatusCode(201, new
        {
            success = true,
            message = "Budget saved successfully",
            budget = result.FirstOrDefault()
        });
    }

    /// <summary>
    /// PUT /api/budget/budgets/{budgetId}
    /// </summary>
    [HttpPut("{budgetId:guid}")]
    public async Task<IActionResult> UpdateBudget(Guid budgetId, [FromBody] UpdateBudgetRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to update this budget" });

        var resultSets = await _db.ExecuteQueryMultiSetAsync(@"
            SET NOCOUNT ON;
            UPDATE Budgets
            SET CategoryName = COALESCE(@categoryName, CategoryName),
                PeriodStart = COALESCE(@periodStart, PeriodStart),
                PeriodEnd = COALESCE(@periodEnd, PeriodEnd),
                Amount = COALESCE(@amount, Amount),
                Currency = COALESCE(@currency, Currency),
                LastEdit = GETDATE()
            WHERE BudgetID = @budgetId AND UserID = @userId;

            IF @@ROWCOUNT = 0
            BEGIN
                SELECT CAST(0 AS bit) AS Success, 'Budget not found' AS Message;
                RETURN;
            END

            SELECT CAST(1 AS bit) AS Success, 'Budget updated successfully' AS Message;

            SELECT BudgetID, UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency, CreationTime, LastEdit
            FROM Budgets WHERE BudgetID = @budgetId AND UserID = @userId",
            SqlParamHelper.UniqueId("@budgetId", budgetId),
            SqlParamHelper.UniqueId("@userId", req.UserID),
            SqlParamHelper.VarChar("@categoryName", req.CategoryName, 50),
            SqlParamHelper.Date("@periodStart", req.PeriodStart),
            SqlParamHelper.Date("@periodEnd", req.PeriodEnd),
            SqlParamHelper.Float("@amount", req.Amount),
            SqlParamHelper.VarChar("@currency", req.Currency, 10));

        var statusRow = resultSets.Count > 0 ? resultSets[0].FirstOrDefault() : null;
        var success = statusRow != null && statusRow.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = statusRow?.TryGetValue("Message", out var m) == true ? m?.ToString() : "Budget not found";

        if (!success)
            return NotFound(new { success = false, error = message });

        var budget = resultSets.Count > 1 ? resultSets[1].FirstOrDefault() : null;
        return Ok(new { success = true, message, budget });
    }

    /// <summary>
    /// DELETE /api/budget/budgets/{budgetId}
    /// </summary>
    [HttpDelete("{budgetId:guid}")]
    public async Task<IActionResult> DeleteBudget(Guid budgetId, [FromBody] DeleteBudgetRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to delete this budget" });

        var result = await _db.ExecuteQueryAsync(@"
            DELETE FROM Budgets WHERE BudgetID = @budgetId AND UserID = @userId;
            SELECT @@ROWCOUNT AS RowsAffected",
            SqlParamHelper.UniqueId("@budgetId", budgetId),
            SqlParamHelper.UniqueId("@userId", req.UserId));

        var row = result.FirstOrDefault();
        var affected = row != null && row.TryGetValue("RowsAffected", out var ra) ? Convert.ToInt32(ra) : 0;

        if (affected == 0)
            return NotFound(new { success = false, error = "Budget not found" });

        return Ok(new { success = true, message = "Budget deleted successfully" });
    }
}
