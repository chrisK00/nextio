using Features.Search.Models;

namespace Features.Search.Services;

public sealed class TmdbSearchService(HttpClient httpClient, IConfiguration configuration)
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly IConfiguration _configuration = configuration;

    private string AppendApiKey(string url)
    {
        var apiKey = _configuration["Tmdb:ApiKey"] ?? Environment.GetEnvironmentVariable("TMDB_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("TMDb API key is not configured.");
        }

        var separator = url.Contains('?') ? '&' : '?';
        return $"{url}{separator}api_key={Uri.EscapeDataString(apiKey)}";
    }

    public async Task<SearchResponse> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        var trimmedQuery = query.Trim();
        if (string.IsNullOrWhiteSpace(trimmedQuery))
        {
            return new SearchResponse(Array.Empty<SearchItem>(), Array.Empty<SearchItem>());
        }

        var url = $"search/multi?query={Uri.EscapeDataString(trimmedQuery)}&include_adult=true&language=en-US&page=1";

        var response = await _httpClient.GetFromJsonAsync<TmdbMultiSearchResponse>(AppendApiKey(url), cancellationToken);

        if (response?.Results is null || response.Results.Count == 0)
        {
            return new SearchResponse(Array.Empty<SearchItem>(), Array.Empty<SearchItem>());
        }

        var tvShows = response.Results
            .Where(r => string.Equals(r.MediaType, "tv", StringComparison.OrdinalIgnoreCase))
            .Select(MapTvShow)
            .ToList();

        var movies = response.Results
            .Where(r => string.Equals(r.MediaType, "movie", StringComparison.OrdinalIgnoreCase))
            .Select(MapMovie)
            .ToList();

        return new SearchResponse(tvShows, movies);
    }

    public async Task<SearchItem?> GetDetailsAsync(string mediaType, int id, CancellationToken cancellationToken = default)
    {
        var endpoint = string.Equals(mediaType, "movie", StringComparison.OrdinalIgnoreCase) ? $"movie/{id}" : $"tv/{id}";
        var url = $"{endpoint}?language=en-US";
        var response = await _httpClient.GetFromJsonAsync<TmdbDetailResponse>(AppendApiKey(url), cancellationToken);
        if (response is null)
        {
            return null;
        }

        return string.Equals(mediaType, "movie", StringComparison.OrdinalIgnoreCase)
            ? MapMovie(new TmdbMultiSearchResult
            {
                MediaType = "movie",
                Id = response.Id,
                Title = response.Title,
                Name = response.Name,
                Overview = response.Overview,
                PosterPath = response.PosterPath,
                ReleaseDate = response.ReleaseDate,
                FirstAirDate = response.FirstAirDate,
            })
            : MapTvShow(new TmdbMultiSearchResult
            {
                MediaType = "tv",
                Id = response.Id,
                Title = response.Title,
                Name = response.Name,
                Overview = response.Overview,
                PosterPath = response.PosterPath,
                ReleaseDate = response.ReleaseDate,
                FirstAirDate = response.FirstAirDate,
            });
    }

    private static SearchItem MapTvShow(TmdbMultiSearchResult result)
    {
        var title = result.Name ?? "Untitled";
        return new SearchItem(
            Id: $"{result.Id}",
            Title: title,
            MediaType: "tv",
            Network: "TMDb",
            Status: "Released",
            EpisodesWatched: 0,
            EpisodesTotal: 1,
            NextEpisodeTitle: "TV Series",
            NextEpisode: result.FirstAirDate,
            NextReleaseDate: result.FirstAirDate,
            Description: result.Overview ?? $"Search result for {title}",
            PosterUrl: ToPosterUrl(result.PosterPath),
            ReleaseYear: ExtractYear(result.FirstAirDate));
    }

    private static SearchItem MapMovie(TmdbMultiSearchResult result)
    {
        var title = result.Title ?? "Untitled";
        return new SearchItem(
            Id: $"{result.Id}",
            Title: title,
            MediaType: "movie",
            Network: "TMDb",
            Status: "Released",
            EpisodesWatched: 0,
            EpisodesTotal: 1,
            NextEpisodeTitle: "Movie",
            NextEpisode: result.ReleaseDate,
            NextReleaseDate: result.ReleaseDate,
            Description: result.Overview ?? $"Search result for {title}",
            PosterUrl: ToPosterUrl(result.PosterPath),
            ReleaseYear: ExtractYear(result.ReleaseDate));
    }

    private static string? ExtractYear(string? date)
        => DateTime.TryParse(date, out var parsed) ? parsed.Year.ToString() : null;

    private static string? ToPosterUrl(string? posterPath)
        => string.IsNullOrWhiteSpace(posterPath) ? null : $"https://image.tmdb.org/t/p/w500{posterPath}";
}
