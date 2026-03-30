using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class UpdateUserRequest
{
    [EmailAddress]
    [StringLength(45)]
    [JsonPropertyName("Email")]
    public string? Email { get; set; }

    [StringLength(25)]
    [JsonPropertyName("Name")]
    public string? Name { get; set; }
}

public class UpdatePasswordRequest
{
    [Required]
    [StringLength(16, MinimumLength = 1, ErrorMessage = "Password required (max 16 chars)")]
    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}
