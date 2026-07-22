using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Enums;
using SportTracker.Core.Models;

namespace SportTracker.Data.Seed;

public static class ExerciseSeeder
{
    private const string BaseUrl = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/";

    public static async Task SeedAsync(SportTrackerDbContext db)
    {
        if (await db.Exercises.AnyAsync()) return;

        var seedPath = Path.Combine(AppContext.BaseDirectory, "Seed", "exercises.json");
        if (!File.Exists(seedPath)) return;

        var json = await File.ReadAllTextAsync(seedPath);
        var dtos = JsonSerializer.Deserialize<List<ExerciseDatasetDto>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (dtos is null) return;

        var exercises = dtos
            .Select(d => new Exercise
            {
                Name = d.Name,
                Type = d.Body_Part == "cardio" ? ExerciseType.Cardio : ExerciseType.Strength,
                MuscleGroups = MapMuscle(d.Target),
                GifUrl = string.IsNullOrEmpty(d.Gif_Url) ? null : BaseUrl + d.Gif_Url,
                InstructionsFr = d.Instructions.TryGetValue("fr", out var fr) ? fr : null
            })
            .ToList();

        db.Exercises.AddRange(exercises);
        await db.SaveChangesAsync();
    }

    private static List<MuscleGroup> MapMuscle(string target) => target.ToLower() switch
    {
        "chest" or "pectorals"                          => [MuscleGroup.Chest],
        "back" or "lats" or "traps" or "spine"         => [MuscleGroup.Back],
        "biceps"                                        => [MuscleGroup.Biceps],
        "triceps"                                       => [MuscleGroup.Triceps],
        "abs" or "serratus anterior"                    => [MuscleGroup.Abs],
        "glutes"                                        => [MuscleGroup.Glutes],
        "quads" or "hamstrings" or "calves" or "adductors" or "abductors" => [MuscleGroup.Legs],
        "shoulders" or "delts" or "upper back"         => [MuscleGroup.Shoulders],
        _                                               => [MuscleGroup.FullBody]
    };
}
