using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class NextEpFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserTvShowEpisodes_UserTvShows_NextEpisodeToAirId",
                table: "UserTvShowEpisodes");

            migrationBuilder.DropIndex(
                name: "IX_UserTvShowEpisodes_NextEpisodeToAirId",
                table: "UserTvShowEpisodes");

            migrationBuilder.DropColumn(
                name: "NextEpisodeToAirId",
                table: "UserTvShowEpisodes");

            migrationBuilder.AddColumn<Guid>(
                name: "NextEpisodeToAirId",
                table: "UserTvShows",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserTvShows_NextEpisodeToAirId",
                table: "UserTvShows",
                column: "NextEpisodeToAirId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserTvShows_UserTvShowEpisodes_NextEpisodeToAirId",
                table: "UserTvShows",
                column: "NextEpisodeToAirId",
                principalTable: "UserTvShowEpisodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserTvShows_UserTvShowEpisodes_NextEpisodeToAirId",
                table: "UserTvShows");

            migrationBuilder.DropIndex(
                name: "IX_UserTvShows_NextEpisodeToAirId",
                table: "UserTvShows");

            migrationBuilder.DropColumn(
                name: "NextEpisodeToAirId",
                table: "UserTvShows");

            migrationBuilder.AddColumn<Guid>(
                name: "NextEpisodeToAirId",
                table: "UserTvShowEpisodes",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserTvShowEpisodes_NextEpisodeToAirId",
                table: "UserTvShowEpisodes",
                column: "NextEpisodeToAirId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_UserTvShowEpisodes_UserTvShows_NextEpisodeToAirId",
                table: "UserTvShowEpisodes",
                column: "NextEpisodeToAirId",
                principalTable: "UserTvShows",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
