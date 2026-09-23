using SportTracker.Core.Interfaces;

namespace SportTracker.Tools;

// Le catalogue d'exercices n'est pas scopé par utilisateur (pas de filtre global sur
// Exercise dans SportTrackerDbContext), donc ce service n'a besoin de renvoyer personne.
public class NullCurrentUserService : ICurrentUserService
{
    public string? UserId => null;
}
