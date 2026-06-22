namespace Features.Library.Services;

public sealed class LibrarySyncWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<LibrarySyncWorker> logger) : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory;
    private readonly ILogger<LibrarySyncWorker> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(8));
        do
        {
            await RunSyncAsync(stoppingToken);
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunSyncAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var syncService = scope.ServiceProvider.GetRequiredService<ILibrarySyncService>();
            var result = await syncService.SyncAllAsync(cancellationToken);
            _logger.LogInformation("Library sync completed. Total: {Total}, Succeeded: {Succeeded}, Failed: {Failed}", result.Total, result.Succeeded, result.Failed);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Library sync worker failed.");
        }
    }
}
