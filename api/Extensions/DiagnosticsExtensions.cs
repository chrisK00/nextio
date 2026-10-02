using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace nextio.Api.Extensions;

public static class DiagnosticsExtensions
{
    public static bool HasDiagnosticsAccess(this ClaimsPrincipal user, IConfiguration configuration)
    {
        var password = configuration["Diagnostics:AdminPassword"];
        if (string.IsNullOrWhiteSpace(password) || !string.Equals(user.FindFirstValue("diagnostics"), "true", StringComparison.Ordinal)) return false;
        var expected = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(user.FindFirstValue("diagnostics_key") ?? string.Empty));
    }
}
