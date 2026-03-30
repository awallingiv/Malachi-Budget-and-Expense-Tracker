namespace ReactBudget.Api.Configuration;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public int ExpiresInHours { get; set; } = 24;
}
