using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class NextEpFix2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserTvShows_UserTvShowEpisodes_NextEpisodeToAirId",
                table: "UserTvShows");

            migrationBuilder.DropIndex(
                name: "IX_UserTvShows_NextEpisodeToAirId",
                table: "UserTvShows");

            migrationBuilder.RenameColumn(
                name: "NextEpisodeToAirId",
                table: "UserTvShows",
                newName: "NextEpisodeToAir_UpdatedAt");

            migrationBuilder.AddColumn<DateTime>(
                name: "NextEpisodeToAir_AirDate",
                table: "UserTvShows",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NextEpisodeToAir_Episode",
                table: "UserTvShows",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NextEpisodeToAir_Season",
                table: "UserTvShows",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextEpisodeToAir_Title",
                table: "UserTvShows",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NextEpisodeToAir_AirDate",
                table: "UserTvShows");

            migrationBuilder.DropColumn(
                name: "NextEpisodeToAir_Episode",
                table: "UserTvShows");

            migrationBuilder.DropColumn(
                name: "NextEpisodeToAir_Season",
                table: "UserTvShows");

            migrationBuilder.DropColumn(
                name: "NextEpisodeToAir_Title",
                table: "UserTvShows");

            migrationBuilder.RenameColumn(
                name: "NextEpisodeToAir_UpdatedAt",
                table: "UserTvShows",
                newName: "NextEpisodeToAirId");

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
    }
}
