namespace SportTracker.Core.Models;

public class WorkoutSession
{
    public int Id { get; set; }
    public List<WorkoutExercise>? WorkoutExercises { get; set; }
    public DateTime Date { get; set; }
    public string Name { get; set; } = string.Empty;
}