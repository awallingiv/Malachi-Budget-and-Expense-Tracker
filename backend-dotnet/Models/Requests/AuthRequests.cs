using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactBudget.Api.Models.Requests;

public class LoginRequest
{
    [Required(ErrorMessage = "Username or email required")]
    [JsonPropertyName("usernameOrEmail")]
    public string UsernameOrEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password required")]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    [Required]
    [StringLength(17, MinimumLength = 1, ErrorMessage = "Username must be 1-17 characters")]
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(45)]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [StringLength(25)]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("enableTitheTracking")]
    public bool? EnableTitheTracking { get; set; }
}

public class ValidateRequest
{
    [Required(ErrorMessage = "Username or email required")]
    [JsonPropertyName("usernameOrEmail")]
    public string UsernameOrEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password required")]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Valid validation code required")]
    [JsonPropertyName("validationCode")]
    public Guid ValidationCode { get; set; }
}

public class ForgotPasswordRequest
{
    [Required(ErrorMessage = "Username or email required")]
    [JsonPropertyName("usernameOrEmail")]
    public string UsernameOrEmail { get; set; } = string.Empty;
}

public class ResetPasswordLinkRequest
{
    [Required]
    [EmailAddress]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("code")]
    public Guid Code { get; set; }

    [Required]
    [MinLength(8, ErrorMessage = "New password must be at least 8 characters")]
    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}
