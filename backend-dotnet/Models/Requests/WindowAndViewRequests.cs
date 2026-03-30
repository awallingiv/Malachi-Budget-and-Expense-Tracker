using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class CreateSavedViewRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    [JsonPropertyName("Name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("FilterConfig")]
    public string FilterConfig { get; set; } = string.Empty;
}

public class UpdateSavedViewRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [StringLength(100)]
    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("FilterConfig")]
    public string? FilterConfig { get; set; }
}

public class DeleteSavedViewRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}

public class CreateWindowRequest
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
    [StringLength(100, MinimumLength = 1)]
    [JsonPropertyName("DisplayName")]
    public string DisplayName { get; set; } = string.Empty;

    [StringLength(255)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [StringLength(20)]
    [JsonPropertyName("ColorTheme")]
    public string? ColorTheme { get; set; }

    [Range(0, int.MaxValue)]
    [JsonPropertyName("PositionX")]
    public int? PositionX { get; set; }

    [Range(0, int.MaxValue)]
    [JsonPropertyName("PositionY")]
    public int? PositionY { get; set; }

    [Range(200, 1200)]
    [JsonPropertyName("Width")]
    public int? Width { get; set; }

    [Range(150, 800)]
    [JsonPropertyName("Height")]
    public int? Height { get; set; }
}

public class UpdateWindowRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [StringLength(100)]
    [JsonPropertyName("DisplayName")]
    public string? DisplayName { get; set; }

    [StringLength(255)]
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [StringLength(20)]
    [JsonPropertyName("ColorTheme")]
    public string? ColorTheme { get; set; }

    [Range(0, int.MaxValue)]
    [JsonPropertyName("PositionX")]
    public int? PositionX { get; set; }

    [Range(0, int.MaxValue)]
    [JsonPropertyName("PositionY")]
    public int? PositionY { get; set; }

    [Range(200, 1200)]
    [JsonPropertyName("Width")]
    public int? Width { get; set; }

    [Range(150, 800)]
    [JsonPropertyName("Height")]
    public int? Height { get; set; }

    [JsonPropertyName("IsMinimized")]
    public bool? IsMinimized { get; set; }

    [Range(0, int.MaxValue)]
    [JsonPropertyName("ZIndex")]
    public int? ZIndex { get; set; }
}

public class DeleteWindowRequest
{
    [Required]
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }
}

public class UpdateWindowPositionsRequest
{
    [Required]
    [JsonPropertyName("UserID")]
    public Guid UserID { get; set; }

    [Required]
    [JsonPropertyName("WindowUpdates")]
    public List<WindowPositionUpdate> WindowUpdates { get; set; } = [];
}

public class WindowPositionUpdate
{
    [Required]
    [JsonPropertyName("windowId")]
    public Guid WindowId { get; set; }

    [Required]
    [JsonPropertyName("positionX")]
    public int PositionX { get; set; }

    [Required]
    [JsonPropertyName("positionY")]
    public int PositionY { get; set; }

    [JsonPropertyName("zIndex")]
    public int? ZIndex { get; set; }
}
