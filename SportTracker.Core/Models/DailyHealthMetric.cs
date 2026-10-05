using SportTracker.Core.Interfaces;

namespace SportTracker.Core.Models;

public class DailyHealthMetric : IUserOwned
{
    public string UserId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public decimal? WeightKg { get; set; }
    public int? Steps { get; set; }
}
