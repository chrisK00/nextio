using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Data;
using Models;
using Microsoft.AspNetCore.Identity;

namespace Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UserService(ApplicationDbContext db, IPasswordHasher<User> passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
    }

    public async Task<User> CreateAsync(string username, string password)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task<bool> ValidateCredentialsAsync(string username, string password)
    {
        var user = await GetByUsernameAsync(username);
        if (user is null) return false;
        var res = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return res == PasswordVerificationResult.Success || res == PasswordVerificationResult.SuccessRehashNeeded;
    }

    public async Task<RefreshToken> CreateRefreshTokenAsync(Guid userId)
    {
        await CleanupOldTokensAsync(userId);

        var tokenString = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var created = DateTime.UtcNow;
        var expires = created.AddDays(7);

        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = tokenString,
            CreatedAt = created,
            ExpiresAt = expires
        };

        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync();
        return token;
    }

    public async Task<(User? User, RefreshToken? NewToken)> RotateRefreshTokenAsync(string token)
    {
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token && !r.IsRevoked && r.ExpiresAt > DateTime.UtcNow);
        if (stored is null) return (null, null);

        var user = await _db.Users.FindAsync(stored.UserId);
        if (user is null) return (null, null);

        stored.IsRevoked = true;

        var tokenString = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var created = DateTime.UtcNow;
        var expires = created.AddDays(7);

        var newToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = tokenString,
            CreatedAt = created,
            ExpiresAt = expires,
            ReplacedByToken = null
        };

        _db.RefreshTokens.Add(newToken);
        await _db.SaveChangesAsync();

        return (user, newToken);
    }

    public async Task RevokeRefreshTokenAsync(string token)
    {
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token);
        if (stored is not null)
        {
            stored.IsRevoked = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<DateTime?> GetLastLibraryExportAtAsync(Guid userId)
    {
        return await _db.Users.Where(u => u.Id == userId).Select(u => u.LastLibraryExportAt).FirstOrDefaultAsync();
    }

    public async Task RecordLibraryExportAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return;
        user.LastLibraryExportAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task CleanupOldTokensAsync(Guid userId)
    {
        var cutoff = DateTime.UtcNow.AddDays(-14);
        var oldTokens = await _db.RefreshTokens
            .Where(r => r.UserId == userId && (r.IsRevoked || r.ExpiresAt < cutoff))
            .ToListAsync();

        if (oldTokens.Count != 0)
        {
            _db.RefreshTokens.RemoveRange(oldTokens);
        }
    }
}
