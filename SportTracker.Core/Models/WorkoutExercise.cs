namespace SportTracker.Core.Models;

public class WorkoutExercise
{
    public int Id { get; set; }
    public int ExerciseId { get; set; }
    public List<ExerciseSet>? ExerciseSets { get; set; }
    public Exercise?  Exercise { get; set; }
    public WorkoutSession? WorkoutSession { get; set; }
    public int WorkoutSessionId { get; set; }
}