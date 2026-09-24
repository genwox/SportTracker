using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data;

public class WorkoutSessionRepository : IRepository<WorkoutSession>
{
    private readonly SportTrackerDbContext _context;

    public WorkoutSessionRepository(SportTrackerDbContext context)
    {
        _context = context;
    }
    public async Task<WorkoutSession?> GetByIdAsync(int id)
    {
        return await _context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises)!
                .ThenInclude(we => we.Exercise)
            .Include(ws => ws.WorkoutExercises)!
                .ThenInclude(we => we.ExerciseSets)
            .FirstOrDefaultAsync(ws => ws.Id == id);
    }

    public async  Task<IEnumerable<WorkoutSession>> GetAllAsync()
    {
        return await _context.WorkoutSessions
            .Include(ws => ws.WorkoutExercises)!
                .ThenInclude(we => we.Exercise)
            .Include(ws => ws.WorkoutExercises)!
                .ThenInclude(we => we.ExerciseSets)
            .ToListAsync();
    }

    public async Task AddAsync(WorkoutSession entity)
    {
        _context.WorkoutSessions.Add(entity); 
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(WorkoutSession entity)
    {
        var existing = await _context.WorkoutSessions.AsNoTracking()
            .Include(ws => ws.WorkoutExercises)!
                .ThenInclude(we => we.ExerciseSets)
            .FirstOrDefaultAsync(ws => ws.Id == entity.Id);
        if (existing == null) return;

        var ownedExercises = existing.WorkoutExercises ?? [];
        var ownedExerciseIds = ownedExercises.Select(e => e.Id).ToHashSet();
        var ownedSetIds = ownedExercises.SelectMany(e => e.ExerciseSets ?? []).Select(s => s.Id).ToHashSet();
        if ((entity.WorkoutExercises ?? []).Any(e =>
                (e.Id != 0 && !ownedExerciseIds.Contains(e.Id)) ||
                (e.ExerciseSets ?? []).Any(s => s.Id != 0 && !ownedSetIds.Contains(s.Id))))
            return;

        entity.UserId = existing.UserId;
        entity.WorkoutProgramSessionId = existing.WorkoutProgramSessionId;
        entity.WorkoutProgramSession = null;
        foreach (var exercise in entity.WorkoutExercises ?? [])
        {
            var existingExercise = ownedExercises.FirstOrDefault(e => e.Id == exercise.Id);
            exercise.WorkoutSessionId = existingExercise?.WorkoutSessionId ?? entity.Id;
            exercise.WorkoutSession = null;
            exercise.Exercise = null;
            foreach (var set in exercise.ExerciseSets ?? [])
            {
                var existingSet = existingExercise?.ExerciseSets?.FirstOrDefault(s => s.Id == set.Id);
                set.WorkoutExerciseId = existingSet?.WorkoutExerciseId ?? (exercise.Id == 0 ? 0 : exercise.Id);
                set.WorkoutExercise = null;
            }
        }
        // The controller may have loaded the same graph for its scoped existence check.
        _context.ChangeTracker.Clear();
        _context.WorkoutSessions.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.WorkoutSessions.FindAsync(id);
        
        if (entity == null)
        {
            return;
        }
        _context.WorkoutSessions.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
