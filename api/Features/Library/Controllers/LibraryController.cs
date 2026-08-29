using Extensions;
using Features.Library.Models;
using Features.Library.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using nextio.Api.Extensions;

namespace nextio.Api.Features.Library.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class LibraryController(ILibraryService libraryService) : ControllerBase
{
    private readonly ILibraryService _libraryService = libraryService;

    [HttpGet("{mediaType}")]
    public async Task<IActionResult> GetLibrary(string mediaType, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        if (mediaType == ShowMediaType.Movie)
        {
            var response = await _libraryService.GetMovieLibraryAsync(userId, status, cancellationToken);
            return Ok(response);
        }
        else
        {
            var response = await _libraryService.GetTvShowLibraryAsync(userId, cancellationToken);
            return Ok(response);
        }
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

    [HttpPost("movies/{id}/watched")]
    public async Task<IActionResult> SetMovieWatched(string id, [FromBody] UpdateMovieWatchStatusRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        try
        {
            await _libraryService.SetMovieWatchedAsync(userId, id, request.Watched, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException e)
        {

            return NotFound(e.Message);
        }
    }

    [HttpPost("tv/{id}/episodes")]
    public async Task<IActionResult> SetEpisode(string id, [FromBody] UpdateEpisodeRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        try
        {
            await _libraryService.SetEpisodeAsync(userId, id, request, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    [HttpPost("tv/{id}/episodes/batch")]
    public async Task<IActionResult> SetEpisodes(string id, [FromBody] BulkUpdateEpisodeRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        try
        {
            await _libraryService.SetEpisodesAsync(userId, id, request, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
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

    [HttpGet("lists")]
    public async Task<IActionResult> GetLists([FromQuery] string? mediaType, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var lists = await _libraryService.GetUserListsAsync(userId, mediaType, cancellationToken);
        return Ok(lists);
    }

    [HttpGet("lists/{id:guid}")]
    public async Task<IActionResult> GetList(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var list = await _libraryService.GetUserListAsync(userId, id, cancellationToken);
        return list is null ? NotFound() : Ok(list);
    }

    [HttpPost("lists")]
    public async Task<IActionResult> CreateList([FromBody] CreateListRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("List name is required.");
        var list = await _libraryService.CreateUserListAsync(userId, request, cancellationToken);
        return CreatedAtAction(nameof(GetList), new { id = list.Id }, list);
    }

    [HttpPut("lists/{id:guid}")]
    public async Task<IActionResult> UpdateList(Guid id, [FromBody] UpdateListRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var list = await _libraryService.UpdateUserListAsync(userId, id, request, cancellationToken);
        return list is null ? NotFound() : Ok(list);
    }

    [HttpDelete("lists/{id:guid}")]
    public async Task<IActionResult> DeleteList(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var success = await _libraryService.DeleteUserListAsync(userId, id, cancellationToken);
        return success ? NoContent() : NotFound();
    }

    [HttpPost("lists/{id:guid}/items")]
    public async Task<IActionResult> AddListItem(Guid id, [FromBody] AddListItemRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var list = await _libraryService.AddItemToUserListAsync(userId, id, request, cancellationToken);
        return list is null ? NotFound() : Ok(list);
    }

    [HttpDelete("lists/{id:guid}/items/{itemId}")]
    public async Task<IActionResult> RemoveListItem(Guid id, string itemId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var list = await _libraryService.RemoveItemFromUserListAsync(userId, id, itemId, cancellationToken);
        return list is null ? NotFound() : Ok(list);
    }
}
