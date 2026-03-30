using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateBudgetRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [Required]
    [StringLength(17, MinimumLength = 1)]
    [JsonPropertyName("Username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    [JsonPropertyName("CategoryName")]
    public string CategoryName { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("PeriodStart")]
    public DateTime PeriodStart { get; set; }

    [Required]
    [JsonPropertyName("PeriodEnd")]
    public DateTime PeriodEnd { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    [JsonPropertyName("Amount")]
    public double Amount { get; set; }

    [StringLength(10)]
    [JsonPropertyName("Currency")]
    public string? Currency { get; set; }
}

public class UpdateBudgetRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [StringLength(50)]
    [JsonPropertyName("CategoryName")]
    public string? CategoryName { get; set; }

    [JsonPropertyName("PeriodStart")]
    public DateTime? PeriodStart { get; set; }

    [JsonPropertyName("PeriodEnd")]
    public DateTime? PeriodEnd { get; set; }

    [Range(0, double.MaxValue)]
    [JsonPropertyName("Amount")]
    public double? Amount { get; set; }

    [StringLength(10)]
    [JsonPropertyName("Currency")]
    public string? Currency { get; set; }
}

public class DeleteBudgetRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}
