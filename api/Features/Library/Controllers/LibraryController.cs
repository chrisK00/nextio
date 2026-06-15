using Extensions;
using Features.Library.Models;
using Features.Library.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class LibraryController(ILibraryService libraryService) : ControllerBase
{
    private readonly ILibraryService _libraryService = libraryService;

    [HttpGet]
    public async Task<IActionResult> GetLibrary(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var response = await _libraryService.GetLibraryAsync(userId, cancellationToken);
        return Ok(response);
    }

    [HttpGet("tv/{id}")]
    public async Task<IActionResult> GetTvShow(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var response = await _libraryService.GetTvShowAsync(userId, id, cancellationToken);
        return response is null ? NotFound() : Ok(response);
    }

    [HttpPost("tv")]
    public async Task<IActionResult> FollowTvShow([FromBody] UpsertTrackedShowRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!string.Equals(request.MediaType, "tv", StringComparison.OrdinalIgnoreCase)) return BadRequest();

        await _libraryService.UpsertTvShowAsync(userId, request, cancellationToken);
        return NoContent();
    }

    [HttpPost("movies")]
    public async Task<IActionResult> AddMovie([FromBody] UpsertTrackedShowRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!string.Equals(request.MediaType, "movie", StringComparison.OrdinalIgnoreCase)) return BadRequest();

        await _libraryService.UpsertMovieAsync(userId, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("tv/{id}")]
    public async Task<IActionResult> UnfollowTvShow(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        await _libraryService.RemoveTvShowAsync(userId, id, cancellationToken);
        return NoContent();
    }

    [HttpDelete("movies/{id}")]
    public async Task<IActionResult> RemoveMovie(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        await _libraryService.RemoveMovieAsync(userId, id, cancellationToken);
        return NoContent();
    }

    [HttpPost("tv/{id}/episodes")]
    public async Task<IActionResult> SetEpisode(string id, [FromBody] UpdateEpisodeRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        await _libraryService.SetEpisodeAsync(userId, id, request, cancellationToken);
        return NoContent();
    }

    [HttpDelete("tv/{id}/episodes")]
    public async Task<IActionResult> ClearProgress(string id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        await _libraryService.ClearProgressAsync(userId, id, cancellationToken);
        return NoContent();
    }

    [HttpPost("sync")]
    public async Task<IActionResult> SyncLibrary([FromServices] ILibrarySyncService syncService, CancellationToken cancellationToken)
    {
        var result = await syncService.SyncAllAsync(cancellationToken);
        return Ok(result);
    }
}
