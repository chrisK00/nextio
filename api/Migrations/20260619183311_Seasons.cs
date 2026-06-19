using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class Seasons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShowSeasonMetadata",
                columns: table => new
                {
                    UserTvShowId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Id = table.Column<int>(type: "INTEGER", nullable: false),
                    VoteAverage = table.Column<double>(type: "REAL", nullable: true),
                    SeasonNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    EpisodeCount = table.Column<int>(type: "INTEGER", nullable: false),
                    AirDate = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShowSeasonMetadata", x => new { x.UserTvShowId, x.Id });
                    table.ForeignKey(
                        name: "FK_ShowSeasonMetadata_UserTvShows_UserTvShowId",
                        column: x => x.UserTvShowId,
                        principalTable: "UserTvShows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShowSeasonMetadata");
        }
    }
}
