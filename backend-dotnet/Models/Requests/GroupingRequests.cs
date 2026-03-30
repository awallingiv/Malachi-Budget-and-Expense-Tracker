using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateGroupingRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    [JsonPropertyName("groupingName")]
    public string GroupingName { get; set; } = string.Empty;

    [JsonPropertyName("displayOrder")]
    public int? DisplayOrder { get; set; }

    [StringLength(20)]
    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [StringLength(50)]
    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}

public class UpdateGroupingRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [StringLength(50)]
    [JsonPropertyName("groupingName")]
    public string? GroupingName { get; set; }

    [JsonPropertyName("displayOrder")]
    public int? DisplayOrder { get; set; }

    [StringLength(20)]
    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [StringLength(50)]
    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}

public class DeleteGroupingRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}
