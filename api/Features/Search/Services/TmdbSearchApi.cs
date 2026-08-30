using Features.Search.Models;
using nextio.Api.Features.Search.Services;

namespace Features.Search.Services;

public sealed class TmdbApi(HttpClient httpClient, IConfiguration configuration, ILogger<TmdbApi> logger)
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly IConfiguration _configuration = configuration;

    private string? GetApiKey()
    {
        return _configuration["Tmdb:ApiKey"] ?? Environment.GetEnvironmentVariable("TMDB_API_KEY");
    }

    private string AppendApiKey(string url)
    {
        var apiKey = GetApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("TMDb API key is not configured.");
        }

        var separator = url.Contains('?') ? '&' : '?';
        return $"{url}{separator}api_key={Uri.EscapeDataString(apiKey)}";
    }

    private static readonly SemaphoreSlim _globalRateLimiter = new(10, 10);

    public async Task<SearchResponse> SearchAsync(string query, bool includeAdult = false, CancellationToken cancellationToken = default)
    {
        var trimmedQuery = query.Trim();
        if (string.IsNullOrWhiteSpace(trimmedQuery) || string.IsNullOrWhiteSpace(GetApiKey()))
        {
            return new SearchResponse(Array.Empty<SearchItem>(), Array.Empty<SearchItem>());
        }

        var adultParam = includeAdult ? "true" : "false";
        var url = $"search/multi?query={Uri.EscapeDataString(trimmedQuery)}&include_adult={adultParam}&language=en-US&page=1";

        try
        {
            await _globalRateLimiter.WaitAsync(cancellationToken);
            TmdbMultiSearchResponse? response;
            try
            {
                response = await _httpClient.GetFromJsonAsync<TmdbMultiSearchResponse>(AppendApiKey(url), cancellationToken);
            }
            finally
            {
                _globalRateLimiter.Release();
            }

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
        catch (Exception ex)
        {
            logger.LogError(ex, "Search failed for query {Query}", query);
            return new SearchResponse(Array.Empty<SearchItem>(), Array.Empty<SearchItem>());
        }
    }

    public async Task<SearchResponse> TrendingAsync(bool includeAdult = false, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(GetApiKey()))
        {
            return new SearchResponse(Array.Empty<SearchItem>(), Array.Empty<SearchItem>());
        }

        try
        {
            await _globalRateLimiter.WaitAsync(cancellationToken);
            TmdbMultiSearchResponse? response;
            try
            {
                response = await _httpClient.GetFromJsonAsync<TmdbMultiSearchResponse>(
                    AppendApiKey("trending/all/week?language=en-US&page=1"), cancellationToken);
            }
            finally
            {
                _globalRateLimiter.Release();
            }

            var results = response?.Results ?? [];
            if (!includeAdult) results = results.Where(r => !r.Adult).ToList();

            return new SearchResponse(
                results.Where(r => r.MediaType == "tv").Select(MapTvShow).ToList(),
                results.Where(r => r.MediaType == "movie").Select(MapMovie).ToList());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Trending request failed");
            return new SearchResponse(Array.Empty<SearchItem>(), Array.Empty<SearchItem>());
        }
    }

    public async Task<TmdbSeasonResponse?> GetSeasonInfoAsync(string showId, int season, SemaphoreSlim? tmdbRateLimiter = null, CancellationToken cancellationToken = default)
    {
        var parsedShowId = TmdbShowIdExtractor.Extract(showId);
        var url = $"tv/{parsedShowId}/season/{season}";
        var limiter = tmdbRateLimiter ?? _globalRateLimiter;
        try
        {
            await limiter.WaitAsync(cancellationToken);
            try
            {
                var response = await _httpClient.GetFromJsonAsync<TmdbSeasonResponse>(AppendApiKey(url), cancellationToken);
                return response;
            }
            finally
            {
                limiter.Release();
            }
        }
        catch (Exception ex)
        {
            logger.LogError("Failed to fetch season info for show: {showId}, season: {season}. Url: {url}. Error: {error}", parsedShowId, season, url, ex.Message);
            return null;
        }
    }

    public async Task<TmdbEpisode?> GetEpisodeAsync(string showId, int season, int episode, CancellationToken cancellationToken = default)
    {
        var parsedShowId = TmdbShowIdExtractor.Extract(showId);
        var url = $"tv/{parsedShowId}/season/{season}/episode/{episode}?language=en-US";
        try
        {
            await _globalRateLimiter.WaitAsync(cancellationToken);
            try
            {
                return await _httpClient.GetFromJsonAsync<TmdbEpisode>(AppendApiKey(url), cancellationToken);
            }
            finally
            {
                _globalRateLimiter.Release();
            }
        }
        catch (Exception ex)
        {
            logger.LogError("Failed to fetch episode for show: {showId}, s{season}e{episode}. Error: {error}", parsedShowId, season, episode, ex.Message);
            return null;
        }
    }

    public async Task<SearchDetailResponse?> GetDetailsAsync(string mediaType, string showId, CancellationToken cancellationToken = default)
    {
        var parsedShowId = TmdbShowIdExtractor.Extract(showId);
        var endpoint = string.Equals(mediaType, "movie", StringComparison.OrdinalIgnoreCase) ? $"movie/{parsedShowId}" : $"tv/{parsedShowId}";
        var url = $"{endpoint}?language=en-US";

        try
        {
            await _globalRateLimiter.WaitAsync(cancellationToken);
            TmdbDetailResponse? response;
            try
            {
                response = await _httpClient.GetFromJsonAsync<TmdbDetailResponse?>(AppendApiKey(url), cancellationToken);
            }
            finally
            {
                _globalRateLimiter.Release();
            }

            if (response == null)
            {
                logger.LogInformation("TMDB could not find: {mediaType} {showId}", mediaType, showId);
                return null;
            }

            return new SearchDetailResponse
            {
                Id = response.Id,
                Description = response.Description,
                InProduction = response.InProduction,
                Languages = response.Languages,
                LastEpisodeToAir = response.LastEpisodeToAir,
                MediaType = mediaType.ToLower(),
                Name = !string.IsNullOrWhiteSpace(response.Name) ? response.Name : response.TmdbMovieTitle,
                ReleaseDate = !string.IsNullOrWhiteSpace(response.ReleaseDate) ? response.ReleaseDate : response.FirstAirDate,
                NextEpisodeToAir = response.NextEpisodeToAir,
                NumberOfEpisodes = response.NumberOfEpisodes,
                NumberOfSeasons = response.NumberOfSeasons,
                PosterUrl = response.PosterPath,
                Seasons = response.Seasons,
                Status = response.Status,
                VoteAverage = response.VoteAverage,
                VoteCount = response.VoteCount,
                Runtime = response.Runtime ?? response.EpisodeRunTime?.FirstOrDefault(),
                Genres = (response.Genres ?? Array.Empty<TmdbGenre>())
                    .Select(g => g.Name)
                    .Where(g => !string.IsNullOrWhiteSpace(g))
                    .ToArray(),
            };
        }
        catch (Exception)
        {
            logger.LogError("Failed to fetch details for showid: {showId}. Url: {url}", parsedShowId, endpoint);
            throw;
        }
    }

    private static SearchItem MapTvShow(TmdbMultiSearchResult result)
    {
        var title = result.Name ?? "Untitled";
        return new SearchItem(
            Id: $"{result.Id}",
            Title: title,
            MediaType: "tv",
            Status: "Tracked",
            EpisodesWatched: 0,
            EpisodesTotal: 1,
            NextEpisodeTitle: null,
            NextEpisode: null,
            NextReleaseDate: null,
            Description: result.Overview ?? $"Search result for {title}",
            PosterUrl: ToPosterUrl(result.PosterPath),
            ReleaseDate: result.FirstAirDate ?? result.ReleaseDate);
    }

    private static SearchItem MapMovie(TmdbMultiSearchResult result)
    {
        var title = result.Title ?? "Untitled";
        return new SearchItem(
            Id: $"{result.Id}",
            Title: title,
            MediaType: "movie",
            Status: "Released",
            EpisodesWatched: 0,
            EpisodesTotal: 1,
            null,
            null,
            null,
            Description: result.Overview ?? $"Search result for {title}",
            PosterUrl: ToPosterUrl(result.PosterPath),
            ReleaseDate: result.ReleaseDate ?? result.FirstAirDate);
    }

    public async Task<IReadOnlyList<SeasonItem>> GetSeasonsAsync(string showId, CancellationToken cancellationToken = default)
    {
        var parsedShowId = TmdbShowIdExtractor.Extract(showId);
        // Fetch TV details to get the list of seasons
        var detailsUrl = $"tv/{parsedShowId}?language=en-US";

        TmdbTvDetailsResponse? tvDetails = null;
        try
        {
            await _globalRateLimiter.WaitAsync(cancellationToken);
            try
            {
                tvDetails = await _httpClient.GetFromJsonAsync<TmdbTvDetailsResponse>(AppendApiKey(detailsUrl), cancellationToken);
            }
            finally
            {
                _globalRateLimiter.Release();
            }

            if (tvDetails is null)
            {
                return Array.Empty<SeasonItem>();
            }
        }
        catch (Exception e)
        {
            logger.LogError(e, "Failed to fetch seasons for showid: {showId}. Url: {url}", parsedShowId, detailsUrl);
            return Array.Empty<SeasonItem>();
        }

        // Fetch each season in parallel, skip season 0 (specials)
        var seasonNumbers = tvDetails.Seasons
            .Where(s => s.SeasonNumber > 0)
            .Select(s => s.SeasonNumber)
            .ToList();

        var seasonTasks = seasonNumbers.Select(async num =>
        {
            var url = AppendApiKey($"tv/{parsedShowId}/season/{num}?language=en-US");
            await _globalRateLimiter.WaitAsync(cancellationToken);
            try
            {
                var season = await _httpClient.GetFromJsonAsync<TmdbSeasonResponse>(url, cancellationToken);
                return season;
            }
            finally
            {
                _globalRateLimiter.Release();
            }
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
