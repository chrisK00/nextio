using System.Diagnostics;

namespace Features.Library.Services;

public sealed class LibrarySyncWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<LibrarySyncWorker> logger) : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory;
    private readonly ILogger<LibrarySyncWorker> _logger = logger;

    // Tracks state to decide if we need the 02:00 retry window
    private bool _lastRunFailed = false;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // If we are currently inside the allowed window, run the sync
            if (IsInsideExecutionWindow(DateTimeOffset.Now))
            {
                var stopwatch = Stopwatch.StartNew();
                _logger.LogInformation("Starting library sync job...");

                try
                {
                    await RunSyncAsync(stoppingToken);
                    _lastRunFailed = false; // Success
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Library sync worker failed during execution.");
                    _lastRunFailed = true; // Trigger retry logic for next delay calculation
                }
                finally
                {
                    stopwatch.Stop();
                    _logger.LogInformation("Library sync execution finished. Duration: {Duration}", stopwatch.Elapsed);
                }
            }

            // Calculate delay until the next target window
            var delay = GetDelayUntilNextRun(DateTimeOffset.Now, _lastRunFailed);
            _logger.LogInformation("Next library sync scheduled at {NextRun}", DateTimeOffset.Now.Add(delay).ToLocalTime());

            await Task.Delay(delay, stoppingToken);
        }
    }

    private static bool IsInsideExecutionWindow(DateTimeOffset now)
    {
        var time = now.ToLocalTime().TimeOfDay;
        // Allows execution if we land exactly on or slightly after our key targets
        return time >= TimeSpan.FromMinutes(1) && time <= TimeSpan.FromHours(6);
    }

    private static TimeSpan GetDelayUntilNextRun(DateTimeOffset now, bool lastRunFailed)
    {
        var localNow = now.ToLocalTime();
        var today = localNow.Date;

        // Define our three absolute target times for today
        var run001 = today.Add(TimeSpan.FromMinutes(1));
        var run0200 = today.Add(TimeSpan.FromHours(2));
        var run0600 = today.Add(TimeSpan.FromHours(6));

        DateTime targetRun;

        // 1. If the last run failed, our primary target is 02:00 today (if we haven't passed it yet)
        if (lastRunFailed && localNow < run0200)
        {
            targetRun = run0200;
        }
        // 2. Otherwise, find the next sequential window chronologically
        else if (localNow < run001)
        {
            targetRun = run001;
        }
        else if (localNow < run0600)
        {
            targetRun = run0600;
        }
        else
        {
            // We passed 06:00 today, look forward to 00:01 tomorrow
            targetRun = today.AddDays(1).AddMinutes(1);
        }

        var delay = targetRun - localNow;
        return delay < TimeSpan.Zero ? TimeSpan.Zero : delay;
    }

    private async Task RunSyncAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var syncService = scope.ServiceProvider.GetRequiredService<ILibrarySyncService>();
        var result = await syncService.SyncAllAsync(cancellationToken);
        _logger.LogInformation("Library sync completed. Total: {Total}, Succeeded: {Succeeded}, Failed: {Failed}", result.Total, result.Succeeded, result.Failed);
    }
}