using Microsoft.JSInterop;

namespace SportTracker.App.Auth;

/// <summary>
/// Persiste le bearer token dans le localStorage du navigateur et le met en cache
/// en mémoire pour éviter un aller-retour JS interop à chaque appel HTTP.
/// </summary>
public class TokenStore(IJSRuntime js)
{
    private const string Key = "st-auth-token";
    private const string DraftOwnerKey = "st-draft-owner";
    private string? _cached;
    private bool _loaded;
    private string? _draftOwner;
    private bool _draftOwnerLoaded;

    public async ValueTask<string?> GetTokenAsync()
    {
        if (_loaded) return _cached;
        _cached = await js.InvokeAsync<string?>("localStorage.getItem", Key);
        _loaded = true;
        return _cached;
    }

    public async ValueTask<string?> GetDraftOwnerAsync()
    {
        if (_draftOwnerLoaded) return _draftOwner;
        _draftOwner = await js.InvokeAsync<string?>("localStorage.getItem", DraftOwnerKey);
        _draftOwnerLoaded = true;
        return _draftOwner;
    }

    public async Task SetDraftOwnerAsync(string email)
    {
        _draftOwner = email.Trim().ToLowerInvariant();
        _draftOwnerLoaded = true;
        await js.InvokeVoidAsync("localStorage.setItem", DraftOwnerKey, _draftOwner);
    }

    public async Task SetTokenAsync(string token, string? email = null)
    {
        _cached = token;
        _loaded = true;
        await js.InvokeVoidAsync("localStorage.setItem", Key, token);
        if (!string.IsNullOrWhiteSpace(email)) await SetDraftOwnerAsync(email);
    }

    public async Task ClearAsync()
    {
        _cached = null;
        _loaded = true;
        _draftOwner = null;
        _draftOwnerLoaded = true;
        await js.InvokeVoidAsync("localStorage.removeItem", Key);
        await js.InvokeVoidAsync("localStorage.removeItem", DraftOwnerKey);
    }
}
