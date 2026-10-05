using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SportTracker.Api.Controllers;
using SportTracker.Data;
using SportTracker.Data.Repository;
using SportTracker.Tests.Support;

namespace SportTracker.Tests.Repository;

public class HealthMetricTests : IDisposable
{
    private readonly SqliteConnection connection = new("DataSource=:memory:");
    private readonly DbContextOptions<SportTrackerDbContext> options;
    private readonly DateOnly date = new(2026, 10, 5);

    public HealthMetricTests()
    {
        connection.Open();
        options = new DbContextOptionsBuilder<SportTrackerDbContext>().UseSqlite(connection).Options;
        using var context = Context("alice");
        // Exercise the actual migration chain, rather than only EnsureCreated.
        context.Database.Migrate();
    }

    private SportTrackerDbContext Context(string user) => new(options, new FakeCurrentUserService(user));
    public void Dispose() => connection.Dispose();

    [Fact]
    public async Task MeasuresAreIsolatedAndARepeatedSaveReplacesOnlyTheSelectedMeasure()
    {
        using (var alice = Context("alice"))
        {
            var repository = new HealthMetricRepository(alice);
            await repository.SaveAsync(date, 75.5m, null);
            await repository.SaveAsync(date, null, 4000);
            await repository.SaveAsync(date, 74.8m, null);
            var metric = Assert.Single(await repository.GetAllAsync());
            Assert.Equal("alice", metric.UserId);
            Assert.Equal(74.8m, metric.WeightKg);
            Assert.Equal(4000, metric.Steps);
        }
        using (var bob = Context("bob"))
        {
            var repository = new HealthMetricRepository(bob);
            Assert.Empty(await repository.GetAllAsync());
            Assert.False(await repository.DeleteAsync(date, true));
            await repository.SaveAsync(date, 90m, null);
            Assert.Equal(90m, Assert.Single(await repository.GetAllAsync()).WeightKg);
        }
        using var check = Context("alice");
        Assert.Equal(74.8m, Assert.Single(await new HealthMetricRepository(check).GetAllAsync()).WeightKg);
    }

    [Fact]
    public async Task DeletingWeightPreservesStepsAndDeletingLastMeasureRemovesTheDay()
    {
        using var context = Context("alice");
        var repository = new HealthMetricRepository(context);
        await repository.SaveAsync(date, 75m, 0);
        Assert.True(await repository.DeleteAsync(date, true));
        var metric = Assert.Single(await repository.GetAllAsync());
        Assert.Null(metric.WeightKg);
        Assert.Equal(0, metric.Steps);
        Assert.False(await repository.DeleteAsync(date, true));
        Assert.True(await repository.DeleteAsync(date, false));
        Assert.Empty(await repository.GetAllAsync());
    }

    [Fact]
    public async Task ControllerRejectsInvalidValuesAndRoundsWeight()
    {
        using var context = Context("alice");
        var controller = new HealthMetricController(new HealthMetricRepository(context));
        Assert.IsType<BadRequestResult>((await controller.SaveWeight(date, new(null), default)).Result);
        Assert.IsType<BadRequestResult>((await controller.SaveWeight(date, new(0), default)).Result);
        Assert.IsType<BadRequestResult>((await controller.SaveWeight(date, new(501), default)).Result);
        Assert.IsType<BadRequestResult>((await controller.SaveSteps(date, new(-1), default)).Result);
        Assert.IsType<BadRequestResult>((await controller.SaveSteps(date, new(200001), default)).Result);
        Assert.IsType<BadRequestResult>((await controller.SaveWeight(default, new(75), default)).Result);
        Assert.IsType<OkObjectResult>((await controller.SaveWeight(date, new(75.555m), default)).Result);
        Assert.Equal(75.56m, (await context.HealthMetrics.SingleAsync()).WeightKg);
    }
}
