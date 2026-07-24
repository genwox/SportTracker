using Microsoft.AspNetCore.Mvc;
using Moq;
using SportTracker.Api.Controllers;
using SportTracker.Core.Interfaces;
using SportTracker.Core.Models;

namespace SportTracker.Tests.Controllers;

public class CardioSessionControllerTests
{
    private Mock<IRepository<CardioSession>> _repoMock = null!;
    private CardioSessionController _controller = null!;

    public CardioSessionControllerTests() => Setup();

    private void Setup()
    {
        _repoMock = new Mock<IRepository<CardioSession>>();
        _controller = new CardioSessionController(_repoMock.Object);
    }

    // -------------------------------------------------------------------------
    // GetById
    // -------------------------------------------------------------------------

    [Fact]
    public async Task GetById_ExistingSession_ReturnsOk()
    {
        // ARRANGE
        var session = new CardioSession { Id = 1, Name = "Run" };
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
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((CardioSession?)null);

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
        var session = new CardioSession { Id = 2, Name = "Run" };

        // ACT
        var result = await _controller.UpdateAsync(1, session);

        // ASSERT
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task Update_MissingSession_ReturnsNotFound()
    {
        // ARRANGE
        var session = new CardioSession { Id = 1, Name = "Run" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((CardioSession?)null);

        // ACT
        var result = await _controller.UpdateAsync(1, session);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Update_ExistingSession_ReturnsNoContent()
    {
        // ARRANGE
        var existing = new CardioSession { Id = 1, Name = "Old Run" };
        var updated = new CardioSession { Id = 1, Name = "New Run" };
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
        _repoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((CardioSession?)null);

        // ACT
        var result = await _controller.DeleteAsync(99);

        // ASSERT
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_ExistingSession_ReturnsNoContent()
    {
        // ARRANGE
        var session = new CardioSession { Id = 1, Name = "Run" };
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(session);

        // ACT
        var result = await _controller.DeleteAsync(1);

        // ASSERT
        Assert.IsType<NoContentResult>(result);
        _repoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }
}
