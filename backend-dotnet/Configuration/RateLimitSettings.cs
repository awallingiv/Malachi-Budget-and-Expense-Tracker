namespace ReactBudget.Api.Configuration;

public class RateLimitSettings
{
    public bool Enabled { get; set; } = true;
    public int WindowMs { get; set; } = 900000; // 15 minutes
    public int MaxRequests { get; set; } = 300;
}
