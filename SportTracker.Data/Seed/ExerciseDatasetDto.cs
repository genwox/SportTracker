namespace SportTracker.Data.Seed;

public record ExerciseDatasetDto(
    string Id,
    string Name,
    string Body_Part,
    string Equipment,
    string Target,
    List<string> Secondary_Muscles,
    string Gif_Url,
    Dictionary<string, string> Instructions,
    Dictionary<string, List<string>> Instruction_Steps
);
