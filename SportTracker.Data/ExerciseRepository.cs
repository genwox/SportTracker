using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Data;

public class ExerciseRepository : IRepository<Exercise>
{
    private readonly SportTrackerDbContext _context;
    
    public ExerciseRepository(SportTrackerDbContext context)
    {
        _context = context;
    }
    public async Task<Exercise?> GetByIdAsync(int id)
    {
        return await _context.Exercises.FindAsync(id);
    }

    public async Task<IEnumerable<Exercise>> GetAllAsync()
    {
        return await _context.Exercises.ToListAsync();
    }

    public async Task AddAsync(Exercise entity)
    {
        _context.Exercises.Add(entity);
        await _context.SaveChangesAsync();     
    }

    public async Task UpdateAsync(Exercise entity)
    {
        _context.Exercises.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.Exercises.FindAsync(id);

        if (entity == null)
        {
            return;
        }
        _context.Exercises.Remove(entity);
        await _context.SaveChangesAsync();
    }
}