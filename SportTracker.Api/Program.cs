using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SportTracker.Data.Seed;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SportTracker.Api.Services;
using SportTracker.Core.Enums;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Data.Repository;
using SportTracker.Data.Users;

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

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddEntityFrameworkStores<SportTrackerDbContext>();

builder.Services.Configure<BearerTokenOptions>(IdentityConstants.BearerScheme,
    options => options.BearerTokenExpiration =  TimeSpan.FromDays(30));

// Data Protection : les bearer tokens Identity sont chiffrés avec ce trousseau.
// En prod (Docker), on le persiste dans un volume monté sur /keys, sinon chaque
// redéploiement régénère la clé et déconnecte tout le monde. SetApplicationName
// stabilise le "purpose" du chiffrement entre les redémarrages.
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("SportTracker");
if (builder.Environment.IsProduction())
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo("/keys"));


builder.Services.
    AddScoped<IRepository<WorkoutSession>, WorkoutSessionRepository>();
builder.Services.
    AddScoped<IRepository<CardioSession>, CardioSessionRepository>();
builder.Services.
    AddScoped<IRepository<Exercise>, ExerciseRepository>();
builder.Services.
    AddScoped<IRepository<WorkoutProgram>, WorkoutProgramRepository>();

var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];


builder.Services.AddCors(options => options.AddPolicy("Frontend",
    policy => policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapIdentityApi<ApplicationUser>();

if (app.Environment.IsProduction())
    app.UseHttpsRedirection();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SportTrackerDbContext>();
    await db.Database.MigrateAsync();
    await ExerciseSeeder.SeedAsync(db);
}

app.Run();


