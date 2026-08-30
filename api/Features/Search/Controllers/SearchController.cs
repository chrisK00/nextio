using Features.Search.Models;
using Features.Search.Services;
using Microsoft.AspNetCore.Mvc;

namespace Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SearchController(TmdbApi tmdbSearchService) : ControllerBase
{
    private readonly TmdbApi _tmdbSearchService = tmdbSearchService;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string query, [FromQuery] bool includeAdult = false, CancellationToken cancellationToken = default)
    {
        var response = await _tmdbSearchService.SearchAsync(query, includeAdult, cancellationToken);
        return Ok(response);
    }

    [HttpGet("trending")]
    public async Task<IActionResult> Trending([FromQuery] bool includeAdult = false, CancellationToken cancellationToken = default)
    {
        return Ok(await _tmdbSearchService.TrendingAsync(includeAdult, cancellationToken));
    }

    [HttpGet("{mediaType}/{id}")]
    public async Task<ActionResult<SearchDetailResponse>> Details(string mediaType, string id, CancellationToken cancellationToken)
    {
        var response = await _tmdbSearchService.GetDetailsAsync(mediaType, id, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpGet("tv/{id}/seasons")]
    public async Task<IActionResult> Seasons(string id, CancellationToken cancellationToken)
    {
        var seasons = await _tmdbSearchService.GetSeasonsAsync(id, cancellationToken);
        return Ok(seasons);
    }

    [HttpGet("tv/{id}/season/{season}/episode/{episode}")]
    public async Task<IActionResult> EpisodeDetail(string id, int season, int episode, CancellationToken cancellationToken)
    {
        var ep = await _tmdbSearchService.GetEpisodeAsync(id, season, episode, cancellationToken);
        return ep is null ? NotFound() : Ok(new { ep.Name, ep.Overview, ep.AirDate, ep.EpisodeNumber, Season = season });
    }
}
