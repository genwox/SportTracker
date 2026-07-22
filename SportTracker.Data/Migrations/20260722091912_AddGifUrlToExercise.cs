using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportTracker.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGifUrlToExercise : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GifUrl",
                table: "Exercises",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GifUrl",
                table: "Exercises");
        }
    }
}
