using SportTracker.Core.Interfaces;

namespace SportTracker.Core.Models;

public class WorkoutProgram : IUserOwned
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Objective { get; set; }
    public string ColorHex { get; set; } = "#4A90D9";
    public List<WorkoutProgramSession> Sessions { get; set; } = new();
    public string UserId { get; set; } =  string.Empty;
}
