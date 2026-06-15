using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class NextReleaseDateAsDateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SQLite stores everything as TEXT; parse existing string dates into ISO format DateTime
            // Existing rows with valid date strings will continue to work; nulls remain null
            migrationBuilder.Sql(
                "UPDATE UserTvShows SET NextReleaseDate = datetime(NextReleaseDate) WHERE NextReleaseDate IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: SQLite TEXT column type is unchanged, format is compatible either way
        }
    }
}
