using SportTracker.Core.Enums;

namespace SportTracker.Tools.Matching;

public static class MuscleGroupMapper
{
    public static List<MuscleGroup> Map(string? primary, List<string>? secondary)
    {
        var raw = new List<string>();
        if (!string.IsNullOrWhiteSpace(primary)) raw.Add(primary);
        if (secondary != null) raw.AddRange(secondary);

        var mapped = raw
            .Select(MapOne)
            .Where(m => m.HasValue)
            .Select(m => m!.Value)
            .Distinct()
            .ToList();

        return mapped.Count == 0 ? [MuscleGroup.FullBody] : mapped;
    }

    // Reprend la convention déjà utilisée dans ExerciseSeeder.MapMuscle, adaptée
    // aux libellés (snake_case) renvoyés par l'API Hevy.
    private static MuscleGroup? MapOne(string hevyMuscle) => hevyMuscle.ToLowerInvariant() switch
    {
        "chest" or "pectorals" => MuscleGroup.Chest,
        "back" or "lats" or "traps" or "upper_back" or "lower_back" or "middle_back" or "spine" => MuscleGroup.Back,
        "biceps" => MuscleGroup.Biceps,
        "triceps" => MuscleGroup.Triceps,
        "abdominals" or "abs" or "core" or "obliques" => MuscleGroup.Abs,
        "glutes" => MuscleGroup.Glutes,
        "quadriceps" or "hamstrings" or "calves" or "adductors" or "abductors" => MuscleGroup.Legs,
        "shoulders" or "delts" => MuscleGroup.Shoulders,
        _ => null
    };
}
