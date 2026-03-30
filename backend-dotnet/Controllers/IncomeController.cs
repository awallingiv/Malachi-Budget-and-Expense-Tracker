using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/budget/income")]
[Authorize]
public class IncomeController : ControllerBase
{
    private readonly IDatabaseService _db;
    private readonly ILogger<IncomeController> _logger;

    public IncomeController(IDatabaseService db, ILogger<IncomeController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst("userId")!.Value);

    /// <summary>
    /// GET /api/budget/income/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetIncome(Guid userId,
        [FromQuery] int page = 1, [FromQuery] int limit = 50,
        [FromQuery] string? startDate = null, [FromQuery] string? endDate = null)
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

        if (!string.IsNullOrEmpty(startDate))
        {
            dataParams.Add(SqlParamHelper.DateTime("@StartDate", DateTime.Parse(startDate)));
            countParams.Add(SqlParamHelper.DateTime("@StartDate", DateTime.Parse(startDate)));
        }
        if (!string.IsNullOrEmpty(endDate))
        {
            dataParams.Add(SqlParamHelper.DateTime("@EndDate", DateTime.Parse(endDate)));
            countParams.Add(SqlParamHelper.DateTime("@EndDate", DateTime.Parse(endDate)));
        }

        List<Dictionary<string, object?>> incomeRecords;
        int totalCount;

        try
        {
            var dataTask = _db.ExecuteStoredProcedureAsync("spmb_GetIncomeByUserIDAndDate", dataParams.ToArray());
            var countTask = _db.ExecuteStoredProcedureAsync("spmb_GetIncomeCount", countParams.ToArray());
            await Task.WhenAll(dataTask, countTask);

            incomeRecords = dataTask.Result;
            totalCount = countTask.Result.Count > 0
                && countTask.Result[0].TryGetValue("TotalCount", out var tc) && tc != null
                    ? Convert.ToInt32(tc) : 0;
        }
        catch
        {
            // Fallback to direct query
            var query = "SELECT * FROM Income WHERE UserId = @userId";
            var countQuery = "SELECT COUNT(*) AS TotalCount FROM Income WHERE UserId = @userId";
            var qParams = new List<Microsoft.Data.SqlClient.SqlParameter>
            {
                SqlParamHelper.UniqueId("@userId", userId)
            };
            var cParams = new List<Microsoft.Data.SqlClient.SqlParameter>
            {
                SqlParamHelper.UniqueId("@userId", userId)
            };

            if (!string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
            {
                var dateCondition = " AND (TRY_CAST(Date AS DATE) BETWEEN @startDate AND @endDate OR CAST(CreationTime AS DATE) BETWEEN @startDate AND @endDate)";
                query += dateCondition;
                countQuery += dateCondition;
                qParams.Add(SqlParamHelper.Date("@startDate", DateTime.Parse(startDate)));
                qParams.Add(SqlParamHelper.Date("@endDate", DateTime.Parse(endDate)));
                cParams.Add(SqlParamHelper.Date("@startDate", DateTime.Parse(startDate)));
                cParams.Add(SqlParamHelper.Date("@endDate", DateTime.Parse(endDate)));
            }

            query += " ORDER BY CreationTime DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";
            qParams.Add(SqlParamHelper.Int("@offset", offset));
            qParams.Add(SqlParamHelper.Int("@limit", limitNum));

            var dataTask = _db.ExecuteQueryAsync(query, qParams.ToArray());
            var countTask = _db.ExecuteQueryAsync(countQuery, cParams.ToArray());
            await Task.WhenAll(dataTask, countTask);

            incomeRecords = dataTask.Result;
            totalCount = countTask.Result.Count > 0
                && countTask.Result[0].TryGetValue("TotalCount", out var tc2) && tc2 != null
                    ? Convert.ToInt32(tc2) : 0;
        }

        var totalPages = totalCount > 0 ? (int)Math.Ceiling((double)totalCount / limitNum) : 0;

        return Ok(new
        {
            data = incomeRecords,
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
    /// POST /api/budget/income
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateIncome([FromBody] CreateIncomeRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to create income for this user" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_InsertIncome",
            SqlParamHelper.VarChar("@Username", req.Username, 17),
            SqlParamHelper.UniqueId("@UserID", req.UserID),
            SqlParamHelper.VarChar("@Description", req.Description, 45),
            SqlParamHelper.Float("@Net", req.Net),
            SqlParamHelper.Float("@Gross", req.Gross),
            SqlParamHelper.Float("@Tithe", req.Tithe),
            SqlParamHelper.VarChar("@TitheStatus", req.TitheStatus, 45),
            SqlParamHelper.VarChar("@Date", req.Date, 45),
            SqlParamHelper.VarChar("@PaycheckStatus", req.PaycheckStatus, 45));

        var row = result.FirstOrDefault();
        var newIncomeId = row?.GetValueOrDefault("NewIncomeID");

        // Auto-create tithe transaction if tithe tracking is enabled
        object? titheTransactionId = null;
        if (req.Tithe.HasValue && req.Tithe.Value > 0)
        {
            try
            {
                var prefs = await _db.ExecuteStoredProcedureAsync("spmb_GetUserPreferences",
                    SqlParamHelper.UniqueId("@UserId", req.UserID));
                var pref = prefs.FirstOrDefault();
                var titheEnabled = pref != null
                    && pref.TryGetValue("TitheTrackingEnabled", out var te)
                    && Convert.ToBoolean(te);

                if (titheEnabled)
                {
                    var groupings = await _db.ExecuteQueryAsync(
                        "SELECT GroupingID FROM Groupings WHERE UserID = @UserID AND GroupingName = N'Tithe' AND IsSystem = 1 AND IsActive = 1",
                        SqlParamHelper.UniqueId("@UserID", req.UserID));

                    var titheGrouping = groupings.FirstOrDefault();
                    if (titheGrouping != null && titheGrouping.TryGetValue("GroupingID", out var gid))
                    {
                        var titheResult = await _db.ExecuteStoredProcedureAsync("spmb_InsertTransaction",
                            SqlParamHelper.UniqueId("@UserID", req.UserID),
                            SqlParamHelper.VarChar("@Username", req.Username, 17),
                            SqlParamHelper.VarChar("@Name", $"Tithe - {req.Description ?? "Income"}", 150),
                            SqlParamHelper.Float("@Amount", req.Tithe.Value),
                            SqlParamHelper.DateTime("@Due", null),
                            SqlParamHelper.DateTime("@Date", string.IsNullOrEmpty(req.Date) ? DateTime.Now : DateTime.Parse(req.Date)),
                            SqlParamHelper.VarChar("@Notes", $"AUTO_TITHE:{newIncomeId}", 60),
                            SqlParamHelper.VarChar("@Category", "Tithe", 50),
                            SqlParamHelper.VarChar("@Status", req.TitheStatus ?? "Pending", 20),
                            SqlParamHelper.UniqueId("@GroupingID", Guid.Parse(gid!.ToString()!)),
                            SqlParamHelper.UniqueId("@CategoryID", null));

                        titheTransactionId = titheResult.FirstOrDefault()?.GetValueOrDefault("NewTransactionId");
                        _logger.LogInformation("Auto-created tithe transaction for income {IncomeId}", newIncomeId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to auto-create tithe transaction");
            }
        }

        return StatusCode(201, new
        {
            success = true,
            message = "Income record created successfully",
            incomeId = newIncomeId,
            titheTransactionId
        });
    }

    /// <summary>
    /// POST /api/budget/income/copy-from-last-month
    /// </summary>
    [HttpPost("copy-from-last-month")]
    public async Task<IActionResult> CopyFromLastMonth([FromBody] CopyIncomeRequest req)
    {
        if (req.UserId != GetUserId())
            return StatusCode(403, new { success = false, message = "Access denied" });

        var now = DateTime.Now;
        var lastMonth = new DateTime(now.Year, now.Month, 1).AddMonths(-1);
        var lastMonthEnd = new DateTime(now.Year, now.Month, 1).AddDays(-1);

        var allIncome = await _db.ExecuteStoredProcedureAsync("spmb_GetIncomeByUserID",
            SqlParamHelper.UniqueId("@UserId", req.UserId));

        var filtered = allIncome.Where(inc =>
        {
            var dateStr = inc.TryGetValue("Date", out var d) ? d?.ToString() : null;
            var creationTime = inc.TryGetValue("CreationTime", out var ct) ? ct : null;
            DateTime incDate;
            if (!string.IsNullOrEmpty(dateStr) && DateTime.TryParse(dateStr, out var parsed))
                incDate = parsed;
            else if (creationTime is DateTime ct2)
                incDate = ct2;
            else
                return false;
            return incDate >= lastMonth && incDate <= lastMonthEnd;
        }).ToList();

        var copied = new List<object>();
        var username = User.FindFirst("Username")?.Value ?? "";

        foreach (var income in filtered)
        {
            var dateStr = income.TryGetValue("Date", out var d) ? d?.ToString() : null;
            var creationTime = income.TryGetValue("CreationTime", out var ct) ? ct : null;
            DateTime originalDate;
            if (!string.IsNullOrEmpty(dateStr) && DateTime.TryParse(dateStr, out var parsed))
                originalDate = parsed;
            else if (creationTime is DateTime ct2)
                originalDate = ct2;
            else
                continue;

            var dayOfMonth = originalDate.Day;
            var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
            var newDate = new DateTime(now.Year, now.Month, Math.Min(dayOfMonth, daysInMonth));

            await _db.ExecuteStoredProcedureAsync("spmb_InsertIncome",
                SqlParamHelper.VarChar("@Username", username, 17),
                SqlParamHelper.UniqueId("@UserID", req.UserId),
                SqlParamHelper.VarChar("@Description", income.GetValueOrDefault("Description")?.ToString(), 45),
                SqlParamHelper.Float("@Net", income.TryGetValue("Net", out var n) && n != null ? Convert.ToDouble(n) : null),
                SqlParamHelper.Float("@Gross", income.TryGetValue("Gross", out var g) && g != null ? Convert.ToDouble(g) : null),
                SqlParamHelper.Float("@Tithe", income.TryGetValue("Tithe", out var t) && t != null ? Convert.ToDouble(t) : null),
                SqlParamHelper.VarChar("@TitheStatus", "Pending", 45),
                SqlParamHelper.VarChar("@Date", newDate.ToString("o"), 45),
                SqlParamHelper.VarChar("@PaycheckStatus", income.GetValueOrDefault("PaycheckStatus")?.ToString(), 45));

            copied.Add(income);
        }

        return Ok(new
        {
            success = true,
            message = $"Copied {copied.Count} income records",
            count = copied.Count,
            copied
        });
    }

    /// <summary>
    /// PUT /api/budget/income/{incomeId}
    /// </summary>
    [HttpPut("{incomeId:guid}")]
    public async Task<IActionResult> UpdateIncome(Guid incomeId, [FromBody] UpdateIncomeRequest req)
    {
        if (req.UserID != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to update this income record" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateIncome",
            SqlParamHelper.UniqueId("@IncomeId", incomeId),
            SqlParamHelper.UniqueId("@UserID", req.UserID),
            SqlParamHelper.VarChar("@Description", req.Description, 45),
            SqlParamHelper.Float("@Gross", req.Gross),
            SqlParamHelper.Float("@Net", req.Net),
            SqlParamHelper.Float("@Tithe", req.Tithe),
            SqlParamHelper.VarChar("@Date", req.Date, 45),
            SqlParamHelper.VarChar("@PaycheckStatus", req.PaycheckStatus, 45),
            SqlParamHelper.VarChar("@TitheStatus", req.TitheStatus, 45),
            SqlParamHelper.NVarCharMax("@Notes", req.Notes));

        var row = result.FirstOrDefault();
        var success = row != null && row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row?.TryGetValue("Message", out var m) == true ? m?.ToString() : "";

        if (!success)
            return BadRequest(new { success = false, error = string.IsNullOrEmpty(message) ? "Failed to update income record" : message });

        // Auto-update or create paired tithe transaction (best-effort)
        try
        {
            var prefs = await _db.ExecuteStoredProcedureAsync("spmb_GetUserPreferences",
                SqlParamHelper.UniqueId("@UserId", req.UserID));
            var pref = prefs.FirstOrDefault();
            var titheEnabled = pref != null && pref.TryGetValue("TitheTrackingEnabled", out var te) && Convert.ToBoolean(te);

            if (titheEnabled)
            {
                var existing = await _db.ExecuteQueryAsync(
                    "SELECT TransactionId FROM Transactions WHERE UserID = @UserID AND Notes = @Notes",
                    SqlParamHelper.UniqueId("@UserID", req.UserID),
                    SqlParamHelper.VarChar("@Notes", $"AUTO_TITHE:{incomeId}", 60));

                var titheAmount = req.Tithe;

                if (existing.Count > 0 && titheAmount.HasValue)
                {
                    var txnId = existing[0]["TransactionId"];
                    if (titheAmount.Value > 0)
                    {
                        await _db.ExecuteQueryAsync(
                            "UPDATE Transactions SET Name = @Name, Amount = @Amount, Date = @Date, Status = @Status, LastEdit = GETDATE() WHERE TransactionId = @TxnId AND UserID = @UserID",
                            SqlParamHelper.VarChar("@Name", $"Tithe - {req.Description ?? "Income"}", 150),
                            SqlParamHelper.Float("@Amount", titheAmount.Value),
                            SqlParamHelper.DateTime("@Date", string.IsNullOrEmpty(req.Date) ? null : DateTime.Parse(req.Date)),
                            SqlParamHelper.VarChar("@Status", req.TitheStatus ?? "Pending", 20),
                            SqlParamHelper.UniqueId("@TxnId", Guid.Parse(txnId!.ToString()!)),
                            SqlParamHelper.UniqueId("@UserID", req.UserID));
                    }
                    else
                    {
                        await _db.ExecuteStoredProcedureAsync("spmb_DeleteTransaction",
                            SqlParamHelper.UniqueId("@TransactionId", Guid.Parse(txnId!.ToString()!)),
                            SqlParamHelper.UniqueId("@UserID", req.UserID));
                    }
                }
                else if (existing.Count == 0 && titheAmount.HasValue && titheAmount.Value > 0)
                {
                    var groupings = await _db.ExecuteQueryAsync(
                        "SELECT GroupingID FROM Groupings WHERE UserID = @UserID AND GroupingName = N'Tithe' AND IsSystem = 1 AND IsActive = 1",
                        SqlParamHelper.UniqueId("@UserID", req.UserID));
                    var titheGrouping = groupings.FirstOrDefault();
                    if (titheGrouping != null && titheGrouping.TryGetValue("GroupingID", out var gid))
                    {
                        var username = User.FindFirst("Username")?.Value ?? "";
                        await _db.ExecuteStoredProcedureAsync("spmb_InsertTransaction",
                            SqlParamHelper.UniqueId("@UserID", req.UserID),
                            SqlParamHelper.VarChar("@Username", username, 17),
                            SqlParamHelper.VarChar("@Name", $"Tithe - {req.Description ?? "Income"}", 150),
                            SqlParamHelper.Float("@Amount", titheAmount.Value),
                            SqlParamHelper.DateTime("@Due", null),
                            SqlParamHelper.DateTime("@Date", string.IsNullOrEmpty(req.Date) ? DateTime.Now : DateTime.Parse(req.Date)),
                            SqlParamHelper.VarChar("@Notes", $"AUTO_TITHE:{incomeId}", 60),
                            SqlParamHelper.VarChar("@Category", "Tithe", 50),
                            SqlParamHelper.VarChar("@Status", req.TitheStatus ?? "Pending", 20),
                            SqlParamHelper.UniqueId("@GroupingID", Guid.Parse(gid!.ToString()!)),
                            SqlParamHelper.UniqueId("@CategoryID", null));
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to sync tithe transaction on income update");
        }

        return Ok(new { success = true, message = "Income record updated successfully" });
    }

    /// <summary>
    /// DELETE /api/budget/income/{incomeId}
    /// </summary>
    [HttpDelete("{incomeId:guid}")]
    public async Task<IActionResult> DeleteIncome(Guid incomeId, [FromQuery] Guid? userId)
    {
        var uid = userId ?? GetUserId();
        if (uid != GetUserId())
            return StatusCode(403, new { success = false, error = "Not authorized to delete this income record" });

        var result = await _db.ExecuteStoredProcedureAsync("spmb_DeleteIncome",
            SqlParamHelper.UniqueId("@IncomeId", incomeId),
            SqlParamHelper.UniqueId("@UserID", uid));

        var row = result.FirstOrDefault();
        if (row == null)
            return StatusCode(500, new { success = false, error = "No response from delete operation" });

        var success = row.TryGetValue("Success", out var s) && Convert.ToBoolean(s);
        var message = row.TryGetValue("Message", out var m) ? m?.ToString() : "";

        if (!success)
            return BadRequest(new { success = false, error = string.IsNullOrEmpty(message) ? "Failed to delete income record" : message });

        // Cleanup auto-created tithe transaction (best-effort)
        try
        {
            var titheResult = await _db.ExecuteQueryAsync(
                "SELECT TransactionId FROM Transactions WHERE UserID = @UserID AND Notes = @Notes",
                SqlParamHelper.UniqueId("@UserID", uid),
                SqlParamHelper.VarChar("@Notes", $"AUTO_TITHE:{incomeId}", 60));

            if (titheResult.Count > 0)
            {
                var txnId = titheResult[0]["TransactionId"];
                await _db.ExecuteStoredProcedureAsync("spmb_DeleteTransaction",
                    SqlParamHelper.UniqueId("@TransactionId", Guid.Parse(txnId!.ToString()!)),
                    SqlParamHelper.UniqueId("@UserID", uid));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cleanup tithe transaction on income delete");
        }

        return Ok(new { success = true, message = string.IsNullOrEmpty(message) ? "Income record deleted successfully" : message });
    }
}
