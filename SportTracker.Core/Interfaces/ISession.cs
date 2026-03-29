namespace SportTracker.Core.Interfaces;

public interface ISession
{
    int Id { get; set; }
    string Name { get; set; }
    DateTime Date { get; set; }
    TimeSpan Duration { get; set; }
}