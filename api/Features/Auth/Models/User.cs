namespace Models;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!; // stored as iterations.salt.hash (base64)
    public DateTime? LastLibraryExportAt { get; set; }
}
