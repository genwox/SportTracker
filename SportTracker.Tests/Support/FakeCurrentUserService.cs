using SportTracker.Core.Interfaces;

namespace SportTracker.Tests.Support;

/// <summary>
/// Utilisateur courant fixe pour les tests : le DbContext filtre les données
/// par UserId (Global Query Filter) et estampille les entités ajoutées.
/// </summary>
public class FakeCurrentUserService(string? userId = FakeCurrentUserService.DefaultUserId) : ICurrentUserService
{
    public const string DefaultUserId = "test-user";

    public string? UserId { get; } = userId;
}
