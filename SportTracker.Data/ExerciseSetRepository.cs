using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data;

public class ExerciseSetRepository : IRepository<ExerciseSet>
{
    private readonly SportTrackerDbContext _context;

    public ExerciseSetRepository(SportTrackerDbContext context)
    {
        _context = context;
    }

    public async Task<ExerciseSet?> GetByIdAsync(int id)
    {
        return await _context.ExerciseSets.FindAsync(id);
    }

    public async Task<IEnumerable<ExerciseSet>> GetAllAsync()
    {
        return await _context.ExerciseSets.ToListAsync();
    }

    public async Task AddAsync(ExerciseSet entity)
    {
        _context.ExerciseSets.Add(entity);
        await _context.SaveChangesAsync();   
    }

    public async Task UpdateAsync(ExerciseSet entity)
    {
        _context.ExerciseSets.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.ExerciseSets.FindAsync(id);

        if (entity == null)
        {
            return;
        }
        _context.ExerciseSets.Remove(entity);
        await _context.SaveChangesAsync();
    }
}