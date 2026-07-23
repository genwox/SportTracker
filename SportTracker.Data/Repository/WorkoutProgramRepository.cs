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
        // Supprimer les exercices existants pour toutes les sessions du programme
        // afin d'éviter les doublons quand EF Core traite les WorkoutProgramExercise avec Id = 0
        var existingExercises = await _context.WorkoutProgramExercises
            .Where(e => e.WorkoutProgramSession!.WorkoutProgramId == entity.Id)
            .ToListAsync();
        _context.WorkoutProgramExercises.RemoveRange(existingExercises);

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
