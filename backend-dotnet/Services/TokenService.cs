using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ReactBudget.Api.Configuration;
using Microsoft.Extensions.Options;

namespace ReactBudget.Api.Services;

public interface ITokenService
{
    string GenerateToken(Guid userId);
}

public class TokenService : ITokenService
{
    private readonly JwtSettings _settings;

    public TokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public string GenerateToken(Guid userId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Match Node.js JWT payload: { userId: "guid-string" }
        var claims = new[]
        {
            new Claim("userId", userId.ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: System.DateTime.UtcNow.AddHours(_settings.ExpiresInHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
