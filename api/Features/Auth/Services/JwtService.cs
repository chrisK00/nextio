using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;

namespace Services;

public class JwtService
{
    private readonly string _key;
    private readonly string _issuer;
    private readonly string _audience;

    public JwtService(IConfiguration config)
    {
        _key = config["Jwt:Key"] ?? throw new ArgumentNullException("Jwt:Key");
        _issuer = config["Jwt:Issuer"] ?? "nextio";
        _audience = config["Jwt:Audience"] ?? "nextio_clients";
    }

    public string CreateToken(string userId, string username, TimeSpan? expires = null, bool diagnostics = false, string? diagnosticsKey = null)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.UniqueName, username)
        };
        if (diagnostics) claims.Add(new Claim("diagnostics", "true"));
        if (diagnostics && diagnosticsKey is not null)
            claims.Add(new Claim("diagnostics_key", Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(diagnosticsKey)))));

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(expires ?? TimeSpan.FromHours(1)),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
