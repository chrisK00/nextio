using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLastLibraryExportAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastLibraryExportAt",
                table: "Users",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastLibraryExportAt",
                table: "Users");
        }
    }
}
