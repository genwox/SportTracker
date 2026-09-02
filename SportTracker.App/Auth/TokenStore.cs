using Microsoft.JSInterop;

namespace SportTracker.App.Auth;

/// <summary>
/// Persiste le bearer token dans le localStorage du navigateur et le met en cache
/// en mémoire pour éviter un aller-retour JS interop à chaque appel HTTP.
/// </summary>
public class TokenStore(IJSRuntime js)
{
    private const string Key = "st-auth-token";
    private string? _cached;
    private bool _loaded;

    public async ValueTask<string?> GetTokenAsync()
    {
        if (_loaded) return _cached;
        _cached = await js.InvokeAsync<string?>("localStorage.getItem", Key);
        _loaded = true;
        return _cached;
    }

    public async Task SetTokenAsync(string token)
    {
        _cached = token;
        _loaded = true;
        await js.InvokeVoidAsync("localStorage.setItem", Key, token);
    }

    public async Task ClearAsync()
    {
        _cached = null;
        _loaded = true;
        await js.InvokeVoidAsync("localStorage.removeItem", Key);
    }
}
