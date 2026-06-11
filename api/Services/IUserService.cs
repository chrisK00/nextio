using Models;

namespace Services
{
    public interface IUserService
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<User> CreateAsync(string username, string password);
        Task<bool> ValidateCredentialsAsync(string username, string password);
    }
}
