namespace Data;

// TODO normalize to have a tvshow in order to avoid duplication of data and requests etc
public sealed class UserTvShow
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string ShowId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? PosterUrl { get; set; }
    public string? Network { get; set; }
    public string? Status { get; set; }
    public string? Description { get; set; }
    public DateTime? NextReleaseDate { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public string? SyncError { get; set; }
    public DateTime FollowedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsFollowing { get; set; } = true;
    public List<UserTvShowEpisode> Episodes { get; set; } = [];
}

public sealed class UserMovie
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string MovieId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? PosterUrl { get; set; }
    public string? Description { get; set; }
    public DateTime WatchedAt { get; set; }
}

public sealed class UserTvShowEpisode
{
    public Guid Id { get; set; }
    public Guid UserTvShowId { get; set; }
    public int Season { get; set; }
    public int Episode { get; set; }
    public bool Watched { get; set; }
    public DateTime UpdatedAt { get; set; }
}
