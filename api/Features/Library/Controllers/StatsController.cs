using Data;
using Features.Library.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Extensions;
using nextio.Api.Features.Library.Services;
using nextio.Api.Extensions;
using Services;

namespace nextio.Api.Features.Library.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class StatsController(ApplicationDbContext db, ILibrarySyncStatusStore syncStatusStore, InMemoryLogProvider logProvider, IConfiguration configuration) : ControllerBase
{
    [HttpGet("library")]
    public async Task<IActionResult> GetLibraryStats(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var totalMoviesTask = db.UserMovies.CountAsync(x => x.UserId == userId, cancellationToken);
        var totalTvShowsTask = db.UserTvShows.CountAsync(x => x.UserId == userId && x.IsFollowing, cancellationToken);
        var unfollowedShowsWithProgressTask = db.UserTvShows
            .AsNoTracking()
            .Where(x => x.UserId == userId && !x.IsFollowing && x.Episodes.Any())
            .OrderBy(x => x.Title)
            .Select(x => new UnfollowedShowWithProgressDto(x.ShowId, x.Title))
            .ToListAsync(cancellationToken);

        await Task.WhenAll(totalMoviesTask, totalTvShowsTask, unfollowedShowsWithProgressTask);

        var (LastSyncAt, LastSyncSucceeded, LastSyncMessage) = syncStatusStore.Snapshot();
        return Ok(new LibraryStatsResponse(
            TotalMovies: await totalMoviesTask,
            TotalTvShows: await totalTvShowsTask,
            ShowsWithEpisodesButNotFollowed: (await unfollowedShowsWithProgressTask).Count,
            LastSyncAt: LastSyncAt,
            LastSyncSucceeded: LastSyncSucceeded,
            LastSyncMessage: LastSyncMessage,
            UnfollowedShowsWithProgress: await unfollowedShowsWithProgressTask));
    }

    [HttpPost("backup")]
    public async Task<IActionResult> TriggerBackup([FromServices] BackupService backupService, CancellationToken cancellationToken)
    {
        if (!User.HasDiagnosticsAccess(configuration)) return Forbid();
        var path = await backupService.CreateBackupAsync(cancellationToken);
        return Ok(new { success = true, backupFile = Path.GetFileName(path) });
    }

    [HttpGet("backups")]
    public IActionResult GetBackups([FromServices] BackupService backupService) => User.HasDiagnosticsAccess(configuration) ? Ok(backupService.GetBackups()) : Forbid();

    [HttpGet("logs")]
    public IActionResult GetLogs([FromQuery] int count = 200) => User.HasDiagnosticsAccess(configuration) ? Ok(logProvider.GetRecent(count)) : Forbid();

}
