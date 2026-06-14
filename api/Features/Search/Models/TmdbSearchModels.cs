using System.Text.Json.Serialization;

namespace Features.Search.Models;

public sealed record SearchResponse(
    IReadOnlyList<SearchItem> TvShows,
    IReadOnlyList<SearchItem> Movies);

public sealed record SearchItem(
    string Id,
    string Title,
    string MediaType,
    string Network,
    string Status,
    int EpisodesWatched,
    int EpisodesTotal,
    string NextEpisodeTitle,
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

    [JsonPropertyName("first_air_date")]
    public string? FirstAirDate { get; init; }

    [JsonPropertyName("release_date")]
    public string? ReleaseDate { get; init; }
}
