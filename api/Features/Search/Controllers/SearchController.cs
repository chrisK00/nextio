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
    public async Task<IActionResult> Search([FromQuery] string query, CancellationToken cancellationToken)
    {
        var response = await _tmdbSearchService.SearchAsync(query, cancellationToken);
        return Ok(response);
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
}
