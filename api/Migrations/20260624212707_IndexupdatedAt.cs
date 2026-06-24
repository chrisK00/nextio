using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace nextio.Api.Migrations
{
    /// <inheritdoc />
    public partial class IndexupdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_UserTvShows_UserId_IsFollowing_UpdatedAt",
                table: "UserTvShows",
                columns: new[] { "UserId", "IsFollowing", "UpdatedAt" },
                descending: new[] { false, false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserTvShows_UserId_IsFollowing_UpdatedAt",
                table: "UserTvShows");
        }
    }
}
