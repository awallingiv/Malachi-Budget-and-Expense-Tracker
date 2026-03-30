using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class UpdatePreferencesRequest
{
    [StringLength(50)]
    [JsonPropertyName("LastExpenseCategory")]
    public string? LastExpenseCategory { get; set; }

    [JsonPropertyName("LastIncomeTemplate")]
    public JsonElement? LastIncomeTemplate { get; set; }

    [Range(0, 100)]
    [JsonPropertyName("CustomTithePercentage")]
    public double? CustomTithePercentage { get; set; }

    [JsonPropertyName("TitheTrackingEnabled")]
    public bool? TitheTrackingEnabled { get; set; }

    [JsonPropertyName("MerchantDefaults")]
    public JsonElement? MerchantDefaults { get; set; }

    [StringLength(20)]
    [JsonPropertyName("Theme")]
    public string? Theme { get; set; }

    [StringLength(10)]
    [JsonPropertyName("DefaultCurrency")]
    public string? DefaultCurrency { get; set; }

    [StringLength(30)]
    [JsonPropertyName("ThemePreset")]
    public string? ThemePreset { get; set; }

    [StringLength(30)]
    [JsonPropertyName("BackgroundPreset")]
    public string? BackgroundPreset { get; set; }

    [JsonPropertyName("WidgetVisibility")]
    public JsonElement? WidgetVisibility { get; set; }
}

public class UpdateLastExpenseCategoryRequest
{
    [Required]
    [StringLength(50)]
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;
}

public class UpdateLastIncomeTemplateRequest
{
    [Required]
    [JsonPropertyName("template")]
    public JsonElement Template { get; set; }
}

public class UpdateMerchantDefaultsRequest
{
    [Required]
    [JsonPropertyName("merchantDefaults")]
    public JsonElement MerchantDefaults { get; set; }
}
