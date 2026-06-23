namespace Features.Library.Models;

public sealed record UpsertTrackedShowRequest(
    string Id,
    string Title,
    string? PosterUrl,
    string? Network,
    string? Status,
    string? Description,
    DateTime? NextReleaseDate,
    string? ReleaseDate,
    string MediaType);

public sealed record UpdateEpisodeRequest(int Season, int Episode, bool? Watched);

public sealed record BulkUpdateEpisodeRequest(IReadOnlyList<UpdateEpisodeRequest> Episodes);

public sealed record MovieItem(
    string Id,
    string Title,
    string? PosterUrl,
    string? Description,
    string? ReleaseDate,
    bool Watched,
    string MediaType = "movie");

public sealed record UpdateMovieWatchStatusRequest(bool Watched);

public sealed record TvEpisodeItem(
    int Season,
    int Episode,
    string Title,
    DateTime? ReleaseDate,
    bool Watched);

public sealed record TvShowItem(
    string Id,
    string Title,
    string? PosterUrl,
    string? Status,
    string? Description,
    string? ReleaseDate,

    TvEpisodeItem? NextUserEpisode,
    TvEpisodeItem? NextAiringEpisode,
    DateTime FollowedAt,
    DateTime UpdatedAt,
    DateTime? LastSyncedAt,
    string? SyncError,
    IReadOnlyList<TvEpisodeItem> Episodes,
    string MediaType = "tv");

public sealed record LibraryResponse<T>(
    IReadOnlyList<T> Items,
    int Length
    );

public sealed record LibraryTvShowDetailsResponse(
    TvShowItem Show,
    IReadOnlyList<TvEpisodeItem> Episodes);

public sealed record LibrarySyncItem(
    string ShowId,
    string Title,
    bool Success,
    string Message,
    DateTime SyncedAt);

public sealed record LibrarySyncResponse(
    int Total,
    int Succeeded,
    int Failed,
    IReadOnlyList<LibrarySyncItem> Items);

public sealed record LibraryStatsResponse(
    int TotalMovies,
    int TotalTvShows,
    int ShowsWithEpisodesButNotFollowed,
    DateTime? LastSyncAt,
    bool? LastSyncSucceeded,
    string? LastSyncMessage);
