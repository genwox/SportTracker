namespace SportTracker.Core.Models;

public class WorkoutProgramSession
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
    public int WorkoutProgramId { get; set; }
    public WorkoutProgram? WorkoutProgram { get; set; }
    public List<WorkoutProgramExercise> Exercises { get; set; } = new();
}
