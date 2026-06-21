using Features.Search.Models;

namespace Features.Search.Services;

public sealed class TmdbApi(HttpClient httpClient, IConfiguration configuration, ILogger<TmdbApi> logger)
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

    public async Task<TmdbSeasonResponse?> GetSeasonInfoAsync(string showId, int season, CancellationToken cancellationToken = default)
    {
        var url = $"tv/{showId}/season/{season}";
        try
        {
            var response = await _httpClient.GetFromJsonAsync<TmdbSeasonResponse>(AppendApiKey(url), cancellationToken);

            return response;

        }
        catch (Exception ex)
        {
            logger.LogError("Failed to fetch season info for show: {showId}, season: {season}. Url: {}. Error: {error}", showId, season, url, ex.Message);
            return null;
        }
    }

    public async Task<TmdbDetailResponse?> GetDetailsAsync(string mediaType, int id, CancellationToken cancellationToken = default)
    {
        var endpoint = string.Equals(mediaType, "movie", StringComparison.OrdinalIgnoreCase) ? $"movie/{id}" : $"tv/{id}";
        var url = $"{endpoint}?language=en-US";

        try
        {
            var response = await _httpClient.GetFromJsonAsync<TmdbDetailResponse>(AppendApiKey(url), cancellationToken);

            return response;
        }
        catch (Exception)
        {
            logger.LogError("Failed to fetch details for showid: {showId}. Url: {url}", id, endpoint);
            throw;
        }

    }

    // TODO
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

    public async Task<IReadOnlyList<SeasonItem>> GetSeasonsAsync(int id, CancellationToken cancellationToken = default)
    {
        // Fetch TV details to get the list of seasons
        var detailsUrl = AppendApiKey($"tv/{id}?language=en-US");
        var tvDetails = await _httpClient.GetFromJsonAsync<TmdbTvDetailsResponse>(detailsUrl, cancellationToken);

        if (tvDetails is null)
        {
            return Array.Empty<SeasonItem>();
        }

        // Fetch each season in parallel, skip season 0 (specials)
        var seasonNumbers = tvDetails.Seasons
            .Where(s => s.SeasonNumber > 0)
            .Select(s => s.SeasonNumber)
            .ToList();

        var seasonTasks = seasonNumbers.Select(async num =>
        {
            var url = AppendApiKey($"tv/{id}/season/{num}?language=en-US");
            var season = await _httpClient.GetFromJsonAsync<TmdbSeasonResponse>(url, cancellationToken);
            return season;
        });

        var seasons = await Task.WhenAll(seasonTasks);

        return seasons
            .Where(s => s is not null)
            .Select(s => new SeasonItem(
                s!.SeasonNumber,
                s.Name ?? $"Season {s.SeasonNumber}",
                s.Episodes.Select(e => new SeasonEpisodeItem(e.EpisodeNumber, e.Name ?? $"Episode {e.EpisodeNumber}", e.AirDate)).ToList()))
            .OrderBy(s => s.SeasonNumber)
            .ToList();
    }

    private static string? ExtractYear(string? date)
        => DateTime.TryParse(date, out var parsed) ? parsed.Year.ToString() : null;

    private static string? ToPosterUrl(string? posterPath)
        => string.IsNullOrWhiteSpace(posterPath) ? null : $"https://image.tmdb.org/t/p/w500{posterPath}";
}
