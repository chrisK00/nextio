namespace nextio.Api.Features.Library.Services;

public sealed class BackupWorker(IServiceScopeFactory scopeFactory, ILogger<BackupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                var latest = backupService.GetBackups().FirstOrDefault();
                if (latest is null || latest.CreatedAt <= DateTime.UtcNow.AddDays(-7))
                    await backupService.CreateBackupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Scheduled database backup failed."); }
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
