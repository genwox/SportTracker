using SportTracker.Core.Models;

namespace SportTracker.Data.ExternalMappings;

public class ExerciseExternalMapping
{
    public int Id { get; set; }
    public int ExerciseId { get; set; }
    public Exercise? Exercise { get; set; }
    public string Source { get; set; } = string.Empty;
    public string ExternalId { get; set; } = string.Empty;
}
