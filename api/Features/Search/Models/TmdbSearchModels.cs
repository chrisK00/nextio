using System.Text.Json.Serialization;

namespace Features.Search.Models;

public sealed record SearchResponse(
    IReadOnlyList<SearchItem> TvShows,
    IReadOnlyList<SearchItem> Movies);

public sealed record SearchItem(
    string Id,
    string Title,
    string MediaType,
    string Status,
    int EpisodesWatched,
    int EpisodesTotal,
    string? NextEpisodeTitle,
    string? NextEpisode,
    string? NextReleaseDate,
    string Description,
    string? PosterUrl,
    string? ReleaseYear);

public sealed class TmdbMultiSearchResponse
{
    [JsonPropertyName("page")]
    public int Page { get; init; }

    [JsonPropertyName("results")]
    public IReadOnlyList<TmdbMultiSearchResult> Results { get; init; } = Array.Empty<TmdbMultiSearchResult>();
}

public sealed class TmdbMultiSearchResult
{
    [JsonPropertyName("media_type")]
    public string? MediaType { get; init; }

    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("title")]
    public string? Title { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("overview")]
    public string? Overview { get; init; }

    [JsonPropertyName("poster_path")]
    public string? PosterPath { get; init; }

    [JsonPropertyName("release_date")]
    public string? ReleaseDate { get; init; }

    [JsonPropertyName("first_air_date")]
    public string? FirstAirDate { get; init; }

    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; init; }
}

public sealed class TmdbDetailResponse
{
    [JsonPropertyName("id")]
    public int Id { get; init; }


    [JsonPropertyName("title")]
    public string? TmdbMovieTitle { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("overview")]
    public string? Overview { get; init; }

    [JsonPropertyName("poster_path")]
    public string? PosterPath
    {
        get;
        init
        {
            if (string.IsNullOrEmpty(value) || value.StartsWith("https://image.tmdb.org"))
            {
                field = value;
            }
            else
            {
                field = $"https://image.tmdb.org/t/p/w500{value}";
            }
        }
    }

    [JsonPropertyName("first_air_date")]
    public string? FirstAirDate { get; init; }

    [JsonPropertyName("release_date")]
    public string? ReleaseDate { get; init; }

    [JsonPropertyName("next_episode_to_air")]
    public TmdbNextEpisode? NextEpisodeToAir { get; init; }
    [JsonPropertyName("in_production")]
    public bool InProduction { get; init; }
    [JsonPropertyName("languages")]
    public IReadOnlyList<string> Languages { get; init; } = [];
    [JsonPropertyName("last_episode_to_air")]
    public TmdbNextEpisode? LastEpisodeToAir { get; init; }
    [JsonPropertyName("number_of_episodes")]
    public int NumberOfEpisodes { get; init; }
    [JsonPropertyName("number_of_seasons")]
    public int NumberOfSeasons { get; init; }
    [JsonPropertyName("status")]
    public string? Status { get; init; }
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; init; }
    [JsonPropertyName("vote_count")]
    public int? VoteCount { get; init; }

    [JsonPropertyName("seasons")]
    public TmdbSeason[] Seasons { get => field.Where(x => x.SeasonNumber != 0).ToArray(); init; } = [];
    public string MediaType { get; set; }
}

public sealed class TmdbSeason
{
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; init; }
    [JsonPropertyName("season_number")]
    public int SeasonNumber { get; init; }
    [JsonPropertyName("episode_count")]
    public int EpisodeCount { get; init; }
    [JsonPropertyName("air_date")]
    public DateTime? AirDate { get; init; }
}

public sealed class TmdbNextEpisode
{
    [JsonPropertyName("air_date")]
    public string? AirDate { get; init; }
    [JsonPropertyName("name")]
    public string? Name { get; init; }
    [JsonPropertyName("episode_number")]
    public int EpisodeNumber { get; init; }
    [JsonPropertyName("season_number")]
    public int SeasonNumber { get; init; }
    [JsonPropertyName("vote_average")]
    public double? VoteAverage { get; init; }
    [JsonPropertyName("vote_count")]
    public int? VoteCount { get; init; }
    [JsonPropertyName("runtime")]
    public int? Runtime { get; init; }
    [JsonPropertyName("id")]
    public int Id { get; init; }
}

// Seasons/episodes models

public sealed record SeasonEpisodeItem(int EpisodeNumber, string Name, string? AirDate);

public sealed record SeasonItem(int SeasonNumber, string Name, IReadOnlyList<SeasonEpisodeItem> Episodes);

public sealed class TmdbSeasonResponse
{
    [JsonPropertyName("season_number")]
    public int SeasonNumber { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("episodes")]
    public IReadOnlyList<TmdbEpisode> Episodes { get; init; } = Array.Empty<TmdbEpisode>();
}

public sealed class TmdbEpisode
{
    [JsonPropertyName("episode_number")]
    public int EpisodeNumber { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("air_date")]
    public string? AirDate { get; init; }
}

public sealed class TmdbTvDetailsResponse
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("seasons")]
    public IReadOnlyList<TmdbTvSeasonInfo> Seasons { get => field.Where(x => x.SeasonNumber != 0).ToArray(); init; } = Array.Empty<TmdbTvSeasonInfo>();
}

public sealed class TmdbTvSeasonInfo
{
    [JsonPropertyName("season_number")]
    public int SeasonNumber { get; init; }

    [JsonPropertyName("episode_count")]
    public int EpisodeCount { get; init; }
}
