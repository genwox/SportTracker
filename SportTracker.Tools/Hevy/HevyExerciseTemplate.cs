namespace SportTracker.Tools.Hevy;

public record HevyExerciseTemplate(
    string Id,
    string Title,
    string Type,
    string? PrimaryMuscleGroup,
    List<string>? SecondaryMuscleGroups,
    string? Equipment,
    bool IsCustom);

public record HevyExerciseTemplatesResponse(
    int Page,
    int PageCount,
    List<HevyExerciseTemplate> ExerciseTemplates);
