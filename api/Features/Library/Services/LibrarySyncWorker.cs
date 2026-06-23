namespace Features.Library.Services;

public sealed class LibrarySyncWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<LibrarySyncWorker> logger) : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory;
    private readonly ILogger<LibrarySyncWorker> _logger = logger;
    private static readonly TimeSpan EveningWindow = TimeSpan.FromHours(9);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while(!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunSyncAsync(stoppingToken);
            }
            catch(OperationCanceledException) when(stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch(Exception ex)
            {
                _logger.LogError(ex, "Library sync worker failed.");
            }

            var delay = GetDelayUntilNextRun(DateTimeOffset.Now);
            _logger.LogInformation("Next library sync scheduled at {NextRun}", DateTimeOffset.Now.Add(delay).ToLocalTime());
            await Task.Delay(delay, stoppingToken);
        }
    }

    private static TimeSpan GetDelayUntilNextRun(DateTimeOffset now)
    {
        var localNow = now.ToLocalTime();
        var next001 = GetNext001(localNow);
        var timeUntil001 = next001 - localNow;
        var baseRun = timeUntil001 <= EveningWindow ? next001 : localNow.AddHours(8);

        var jitter = TimeSpan.FromMinutes(Random.Shared.Next(0, 5)) + TimeSpan.FromSeconds(Random.Shared.Next(0, 60));
        var target = baseRun + jitter;
        return target - localNow;
    }

    private static DateTimeOffset GetNext001(DateTimeOffset localNow)
    {
        var nextDay = localNow.TimeOfDay >= TimeSpan.FromMinutes(1) ? localNow.Date.AddDays(1) : localNow.Date;
        return new DateTimeOffset(nextDay.AddMinutes(1), localNow.Offset);
    }

    private async Task RunSyncAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var syncService = scope.ServiceProvider.GetRequiredService<ILibrarySyncService>();
        var result = await syncService.SyncAllAsync(cancellationToken);
        _logger.LogInformation("Library sync completed. Total: {Total}, Succeeded: {Succeeded}, Failed: {Failed}", result.Total, result.Succeeded, result.Failed);
    }
}
