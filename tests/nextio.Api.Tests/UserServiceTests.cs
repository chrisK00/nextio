using Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Models;
using Services;
using Xunit;

namespace nextio.Api.Tests;

public class UserServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ApplicationDbContext _db;
    private readonly PasswordHasher<User> _hasher;
    private readonly UserService _userService;

    public UserServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new ApplicationDbContext(options);
        _db.Database.EnsureCreated();

        _hasher = new PasswordHasher<User>();
        _userService = new UserService(_db, _hasher);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateUserWithHashedPassword()
    {
        var user = await _userService.CreateAsync("testuser", "Password123!");

        Assert.NotNull(user);
        Assert.Equal("testuser", user.Username);
        Assert.False(string.IsNullOrWhiteSpace(user.PasswordHash));

        var savedUser = await _db.Users.FirstOrDefaultAsync(u => u.Username == "testuser");
        Assert.NotNull(savedUser);
        Assert.Equal(user.Id, savedUser.Id);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ShouldReturnTrueForValidCredentials()
    {
        await _userService.CreateAsync("validuser", "SecretPass!123");

        var isValid = await _userService.ValidateCredentialsAsync("validuser", "SecretPass!123");
        var isInvalidPassword = await _userService.ValidateCredentialsAsync("validuser", "WrongPassword");
        var isNonExistentUser = await _userService.ValidateCredentialsAsync("ghost", "SecretPass!123");

        Assert.True(isValid);
        Assert.False(isInvalidPassword);
        Assert.False(isNonExistentUser);
    }

    [Fact]
    public async Task RefreshToken_Lifecycle_CreateRotateRevoke()
    {
        var user = await _userService.CreateAsync("tokenuser", "Pass!123");

        // 1. Create token
        var token = await _userService.CreateRefreshTokenAsync(user.Id);
        Assert.NotNull(token);
        Assert.Equal(user.Id, token.UserId);
        Assert.False(token.IsRevoked);

        // 2. Rotate token
        var (rotatedUser, newToken) = await _userService.RotateRefreshTokenAsync(token.Token);
        Assert.NotNull(rotatedUser);
        Assert.Equal(user.Id, rotatedUser.Id);
        Assert.NotNull(newToken);
        Assert.NotEqual(token.Token, newToken.Token);

        // Old token should be revoked now
        var oldTokenInDb = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == token.Token);
        Assert.True(oldTokenInDb?.IsRevoked);

        // 3. Revoke new token
        await _userService.RevokeRefreshTokenAsync(newToken.Token);
        var revokedTokenInDb = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == newToken.Token);
        Assert.True(revokedTokenInDb?.IsRevoked);
    }
}
