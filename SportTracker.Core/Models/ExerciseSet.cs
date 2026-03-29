namespace SportTracker.Core.Models;

public class ExerciseSet
{
    public int Id { get; set; }
    public int  ExerciseId { get; set; }
    public Exercise? Exercise { get; set; }
    public double Weight {get; set;}
    public int Repetitions {get; set;}
}