using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class Lib : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserMovies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MovieId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    PosterUrl = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    WatchedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMovies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserTvShows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShowId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    PosterUrl = table.Column<string>(type: "TEXT", nullable: true),
                    Network = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    NextReleaseDate = table.Column<string>(type: "TEXT", nullable: true),
                    LastSyncedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    SyncError = table.Column<string>(type: "TEXT", nullable: true),
                    FollowedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTvShows", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserTvShowEpisodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserTvShowId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Season = table.Column<int>(type: "INTEGER", nullable: false),
                    Episode = table.Column<int>(type: "INTEGER", nullable: false),
                    Watched = table.Column<bool>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTvShowEpisodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserTvShowEpisodes_UserTvShows_UserTvShowId",
                        column: x => x.UserTvShowId,
                        principalTable: "UserTvShows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserMovies_UserId_MovieId",
                table: "UserMovies",
                columns: new[] { "UserId", "MovieId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserTvShows_UserId_ShowId",
                table: "UserTvShows",
                columns: new[] { "UserId", "ShowId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserTvShowEpisodes_UserTvShowId_Season_Episode",
                table: "UserTvShowEpisodes",
                columns: new[] { "UserTvShowId", "Season", "Episode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UserTvShowEpisodes");
            migrationBuilder.DropTable(name: "UserMovies");
            migrationBuilder.DropTable(name: "UserTvShows");
        }
    }
}
