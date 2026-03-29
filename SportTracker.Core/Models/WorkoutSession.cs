using SportTracker.Core.Interfaces;

namespace SportTracker.Core.Models;

public class WorkoutSession : ISession
{
    public int Id { get; set; }
    public List<WorkoutExercise>? WorkoutExercises { get; set; }
    public DateTime Date { get; set; }
    public TimeSpan Duration { get; set; }
    public string Name { get; set; } = string.Empty;
}