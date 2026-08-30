using Data;
using Features.Library.Models;
using Features.Library.Services;
using Features.Search.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace nextio.Api.Tests;

public class LibraryServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ApplicationDbContext _db;
    private readonly LibraryService _service;

    public LibraryServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new ApplicationDbContext(options);
        _db.Database.EnsureCreated();

        var syncServiceMock = new Mock<ILibrarySyncService>();
        var tmdbLoggerMock = new Mock<ILogger<TmdbApi>>();
        var configMock = new Mock<IConfiguration>();
        configMock.Setup(c => c["Tmdb:ApiKey"]).Returns("dummy_key");

        var httpClient = new HttpClient();
        var tmdbApi = new TmdbApi(httpClient, configMock.Object, tmdbLoggerMock.Object);
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var loggerMock = new Mock<ILogger<LibraryService>>();

        _service = new LibraryService(_db, syncServiceMock.Object, tmdbApi, memoryCache, loggerMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task UpsertTvShowAsync_ShouldCreateShow()
    {
        var userId = Guid.NewGuid();

        var request = new UpsertTrackedShowRequest(
            Id: "tv:100",
            Title: "Breaking Bad",
            PosterUrl: "https://example.com/poster.jpg",
            Network: "AMC",
            Status: "Ended",
            Description: "A chemistry teacher turned manufacturer.",
            NextReleaseDate: null,
            ReleaseDate: "2008-01-20",
            MediaType: "tv"
        );

        await _service.UpsertTvShowAsync(userId, request);

        var savedShow = await _db.UserTvShows.FirstOrDefaultAsync(s => s.UserId == userId && s.ShowId == "tv:100");
        Assert.NotNull(savedShow);
        Assert.Equal("Breaking Bad", savedShow.Title);
        Assert.True(savedShow.IsFollowing);
    }

    [Fact]
    public async Task SetEpisodeAsync_And_SetEpisodesBulk_ShouldTrackProgress()
    {
        var userId = Guid.NewGuid();

        // 1. Add show
        await _service.UpsertTvShowAsync(userId, new UpsertTrackedShowRequest(
            "tv:200", "Show 200", null, null, "Running", "Desc", null, "2020-01-01", "tv"
        ));

        // 2. Set single episode watched
        await _service.SetEpisodeAsync(userId, "tv:200", new UpdateEpisodeRequest(Season: 1, Episode: 1, Watched: true));

        var ep1 = await _db.UserTvShowEpisodes.FirstOrDefaultAsync(e => e.Season == 1 && e.Episode == 1);
        Assert.NotNull(ep1);
        Assert.True(ep1.Watched);

        // 3. Set bulk episodes
        await _service.SetEpisodesAsync(userId, "tv:200", new BulkUpdateEpisodeRequest(new List<UpdateEpisodeRequest>
        {
            new(Season: 1, Episode: 2, Watched: true),
            new(Season: 1, Episode: 3, Watched: true),
        }));

        var totalWatched = await _db.UserTvShowEpisodes.CountAsync(e => e.Watched);
        Assert.Equal(3, totalWatched);

        // 4. Clear progress
        await _service.ClearProgressAsync(userId, "tv:200");
        var afterClearCount = await _db.UserTvShowEpisodes.CountAsync();
        Assert.Equal(0, afterClearCount);
    }

    [Fact]
    public async Task Movie_Lifecycle_UpsertSetWatchedRemove()
    {
        var userId = Guid.NewGuid();

        // 1. Add movie
        var movieReq = new UpsertTrackedShowRequest(
            "movie:550", "Fight Club", null, null, "Released", "An insomniac office worker...", null, "1999-10-15", "movie"
        );
        await _service.UpsertMovieAsync(userId, movieReq);

        var movies = await _service.GetMovieLibraryAsync(userId);
        Assert.Equal(1, movies.Length);
        Assert.False(movies.Items[0].Watched);

        // 2. Mark watched
        await _service.SetMovieWatchedAsync(userId, "movie:550", true);
        var watchedMovies = await _service.GetMovieLibraryAsync(userId, "watched");
        Assert.Equal(1, watchedMovies.Length);
        Assert.True(watchedMovies.Items[0].Watched);

        // 3. Remove movie
        await _service.RemoveMovieAsync(userId, "movie:550");
        var emptyMovies = await _service.GetMovieLibraryAsync(userId);
        Assert.Equal(0, emptyMovies.Length);
    }
}
