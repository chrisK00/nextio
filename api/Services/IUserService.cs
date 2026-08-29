using Models;

namespace Services
{
    public interface IUserService
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<User> CreateAsync(string username, string password);
        Task<bool> ValidateCredentialsAsync(string username, string password);
        Task<RefreshToken> CreateRefreshTokenAsync(Guid userId);
        Task<(User? User, RefreshToken? NewToken)> RotateRefreshTokenAsync(string token);
        Task RevokeRefreshTokenAsync(string token);
    }
}
