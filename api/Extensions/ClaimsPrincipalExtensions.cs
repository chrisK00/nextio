using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var userIdValue = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (Guid.TryParse(userIdValue, out var userId))
        {
            return userId;
        }

        throw new InvalidOperationException("Authenticated user is missing a valid user id claim.");
    }
}
