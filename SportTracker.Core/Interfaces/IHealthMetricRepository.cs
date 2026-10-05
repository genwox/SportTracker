using SportTracker.Core.Models;

namespace SportTracker.Core.Interfaces;

public interface IHealthMetricRepository
{
    Task<List<DailyHealthMetric>> GetAllAsync(CancellationToken ct = default);
    Task<DailyHealthMetric> SaveAsync(DateOnly date, decimal? weightKg, int? steps, CancellationToken ct = default);
    Task<bool> DeleteAsync(DateOnly date, bool weight, CancellationToken ct = default);
}
