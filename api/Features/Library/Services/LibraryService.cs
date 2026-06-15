using Data;
using Features.Library.Models;
using Microsoft.EntityFrameworkCore;

namespace Features.Library.Services;

public interface ILibraryService
{
    Task<LibraryResponse> GetLibraryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<LibraryTvShowDetailsResponse?> GetTvShowAsync(Guid userId, string id, CancellationToken cancellationToken = default);
    Task UpsertTvShowAsync(Guid userId, UpsertTrackedShowRequest request, CancellationToken cancellationToken = default);
    Task UpsertMovieAsync(Guid userId, UpsertTrackedShowRequest request, CancellationToken cancellationToken = default);
    Task RemoveTvShowAsync(Guid userId, string id, CancellationToken cancellationToken = default);
    Task RemoveMovieAsync(Guid userId, string id, CancellationToken cancellationToken = default);
    Task SetEpisodeAsync(Guid userId, string id, UpdateEpisodeRequest request, CancellationToken cancellationToken = default);
    Task ClearProgressAsync(Guid userId, string id, CancellationToken cancellationToken = default);
}

public sealed class LibraryService(ApplicationDbContext db, ILibrarySyncService syncService) : ILibraryService
{
    private readonly ApplicationDbContext _db = db;
    private readonly ILibrarySyncService _syncService = syncService;

    public async Task<LibraryResponse> GetLibraryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tvEntities = await _db.UserTvShows
            .Include(x => x.Episodes)
            .Where(x => x.UserId == userId && x.IsFollowing)
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);

        var tvShows = tvEntities.Select(x => new TvShowItem(
                x.ShowId,
                x.Title,
                x.PosterUrl,
                x.Network,
                x.Status,
                x.Description,
                x.NextReleaseDate,
                x.FollowedAt,
                x.UpdatedAt,
                x.LastSyncedAt,
                x.SyncError,
                x.Episodes
                    .OrderBy(e => e.Season)
                    .ThenBy(e => e.Episode)
                    .Select(e => new TvEpisodeItem(e.Season, e.Episode, e.Watched))
                    .ToList()))
            .ToList();

        var movies = await _db.UserMovies
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.WatchedAt)
            .Select(x => new MovieItem(x.MovieId, x.Title, x.PosterUrl, x.Description, x.WatchedAt))
            .ToListAsync(cancellationToken);

        return new LibraryResponse(tvShows, movies);
    }

    public async Task<LibraryTvShowDetailsResponse?> GetTvShowAsync(Guid userId, string id, CancellationToken cancellationToken = default)
    {
        var show = await _db.UserTvShows
            .Include(x => x.Episodes)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == id, cancellationToken);

        if (show is null)
        {
            return null;
        }

        var episodes = show.Episodes
            .OrderBy(e => e.Season)
            .ThenBy(e => e.Episode)
            .Select(e => new TvEpisodeItem(e.Season, e.Episode, e.Watched))
            .ToList();

        return new LibraryTvShowDetailsResponse(
            new TvShowItem(
                show.ShowId,
                show.Title,
                show.PosterUrl,
                show.Network,
                show.Status,
                show.Description,
                show.NextReleaseDate,
                show.FollowedAt,
                show.UpdatedAt,
                show.LastSyncedAt,
                show.SyncError,
                episodes),
            episodes);
    }

    public async Task UpsertTvShowAsync(Guid userId, UpsertTrackedShowRequest request, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(request.MediaType, "tv", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Request media type must be tv.", nameof(request));
        }

        var now = DateTime.UtcNow;
        var show = await _db.UserTvShows
            .Include(x => x.Episodes)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == request.Id, cancellationToken);

        if (show is null)
        {
            show = new UserTvShow
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ShowId = request.Id,
                Title = request.Title,
                PosterUrl = request.PosterUrl,
                Network = request.Network,
                Status = request.Status,
                Description = request.Description,
                NextReleaseDate = request.NextReleaseDate,
                IsFollowing = true,
                FollowedAt = now,
                UpdatedAt = now,
            };
            _db.UserTvShows.Add(show);
            await _db.SaveChangesAsync(cancellationToken);
            await _syncService.SyncShowAsync(show, cancellationToken);
        }
        else
        {
            show.Title = request.Title;
            show.PosterUrl = request.PosterUrl;
            show.Network = request.Network;
            show.Status = request.Status;
            show.Description = request.Description;
            show.NextReleaseDate = request.NextReleaseDate;
            show.IsFollowing = true;
            show.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpsertMovieAsync(Guid userId, UpsertTrackedShowRequest request, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(request.MediaType, "movie", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Request media type must be movie.", nameof(request));
        }

        var now = DateTime.UtcNow;
        var movie = await _db.UserMovies.FirstOrDefaultAsync(x => x.UserId == userId && x.MovieId == request.Id, cancellationToken);
        if (movie is null)
        {
            movie = new UserMovie
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MovieId = request.Id,
                Title = request.Title,
                PosterUrl = request.PosterUrl,
                Description = request.Description,
                WatchedAt = now,
            };
            _db.UserMovies.Add(movie);
        }
        else
        {
            movie.Title = request.Title;
            movie.PosterUrl = request.PosterUrl;
            movie.Description = request.Description;
            movie.WatchedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveTvShowAsync(Guid userId, string id, CancellationToken cancellationToken = default)
    {
        var show = await _db.UserTvShows.FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == id, cancellationToken);
        if (show is null) return;
        show.IsFollowing = false;
        show.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveMovieAsync(Guid userId, string id, CancellationToken cancellationToken = default)
    {
        var movie = await _db.UserMovies.FirstOrDefaultAsync(x => x.UserId == userId && x.MovieId == id, cancellationToken);
        if (movie is null)
        {
            return;
        }

        _db.UserMovies.Remove(movie);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetEpisodeAsync(Guid userId, string id, UpdateEpisodeRequest request, CancellationToken cancellationToken = default)
    {
        var show = await _db.UserTvShows
            .Include(x => x.Episodes)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == id, cancellationToken);

        if (show is null)
        {
            // Auto-create a minimal record so episode progress can be saved without explicitly following
            show = new UserTvShow
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ShowId = id,
                Title = id,
                IsFollowing = false,
                FollowedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.UserTvShows.Add(show);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var episode = show.Episodes.FirstOrDefault(x => x.Season == request.Season && x.Episode == request.Episode);
        if (episode is null)
        {
            episode = new UserTvShowEpisode
            {
                Id = Guid.NewGuid(),
                UserTvShowId = show.Id,
                Season = request.Season,
                Episode = request.Episode,
                Watched = request.Watched ?? true,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.UserTvShowEpisodes.Add(episode);
        }
        else
        {
            episode.Watched = request.Watched ?? !episode.Watched;
            episode.UpdatedAt = DateTime.UtcNow;
        }

        show.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ClearProgressAsync(Guid userId, string id, CancellationToken cancellationToken = default)
    {
        var show = await _db.UserTvShows
            .Include(x => x.Episodes)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == id, cancellationToken);
        if (show is null) return;
        _db.UserTvShowEpisodes.RemoveRange(show.Episodes);
        show.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }
}