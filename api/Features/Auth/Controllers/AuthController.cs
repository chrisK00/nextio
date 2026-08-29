using Microsoft.AspNetCore.Mvc;
using Models;
using Services;

namespace Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(IUserService userService, JwtService jwtService) : ControllerBase
    {
        private readonly IUserService _userService = userService;
        private readonly JwtService _jwtService = jwtService;

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            var existing = await _userService.GetByUsernameAsync(req.Username);
            if (existing is not null)
                return Conflict(new { error = "User already exists" });

            var user = await _userService.CreateAsync(req.Username, req.Password);
            var token = _jwtService.CreateToken(user.Id.ToString(), user.Username);
            var refresh = await _userService.CreateRefreshTokenAsync(user.Id);

            SetRefreshTokenCookie(refresh.Token, refresh.ExpiresAt);

            var returnRefresh = Request.Headers.TryGetValue("X-Return-RefreshToken", out var rv) && string.Equals(rv.ToString(), "true", StringComparison.OrdinalIgnoreCase);
            return Ok(new AuthResponse(token, (long)TimeSpan.FromHours(1).TotalSeconds, returnRefresh ? refresh.Token : null));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest req)
        {
            var valid = await _userService.ValidateCredentialsAsync(req.Username, req.Password);
            if (!valid) return Unauthorized(new { error = "Invalid credentials" });

            var user = await _userService.GetByUsernameAsync(req.Username);
            if (user is null) return Unauthorized();

            var token = _jwtService.CreateToken(user.Id.ToString(), user.Username);
            var refresh = await _userService.CreateRefreshTokenAsync(user.Id);

            SetRefreshTokenCookie(refresh.Token, refresh.ExpiresAt);

            var returnRefreshLogin = Request.Headers.TryGetValue("X-Return-RefreshToken", out var lrv) && string.Equals(lrv.ToString(), "true", StringComparison.OrdinalIgnoreCase);
            return Ok(new AuthResponse(token, (long)TimeSpan.FromHours(1).TotalSeconds, returnRefreshLogin ? refresh.Token : null));
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var refreshToken = Request.Cookies["refreshToken"] ?? (await HttpContext.Request.ReadFromJsonAsync<RefreshRequest>())?.RefreshToken;
            if (string.IsNullOrEmpty(refreshToken)) return Unauthorized();

            var (user, newRefresh) = await _userService.RotateRefreshTokenAsync(refreshToken);
            if (user is null || newRefresh is null) return Unauthorized();

            SetRefreshTokenCookie(newRefresh.Token, newRefresh.ExpiresAt);

            var newAccess = _jwtService.CreateToken(user.Id.ToString(), user.Username);
            var returnRefreshRefresh = Request.Headers.TryGetValue("X-Return-RefreshToken", out var rrv) && string.Equals(rrv.ToString(), "true", StringComparison.OrdinalIgnoreCase);
            return Ok(new AuthResponse(newAccess, (long)TimeSpan.FromHours(1).TotalSeconds, returnRefreshRefresh ? newRefresh.Token : null));
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (!string.IsNullOrEmpty(refreshToken))
            {
                await _userService.RevokeRefreshTokenAsync(refreshToken);
            }

            Response.Cookies.Delete("refreshToken");
            return Ok();
        }

        private void SetRefreshTokenCookie(string token, DateTime expires)
        {
            Response.Cookies.Append("refreshToken", token, new Microsoft.AspNetCore.Http.CookieOptions
            {
                HttpOnly = true,
                Expires = expires,
                SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax,
                Secure = false // set true in production over HTTPS
            });
        }
    }

    record RefreshRequest(string RefreshToken);
}
