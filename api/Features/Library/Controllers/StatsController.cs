using Data;
using Features.Library.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Extensions;
using nextio.Api.Features.Library.Services;

namespace nextio.Api.Features.Library.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class StatsController(ApplicationDbContext db, ILibrarySyncStatusStore syncStatusStore) : ControllerBase
{
    [HttpGet("library")]
    public async Task<IActionResult> GetLibraryStats(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var totalMoviesTask = db.UserMovies.CountAsync(x => x.UserId == userId, cancellationToken);
        var totalTvShowsTask = db.UserTvShows.CountAsync(x => x.UserId == userId && x.IsFollowing, cancellationToken);
        var showsWithEpisodesButNotFollowedTask = db.UserTvShows.CountAsync(x => x.UserId == userId && !x.IsFollowing && x.Episodes.Any(), cancellationToken);

        await Task.WhenAll(totalMoviesTask, totalTvShowsTask, showsWithEpisodesButNotFollowedTask);

        var (LastSyncAt, LastSyncSucceeded, LastSyncMessage) = syncStatusStore.Snapshot();
        return Ok(new LibraryStatsResponse(
            TotalMovies: await totalMoviesTask,
            TotalTvShows: await totalTvShowsTask,
            ShowsWithEpisodesButNotFollowed: await showsWithEpisodesButNotFollowedTask,
            LastSyncAt: LastSyncAt,
            LastSyncSucceeded: LastSyncSucceeded,
            LastSyncMessage: LastSyncMessage));
    }

    [HttpPost("backup")]
    public async Task<IActionResult> TriggerBackup([FromServices] BackupService backupService, CancellationToken cancellationToken)
    {
        var path = await backupService.CreateBackupAsync(cancellationToken);
        return Ok(new { success = true, backupFile = Path.GetFileName(path) });
    }

    [HttpGet("backups")]
    public IActionResult GetBackups([FromServices] BackupService backupService)
    {
        var backups = backupService.GetBackups();
        return Ok(backups);
    }
}
