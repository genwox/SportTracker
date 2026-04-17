using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data.Repository;

public class WorkoutExerciseRepository : IRepository<WorkoutExercise>
{
    private readonly SportTrackerDbContext _context;

    public WorkoutExerciseRepository(SportTrackerDbContext context)
    {
        _context = context;
    }
    public async Task<WorkoutExercise?> GetByIdAsync(int id)
    {
        return await _context.WorkoutExercises.FindAsync(id);
    }

    public async Task<IEnumerable<WorkoutExercise>> GetAllAsync()
    {
        return await _context.WorkoutExercises.ToListAsync();
    }

    public async Task AddAsync(WorkoutExercise entity)
    {
        _context.WorkoutExercises.Add(entity);
        await _context.SaveChangesAsync();     
    }

    public async Task UpdateAsync(WorkoutExercise entity)
    {
        _context.WorkoutExercises.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.WorkoutExercises.FindAsync(id);

        if (entity == null)
        {
            return;
        }
        _context.WorkoutExercises.Remove(entity);
        await _context.SaveChangesAsync();
    }
}