using System.Net.Http.Json;
using Microsoft.JSInterop;

namespace SportTracker.App.Services;

/// <summary>
/// Objectif hebdomadaire (nombre de séances) partagé entre Profil et Progrès.
/// Stocké en localStorage sous une clé versionnée par l'email réel (jamais le
/// nom d'affichage générique) : sans identité ni stockage disponibles, la
/// valeur reste le défaut et toute sauvegarde échoue explicitement.
/// </summary>
public class WeeklyGoalService(HttpClient http, IJSRuntime js)
{
    public const int DefaultGoal = 4;
    private const string KeyPrefix = "st-weekly-goal:v1:";

    private string? _email;
    private bool _emailLoaded;

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

    private async Task<string?> GetEmailAsync()
    {
        if (_emailLoaded) return _email;
        try
        {
            var info = await http.GetFromJsonAsync<ManageInfo>("manage/info");
            _email = string.IsNullOrWhiteSpace(info?.Email) ? null : info.Email.Trim().ToLowerInvariant();
        }
        catch
        {
            _email = null;
        }
        _emailLoaded = true;
        return _email;
    }

    private static string KeyFor(string email) => KeyPrefix + email;

    private sealed record ManageInfo(string? Email);
}
