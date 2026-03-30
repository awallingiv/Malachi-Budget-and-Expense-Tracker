using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactBudget.Api.Models.Requests;
using ReactBudget.Api.Services;

namespace ReactBudget.Api.Controllers;

[ApiController]
[Route("api/preferences")]
[Authorize]
public class PreferencesController : ControllerBase
{
    private readonly IDatabaseService _db;

    public PreferencesController(IDatabaseService db) => _db = db;

    /// <summary>
    /// GET /api/preferences/{userId}
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetPreferences(Guid userId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_GetUserPreferences",
            SqlParamHelper.UniqueId("@UserId", userId));

        if (result.Count == 0)
            return NotFound(new { message = "User preferences not found" });

        var preferences = result[0];
        ParseJsonFields(preferences);

        return Ok(preferences);
    }

    /// <summary>
    /// PUT /api/preferences/{userId}
    /// </summary>
    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> UpdatePreferences(Guid userId, [FromBody] UpdatePreferencesRequest req)
    {
        // Get username from JWT for tithe grouping
        var username = User.FindFirst("username")?.Value ?? User.FindFirst("Username")?.Value;

        // If enabling tithe tracking, ensure the Tithe grouping exists
        if (req.TitheTrackingEnabled == true)
        {
            try
            {
                await _db.ExecuteStoredProcedureAsync("spmb_EnsureTitheGrouping",
                    SqlParamHelper.UniqueId("@UserID", userId),
                    SqlParamHelper.VarChar("@Username", username, 17));
            }
            catch
            {
                // Don't block the preferences update
            }
        }

        string? lastIncomeTemplateJson = req.LastIncomeTemplate.HasValue
            ? req.LastIncomeTemplate.Value.GetRawText()
            : null;
        string? merchantDefaultsJson = req.MerchantDefaults.HasValue
            ? req.MerchantDefaults.Value.GetRawText()
            : null;
        string? widgetVisibilityJson = req.WidgetVisibility.HasValue
            ? req.WidgetVisibility.Value.GetRawText()
            : null;

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateUserPreferences",
            SqlParamHelper.UniqueId("@UserId", userId),
            SqlParamHelper.VarChar("@LastExpenseCategory", req.LastExpenseCategory, 50),
            SqlParamHelper.NVarCharMax("@LastIncomeTemplate", lastIncomeTemplateJson),
            SqlParamHelper.Float("@CustomTithePercentage", req.CustomTithePercentage),
            SqlParamHelper.Bit("@TitheTrackingEnabled", req.TitheTrackingEnabled),
            SqlParamHelper.NVarCharMax("@MerchantDefaults", merchantDefaultsJson),
            SqlParamHelper.VarChar("@Theme", req.Theme, 20),
            SqlParamHelper.VarChar("@DefaultCurrency", req.DefaultCurrency, 10),
            SqlParamHelper.VarChar("@ThemePreset", req.ThemePreset, 30),
            SqlParamHelper.VarChar("@BackgroundPreset", req.BackgroundPreset, 30),
            SqlParamHelper.NVarCharMax("@WidgetVisibility", widgetVisibilityJson));

        if (result.Count == 0)
            return NotFound(new { message = "Failed to update preferences" });

        var preferences = result[0];
        ParseJsonFields(preferences);

        return Ok(preferences);
    }

    /// <summary>
    /// PUT /api/preferences/{userId}/last-expense-category
    /// </summary>
    [HttpPut("{userId:guid}/last-expense-category")]
    public async Task<IActionResult> UpdateLastExpenseCategory(Guid userId, [FromBody] UpdateLastExpenseCategoryRequest req)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateLastExpenseCategory",
            SqlParamHelper.UniqueId("@UserId", userId),
            SqlParamHelper.VarChar("@CategoryName", req.Category, 50));

        var preferences = result.FirstOrDefault();
        if (preferences != null)
            ParseJsonFields(preferences);

        return Ok(preferences);
    }

    /// <summary>
    /// PUT /api/preferences/{userId}/last-income-template
    /// </summary>
    [HttpPut("{userId:guid}/last-income-template")]
    public async Task<IActionResult> UpdateLastIncomeTemplate(Guid userId, [FromBody] UpdateLastIncomeTemplateRequest req)
    {
        string templateJson = req.Template.ValueKind != JsonValueKind.Undefined
            ? req.Template.GetRawText()
            : "{}";

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateLastIncomeTemplate",
            SqlParamHelper.UniqueId("@UserId", userId),
            SqlParamHelper.NVarCharMax("@TemplateJson", templateJson));

        var preferences = result.FirstOrDefault();
        if (preferences != null)
            ParseJsonFields(preferences);

        return Ok(preferences);
    }

    /// <summary>
    /// PUT /api/preferences/{userId}/merchant-defaults
    /// </summary>
    [HttpPut("{userId:guid}/merchant-defaults")]
    public async Task<IActionResult> UpdateMerchantDefaults(Guid userId, [FromBody] UpdateMerchantDefaultsRequest req)
    {
        string defaultsJson = req.MerchantDefaults.ValueKind != JsonValueKind.Undefined
            ? req.MerchantDefaults.GetRawText()
            : "{}";

        var result = await _db.ExecuteStoredProcedureAsync("spmb_UpdateMerchantDefaults",
            SqlParamHelper.UniqueId("@UserId", userId),
            SqlParamHelper.NVarCharMax("@MerchantDefaultsJson", defaultsJson));

        var preferences = result.FirstOrDefault();
        if (preferences != null)
            ParseJsonFields(preferences);

        return Ok(preferences);
    }

    /// <summary>
    /// POST /api/preferences/{userId}/reset
    /// </summary>
    [HttpPost("{userId:guid}/reset")]
    public async Task<IActionResult> ResetPreferences(Guid userId)
    {
        var result = await _db.ExecuteStoredProcedureAsync("spmb_ResetUserPreferences",
            SqlParamHelper.UniqueId("@UserId", userId));

        var preferences = result.FirstOrDefault();
        if (preferences != null)
            ParseJsonFields(preferences);

        return Ok(preferences);
    }

    /// <summary>
    /// Parses JSON string fields into deserialized objects in-place.
    /// </summary>
    private static void ParseJsonFields(Dictionary<string, object?> row)
    {
        TryParseJsonField(row, "LastIncomeTemplate");
        TryParseJsonField(row, "MerchantDefaults", fallback: new Dictionary<string, object>());
        TryParseJsonField(row, "WidgetVisibility");
    }

    private static void TryParseJsonField(Dictionary<string, object?> row, string key, object? fallback = null)
    {
        if (row.TryGetValue(key, out var val) && val is string json && !string.IsNullOrEmpty(json))
        {
            try
            {
                row[key] = JsonSerializer.Deserialize<object>(json);
            }
            catch
            {
                row[key] = fallback;
            }
        }
        else if (row.ContainsKey(key))
        {
            row[key] = fallback;
        }
    }
}
