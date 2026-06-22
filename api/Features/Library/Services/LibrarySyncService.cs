using Data;
using Features.Search.Services;
using Microsoft.EntityFrameworkCore;

namespace Features.Library.Services;

public interface ILibrarySyncService
{
    Task<Models.LibrarySyncResponse> SyncAllAsync(CancellationToken cancellationToken = default);
    Task SyncShowAsync(UserTvShow show, CancellationToken cancellationToken = default);
}



public sealed class LibrarySyncService(
    ApplicationDbContext db,
    TmdbApi tmdbSearchService,
    ILogger<LibrarySyncService> logger) : ILibrarySyncService
{
    private readonly ApplicationDbContext _db = db;
    private readonly TmdbApi _tmdbSearchService = tmdbSearchService;
    private readonly ILogger<LibrarySyncService> _logger = logger;

    public async Task SyncShowAsync(UserTvShow show, CancellationToken cancellationToken = default)
    {
        try
        {
            var details = await _tmdbSearchService.GetDetailsAsync("tv", show.ShowId, cancellationToken) ?? throw new InvalidOperationException("TMDb returned no details.");

            show.Title = details.Name;
            show.PosterUrl = details.PosterUrl;
            show.Status = details.Status;
            show.Description = details.Description;
            show.LastSyncedAt = DateTime.UtcNow;
            show.SyncError = null;
            show.UpdatedAt = DateTime.UtcNow;
            show.NextEpisodeToAir = details.NextEpisodeToAir is not null ? new UserTvShowNextEpisode
            {
                Season = details.NextEpisodeToAir.SeasonNumber,
                Episode = details.NextEpisodeToAir.EpisodeNumber,
                Title = details.NextEpisodeToAir.Name,
                UpdatedAt = DateTime.UtcNow,
                AirDate = DateTime.Parse(details.NextEpisodeToAir?.AirDate)
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
        catch (Exception ex)
        {
            show.SyncError = ex.Message;
            show.LastSyncedAt = DateTime.UtcNow;
            show.UpdatedAt = DateTime.UtcNow;
            _logger.LogError(ex, "Failed to sync TV show {ShowId}", show.ShowId);
        }
    }

    public async Task<Models.LibrarySyncResponse> SyncAllAsync(CancellationToken cancellationToken = default)
    {
        var shows = await _db.UserTvShows
            .Include(x => x.Episodes)
            .Include(x => x.SeasonsMetadata)
            .Where(x => x.IsFollowing)
            .OrderBy(x => x.Title)
            .ToListAsync(cancellationToken);

        var items = new List<Models.LibrarySyncItem>(shows.Count);
        var succeeded = 0;

        // TODO store synced shows in dict and reuse info so dont make multiple calls to TMDb for same show if multiple users has same show in library
        foreach (var show in shows)
        {
            await SyncShowAsync(show, cancellationToken);
            if (show.SyncError is null)
            {
                items.Add(new Models.LibrarySyncItem(show.ShowId, show.Title, true, "Synced successfully.", show.LastSyncedAt!.Value));
                succeeded++;
            }
            else
            {
                items.Add(new Models.LibrarySyncItem(show.ShowId, show.Title, false, show.SyncError, show.LastSyncedAt!.Value));
            }
            await Task.Delay(300, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new Models.LibrarySyncResponse(
            Total: shows.Count,
            Succeeded: succeeded,
            Failed: shows.Count - succeeded,
            Items: items);
    }
}
