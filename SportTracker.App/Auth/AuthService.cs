using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace SportTracker.App.Auth;

/// <summary>
/// Appelle les endpoints <c>MapIdentityApi</c> (/login, /register) et gère la
/// persistance du token + la notification de l'état d'authentification.
/// </summary>
public class AuthService(
    HttpClient http,
    TokenStore store,
    CustomAuthenticationStateProvider authState)
{
    /// <summary>Connexion. Renvoie <c>null</c> si OK, sinon un message d'erreur.</summary>
    public async Task<string?> LoginAsync(string email, string password)
    {
        HttpResponseMessage response;
        try
        {
            response = await http.PostAsJsonAsync("login",
                new { email, password });
        }
        catch (HttpRequestException)
        {
            return "Impossible de joindre le serveur.";
        }

        if (!response.IsSuccessStatusCode)
            return "Email ou mot de passe incorrect.";

        var token = await response.Content.ReadFromJsonAsync<AccessTokenResponse>();
        if (token?.AccessToken is null)
            return "Réponse du serveur invalide.";

        await store.SetTokenAsync(token.AccessToken);
        authState.NotifyStateChanged();
        return null;
    }

    /// <summary>Inscription puis connexion automatique. Renvoie <c>null</c> si OK.</summary>
    public async Task<string?> RegisterAsync(string email, string password)
    {
        HttpResponseMessage response;
        try
        {
            response = await http.PostAsJsonAsync("register",
                new { email, password });
        }
        catch (HttpRequestException)
        {
            return "Impossible de joindre le serveur.";
        }

        if (!response.IsSuccessStatusCode)
        {
            var problem = await TryReadIdentityErrorsAsync(response);
            return problem ?? "Inscription impossible. Vérifie l'email et le mot de passe.";
        }

        // Identity renvoie 200 sans corps : on enchaîne sur un login.
        return await LoginAsync(email, password);
    }

    public async Task LogoutAsync()
    {
        await store.ClearAsync();
        authState.NotifyStateChanged();
    }

    private static async Task<string?> TryReadIdentityErrorsAsync(HttpResponseMessage response)
    {
        try
        {
            var problem = await response.Content.ReadFromJsonAsync<IdentityProblem>();
            if (problem?.Errors is { Count: > 0 } errors)
                return string.Join(" ", errors.Values.SelectMany(v => v));
        }
        catch
        {
            // corps non JSON / vide — on retombe sur le message générique
        }
        return null;
    }

    private sealed record AccessTokenResponse(
        [property: JsonPropertyName("accessToken")] string? AccessToken,
        [property: JsonPropertyName("expiresIn")] int ExpiresIn);

    private sealed record IdentityProblem(
        [property: JsonPropertyName("errors")] Dictionary<string, string[]>? Errors);
}
