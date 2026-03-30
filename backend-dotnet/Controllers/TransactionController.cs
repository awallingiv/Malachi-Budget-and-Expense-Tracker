using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/budget/transactions")]
[Authorize]
public class TransactionController : ControllerBase
{
    private readonly IDatabaseService _db;

    public TransactionController(IDatabaseService db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/budget/transactions/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetTransactions(Guid userId,
        [FromQuery] int page = 1, [FromQuery] int limit = 50,
        [FromQuery] string? category = null, [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null, [FromQuery] double? minAmount = null,
        [FromQuery] double? maxAmount = null, [FromQuery] string? q = null)
    {
        var pageNum = Math.Max(1, page);
        var limitNum = Math.Clamp(limit, 1, 100);
        var offset = (pageNum - 1) * limitNum;

        var dataParams = new List<Microsoft.Data.SqlClient.SqlParameter>
        {
            SqlParamHelper.UniqueId("@UserId", userId),
            SqlParamHelper.Int("@Offset", offset),
            SqlParamHelper.Int("@Limit", limitNum)
        };
        var countParams = new List<Microsoft.Data.SqlClient.SqlParameter>
        {
            SqlParamHelper.UniqueId("@UserId", userId)
        };

        if (!string.IsNullOrEmpty(category))
        {
            dataParams.Add(SqlParamHelper.NVarChar("@TableName", category, 50));
            countParams.Add(SqlParamHelper.NVarChar("@TableName", category, 50));
        }

        if (!string.IsNullOrEmpty(startDate))
        {
            var sd = SqlParamHelper.Date("@StartDate", DateTime.Parse(startDate));
            dataParams.Add(sd);
            countParams.Add(SqlParamHelper.Date("@StartDate", DateTime.Parse(startDate)));
        }

        if (!string.IsNullOrEmpty(endDate))
        {
            var ed = SqlParamHelper.Date("@EndDate", DateTime.Parse(endDate));
            dataParams.Add(ed);
            countParams.Add(SqlParamHelper.Date("@EndDate", DateTime.Parse(endDate)));
        }

        var dataTask = _db.ExecuteStoredProcedureAsync("spmb_GetTransactionsByUserID", dataParams.ToArray());
        var countTask = _db.ExecuteStoredProcedureAsync("spmb_GetTransactionCount", countParams.ToArray());
        await Task.WhenAll(dataTask, countTask);

        var transactions = dataTask.Result;
        var totalCount = 0;
        if (countTask.Result.Count > 0 && countTask.Result[0].TryGetValue("TotalCount", out var tc) && tc != null)
            totalCount = Convert.ToInt32(tc);

        // Apply in-memory filters for fields not supported by SP
        if (minAmount.HasValue || maxAmount.HasValue || !string.IsNullOrEmpty(q))
        {
            transactions = transactions.Where(t =>
            {
                var amt = t.TryGetValue("Amount", out var a) && a != null ? Convert.ToDouble(a) : 0;
                if (minAmount.HasValue && amt < minAmount.Value) return false;
                if (maxAmount.HasValue && amt > maxAmount.Value) return false;

                if (!string.IsNullOrEmpty(q))
                {
                    var haystack = string.Join(" ",
                        new[] { "Description", "Notes", "TableName", "Category" }
                            .Select(k => t.TryGetValue(k, out var v) ? v?.ToString() : "")
                            .Where(s => !string.IsNullOrEmpty(s))
                    ).ToLower();
                    if (!haystack.Contains(q.ToLower())) return false;
                }
                return true;
            }).ToList();
        }

        var totalPages = totalCount > 0 ? (int)Math.Ceiling((double)totalCount / limitNum) : 0;

        return Ok(new
        {
            data = transactions,
            pagination = new
            {
                page = pageNum,
                limit = limitNum,
                total = totalCount,
                totalPages,
                hasMore = pageNum < totalPages
            }
        });
    }

    /// <summary>
    /// POST /api/budget/transactions
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to create transaction for this user" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_InsertTransaction",
            SqlParamHelper.UniqueId("@UserID", req.UserID),
            SqlParamHelper.VarChar("@Username", req.Username, 17),
            SqlParamHelper.VarChar("@Name", req.Name, 150),
            SqlParamHelper.Float("@Amount", req.Amount),
            SqlParamHelper.DateTime("@Due", req.Due),
            SqlParamHelper.DateTime("@Date", req.Date),
            SqlParamHelper.VarChar("@Notes", req.Notes, 60),
            SqlParamHelper.VarChar("@Category", req.Category, 50),
            SqlParamHelper.VarChar("@Status", req.Status, 20),
            SqlParamHelper.UniqueId("@GroupingID", req.GroupingID),
            SqlParamHelper.UniqueId("@CategoryID", req.CategoryID));

        var row = result.FirstOrDefault();

        return StatusCode(201, new
        {
            success = true,
            message = "Transaction created successfully",
            transactionId = row?.GetValueOrDefault("NewTransactionId")
        });
    }

    /// <summary>
    /// PUT /api/budget/transactions/{transactionId}
    /// </summary>
    [HttpPut("{transactionId:guid}")]
    public async Task<IActionResult> UpdateTransaction(Guid transactionId, [FromBody] UpdateTransactionRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to update this transaction" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateTransaction",
            SqlParamHelper.UniqueId("@TransactionId", transactionId),
            SqlParamHelper.VarChar("@Name", req.Description, 150),
            SqlParamHelper.Float("@Amount", req.Amount),
            SqlParamHelper.DateTime("@Due", req.Due),
            SqlParamHelper.DateTime("@Date", req.Date),
            SqlParamHelper.VarChar("@Notes", req.Notes, 60),
            SqlParamHelper.VarChar("@Category", req.Category, 20),
            SqlParamHelper.VarChar("@Status", req.Status, 20),
            SqlParamHelper.UniqueId("@UserID", req.UserID),
            SqlParamHelper.UniqueId("@GroupingID", req.GroupingID),
            SqlParamHelper.UniqueId("@CategoryID", req.CategoryID));

        var row = result.FirstOrDefault();
        var success = row != null && row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : "";

        if (!success)
            return NotFound(new { success = false, error = message });

        return Ok(new { success = true, message });
    }

    /// <summary>
    /// DELETE /api/budget/transactions/{transactionId}
    /// </summary>
    [HttpDelete("{transactionId:guid}")]
    public async Task<IActionResult> DeleteTransaction(Guid transactionId, [FromQuery] Guid? userId)
    {
        var uid = userId ?? GetUserId();
        if (uid != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to delete this transaction" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_DeleteTransaction",
            SqlParamHelper.UniqueId("@TransactionId", transactionId),
            SqlParamHelper.UniqueId("@UserID", uid));

        var row = result.FirstOrDefault();
        if (row == null)
            return StatusCode(500, new { success = false, error = "No response from delete operation" });

        var success = row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row.TryGetValue("Message", out var m) ? m?.ToString() : "";

        if (!success)
            return NotFound(new { success = false, error = string.IsNullOrEmpty(message) ? "Transaction not found or could not be deleted" : message });

        return Ok(new { success = true, message = string.IsNullOrEmpty(message) ? "Transaction deleted successfully" : message });
    }
}
