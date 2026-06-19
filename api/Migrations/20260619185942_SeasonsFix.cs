using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeasonsFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ShowSeasonMetadata",
                table: "ShowSeasonMetadata");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "ShowSeasonMetadata");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ShowSeasonMetadata",
                table: "ShowSeasonMetadata",
                columns: new[] { "UserTvShowId", "SeasonNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ShowSeasonMetadata",
                table: "ShowSeasonMetadata");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "ShowSeasonMetadata",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ShowSeasonMetadata",
                table: "ShowSeasonMetadata",
                columns: new[] { "UserTvShowId", "Id" });
        }
    }
}
