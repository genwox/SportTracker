using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SportTracker.Core.Enums;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Data.Repository;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddControllers();

builder.Services.AddDbContext<SportTrackerDbContext>( 
    options =>  options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IRepository<WorkoutSession>, WorkoutSessionRepository>();
builder.Services.AddScoped<IRepository<CardioSession>, CardioSessionRepository>();

var app = builder.Build();

// Configure the HTTP request pipeline.

app.MapControllers();

app.UseHttpsRedirection();


app.Run();


