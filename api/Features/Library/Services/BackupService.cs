using Microsoft.Data.Sqlite;

namespace nextio.Api.Features.Library.Services;

public interface IBackupService
{
    Task<string> CreateBackupAsync(CancellationToken cancellationToken = default);
    IReadOnlyList<BackupInfo> GetBackups();
}

public sealed record BackupInfo(string FileName, DateTime CreatedAt, long SizeBytes);

public sealed class BackupService(IConfiguration configuration, IWebHostEnvironment environment, ILogger<BackupService> logger) : IBackupService
{
    private const int MaximumBackups = 2;
    private readonly string _databasePath = ResolveDatabasePath(configuration, environment.ContentRootPath);
    private readonly string _backupDirectory = Path.Combine(environment.ContentRootPath, "backups");
    private readonly ILogger<BackupService> _logger = logger;
    private readonly SemaphoreSlim _backupLock = new(1, 1);

    public async Task<string> CreateBackupAsync(CancellationToken cancellationToken = default)
    {
        await _backupLock.WaitAsync(cancellationToken);
        try
        {
            Directory.CreateDirectory(_backupDirectory);
            var destinationPath = Path.Combine(_backupDirectory, $"nextio-{DateTime.UtcNow:yyyyMMdd-HHmmss}.db");
            await using var source = new SqliteConnection($"Data Source={_databasePath}");
            await using var destination = new SqliteConnection($"Data Source={destinationPath}");
            await source.OpenAsync(cancellationToken);
            await destination.OpenAsync(cancellationToken);
            source.BackupDatabase(destination);
            RemoveOldBackups();
            _logger.LogInformation("Created database backup {BackupPath}", destinationPath);
            return destinationPath;
        }
        finally
        {
            _backupLock.Release();
        }
    }

    public IReadOnlyList<BackupInfo> GetBackups()
    {
        if (!Directory.Exists(_backupDirectory)) return [];
        return Directory.EnumerateFiles(_backupDirectory, "nextio-*.db")
            .Select(path => new FileInfo(path))
            .OrderByDescending(file => file.CreationTimeUtc)
            .Select(file => new BackupInfo(file.Name, file.CreationTimeUtc, file.Length))
            .ToList();
    }

    private void RemoveOldBackups()
    {
        foreach (var file in GetBackups().Skip(MaximumBackups))
            File.Delete(Path.Combine(_backupDirectory, file.FileName));
    }

    private static string ResolveDatabasePath(IConfiguration configuration, string contentRootPath)
    {
        var builder = new SqliteConnectionStringBuilder(configuration.GetConnectionString("DefaultConnection") ?? "Data Source=nextio.db");
        return Path.GetFullPath(builder.DataSource, contentRootPath);
    }
}
