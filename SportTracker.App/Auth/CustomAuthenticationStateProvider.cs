using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;

namespace SportTracker.App.Auth;

/// <summary>
/// Expose l'état connecté à partir de la présence d'un token en localStorage.
/// Les tokens de <c>MapIdentityApi</c> sont opaques : on ne décode aucun claim,
/// on suit seulement « token présent = connecté ».
/// </summary>
public class CustomAuthenticationStateProvider(TokenStore store) : AuthenticationStateProvider
{
    private static readonly AuthenticationState Anonymous =
        new(new ClaimsPrincipal(new ClaimsIdentity()));

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        var token = await store.GetTokenAsync();
        if (string.IsNullOrEmpty(token))
            return Anonymous;

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "Sportif")],
            authenticationType: "Bearer");
        return new AuthenticationState(new ClaimsPrincipal(identity));
    }

    /// <summary>À appeler après un login/logout pour rafraîchir l'UI.</summary>
    public void NotifyStateChanged()
        => NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
}
