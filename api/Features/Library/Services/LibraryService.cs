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
    Task<IReadOnlyList<UserListDto>> GetUserListsAsync(Guid userId, string? mediaType = null, CancellationToken cancellationToken = default);
    Task<UserListDto?> GetUserListAsync(Guid userId, Guid listId, CancellationToken cancellationToken = default);
    Task<UserListDto> CreateUserListAsync(Guid userId, CreateListRequest request, CancellationToken cancellationToken = default);
    Task<UserListDto?> UpdateUserListAsync(Guid userId, Guid listId, UpdateListRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteUserListAsync(Guid userId, Guid listId, CancellationToken cancellationToken = default);
    Task<UserListDto?> AddItemToUserListAsync(Guid userId, Guid listId, AddListItemRequest request, CancellationToken cancellationToken = default);
    Task<UserListDto?> RemoveItemFromUserListAsync(Guid userId, Guid listId, string itemId, CancellationToken cancellationToken = default);
}

public sealed class LibraryService(ApplicationDbContext db, ILibrarySyncService syncService, TmdbApi tmdbApi, IMemoryCache cache, ILogger<LibraryService> logger) : ILibraryService
{
    private readonly ApplicationDbContext _db = db;
    private readonly ILibrarySyncService _syncService = syncService;
    private readonly IMemoryCache _cache = cache;
    private static readonly TimeSpan EpisodeCacheTtlMax = TimeSpan.FromHours(48);
    private static readonly TimeSpan EpisodeCacheTtlSliding = TimeSpan.FromHours(24);
    private static string GetEpisodeCacheKey(string showId, int season, int episode) => $"{showId}:s{season}e{episode}";

    private async Task<TvEpisodeItem?> GetEpisodeAsync(string showId, int seasonNumber, int episodeNumber, SemaphoreSlim tmdbRateLimiter, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetEpisodeCacheKey(showId, seasonNumber, episodeNumber);
        if (_cache.TryGetValue(cacheKey, out TvEpisodeItem? cached))
            return cached;

        var season = await tmdbApi.GetSeasonInfoAsync(showId, seasonNumber, tmdbRateLimiter, cancellationToken);
        if (season == null) return null;

        var episode = season.Episodes.FirstOrDefault(x => x.EpisodeNumber == episodeNumber);
        if (episode is null) return null;

        var item = new TvEpisodeItem(season.SeasonNumber, episode.EpisodeNumber, episode.Name,
            DateTime.TryParse(episode.AirDate, out var dt) ? dt : null, false);

        _cache.Set(cacheKey, item, new MemoryCacheEntryOptions()
        // Default to 12 hours, extends by 12 hours every time it's accessed
        .SetSlidingExpiration(EpisodeCacheTtlSliding)
        // Hard stop at 24 hours total, no matter how many times it's accessed
        .SetAbsoluteExpiration(EpisodeCacheTtlMax)
        .SetSize(1));

        return item;
    }

    private Task<TvEpisodeItem?> GetNextUserEpisodeAsync(string showId, UserTvShowEpisode? recentlyWatchedEpisode, List<ShowSeasonMetadata> seasonsmetadata, SemaphoreSlim tmdbRateLimiter, CancellationToken cancellationToken = default)
    {
        // Case 1: No history - Start from Season 1, Episode 1
        if (recentlyWatchedEpisode is null)
        {
            return seasonsmetadata.Any(x => x.SeasonNumber == 1 && x.EpisodeCount > 0)
                ? GetEpisodeAsync(showId, 1, 1, tmdbRateLimiter, cancellationToken)
                : Task.FromResult<TvEpisodeItem?>(null);
        }

        // Case 2: Next episode in the current season
        if (seasonsmetadata.Any(x => x.SeasonNumber == recentlyWatchedEpisode.Season && x.EpisodeCount >= recentlyWatchedEpisode.Episode + 1))
        {
            return GetEpisodeAsync(showId, recentlyWatchedEpisode.Season, recentlyWatchedEpisode.Episode + 1, tmdbRateLimiter, cancellationToken);
        }

        // Case 3: First episode of the next season
        if (seasonsmetadata.Any(x => x.SeasonNumber == recentlyWatchedEpisode.Season + 1 && x.EpisodeCount > 0))
        {
            return GetEpisodeAsync(showId, recentlyWatchedEpisode.Season + 1, 1, tmdbRateLimiter, cancellationToken);
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
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var tmdbRateLimiter = new SemaphoreSlim(50, 50);
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
                nextUserEpisode = await GetNextUserEpisodeAsync(show.ShowId, mostRecentlyWatchedEpisode, show.SeasonsMetadata, tmdbRateLimiter, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError("Failed calculating next user episode for {showid}. {message}", show.ShowId, ex.Message);
                return null;
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
                                show.NextEpisodeToAir?.Title ?? $"S{show.NextEpisodeToAir?.Season} E{show.NextEpisodeToAir?.Episode}",
                                show.NextEpisodeToAir?.AirDate,
                                false
                            ) : null,
                            show.FollowedAt,
                            show.UpdatedAt,
                            show.LastSyncedAt,
                            show.SyncError,
                            show.Episodes
                                .OrderBy(e => e.Season)
                                .ThenBy(e => e.Episode)
                                .Select(e => new TvEpisodeItem(e.Season, e.Episode, e.Title ?? $"Episode {e.Episode}", e.AirDate ?? DateTime.MinValue, e.Watched))
                                .ToList());
        });

        var awaitedShows = await Task.WhenAll(tvShows);
        var validShows = awaitedShows.Where(s => s is not null).Select(s => s!).ToList();

        return new LibraryResponse<TvShowItem>(validShows, validShows.Count);
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

        var normalizedId = ConvertIdToTmdbMovieId(request.Id);
        var now = DateTime.UtcNow;
        var movie = await _db.UserMovies.FirstOrDefaultAsync(x => x.UserId == userId && (x.MovieId == normalizedId || x.MovieId == request.Id), cancellationToken);
        if (movie is null)
        {
            movie = new UserMovie
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MovieId = normalizedId,
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
            movie.MovieId = normalizedId;
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

    }

    public async Task RemoveMovieAsync(Guid userId, string id, CancellationToken cancellationToken = default)
    {
        var normalizedId = ConvertIdToTmdbMovieId(id);
        var movie = await _db.UserMovies.FirstOrDefaultAsync(x => x.UserId == userId && (x.MovieId == normalizedId || x.MovieId == id), cancellationToken);
        if (movie is null)
        {
            return;
        }

        _db.UserMovies.Remove(movie);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static string ConvertIdToTmdbMovieId(string id)
    {
        var raw = id.Trim();
        while (raw.StartsWith("movie:", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw["movie:".Length..];
        }
        return $"movie:{raw}";
    }

    public async Task SetMovieWatchedAsync(Guid userId, string id, bool watched, CancellationToken cancellationToken = default)
    {
        var tmdbId = ConvertIdToTmdbMovieId(id);
        var movie = await _db.UserMovies.FirstOrDefaultAsync(x => x.UserId == userId && (x.MovieId == tmdbId || x.MovieId == id), cancellationToken);
        if (movie is null)
        {
            throw new KeyNotFoundException($"Movie with id {tmdbId} was not found");
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

    public async Task<IReadOnlyList<UserListDto>> GetUserListsAsync(Guid userId, string? mediaType = null, CancellationToken cancellationToken = default)
    {
        var query = _db.UserLists
            .Include(x => x.Items)
            .Where(x => x.UserId == userId);

        if (!string.IsNullOrWhiteSpace(mediaType))
        {
            var norm = mediaType.ToLower();
            query = query.Where(x => x.MediaType == norm);
        }

        var lists = await query.OrderByDescending(x => x.UpdatedAt).ToListAsync(cancellationToken);
        return lists.Select(MapListToDto).ToList();
    }

    public async Task<UserListDto?> GetUserListAsync(Guid userId, Guid listId, CancellationToken cancellationToken = default)
    {
        var list = await _db.UserLists
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == listId, cancellationToken);
        return list is null ? null : MapListToDto(list);
    }

    public async Task<UserListDto> CreateUserListAsync(Guid userId, CreateListRequest request, CancellationToken cancellationToken = default)
    {
        var mediaType = request.MediaType?.ToLower() == "movie" ? "movie" : "tv";
        var userList = new UserList
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            MediaType = mediaType,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = []
        };

        _db.UserLists.Add(userList);
        await _db.SaveChangesAsync(cancellationToken);
        return MapListToDto(userList);
    }

    public async Task<UserListDto?> UpdateUserListAsync(Guid userId, Guid listId, UpdateListRequest request, CancellationToken cancellationToken = default)
    {
        var list = await _db.UserLists
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == listId, cancellationToken);
        if (list is null) return null;

        list.Name = request.Name.Trim();
        list.Description = request.Description?.Trim();
        list.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return MapListToDto(list);
    }

    public async Task<bool> DeleteUserListAsync(Guid userId, Guid listId, CancellationToken cancellationToken = default)
    {
        var list = await _db.UserLists.FirstOrDefaultAsync(x => x.UserId == userId && x.Id == listId, cancellationToken);
        if (list is null) return false;

        _db.UserLists.Remove(list);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<UserListDto?> AddItemToUserListAsync(Guid userId, Guid listId, AddListItemRequest request, CancellationToken cancellationToken = default)
    {
        var list = await _db.UserLists
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == listId, cancellationToken);
        if (list is null) return null;

        // Automatically follow/track item in main library if not already tracked
        if (list.MediaType == "tv")
        {
            var existingTv = await _db.UserTvShows.FirstOrDefaultAsync(x => x.UserId == userId && x.ShowId == request.ItemId, cancellationToken);
            if (existingTv is null)
            {
                await UpsertTvShowAsync(userId, new UpsertTrackedShowRequest(
                    Id: request.ItemId,
                    Title: request.Title,
                    PosterUrl: request.PosterUrl,
                    Network: null,
                    Status: "Tracked",
                    Description: null,
                    NextReleaseDate: null,
                    ReleaseDate: request.ReleaseDate,
                    MediaType: "tv"
                ), cancellationToken);
            }
            else if (!existingTv.IsFollowing)
            {
                existingTv.IsFollowing = true;
                existingTv.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(cancellationToken);
            }
        }
        else if (list.MediaType == "movie")
        {
            var existingMovie = await _db.UserMovies.FirstOrDefaultAsync(x => x.UserId == userId && x.MovieId == request.ItemId, cancellationToken);
            if (existingMovie is null)
            {
                await UpsertMovieAsync(userId, new UpsertTrackedShowRequest(
                    Id: request.ItemId,
                    Title: request.Title,
                    PosterUrl: request.PosterUrl,
                    Network: null,
                    Status: "Released",
                    Description: null,
                    NextReleaseDate: null,
                    ReleaseDate: request.ReleaseDate,
                    MediaType: "movie"
                ), cancellationToken);
            }
        }

        // Auto-following a new item can save and mutate other tracked entities
        // (including during metadata sync). Reload the list graph before adding
        // the list item so the final save never uses a stale tracked instance.
        _db.ChangeTracker.Clear();
        list = await _db.UserLists
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == listId, cancellationToken);
        if (list is null) return null;

        var existingItem = list.Items.FirstOrDefault(x => x.ItemId == request.ItemId);
        if (existingItem is null)
        {
            var maxOrder = list.Items.Count > 0 ? list.Items.Max(x => x.Order) : 0;
            var listItem = new UserListItem
            {
                Id = Guid.NewGuid(),
                UserListId = list.Id,
                ItemId = request.ItemId,
                Title = request.Title,
                PosterUrl = request.PosterUrl,
                ReleaseDate = request.ReleaseDate,
                Order = maxOrder + 1,
                AddedAt = DateTime.UtcNow
            };
            // Adding an item only needs an INSERT. Updating the parent list here
            // can conflict with another request that has already touched it.
            _db.UserListItems.Add(listItem);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return MapListToDto(list);
    }

    public async Task<UserListDto?> RemoveItemFromUserListAsync(Guid userId, Guid listId, string itemId, CancellationToken cancellationToken = default)
    {
        var list = await _db.UserLists
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == listId, cancellationToken);
        if (list is null) return null;

        var item = list.Items.FirstOrDefault(x => x.ItemId == itemId);
        if (item is not null)
        {
            list.Items.Remove(item);
            list.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return MapListToDto(list);
    }

    private static UserListDto MapListToDto(UserList list)
    {
        return new UserListDto(
            Id: list.Id,
            Name: list.Name,
            Description: list.Description,
            MediaType: list.MediaType,
            CreatedAt: list.CreatedAt,
            UpdatedAt: list.UpdatedAt,
            Items: list.Items.OrderBy(i => i.Order).Select(i => new UserListItemDto(
                Id: i.Id,
                ItemId: i.ItemId,
                Title: i.Title,
                PosterUrl: i.PosterUrl,
                ReleaseDate: i.ReleaseDate,
                AddedAt: i.AddedAt,
                Order: i.Order
            )).ToList()
        );
    }
}
