using Microsoft.AspNetCore.Mvc;
using Moq;
using SportTracker.Api.Controllers;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Tests.Controllers;

public class WorkoutSessionControllerTests
{
    private Mock<IRepository<WorkoutSession>> _repoMock = null!;
    private WorkoutSessionController _controller = null!;

    public WorkoutSessionControllerTests() => Setup();

    private void Setup()
    {
        _repoMock = new Mock<IRepository<WorkoutSession>>();
        _controller = new WorkoutSessionController(_repoMock.Object);
    }

    // -------------------------------------------------------------------------
    // GetById
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetById_ExistingSession_ReturnsOk()
    {
        // ARRANGE
        var session = new WorkoutSession { Id = 1, Name = "Push Day" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(session);

        // ACT
        var result = await _controller.GetByIdAsync(1);

        // ASSERT
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(session, ok.Value);
    }

    [Fact]
    public async Task GetById_MissingSession_ReturnsNotFound()
    {
        // ARRANGE
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((WorkoutSession?)null);

        // ACT
        var result = await _controller.GetByIdAsync(99);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Update_IdMismatch_ReturnsBadRequest()
    {
        // ARRANGE
        var session = new WorkoutSession { Id = 2, Name = "Push Day" };

        // ACT
        var result = await _controller.UpdateAsync(1, session);

        // ASSERT
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task Update_MissingSession_ReturnsNotFound()
    {
        // ARRANGE
        var session = new WorkoutSession { Id = 1, Name = "Push Day" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((WorkoutSession?)null);

        // ACT
        var result = await _controller.UpdateAsync(1, session);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Update_ExistingSession_ReturnsNoContent()
    {
        // ARRANGE
        var existing = new WorkoutSession { Id = 1, Name = "Old Name" };
        var updated = new WorkoutSession { Id = 1, Name = "New Name" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        // ACT
        var result = await _controller.UpdateAsync(1, updated);

        // ASSERT
        Assert.IsType<NoContentResult>(result);
        _repoMock.Verify(r => r.UpdateAsync(updated), Times.Once);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Delete_MissingSession_ReturnsNotFound()
    {
        // ARRANGE
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((WorkoutSession?)null);

        // ACT
        var result = await _controller.DeleteAsync(99);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingSession_ReturnsNoContent()
    {
        // ARRANGE
        var session = new WorkoutSession { Id = 1, Name = "Push Day" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(session);

        // ACT
        var result = await _controller.DeleteAsync(1);

        // ASSERT
        Assert.IsType<NoContentResult>(result);
        _repoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }
}
