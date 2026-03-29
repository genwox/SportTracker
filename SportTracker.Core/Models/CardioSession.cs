using SportTracker.Core.Enums;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Core.Models;

public class CardioSession: ISession
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public TimeSpan Duration { get; set; }
    public double Distance { get; set; }
    public double ElevationGain { get; set; }
    public CardioType Type { get; set; }
}