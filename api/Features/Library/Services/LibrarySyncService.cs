using Data;
using Features.Search.Models;
using Features.Search.Services;
using Microsoft.EntityFrameworkCore;
using nextio.Api.Features.Library.Services;

namespace Features.Library.Services;

public interface ILibrarySyncService
{
    Task<Models.LibrarySyncResponse> SyncAllAsync(CancellationToken cancellationToken = default);
    Task SyncShowAsync(UserTvShow show, CancellationToken cancellationToken = default);
}

public sealed class LibrarySyncService(
    ApplicationDbContext db,
    TmdbApi tmdbSearchService,
    ILogger<LibrarySyncService> logger,
    ILibrarySyncStatusStore syncStatusStore) : ILibrarySyncService
{
    private const int MaxConcurrentSyncs = 5;
    private readonly ApplicationDbContext _db = db;
    private readonly TmdbApi _tmdbSearchService = tmdbSearchService;
    private readonly ILogger<LibrarySyncService> _logger = logger;
    private readonly ILibrarySyncStatusStore _syncStatusStore = syncStatusStore;

    public async Task SyncShowAsync(UserTvShow show, CancellationToken cancellationToken = default)
    {
        try
        {
            var details = await FetchShowDetailsAsync(show.ShowId, cancellationToken);
            ApplyShowDetails(show, details);
        }
        catch (Exception ex)
        {
            // Keep the user's last activity timestamp intact; only record the sync attempt metadata.
            show.SyncError = ex.Message;
            show.LastSyncedAt = DateTime.UtcNow;
            _logger.LogError(ex, "Failed to sync TV show {ShowId}", show.ShowId);
        }
    }

    private async Task<SearchDetailResponse> FetchShowDetailsAsync(string showId, CancellationToken cancellationToken)
    {
        return await _tmdbSearchService.GetDetailsAsync("tv", showId, cancellationToken)
            ?? throw new InvalidOperationException("TMDb returned no details.");
    }

    private static void ApplyShowDetails(UserTvShow show, SearchDetailResponse details)
    {

            show.Title = details.Name;
            show.PosterUrl = details.PosterUrl;
            show.Status = details.Status;
            show.Description = details.Description;
            show.ReleaseDate = details.ReleaseDate;
            show.LastSyncedAt = DateTime.UtcNow;
            show.SyncError = null;
            DateTime? parsedAirDate = null;
            if (!string.IsNullOrWhiteSpace(details.NextEpisodeToAir?.AirDate) && DateTime.TryParse(details.NextEpisodeToAir.AirDate, out var dt))
            {
                parsedAirDate = dt.AddMinutes(-1);
            }

            show.NextEpisodeToAir = details.NextEpisodeToAir is not null ? new UserTvShowNextEpisode
            {
                Season = details.NextEpisodeToAir.SeasonNumber,
                Episode = details.NextEpisodeToAir.EpisodeNumber,
                Title = details.NextEpisodeToAir.Name,
                UpdatedAt = DateTime.UtcNow,
                AirDate = parsedAirDate
            } : null;
            show.SeasonsMetadata = details.Seasons.Select(x => new ShowSeasonMetadata
            {
                SeasonNumber = x.SeasonNumber,
                AirDate = x.AirDate,
                EpisodeCount = x.EpisodeCount,
                VoteAverage = x.VoteAverage,
            }).ToList();
            show.NumberOfEpisodes = details.NumberOfEpisodes;
            show.NumberOfSeasons = details.NumberOfSeasons;
    }

    private sealed record SyncFetchResult(UserTvShow Show, SearchDetailResponse? Details, Exception? Error);

    private async Task<SyncFetchResult> FetchSyncResultAsync(UserTvShow show, SemaphoreSlim concurrencyGate, CancellationToken cancellationToken)
    {
        await concurrencyGate.WaitAsync(cancellationToken);
        try
        {
            return new SyncFetchResult(show, await FetchShowDetailsAsync(show.ShowId, cancellationToken), null);
        }
        catch (Exception ex)
        {
            if (ex is OperationCanceledException && cancellationToken.IsCancellationRequested)
                throw;
            return new SyncFetchResult(show, null, ex);
        }
        finally
        {
            concurrencyGate.Release();
        }
    }

    public async Task<Models.LibrarySyncResponse> SyncAllAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var shows = await _db.UserTvShows
                .Include(x => x.Episodes)
                .Include(x => x.SeasonsMetadata)
                .Where(x => x.IsFollowing)
                .OrderBy(x => x.Title)
                .AsSplitQuery()
                .ToListAsync(cancellationToken);

            var items = new List<Models.LibrarySyncItem>(shows.Count);
            var errors = new List<string>();
            var succeeded = 0;

            using var concurrencyGate = new SemaphoreSlim(MaxConcurrentSyncs, MaxConcurrentSyncs);
            var fetchTasks = shows.Select(show => FetchSyncResultAsync(show, concurrencyGate, cancellationToken));
            var fetchResults = await Task.WhenAll(fetchTasks);

            foreach (var result in fetchResults)
            {
                var show = result.Show;
                try
                {
                    if (result.Error is not null)
                        throw result.Error;

                    ApplyShowDetails(show, result.Details!);
                    if (show.SyncError is null)
                    {
                        items.Add(new Models.LibrarySyncItem(show.ShowId, show.Title, true, "Synced successfully.", show.LastSyncedAt!.Value));
                        succeeded++;
                    }
                    else
                    {
                        items.Add(new Models.LibrarySyncItem(show.ShowId, show.Title, false, show.SyncError, show.LastSyncedAt!.Value));
                    }
                }
                catch (Exception ex)
                {
                    errors.Add($"Failed syncing {show.Id} for user {show.UserId}: {ex.Message}");
                }
            }

            await _db.SaveChangesAsync(cancellationToken);

            if (errors.Count != 0)
            {
                _syncStatusStore.MarkFailure(DateTime.UtcNow, string.Join(", ", errors));
            }
            else
            {
                _syncStatusStore.MarkSuccess(DateTime.UtcNow, $"Synced {succeeded} of {shows.Count} shows.");
            }

            return new Models.LibrarySyncResponse(
                Total: shows.Count,
                Succeeded: succeeded,
                Failed: shows.Count - succeeded,
                Items: items);
        }
        catch (Exception ex)
        {
            _syncStatusStore.MarkFailure(DateTime.UtcNow, ex.Message);
            throw;
        }
    }
}
