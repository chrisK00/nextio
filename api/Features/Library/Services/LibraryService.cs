using Data;
using Features.Library.Models;
using Features.Search.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Features.Library.Services;

public interface ILibraryService
{
    Task<LibraryResponse<TvShowItem>> GetTvShowLibraryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<LibraryResponse<MovieItem>> GetMovieLibraryAsync(Guid userId, string? status = null, CancellationToken cancellationToken = default);
    Task<LibraryTvShowDetailsResponse?> GetTvShowAsync(Guid userId, string id, CancellationToken cancellationToken = default);
    Task UpsertTvShowAsync(Guid userId, UpsertTrackedShowRequest request, CancellationToken cancellationToken = default);
    Task UpsertMovieAsync(Guid userId, UpsertTrackedShowRequest request, CancellationToken cancellationToken = default);
    Task RemoveTvShowAsync(Guid userId, string id, CancellationToken cancellationToken = default);
    Task RemoveMovieAsync(Guid userId, string id, CancellationToken cancellationToken = default);
    Task SetMovieWatchedAsync(Guid userId, string id, bool watched, CancellationToken cancellationToken = default);
    Task SetEpisodeAsync(Guid userId, string id, UpdateEpisodeRequest request, CancellationToken cancellationToken = default);
    Task SetEpisodesAsync(Guid userId, string id, BulkUpdateEpisodeRequest request, CancellationToken cancellationToken = default);
    Task ClearProgressAsync(Guid userId, string id, CancellationToken cancellationToken = default);
}

public sealed class LibraryService(ApplicationDbContext db, ILibrarySyncService syncService, TmdbApi tmdbApi, IMemoryCache cache, ILogger<LibraryService> logger) : ILibraryService
{
    private readonly ApplicationDbContext _db = db;
    private readonly ILibrarySyncService _syncService = syncService;
    private readonly IMemoryCache _cache = cache;
    private static readonly TimeSpan EpisodeCacheTtl = TimeSpan.FromHours(6);
    private string GetTvShowCacheKey(string showId)
    {
        return $"{showId}";
    }

    private async Task<TvEpisodeItem?> GetEpisodeAsync(string showId, int seasonNumber, int episodeNumber, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetTvShowCacheKey(showId);
        if (_cache.TryGetValue(cacheKey, out TvEpisodeItem? cached))
            return cached;

        var season = await tmdbApi.GetSeasonInfoAsync(showId, seasonNumber, cancellationToken);
        if (season == null) return null;

        var episode = season.Episodes.FirstOrDefault(x => x.EpisodeNumber == episodeNumber);
        if (episode is null) return null;

        var item = new TvEpisodeItem(season.SeasonNumber, episode.EpisodeNumber, episode.Name,
            DateTime.TryParse(episode.AirDate, out var dt) ? dt : null, false);
        _cache.Set(cacheKey, item, new MemoryCacheEntryOptions()
        .SetAbsoluteExpiration(EpisodeCacheTtl)
        .SetSize(1));
        return item;
    }

    private Task<TvEpisodeItem?> GetNextUserEpisodeAsync(string showId, UserTvShowEpisode? recentlyWatchedEpisode, List<ShowSeasonMetadata> seasonsmetadata, CancellationToken cancellationToken = default)
    {
        // Case 1: No history - Start from Season 1, Episode 1
        if (recentlyWatchedEpisode is null)
        {
            return seasonsmetadata.Any(x => x.SeasonNumber == 1 && x.EpisodeCount > 0)
                ? GetEpisodeAsync(showId, 1, 1, cancellationToken)
                : Task.FromResult<TvEpisodeItem?>(null);
        }

        // Case 2: Next episode in the current season
        if (seasonsmetadata.Any(x => x.SeasonNumber == recentlyWatchedEpisode.Season && x.EpisodeCount >= recentlyWatchedEpisode.Episode + 1))
        {
            return GetEpisodeAsync(showId, recentlyWatchedEpisode.Season, recentlyWatchedEpisode.Episode + 1, cancellationToken);
        }

        // Case 3: First episode of the next season
        if (seasonsmetadata.Any(x => x.SeasonNumber == recentlyWatchedEpisode.Season + 1 && x.EpisodeCount > 0))
        {
            return GetEpisodeAsync(showId, recentlyWatchedEpisode.Season + 1, 1, cancellationToken);
        }

        return Task.FromResult<TvEpisodeItem?>(null);
    }

    public async Task<LibraryResponse<TvShowItem>> GetTvShowLibraryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tvEntities = await _db.UserTvShows
            .AsNoTracking()
            .Include(x => x.Episodes)
            .Include(x => x.SeasonsMetadata)
            .Where(x => x.UserId == userId && x.IsFollowing)
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);

        var tvShows = tvEntities.Select(async show =>
        {
            // TODO fix bugg where if for example user watches season 3 e1 but not season 2 e1 we will only check after season 3 e1
            var mostRecentlyWatchedEpisode = show.Episodes
                .Where(e => e.Watched)
                .OrderByDescending(e => e.Season)
                .ThenByDescending(e => e.Episode)
                .FirstOrDefault();

            TvEpisodeItem? nextUserEpisode = null;
            try
            {

                nextUserEpisode = await GetNextUserEpisodeAsync(show.ShowId, mostRecentlyWatchedEpisode, show.SeasonsMetadata, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError("Failed getting next user episode for {showid}. {message}", show.ShowId, ex.Message);
                throw;
            }

            return new TvShowItem(
                            show.ShowId,
                            show.Title,
                            show.PosterUrl,
                            show.Status,
                            show.Description,
                            show.ReleaseDate,
                            nextUserEpisode,
                            show.NextEpisodeToAir is not null ?
                            new TvEpisodeItem(
                                show.NextEpisodeToAir?.Season ?? 0,
                                show.NextEpisodeToAir?.Episode ?? 0,
                                show.NextEpisodeToAir.Title,
                                show.NextEpisodeToAir.AirDate,
                                false
                            ) : null,
                            show.FollowedAt,
                            show.UpdatedAt,
                            show.LastSyncedAt,
                            show.SyncError,
                            show.Episodes
                                .OrderBy(e => e.Season)
                                .ThenBy(e => e.Episode)
                                .Select(e => new TvEpisodeItem(e.Season, e.Episode, e.Title ?? "TODO", DateTime.MinValue, e.Watched))
                                .ToList());
        });

        var awaitedShows = await Task.WhenAll(tvShows);

        return new LibraryResponse<TvShowItem>(awaitedShows, awaitedShows.Length);
    }

    public async Task<LibraryResponse<MovieItem>> GetMovieLibraryAsync(Guid userId, string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _db.UserMovies
        .AsNoTracking()
         .Where(x => x.UserId == userId);

        if (string.Equals(status, "watched", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.IsWatched);
        }
        else if (string.Equals(status, "unwatched", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => !x.IsWatched);
        }

        var movies = await query
         .OrderBy(x => x.IsWatched)
         .ThenBy(x => x.Title)
         .Select(x => new MovieItem(x.MovieId, x.Title, x.PosterUrl, x.Description, x.ReleaseDate, x.IsWatched))
         .ToListAsync(cancellationToken);

        return new LibraryResponse<MovieItem>(movies, movies.Count);
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
            .Select(e => new TvEpisodeItem(e.Season, e.Episode, e.Title ?? "_", DateTime.MinValue, e.Watched))
            .ToList();

        return new LibraryTvShowDetailsResponse(
            new TvShowItem(
                show.ShowId,
                show.Title,
                show.PosterUrl,
                show.Status,
                show.Description,
                show.ReleaseDate,
                null,
                null,
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
                Status = request.Status,
                Description = request.Description,
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
            show.Status = request.Status;
            show.Description = request.Description;
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
                ReleaseDate = request.ReleaseDate,
                IsWatched = false,
            };
            _db.UserMovies.Add(movie);
        }
        else
        {
            movie.Title = request.Title;
            movie.PosterUrl = request.PosterUrl;
            movie.Description = request.Description;
            movie.ReleaseDate = request.ReleaseDate;
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
        _cache.Remove(GetTvShowCacheKey(show.ShowId));
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

    public async Task SetMovieWatchedAsync(Guid userId, string id, bool watched, CancellationToken cancellationToken = default)
    {
        var movie = await _db.UserMovies.FirstOrDefaultAsync(x => x.UserId == userId && x.MovieId == id, cancellationToken);
        if (movie is null)
        {
            return;
        }

        movie.IsWatched = watched;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task SetEpisodeAsync(Guid userId, string id, UpdateEpisodeRequest request, CancellationToken cancellationToken = default)
    {
        var show = await _db.UserTvShows
            .Include(x => x.Episodes)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == id, cancellationToken);

        if (show is null || !show.IsFollowing)
        {
            throw new InvalidOperationException("Show must be followed before updating episodes.");
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
        _cache.Remove(GetTvShowCacheKey(show.ShowId));
    }

    public async Task SetEpisodesAsync(Guid userId, string id, BulkUpdateEpisodeRequest request, CancellationToken cancellationToken = default)
    {
        var show = await _db.UserTvShows
            .Include(x => x.Episodes)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == id, cancellationToken);

        if (show is null || !show.IsFollowing)
        {
            throw new InvalidOperationException("Show must be followed before updating episodes.");
        }

        foreach (var episodeRequest in request.Episodes)
        {
            var episode = show.Episodes.FirstOrDefault(x => x.Season == episodeRequest.Season && x.Episode == episodeRequest.Episode);
            if (episode is null)
            {
                episode = new UserTvShowEpisode
                {
                    Id = Guid.NewGuid(),
                    UserTvShowId = show.Id,
                    Season = episodeRequest.Season,
                    Episode = episodeRequest.Episode,
                    Watched = episodeRequest.Watched ?? true,
                    UpdatedAt = DateTime.UtcNow,
                };
                _db.UserTvShowEpisodes.Add(episode);
            }
            else
            {
                episode.Watched = episodeRequest.Watched ?? !episode.Watched;
                episode.UpdatedAt = DateTime.UtcNow;
            }
        }

        show.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        _cache.Remove(GetTvShowCacheKey(show.ShowId));
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
        _cache.Remove(GetTvShowCacheKey(show.ShowId));
    }
}
