using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportTracker.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExerciseExternalMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExerciseExternalMappings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ExerciseId = table.Column<int>(type: "INTEGER", nullable: false),
                    Source = table.Column<string>(type: "TEXT", nullable: false),
                    ExternalId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseExternalMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExerciseExternalMappings_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseExternalMappings_ExerciseId_Source",
                table: "ExerciseExternalMappings",
                columns: new[] { "ExerciseId", "Source" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseExternalMappings_Source_ExternalId",
                table: "ExerciseExternalMappings",
                columns: new[] { "Source", "ExternalId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExerciseExternalMappings");
        }
    }
}
