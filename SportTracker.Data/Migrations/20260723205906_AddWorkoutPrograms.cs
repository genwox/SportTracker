using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportTracker.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutPrograms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WorkoutProgramSessionId",
                table: "WorkoutSessions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WorkoutPrograms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Objective = table.Column<string>(type: "TEXT", nullable: true),
                    ColorHex = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutPrograms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutProgramSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Order = table.Column<int>(type: "INTEGER", nullable: false),
                    WorkoutProgramId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutProgramSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutProgramSessions_WorkoutPrograms_WorkoutProgramId",
                        column: x => x.WorkoutProgramId,
                        principalTable: "WorkoutPrograms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutProgramExercises",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Order = table.Column<int>(type: "INTEGER", nullable: false),
                    WorkoutProgramSessionId = table.Column<int>(type: "INTEGER", nullable: false),
                    ExerciseId = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetSets = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetRepsMin = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetRepsMax = table.Column<int>(type: "INTEGER", nullable: false),
                    RestSeconds = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutProgramExercises", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutProgramExercises_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkoutProgramExercises_WorkoutProgramSessions_WorkoutProgramSessionId",
                        column: x => x.WorkoutProgramSessionId,
                        principalTable: "WorkoutProgramSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_WorkoutProgramSessionId",
                table: "WorkoutSessions",
                column: "WorkoutProgramSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutProgramExercises_ExerciseId",
                table: "WorkoutProgramExercises",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutProgramExercises_WorkoutProgramSessionId",
                table: "WorkoutProgramExercises",
                column: "WorkoutProgramSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutProgramSessions_WorkoutProgramId",
                table: "WorkoutProgramSessions",
                column: "WorkoutProgramId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutSessions_WorkoutProgramSessions_WorkoutProgramSessionId",
                table: "WorkoutSessions",
                column: "WorkoutProgramSessionId",
                principalTable: "WorkoutProgramSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutSessions_WorkoutProgramSessions_WorkoutProgramSessionId",
                table: "WorkoutSessions");

            migrationBuilder.DropTable(
                name: "WorkoutProgramExercises");

            migrationBuilder.DropTable(
                name: "WorkoutProgramSessions");

            migrationBuilder.DropTable(
                name: "WorkoutPrograms");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_WorkoutProgramSessionId",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "WorkoutProgramSessionId",
                table: "WorkoutSessions");
        }
    }
}
