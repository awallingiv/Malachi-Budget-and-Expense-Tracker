namespace ReactBudget.Api.Configuration;

public class DatabaseSettings
{
    public string Server { get; set; } = "localhost";
    public string Database { get; set; } = "MalachiBudget";
    public string? User { get; set; }
    public string? Password { get; set; }
    public bool Encrypt { get; set; }
    public bool TrustServerCertificate { get; set; } = true;

    public string ConnectionString
    {
        get
        {
            var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder
            {
                DataSource = Server,
                InitialCatalog = Database,
                Encrypt = Encrypt,
                TrustServerCertificate = TrustServerCertificate,
                ConnectTimeout = 15,
                CommandTimeout = 30,
                MaxPoolSize = 10,
                MinPoolSize = 0
            };

            if (!string.IsNullOrEmpty(User) && !string.IsNullOrEmpty(Password))
            {
                builder.UserID = User;
                builder.Password = Password;
            }
            else
            {
                builder.IntegratedSecurity = true;
            }

            return builder.ConnectionString;
        }
    }
}
