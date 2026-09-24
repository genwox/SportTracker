using SportTracker.Core.Enums;

namespace SportTracker.Core.Models;

public class ExerciseSet
{
    private int? _rpe;

    public int Id { get; set; }
    public int  WorkoutExerciseId { get; set; }
    public WorkoutExercise? WorkoutExercise { get; set; }
    public double Weight {get; set;}
    public int Repetitions {get; set;}
    public SetType SetType { get; set; } = SetType.Normal;
    public int? RPE
    {
        get => _rpe;
        set
        {
            if (value is < 1 or > 10)
                throw new ArgumentOutOfRangeException(nameof(RPE), "RPE must be between 1 and 10.");
            _rpe = value;
        }
    }
}
