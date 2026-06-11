namespace Models;

public record AuthRequest(string Username, string Password);

public record RegisterRequest(string Username, string Password);

public record AuthResponse(string Token, long ExpiresInSeconds, string? RefreshToken);
