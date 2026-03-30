using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using ReactBudget.Api.Configuration;
using Microsoft.Extensions.Options;

namespace ReactBudget.Api.Services;

public interface IEmailService
{
    Task<bool> SendValidationEmailAsync(string email, string validationCode, string username);
    Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string username);
}

public class EmailService : IEmailService
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<SmtpSettings> settings, ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<bool> SendValidationEmailAsync(string email, string validationCode, string username)
    {
        try
        {
            var appBaseUrl = _settings.AppBaseUrl.TrimEnd('/');
            var verificationUrl = $"{appBaseUrl}/verify-email?email={Uri.EscapeDataString(email)}&code={validationCode}";

            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(_settings.From));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = "ReactBudget - Account Validation Required";

            var builder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"">
  <h2 style=""color: #2196F3;"">Welcome to ReactBudget!</h2>
  <p>Hi {System.Net.WebUtility.HtmlEncode(username)},</p>
  <p>Thank you for registering with ReactBudget. To complete your account setup, please verify your email address using the button below:</p>
  <p style=""text-align: center; margin: 24px 0;"">
    <a href=""{verificationUrl}"" style=""display: inline-block; padding: 12px 24px; background-color: #2196F3; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600;"">Verify Email</a>
  </p>
  <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
  <p style=""word-break: break-all;""><a href=""{verificationUrl}"">{verificationUrl}</a></p>
  <p>If you didn't create this account, please ignore this email.</p>
  <hr style=""border: none; border-top: 1px solid #eee; margin: 30px 0;"" />
  <p style=""font-size: 12px; color: #666;"">This email was sent from ReactBudget - Your Personal Finance Management App</p>
</div>",
                TextBody = $@"Welcome to ReactBudget!

Hi {username},

Thank you for registering with ReactBudget.

To complete your account setup, click the link below to verify your email address:

{verificationUrl}

Validation Code: {validationCode}

This code will expire in 15 minutes for security purposes.

If you didn't create this account, please ignore this email."
            };

            message.Body = builder.ToMessageBody();
            return await SendAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send validation email to {Email}", email);
            return false;
        }
    }

    public async Task<bool> SendPasswordResetEmailAsync(string email, string resetToken, string username)
    {
        try
        {
            var appBaseUrl = _settings.AppBaseUrl.TrimEnd('/');
            var resetUrl = $"{appBaseUrl}/reset-password?email={Uri.EscapeDataString(email)}&code={resetToken}";

            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(_settings.From));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = "ReactBudget - Password Reset Request";

            var builder = new BodyBuilder
            {
                HtmlBody = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"">
  <h2 style=""color: #f44336;"">Password Reset Request</h2>
  <p>Hi {System.Net.WebUtility.HtmlEncode(username)},</p>
  <p>We received a request to reset your ReactBudget account password. If you made this request, please reset your password using the button below:</p>
  <p style=""text-align: center; margin: 24px 0;"">
    <a href=""{resetUrl}"" style=""display: inline-block; padding: 12px 24px; background-color: #f44336; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600;"">Reset Password</a>
  </p>
  <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
  <p style=""word-break: break-all;""><a href=""{resetUrl}"">{resetUrl}</a></p>
  <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
  <hr style=""border: none; border-top: 1px solid #eee; margin: 30px 0;"" />
  <p style=""font-size: 12px; color: #666;"">This email was sent from ReactBudget - Your Personal Finance Management App</p>
</div>",
                TextBody = $@"Password Reset Request

Hi {username},

We received a request to reset your ReactBudget account password.

Reset your password using this link:
{resetUrl}

If you didn't request this password reset, please ignore this email."
            };

            message.Body = builder.ToMessageBody();
            return await SendAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            return false;
        }
    }

    private async Task<bool> SendAsync(MimeMessage message)
    {
        using var client = new SmtpClient();
        try
        {
            var secureOption = _settings.Secure ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await client.ConnectAsync(_settings.Host, _settings.Port, secureOption);
            await client.AuthenticateAsync(_settings.User, _settings.Pass);
            await client.SendAsync(message);
            _logger.LogInformation("Email sent successfully to {To}", message.To);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email");
            return false;
        }
        finally
        {
            if (client.IsConnected)
                await client.DisconnectAsync(true);
        }
    }
}
