using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data.Repository;

public class HealthMetricRepository(SportTrackerDbContext context) : IHealthMetricRepository
{
    public Task<List<DailyHealthMetric>> GetAllAsync(CancellationToken ct = default) =>
        context.HealthMetrics.OrderBy(m => m.Date).ToListAsync(ct);

    public async Task<DailyHealthMetric> SaveAsync(DateOnly date, decimal? weightKg, int? steps, CancellationToken ct = default)
    {
        var metric = await context.HealthMetrics.SingleOrDefaultAsync(m => m.Date == date, ct);
        if (metric == null)
        {
            metric = new DailyHealthMetric { Date = date };
            context.HealthMetrics.Add(metric);
        }
        // Saving one measure never overwrites the other measure of that day.
        if (weightKg.HasValue) metric.WeightKg = weightKg;
        if (steps.HasValue) metric.Steps = steps;
        try { await context.SaveChangesAsync(ct); }
        catch (DbUpdateException) when (context.Entry(metric).State == EntityState.Added)
        {
            // Two first measurements can arrive simultaneously (weight and steps).
            context.Entry(metric).State = EntityState.Detached;
            var existing = await context.HealthMetrics.SingleOrDefaultAsync(m => m.Date == date, ct);
            if (existing == null) throw;
            metric = existing;
            if (weightKg.HasValue) metric.WeightKg = weightKg;
            if (steps.HasValue) metric.Steps = steps;
            await context.SaveChangesAsync(ct);
        }
        return metric;
    }

    public async Task<bool> DeleteAsync(DateOnly date, bool weight, CancellationToken ct = default)
    {
        var metric = await context.HealthMetrics.SingleOrDefaultAsync(m => m.Date == date, ct);
        if (metric == null || (weight ? metric.WeightKg == null : metric.Steps == null)) return false;
        if (weight) metric.WeightKg = null; else metric.Steps = null;
        if (metric.WeightKg == null && metric.Steps == null) context.HealthMetrics.Remove(metric);
        await context.SaveChangesAsync(ct);
        return true;
    }
}
