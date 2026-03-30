using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateRecurringRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [Required]
    [StringLength(17, MinimumLength = 1)]
    [JsonPropertyName("Username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("ItemType")]
    public string ItemType { get; set; } = string.Empty; // "expense" | "income"

    [StringLength(150)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [StringLength(50)]
    [JsonPropertyName("TableName")]
    public string? TableName { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    [JsonPropertyName("Amount")]
    public double Amount { get; set; }

    [Required]
    [JsonPropertyName("StartDate")]
    public DateTime StartDate { get; set; }

    [JsonPropertyName("EndDate")]
    public DateTime? EndDate { get; set; }

    [Required]
    [StringLength(20, MinimumLength = 1)]
    [JsonPropertyName("Frequency")]
    public string Frequency { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    [JsonPropertyName("Interval")]
    public int? Interval { get; set; }

    [JsonPropertyName("NextOccurrence")]
    public DateTime? NextOccurrence { get; set; }

    [StringLength(255)]
    [JsonPropertyName("Notes")]
    public string? Notes { get; set; }
}

public class UpdateRecurringRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [StringLength(150)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [StringLength(50)]
    [JsonPropertyName("TableName")]
    public string? TableName { get; set; }

    [Range(0, double.MaxValue)]
    [JsonPropertyName("Amount")]
    public double? Amount { get; set; }

    [JsonPropertyName("StartDate")]
    public DateTime? StartDate { get; set; }

    [JsonPropertyName("EndDate")]
    public DateTime? EndDate { get; set; }

    [StringLength(20)]
    [JsonPropertyName("Frequency")]
    public string? Frequency { get; set; }

    [Range(1, int.MaxValue)]
    [JsonPropertyName("Interval")]
    public int? Interval { get; set; }

    [JsonPropertyName("NextOccurrence")]
    public DateTime? NextOccurrence { get; set; }

    [JsonPropertyName("IsActive")]
    public bool? IsActive { get; set; }

    [StringLength(255)]
    [JsonPropertyName("Notes")]
    public string? Notes { get; set; }
}

public class DeleteRecurringRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}
