using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportTracker.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLiveWorkoutDraftKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClientDraftId",
                table: "WorkoutSessions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_ClientDraftId",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "ClientDraftId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutSessions_UserId_ClientDraftId",
                table: "WorkoutSessions");

            migrationBuilder.DropColumn(
                name: "ClientDraftId",
                table: "WorkoutSessions");
        }
    }
}
