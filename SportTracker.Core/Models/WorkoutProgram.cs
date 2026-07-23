namespace SportTracker.Core.Models;

public class WorkoutProgram
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Objective { get; set; }
    public string ColorHex { get; set; } = "#4A90D9";
    public List<WorkoutProgramSession> Sessions { get; set; } = new();
}
