namespace Data;

// TODO normalize to have a tvshow in order to avoid duplication of data and requests etc
public sealed class UserTvShow
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string ShowId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? PosterUrl { get; set; }
    public string? Status { get; set; }
    public string? Description { get; set; }
    public string? ReleaseDate { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public string? SyncError { get; set; }
    public DateTime FollowedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsFollowing { get; set; } = true;
    public List<UserTvShowEpisode> Episodes { get; set; } = [];
    public UserTvShowNextEpisode? NextEpisodeToAir { get; set; }
    public int NumberOfEpisodes { get; set; }
    public int NumberOfSeasons { get; set; }
    public List<ShowSeasonMetadata> SeasonsMetadata { get; set; } = [];
}

public sealed class ShowSeasonMetadata
{
    public double? VoteAverage { get; init; }
    public int SeasonNumber { get; init; }
    public int EpisodeCount { get; init; }
    public DateTime? AirDate { get; init; }
}

public sealed class UserMovie
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string MovieId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? PosterUrl { get; set; }
    public string? Description { get; set; }
    public string? ReleaseDate { get; set; }
    public bool IsWatched { get; set; } = false;
}

public sealed class UserTvShowEpisode
{
    public Guid Id { get; set; }
    public Guid UserTvShowId { get; set; }
    public string? Title { get; set; }
    public int Season { get; set; }
    public int Episode { get; set; }
    public bool Watched { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? AirDate { get; set; }
}

public sealed class UserTvShowNextEpisode
{
    public string? Title { get; set; }
    public int Season { get; set; }
    public int Episode { get; set; }
    public DateTime? AirDate { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class UserList
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string MediaType { get; set; } = null!; // "tv" or "movie"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<UserListItem> Items { get; set; } = [];
}

public sealed class UserListItem
{
    public Guid Id { get; set; }
    public Guid UserListId { get; set; }
    public string ItemId { get; set; } = null!; // e.g. "tv:1399" or "movie:550"
    public string Title { get; set; } = null!;
    public string? PosterUrl { get; set; }
    public string? ReleaseDate { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public int Order { get; set; }
}
