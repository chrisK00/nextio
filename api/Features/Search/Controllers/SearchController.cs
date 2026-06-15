using Features.Search.Services;
using Microsoft.AspNetCore.Mvc;

namespace Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SearchController(TmdbSearchService tmdbSearchService) : ControllerBase
{
    private readonly TmdbSearchService _tmdbSearchService = tmdbSearchService;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string query, CancellationToken cancellationToken)
    {
        var response = await _tmdbSearchService.SearchAsync(query, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{mediaType}/{id:int}")]
    public async Task<IActionResult> Details(string mediaType, int id, CancellationToken cancellationToken)
    {
        var response = await _tmdbSearchService.GetDetailsAsync(mediaType, id, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpGet("tv/{id:int}/seasons")]
    public async Task<IActionResult> Seasons(int id, CancellationToken cancellationToken)
    {
        var seasons = await _tmdbSearchService.GetSeasonsAsync(id, cancellationToken);
        return Ok(seasons);
    }
}
