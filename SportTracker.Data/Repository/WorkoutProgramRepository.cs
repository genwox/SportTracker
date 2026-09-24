using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data.Repository;

public class WorkoutProgramRepository : IRepository<WorkoutProgram>
{
    private readonly SportTrackerDbContext _context;

    public WorkoutProgramRepository(SportTrackerDbContext context)
    {
        _context = context;
    }

    public async Task<WorkoutProgram?> GetByIdAsync(int id)
    {
        return await _context.WorkoutPrograms
            .Include(p => p.Sessions.OrderBy(s => s.Order))
                .ThenInclude(s => s.Exercises.OrderBy(e => e.Order))
                    .ThenInclude(e => e.Exercise)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<WorkoutProgram>> GetAllAsync()
    {
        return await _context.WorkoutPrograms.ToListAsync();
    }

    public async Task AddAsync(WorkoutProgram entity)
    {
        _context.WorkoutPrograms.Add(entity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(WorkoutProgram entity)
    {
        var existing = await _context.WorkoutPrograms.AsNoTracking()
            .Include(p => p.Sessions)
                .ThenInclude(s => s.Exercises)
            .FirstOrDefaultAsync(p => p.Id == entity.Id);
        if (existing == null) return;

        var ownedSessionIds = existing.Sessions.Select(s => s.Id).ToHashSet();
        var ownedExerciseIds = existing.Sessions.SelectMany(s => s.Exercises).Select(e => e.Id).ToHashSet();
        if (entity.Sessions.Any(s =>
                (s.Id != 0 && !ownedSessionIds.Contains(s.Id)) ||
                s.Exercises.Any(e => e.Id != 0 && !ownedExerciseIds.Contains(e.Id))))
            return;

        entity.UserId = existing.UserId;
        foreach (var session in entity.Sessions)
        {
            session.WorkoutProgramId = entity.Id;
            session.WorkoutProgram = null;
            foreach (var exercise in session.Exercises)
            {
                exercise.WorkoutProgramSessionId = session.Id;
                exercise.WorkoutProgramSession = null;
                exercise.Exercise = null;
            }
        }
        var existingExercises = await _context.WorkoutPrograms
            .Where(p => p.Id == entity.Id)
            .SelectMany(p => p.Sessions)
            .SelectMany(s => s.Exercises)
            .ToListAsync();
        _context.WorkoutProgramExercises.RemoveRange(existingExercises);
        await _context.SaveChangesAsync();

        _context.ChangeTracker.Clear();

        // Reset all exercise IDs so EF Core inserts them as new rows
        // (the old rows were just deleted above)
        foreach (var session in entity.Sessions)
            foreach (var ex in session.Exercises)
                ex.Id = 0;

        _context.WorkoutPrograms.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.WorkoutPrograms.FindAsync(id);
        if (entity == null) return;
        _context.WorkoutPrograms.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
