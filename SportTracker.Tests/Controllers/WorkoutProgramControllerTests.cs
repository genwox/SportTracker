using Microsoft.AspNetCore.Mvc;
using Moq;
using SportTracker.Api.Controllers;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Tests.Controllers;

public class WorkoutProgramControllerTests
{
    private Mock<IRepository<WorkoutProgram>> _repoMock = null!;
    private WorkoutProgramController _controller = null!;

    public WorkoutProgramControllerTests() => Setup();

    private void Setup()
    {
        _repoMock = new Mock<IRepository<WorkoutProgram>>();
        _controller = new WorkoutProgramController(_repoMock.Object);
    }

    // -------------------------------------------------------------------------
    // GetById
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetById_ExistingProgram_ReturnsOk()
    {
        // ARRANGE
        var program = new WorkoutProgram { Id = 1, Name = "PPL" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(program);

        // ACT
        var result = await _controller.GetByIdAsync(1);

        // ASSERT
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(program, ok.Value);
    }

    [Fact]
    public async Task GetById_MissingProgram_ReturnsNotFound()
    {
        // ARRANGE
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((WorkoutProgram?)null);

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
        var program = new WorkoutProgram { Id = 2, Name = "PPL" };

        // ACT
        var result = await _controller.UpdateAsync(1, program);

        // ASSERT
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task Update_MissingProgram_ReturnsNotFound()
    {
        // ARRANGE
        var program = new WorkoutProgram { Id = 1, Name = "PPL" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((WorkoutProgram?)null);

        // ACT
        var result = await _controller.UpdateAsync(1, program);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Update_ExistingProgram_ReturnsNoContent()
    {
        // ARRANGE
        var existing = new WorkoutProgram { Id = 1, Name = "Old Name" };
        var updated = new WorkoutProgram { Id = 1, Name = "New Name" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        // ACT
        var result = await _controller.UpdateAsync(1, updated);

        // ASSERT
        Assert.IsType<NoContentResult>(result);
        _repoMock.Verify(r => r.UpdateAsync(updated), Times.Once);
    }

    [Fact]
    public async Task Update_ForgedUserId_PreservesStoredOwner()
    {
        var existing = new WorkoutProgram { Id = 1, UserId = "owner" };
        var forged = new WorkoutProgram { Id = 1, Name = "Changed", UserId = "attacker" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        Assert.IsType<NoContentResult>(await _controller.UpdateAsync(1, forged));

        Assert.Equal("owner", forged.UserId);
        _repoMock.Verify(r => r.UpdateAsync(It.Is<WorkoutProgram>(p => p.UserId == "owner" && p.Name == "Changed")), Times.Once);
    }

    [Fact]
    public async Task Update_ForeignSessionId_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(new WorkoutProgram
        {
            Id = 1, Sessions = [new WorkoutProgramSession { Id = 10 }]
        });
        var forged = new WorkoutProgram
        {
            Id = 1, Sessions = [new WorkoutProgramSession { Id = 99 }]
        };

        Assert.IsType<NotFoundResult>(await _controller.UpdateAsync(1, forged));
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<WorkoutProgram>()), Times.Never);
    }

    [Fact]
    public async Task Update_ForgedProgramForeignKey_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(new WorkoutProgram
        {
            Id = 1, Sessions = [new WorkoutProgramSession { Id = 10, WorkoutProgramId = 1 }]
        });
        var forged = new WorkoutProgram
        {
            Id = 1, Sessions = [new WorkoutProgramSession { Id = 10, WorkoutProgramId = 999 }]
        };

        Assert.IsType<NotFoundResult>(await _controller.UpdateAsync(1, forged));
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<WorkoutProgram>()), Times.Never);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Delete_MissingProgram_ReturnsNotFound()
    {
        // ARRANGE
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((WorkoutProgram?)null);

        // ACT
        var result = await _controller.DeleteAsync(99);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingProgram_ReturnsNoContent()
    {
        // ARRANGE
        var program = new WorkoutProgram { Id = 1, Name = "PPL" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(program);

        // ACT
        var result = await _controller.DeleteAsync(1);

        // ASSERT
        Assert.IsType<NoContentResult>(result);
        _repoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }
}
