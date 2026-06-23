using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class IsWatchedMovie : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WatchedAt",
                table: "UserMovies");

            migrationBuilder.AddColumn<bool>(
                name: "IsWatched",
                table: "UserMovies",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsWatched",
                table: "UserMovies");

            migrationBuilder.AddColumn<DateTime>(
                name: "WatchedAt",
                table: "UserMovies",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }
    }
}
