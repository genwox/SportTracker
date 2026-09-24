using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportTracker.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutLoggingDetailsAndEquipment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "WorkoutExercises",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupersetGroupId",
                table: "WorkoutExercises",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RPE",
                table: "ExerciseSets",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SetType",
                table: "ExerciseSets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "Equipment",
                table: "Exercises",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ExerciseSets_RPE",
                table: "ExerciseSets",
                sql: "RPE IS NULL OR (RPE >= 1 AND RPE <= 10)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ExerciseSets_RPE",
                table: "ExerciseSets");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "WorkoutExercises");

            migrationBuilder.DropColumn(
                name: "SupersetGroupId",
                table: "WorkoutExercises");

            migrationBuilder.DropColumn(
                name: "RPE",
                table: "ExerciseSets");

            migrationBuilder.DropColumn(
                name: "SetType",
                table: "ExerciseSets");

            migrationBuilder.DropColumn(
                name: "Equipment",
                table: "Exercises");
        }
    }
}
