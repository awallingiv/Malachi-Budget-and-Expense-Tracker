namespace ReactBudget.Api.Configuration;

public class SmtpSettings
{
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public bool Secure { get; set; }
    public string User { get; set; } = string.Empty;
    public string Pass { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public bool RejectUnauthorized { get; set; } = true;
    public string AppBaseUrl { get; set; } = "https://budget.austinwalling.dev";
}
