using System.Net.Http.Json;
using Microsoft.JSInterop;
using SportTracker.App.Auth;

namespace SportTracker.App.Services;

/// <summary>
/// Objectif hebdomadaire (nombre de séances) partagé entre Profil et Progrès.
/// Stocké en localStorage sous une clé versionnée par l'email réel (jamais le
/// nom d'affichage générique) : sans identité ni stockage disponibles, la
/// valeur reste le défaut et toute sauvegarde échoue explicitement.
/// </summary>
/// <remarks>
/// L'identité (GET manage/info) est mise en cache pour le jeton courant seulement :
/// un changement de compte sans rechargement (déconnexion → connexion) force une
/// nouvelle lecture, et un échec (coupure réseau) n'est jamais mémorisé, pour qu'un
/// « Réessayer » retrouve l'objectif réel une fois l'API revenue. Les appels
/// concurrents partagent la même requête en cours.
/// </remarks>
public class WeeklyGoalService(HttpClient http, IJSRuntime js, TokenStore tokens)
{
    public const int DefaultGoal = 4;
    private const string KeyPrefix = "st-weekly-goal:v1:";

    private string? _cachedToken;
    private string? _cachedEmail;
    private Task<string?>? _pending;
    private string? _pendingToken;

    public async Task<bool> IsAvailableAsync() => await GetEmailAsync() is not null;

    public async Task<int> GetGoalAsync()
    {
        var email = await GetEmailAsync();
        if (email is null) return DefaultGoal;

        try
        {
            var raw = await js.InvokeAsync<string?>("localStorage.getItem", KeyFor(email));
            if (int.TryParse(raw, out var stored) && stored > 0)
                return stored;
        }
        catch (JSException)
        {
            // Stockage indisponible (navigation privée, quota, contexte non-DOM…) : défaut.
        }
        return DefaultGoal;
    }

    /// <summary>Sauvegarde l'objectif. Renvoie false si la valeur est invalide ou si
    /// l'identité/le stockage sont indisponibles (aucune sauvegarde n'a alors eu lieu).</summary>
    public async Task<bool> SetGoalAsync(int value)
    {
        if (value <= 0) return false;

        var email = await GetEmailAsync();
        if (email is null) return false;

        try
        {
            await js.InvokeVoidAsync("localStorage.setItem", KeyFor(email), value.ToString());
            return true;
        }
        catch (JSException)
        {
            return false;
        }
    }

    /// <summary>Email du compte connecté (normalisé), ou null si l'identité ne peut
    /// pas être confirmée (pas de jeton, API injoignable, réponse sans email).</summary>
    public async Task<string?> GetEmailAsync()
    {
        string? token;
        try
        {
            token = await tokens.GetTokenAsync();
        }
        catch (JSException)
        {
            return null;
        }
        if (string.IsNullOrEmpty(token)) return null;

        if (_cachedEmail is not null && _cachedToken == token) return _cachedEmail;

        if (_pending is null || _pendingToken != token)
        {
            _pendingToken = token;
            _pending = FetchEmailAsync();
        }

        var pending = _pending;
        var email = await pending;

        if (ReferenceEquals(_pending, pending))
        {
            _pending = null;
            _pendingToken = null;
            if (email is not null)
            {
                _cachedToken = token;
                _cachedEmail = email;
            }
        }
        return email;
    }

    private async Task<string?> FetchEmailAsync()
    {
        try
        {
            var info = await http.GetFromJsonAsync<ManageInfo>("manage/info");
            return string.IsNullOrWhiteSpace(info?.Email) ? null : info.Email.Trim().ToLowerInvariant();
        }
        catch
        {
            return null;
        }
    }

    private static string KeyFor(string email) => KeyPrefix + email;

    private sealed record ManageInfo(string? Email);
}
