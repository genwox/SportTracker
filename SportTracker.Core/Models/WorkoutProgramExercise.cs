namespace SportTracker.Core.Models;

public class WorkoutProgramExercise
{
    public int Id { get; set; }
    public int Order { get; set; }
    public int WorkoutProgramSessionId { get; set; }
    public WorkoutProgramSession? WorkoutProgramSession { get; set; }
    public int ExerciseId { get; set; }
    public Exercise? Exercise { get; set; }
    public int TargetSets { get; set; }
    public int TargetRepsMin { get; set; }
    public int TargetRepsMax { get; set; }
    public int RestSeconds { get; set; }
}
