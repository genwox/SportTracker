using System.Security.Claims;
using SportTracker.Core.Interfaces;

namespace SportTracker.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    
    private readonly IHttpContextAccessor _http;
    public CurrentUserService(IHttpContextAccessor http) => _http= http;
    public string? UserId => _http.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
}