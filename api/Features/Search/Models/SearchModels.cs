namespace Features.Search.Models;

public sealed class SearchDetailResponse
{
    public int Id { get; init; }

    public string? Name { get; init; }

    public string? Description { get; init; }

    public string? PosterUrl { get; init; }

    public string? ReleaseDate { get; set; }
    public TmdbNextEpisode? NextEpisodeToAir { get; init; }
    public bool InProduction { get; init; }
    public IReadOnlyList<string> Languages { get; init; } = [];
    public TmdbNextEpisode? LastEpisodeToAir { get; init; }
    public int NumberOfEpisodes { get; init; }
    public int NumberOfSeasons { get; init; }
    public string? Status { get; init; }
    public double? VoteAverage { get; init; }
    public int? VoteCount { get; init; }
    public int? Runtime { get; init; }
    public IReadOnlyList<string> Genres { get; init; } = [];

    public TmdbSeason[] Seasons { get; init; } = [];
    public string MediaType { get; set; }
}
