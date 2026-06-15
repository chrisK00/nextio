namespace Features.Library.Models;

public sealed record UpsertTrackedShowRequest(
    string Id,
    string Title,
    string? PosterUrl,
    string? Network,
    string? Status,
    string? Description,
    DateTime? NextReleaseDate,
    string MediaType);

public sealed record UpdateEpisodeRequest(int Season, int Episode, bool? Watched);

public sealed record MovieItem(
    string Id,
    string Title,
    string? PosterUrl,
    string? Description,
    DateTime WatchedAt);

public sealed record TvEpisodeItem(
    int Season,
    int Episode,
    bool Watched);

public sealed record TvShowItem(
    string Id,
    string Title,
    string? PosterUrl,
    string? Network,
    string? Status,
    string? Description,
    DateTime? NextReleaseDate,
    DateTime FollowedAt,
    DateTime UpdatedAt,
    DateTime? LastSyncedAt,
    string? SyncError,
    IReadOnlyList<TvEpisodeItem> Episodes);

public sealed record LibraryResponse(
    IReadOnlyList<TvShowItem> TvShows,
    IReadOnlyList<MovieItem> Movies);

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
