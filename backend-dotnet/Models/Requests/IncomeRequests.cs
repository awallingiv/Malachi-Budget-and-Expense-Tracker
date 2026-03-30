using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateIncomeRequest
{
    [Required]
    [StringLength(17, MinimumLength = 1)]
    [JsonPropertyName("Username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [StringLength(45)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [JsonPropertyName("Net")]
    public double? Net { get; set; }

    [JsonPropertyName("Gross")]
    public double? Gross { get; set; }

    [JsonPropertyName("Tithe")]
    public double? Tithe { get; set; }

    [StringLength(45)]
    [JsonPropertyName("TitheStatus")]
    public string? TitheStatus { get; set; }

    [StringLength(45)]
    [JsonPropertyName("Date")]
    public string? Date { get; set; }

    [StringLength(45)]
    [JsonPropertyName("PaycheckStatus")]
    public string? PaycheckStatus { get; set; }
}

public class UpdateIncomeRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [StringLength(45)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [JsonPropertyName("Gross")]
    public double? Gross { get; set; }

    [JsonPropertyName("Net")]
    public double? Net { get; set; }

    [JsonPropertyName("Tithe")]
    public double? Tithe { get; set; }

    [StringLength(45)]
    [JsonPropertyName("Date")]
    public string? Date { get; set; }

    [StringLength(45)]
    [JsonPropertyName("PaycheckStatus")]
    public string? PaycheckStatus { get; set; }

    [StringLength(45)]
    [JsonPropertyName("TitheStatus")]
    public string? TitheStatus { get; set; }

    [StringLength(500)]
    [JsonPropertyName("Notes")]
    public string? Notes { get; set; }
}

public class CopyIncomeRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}
