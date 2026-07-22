using SportTracker.Core.Enums;

namespace SportTracker.Core.Models;

public class Exercise
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ExerciseType Type  { get; set; }
    public List<MuscleGroup> MuscleGroups { get; set; } = new();
    public string? GifUrl { get; set; }
    public string? InstructionsFr { get; set; }
}