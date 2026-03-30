using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateTransactionRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [Required]
    [StringLength(17, MinimumLength = 1)]
    [JsonPropertyName("Username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [StringLength(150, MinimumLength = 1)]
    [JsonPropertyName("Name")]
    public string Name { get; set; } = string.Empty;

    [StringLength(150)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [JsonPropertyName("Amount")]
    public double? Amount { get; set; }

    [JsonPropertyName("Due")]
    public DateTime? Due { get; set; }

    [JsonPropertyName("Date")]
    public DateTime? Date { get; set; }

    [StringLength(60)]
    [JsonPropertyName("Notes")]
    public string? Notes { get; set; }

    [StringLength(50)]
    [JsonPropertyName("Category")]
    public string? Category { get; set; }

    [StringLength(20)]
    [JsonPropertyName("Status")]
    public string? Status { get; set; }

    [JsonPropertyName("GroupingID")]
    public Guid? GroupingID { get; set; }

    [JsonPropertyName("CategoryID")]
    public Guid? CategoryID { get; set; }
}

public class UpdateTransactionRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [StringLength(150)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [JsonPropertyName("Amount")]
    public double? Amount { get; set; }

    [JsonPropertyName("Due")]
    public DateTime? Due { get; set; }

    [JsonPropertyName("Date")]
    public DateTime? Date { get; set; }

    [StringLength(60)]
    [JsonPropertyName("Notes")]
    public string? Notes { get; set; }

    [StringLength(20)]
    [JsonPropertyName("Category")]
    public string? Category { get; set; }

    [StringLength(20)]
    [JsonPropertyName("Status")]
    public string? Status { get; set; }

    [JsonPropertyName("GroupingID")]
    public Guid? GroupingID { get; set; }

    [JsonPropertyName("CategoryID")]
    public Guid? CategoryID { get; set; }
}
