using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateCategoryRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [Required]
    [JsonPropertyName("groupingId")]
    public Guid GroupingId { get; set; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    [JsonPropertyName("categoryName")]
    public string CategoryName { get; set; } = string.Empty;

    [JsonPropertyName("displayOrder")]
    public int? DisplayOrder { get; set; }

    [StringLength(20)]
    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [StringLength(50)]
    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}

public class UpdateCategoryRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [StringLength(50)]
    [JsonPropertyName("categoryName")]
    public string? CategoryName { get; set; }

    [JsonPropertyName("groupingId")]
    public Guid? GroupingId { get; set; }

    [JsonPropertyName("displayOrder")]
    public int? DisplayOrder { get; set; }

    [StringLength(20)]
    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [StringLength(50)]
    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}

public class DeleteCategoryRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}
