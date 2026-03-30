using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateCategoryWindowRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [Required]
    [StringLength(17)]
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    [JsonPropertyName("categoryName")]
    public string CategoryName { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [StringLength(255)]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [StringLength(20)]
    [JsonPropertyName("colorTheme")]
    public string? ColorTheme { get; set; }

    [JsonPropertyName("positionX")]
    public int? PositionX { get; set; }

    [JsonPropertyName("positionY")]
    public int? PositionY { get; set; }

    [JsonPropertyName("width")]
    public int? Width { get; set; }

    [JsonPropertyName("height")]
    public int? Height { get; set; }

    [StringLength(20)]
    [JsonPropertyName("tableName")]
    public string? TableName { get; set; }
}

public class UpdateCategoryWindowRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [StringLength(100)]
    [JsonPropertyName("displayName")]
    public string? DisplayName { get; set; }

    [StringLength(255)]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [StringLength(20)]
    [JsonPropertyName("colorTheme")]
    public string? ColorTheme { get; set; }

    [JsonPropertyName("positionX")]
    public int? PositionX { get; set; }

    [JsonPropertyName("positionY")]
    public int? PositionY { get; set; }

    [JsonPropertyName("width")]
    public int? Width { get; set; }

    [JsonPropertyName("height")]
    public int? Height { get; set; }

    [JsonPropertyName("isMinimized")]
    public bool? IsMinimized { get; set; }

    [JsonPropertyName("zIndex")]
    public int? ZIndex { get; set; }

    [StringLength(20)]
    [JsonPropertyName("tableName")]
    public string? TableName { get; set; }
}

public class DeleteCategoryWindowRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}
