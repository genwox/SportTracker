using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SportTracker.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyHealthMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HealthMetrics",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Date = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    WeightKg = table.Column<decimal>(type: "TEXT", nullable: true),
                    Steps = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HealthMetrics", x => new { x.UserId, x.Date });
                    table.CheckConstraint("CK_HealthMetrics_Steps", "Steps IS NULL OR (Steps >= 0 AND Steps <= 200000)");
                    table.CheckConstraint("CK_HealthMetrics_Weight", "WeightKg IS NULL OR (CAST(WeightKg AS REAL) >= 1 AND CAST(WeightKg AS REAL) <= 500)");
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HealthMetrics");
        }
    }
}
