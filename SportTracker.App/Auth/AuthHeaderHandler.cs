using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Components;

namespace SportTracker.App.Auth;

/// <summary>
/// Injecte <c>Authorization: Bearer &lt;token&gt;</c> sur chaque requête sortante et,
/// en cas de <c>401</c> (token expiré ou invalide), purge la session et renvoie vers /login.
/// </summary>
public class AuthHeaderHandler(
    TokenStore store,
    CustomAuthenticationStateProvider authState,
    NavigationManager nav) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = await store.GetTokenAsync();
        if (!string.IsNullOrEmpty(token))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await base.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized && !string.IsNullOrEmpty(token))
        {
            await store.ClearAsync();
            authState.NotifyStateChanged();
            var returnUrl = Uri.EscapeDataString(nav.ToBaseRelativePath(nav.Uri));
            nav.NavigateTo($"/login?returnUrl={returnUrl}", forceLoad: false);
        }

        return response;
    }
}
