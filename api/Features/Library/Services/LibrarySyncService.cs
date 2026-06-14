using Data;
using Features.Search.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Features.Library.Services;

public interface ILibrarySyncService
{
    Task<Models.LibrarySyncResponse> SyncAllAsync(CancellationToken cancellationToken = default);
}

public sealed class LibrarySyncService(
    ApplicationDbContext db,
    TmdbSearchService tmdbSearchService,
    ILogger<LibrarySyncService> logger) : ILibrarySyncService
{
    private readonly ApplicationDbContext _db = db;
    private readonly TmdbSearchService _tmdbSearchService = tmdbSearchService;
    private readonly ILogger<LibrarySyncService> _logger = logger;

    public async Task<Models.LibrarySyncResponse> SyncAllAsync(CancellationToken cancellationToken = default)
    {
        var shows = await _db.UserTvShows
            .OrderBy(x => x.Title)
            .ToListAsync(cancellationToken);

        var items = new List<Models.LibrarySyncItem>(shows.Count);
        var succeeded = 0;

        // TODO store synced shows in dict and reuse info so dont make multiple calls to TMDb for same show if multiple users has same show in library
        foreach (var show in shows)
        {
            try
            {
                if (!int.TryParse(show.ShowId, out var showId))
                {
                    throw new InvalidOperationException($"Invalid TMDb show id: {show.ShowId}");
                }

                var details = await _tmdbSearchService.GetDetailsAsync("tv", showId, cancellationToken);
                if (details is null)
                {
                    throw new InvalidOperationException("TMDb returned no details.");
                }

                show.Title = details.Title;
                show.PosterUrl = details.PosterUrl;
                show.Network = details.Network;
                show.Status = details.Status;
                show.Description = details.Description;
                show.NextReleaseDate = details.NextReleaseDate;
                show.LastSyncedAt = DateTime.UtcNow;
                show.SyncError = null;
                show.UpdatedAt = DateTime.UtcNow;

                items.Add(new Features.Library.Models.LibrarySyncItem(show.ShowId, show.Title, true, "Synced successfully.", show.LastSyncedAt.Value));
                succeeded++;
            }
            catch (Exception ex)
            {
                show.SyncError = ex.Message;
                show.LastSyncedAt = DateTime.UtcNow;
                show.UpdatedAt = DateTime.UtcNow;
                _logger.LogError(ex, "Failed to sync TV show {ShowId}", show.ShowId);
                items.Add(new Features.Library.Models.LibrarySyncItem(show.ShowId, show.Title, false, ex.Message, show.LastSyncedAt.Value));
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new Features.Library.Models.LibrarySyncResponse(
            Total: shows.Count,
            Succeeded: succeeded,
            Failed: shows.Count - succeeded,
            Items: items);
    }
}
