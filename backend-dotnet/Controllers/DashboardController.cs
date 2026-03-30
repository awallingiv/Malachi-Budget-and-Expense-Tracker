using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/budget")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDatabaseService _db;

    public DashboardController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/budget/test
    /// </summary>
    [HttpGet("test")]
    [AllowAnonymous]
    public IActionResult Test() =>
        Ok(new { success = true, message = "Budget API is working", timestamp = DateTime.UtcNow.ToString("o") });

    /// <summary>
    /// GET /api/budget/dashboard/{userId}
    /// </summary>
    [HttpGet("dashboard/{userId:guid}")]
    public async Task<IActionResult> GetDashboard(Guid userId, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        try
        {
            var result = await _db.ExecuteStoredProcedureMultiSetAsync("spmb_GetDashboardStats",
                SqlParamHelper.UniqueId("@UserId", userId),
                SqlParamHelper.Date("@StartDate", string.IsNullOrEmpty(startDate) ? null : DateTime.Parse(startDate)),
                SqlParamHelper.Date("@EndDate", string.IsNullOrEmpty(endDate) ? null : DateTime.Parse(endDate)));

            var income = result.Count > 0 && result[0].Count > 0
                ? result[0][0]
                : new Dictionary<string, object?> { ["totalGross"] = 0, ["totalNet"] = 0, ["totalTithe"] = 0, ["incomeCount"] = 0 };
            var categories = result.Count > 1 ? result[1] : [];
            var recentTransactions = result.Count > 2 ? result[2] : [];

            var totalExpenses = categories.Sum(c =>
            {
                if (c.TryGetValue("totalAmount", out var amt) && amt != null)
                    return Convert.ToDouble(amt);
                return 0.0;
            });

            return Ok(new
            {
                income,
                categories,
                recentTransactions,
                expenses = new { totalAmount = totalExpenses }
            });
        }
        catch (Exception)
        {
            // Fallback to direct queries
            var incomeTask = _db.ExecuteQueryAsync(
                "SELECT ISNULL(SUM(Gross), 0) AS totalGross, ISNULL(SUM(Net), 0) AS totalNet, ISNULL(SUM(Tithe), 0) AS totalTithe, COUNT(*) AS incomeCount FROM Income WHERE UserId = @userId",
                SqlParamHelper.UniqueId("@userId", userId));

            var categoriesTask = _db.ExecuteQueryAsync(
                "SELECT TableName, ISNULL(SUM(Amount), 0) AS totalAmount, COUNT(*) AS transactionCount FROM Transactions WHERE UserId = @userId GROUP BY TableName ORDER BY totalAmount DESC",
                SqlParamHelper.UniqueId("@userId", userId));

            var recentTask = _db.ExecuteQueryAsync(
                "SELECT TOP 5 TransactionId, Username, TableName, Name, Amount, Date, CreationTime FROM Transactions WHERE UserId = @userId ORDER BY CreationTime DESC",
                SqlParamHelper.UniqueId("@userId", userId));

            await Task.WhenAll(incomeTask, categoriesTask, recentTask);

            var incomeRow = incomeTask.Result.FirstOrDefault()
                ?? new Dictionary<string, object?> { ["totalGross"] = 0, ["totalNet"] = 0, ["totalTithe"] = 0, ["incomeCount"] = 0 };
            var cats = categoriesTask.Result;
            var recent = recentTask.Result;

            var totalExp = cats.Sum(c =>
                c.TryGetValue("totalAmount", out var a) && a != null ? Convert.ToDouble(a) : 0.0);

            return Ok(new
            {
                income = incomeRow,
                categories = cats,
                recentTransactions = recent,
                expenses = new { totalAmount = totalExp }
            });
        }
    }

    /// <summary>
    /// GET /api/budget/category-summary/{userId}
    /// </summary>
    [HttpGet("category-summary/{userId:guid}")]
    public async Task<IActionResult> GetCategorySummary(Guid userId,
        [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to view category summary for this user" });

        var now = DateTime.Now;
        var start = string.IsNullOrEmpty(startDate)
            ? new DateTime(now.Year, now.Month, 1) : DateTime.Parse(startDate);
        var end = string.IsNullOrEmpty(endDate)
            ? new DateTime(now.Year, now.Month, 1).AddMonths(1).AddDays(-1) : DateTime.Parse(endDate);

        var result = await _db.ExecuteQueryAsync(@"
            SELECT
                ISNULL(TableName, 'Other') AS Category,
                ISNULL(SUM(Amount), 0) AS TotalAmount,
                COUNT(*) AS TransactionCount
            FROM Transactions
            WHERE UserID = @userId
              AND CAST(ISNULL(Date, CreationTime) AS DATE) BETWEEN @startDate AND @endDate
            GROUP BY ISNULL(TableName, 'Other')
            ORDER BY TotalAmount DESC",
            SqlParamHelper.UniqueId("@userId", userId),
            SqlParamHelper.Date("@startDate", start),
            SqlParamHelper.Date("@endDate", end));

        return Ok(result);
    }

    /// <summary>
    /// GET /api/budget/category-trends/{userId}
    /// </summary>
    [HttpGet("category-trends/{userId:guid}")]
    public async Task<IActionResult> GetCategoryTrends(Guid userId,
        [FromQuery] string? category, [FromQuery] int? months)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to view trends for this user" });

        var monthsInt = months ?? 12;

        var result = await _db.ExecuteQueryAsync(@"
            DECLARE @today DATE = CAST(GETDATE() AS DATE);
            DECLARE @startDate DATE = DATEADD(MONTH, -(@months - 1), DATEFROMPARTS(YEAR(@today), MONTH(@today), 1));

            WITH MonthlyData AS (
                SELECT
                    YEAR(ISNULL(Date, CreationTime)) AS [Year],
                    MONTH(ISNULL(Date, CreationTime)) AS [Month],
                    ISNULL(TableName, 'Other') AS Category,
                    SUM(Amount) AS TotalAmount
                FROM Transactions
                WHERE UserID = @userId
                  AND CAST(ISNULL(Date, CreationTime) AS DATE) >= @startDate
                  AND CAST(ISNULL(Date, CreationTime) AS DATE) <= @today
                  AND (@category IS NULL OR ISNULL(TableName, 'Other') = @category)
                GROUP BY YEAR(ISNULL(Date, CreationTime)),
                         MONTH(ISNULL(Date, CreationTime)),
                         ISNULL(TableName, 'Other')
            )
            SELECT [Year], [Month], Category, TotalAmount
            FROM MonthlyData
            ORDER BY [Year], [Month], Category",
            SqlParamHelper.UniqueId("@userId", userId),
            SqlParamHelper.VarChar("@category", category, 50),
            SqlParamHelper.Int("@months", monthsInt));

        return Ok(result);
    }

    /// <summary>
    /// GET /api/budget/comparison/{userId}
    /// </summary>
    [HttpGet("comparison/{userId:guid}")]
    public async Task<IActionResult> GetBudgetComparison(Guid userId,
        [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to view budget comparison for this user" });

        var now = DateTime.Now;
        var start = string.IsNullOrEmpty(startDate)
            ? new DateTime(now.Year, now.Month, 1) : DateTime.Parse(startDate);
        var end = string.IsNullOrEmpty(endDate)
            ? new DateTime(now.Year, now.Month, 1).AddMonths(1).AddDays(-1) : DateTime.Parse(endDate);

        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetBudgetComparison",
            SqlParamHelper.UniqueId("@UserID", userId),
            SqlParamHelper.Date("@StartDate", start),
            SqlParamHelper.Date("@EndDate", end));

        return Ok(result);
    }

    /// <summary>
    /// GET /api/budget/income-expense-summary/{userId}
    /// </summary>
    [HttpGet("income-expense-summary/{userId:guid}")]
    public async Task<IActionResult> GetIncomeExpenseSummary(Guid userId, [FromQuery] int? months)
    {
        if (userId != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to view income/expense summary for this user" });

        var monthsInt = months ?? 6;

        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetIncomeSummaryByMonth",
            SqlParamHelper.UniqueId("@UserID", userId),
            SqlParamHelper.Int("@MonthsBack", monthsInt));

        return Ok(result);
    }

    /// <summary>
    /// GET /api/budget/categories/{userId} - unique TableNames from transactions 
    /// </summary>
    [HttpGet("categories/{userId:guid}")]
    public async Task<IActionResult> GetTransactionCategories(Guid userId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetTransactionsByUserID",
            SqlParamHelper.UniqueId("@UserId", userId));

        var categories = result
            .Select(r => r.TryGetValue("TableName", out var tn) ? tn?.ToString() : null)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct()
            .OrderBy(n => n)
            .ToList();

        return Ok(categories);
    }
}
