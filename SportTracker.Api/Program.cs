using Microsoft.EntityFrameworkCore;
using SportTracker.Data.Seed;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SportTracker.Core.Enums;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Data.Repository;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);

builder.Services.AddDbContext<SportTrackerDbContext>( 
    options =>  options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.
    AddScoped<IRepository<WorkoutSession>, WorkoutSessionRepository>();
builder.Services.
    AddScoped<IRepository<CardioSession>, CardioSessionRepository>();
builder.Services.
    AddScoped<IRepository<Exercise>, ExerciseRepository>();

builder.Services.AddCors(options => options.AddPolicy("Frontend",
    policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors("Frontend");
// Configure the HTTP request pipeline.

app.MapControllers();

if (app.Environment.IsProduction())
    app.UseHttpsRedirection();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SportTrackerDbContext>();
    await db.Database.MigrateAsync();
    await ExerciseSeeder.SeedAsync(db);
}

app.Run();


