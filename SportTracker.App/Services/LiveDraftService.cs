using Microsoft.JSInterop;
using System.Net;
using System.Net.Http.Json;
using SportTracker.App.Auth;
using SportTracker.Core.Enums;

namespace SportTracker.App.Services;

public sealed class LiveDraftService(IJSRuntime js, TokenStore tokens, HttpClient http)
{
    private readonly SemaphoreSlim syncGate = new(1, 1);
    public event Action<string>? Synced;
    private async Task<string> OwnerAsync()
    {
        var token = await tokens.GetTokenAsync()
            ?? throw new InvalidOperationException("Connexion requise pour les brouillons live.");
        var owner = await tokens.GetDraftOwnerAsync();
        if (!string.IsNullOrWhiteSpace(owner)) return owner;
        try
        {
            var info = await http.GetFromJsonAsync<AccountInfo>("manage/info");
            if (!string.IsNullOrWhiteSpace(info?.Email))
            {
                owner = info.Email.Trim().ToLowerInvariant();
                await js.InvokeVoidAsync("liveDrafts.migrate", token, owner);
                await tokens.SetDraftOwnerAsync(owner);
                return owner;
            }
        }
        catch (Exception) { /* Hors ligne : le scope temporaire sera migré au retour du réseau. */ }
        return token;
    }

    private sealed class AccountInfo { public string? Email { get; set; } }

    public async Task<T?> GetAsync<T>(string key) =>
        await js.InvokeAsync<T?>("liveDrafts.get", await OwnerAsync(), key);

    public async Task PutAsync<T>(string key, T value) =>
        await js.InvokeVoidAsync("liveDrafts.put", await OwnerAsync(), key, value);

    public async Task<List<T>> ListAsync<T>(string prefix) =>
        await js.InvokeAsync<List<T>>("liveDrafts.list", await OwnerAsync(), prefix);

    public async Task RemoveAsync(string key) =>
        await js.InvokeVoidAsync("liveDrafts.remove", await OwnerAsync(), key);

    public async Task<bool> IsOnlineAsync() => await js.InvokeAsync<bool>("liveDrafts.isOnline");

    public async Task<LiveExerciseDraft?> SyncAsync(string key)
    {
        await syncGate.WaitAsync();
        try
        {
            for (var attempt = 0; attempt < 3; attempt++)
            {
                var draft = await GetAsync<LiveExerciseDraft>(key);
                if (draft is null || !draft.PendingSync || draft.SyncConflict || !await IsOnlineAsync()) return draft;
                var body = new
                {
                    workoutProgramSessionId = draft.ProgramSessionId,
                    workoutDate = draft.WorkoutDate,
                    sessionName = draft.SessionName,
                    notes = draft.Notes,
                    supersetGroupId = draft.SupersetGroupId,
                    sets = draft.Sets.Select(s => new { s.Weight, s.Repetitions, s.SetType, s.RPE }).ToArray(),
                    expectedWorkoutSessionId = await KnownWorkoutSessionIdAsync(draft)
                };
                using var response = await http.PutAsJsonAsync(
                    $"api/workoutsessions/live/{draft.DraftId}/exercises/{draft.ExerciseId}", body);
                if (response.StatusCode == HttpStatusCode.Conflict)
                {
                    // La séance serveur a disparu : on garde les séries localement et on laisse
                    // l'utilisateur choisir (recréer ou abandonner) au lieu de la recréer en silence.
                    var current = await GetAsync<LiveExerciseDraft>(key);
                    if (current is null) return null;
                    current.SyncConflict = true;
                    await PutAsync(key, current);
                    Synced?.Invoke(key);
                    return current;
                }
                if (!response.IsSuccessStatusCode) return draft;

                var result = await response.Content.ReadFromJsonAsync<SyncResponse>();
                var latest = await GetAsync<LiveExerciseDraft>(key);
                if (latest is null) return null;
                if (latest.Revision != draft.Revision) continue;
                latest.WorkoutSessionId = result?.WorkoutSessionId;
                if (result?.Sets is not null)
                    for (var i = 0; i < Math.Min(latest.Sets.Count, result.Sets.Count); i++)
                        latest.Sets[i].Id = result.Sets[i].Id;
                latest.PendingSync = false;
                latest.SavedAtUtc = DateTime.UtcNow;
                await PutAsync(key, latest);
                Synced?.Invoke(key);
                return latest;
            }
            return await GetAsync<LiveExerciseDraft>(key);
        }
        catch (Exception) { return await GetAsync<LiveExerciseDraft>(key); }
        finally { syncGate.Release(); }
    }

    public async Task SyncPendingAsync()
    {
        if (!await IsOnlineAsync()) return;
        var free = await ListAsync<LiveExerciseDraft>("free:");
        var routine = await ListAsync<LiveExerciseDraft>("routine:");
        foreach (var draft in free.Concat(routine).Where(d => d.PendingSync && !d.SyncConflict))
        {
            if (!string.IsNullOrEmpty(draft.StorageKey)) await SyncAsync(draft.StorageKey);
        }
    }

    // Séance serveur à laquelle ce brouillon (ou un exercice frère de la même séance) est déjà
    // rattaché. Envoyée au serveur pour qu'il refuse de recréer une séance supprimée entre-temps.
    private async Task<int?> KnownWorkoutSessionIdAsync(LiveExerciseDraft draft)
    {
        if (draft.WorkoutSessionId is int id) return id;
        var siblings = await ListAsync<LiveExerciseDraft>(SiblingPrefix(draft.StorageKey));
        return siblings.Select(d => d.WorkoutSessionId).FirstOrDefault(known => known is not null);
    }

    // "free:{draftId}:{exerciseId}" → "free:{draftId}:" ; "routine:{session}:{date}:{exerciseId}" → "routine:{session}:{date}:"
    private static string SiblingPrefix(string key) => key[..(key.LastIndexOf(':') + 1)];

    /// <summary>
    /// Sortie d'un conflit de synchro : soit on recrée une séance serveur avec les séries
    /// locales, soit on abandonne le brouillon de cet exercice.
    /// </summary>
    public async Task<LiveExerciseDraft?> ResolveConflictAsync(string key, bool recreate)
    {
        if (!recreate) { await RemoveAsync(key); return null; }
        var draft = await GetAsync<LiveExerciseDraft>(key);
        if (draft is null) return null;
        var lostId = await KnownWorkoutSessionIdAsync(draft);
        if (lostId is not null)
        {
            // Les exercices frères pointaient vers la même séance supprimée : on les détache aussi.
            foreach (var sibling in await ListAsync<LiveExerciseDraft>(SiblingPrefix(key)))
            {
                if (sibling.WorkoutSessionId != lostId || sibling.StorageKey == key) continue;
                sibling.WorkoutSessionId = null;
                await PutAsync(sibling.StorageKey, sibling);
            }
        }
        draft.WorkoutSessionId = null;
        draft.SyncConflict = false;
        draft.PendingSync = true;
        draft.Revision++;
        draft.SavedAtUtc = DateTime.UtcNow;
        await PutAsync(key, draft);
        return await SyncAsync(key);
    }

    private sealed class SyncResponse
    {
        public int WorkoutSessionId { get; set; }
        public List<SyncSet> Sets { get; set; } = [];
    }
    private sealed class SyncSet { public int Id { get; set; } }
}

public sealed class LiveExerciseDraft
{
    public string StorageKey { get; set; } = "";
    public Guid DraftId { get; set; } = Guid.NewGuid();
    public DateTime WorkoutDate { get; set; } = DateTime.Today;
    public int? ProgramSessionId { get; set; }
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = "";
    public string? GifUrl { get; set; }
    public string? Instructions { get; set; }
    public string? SessionName { get; set; }
    public int RestSeconds { get; set; }
    public int TargetSets { get; set; }
    public List<LiveSetDraft> Sets { get; set; } = [];
    public double WeightCurrent { get; set; } = 20;
    public int RepsCurrent { get; set; } = 10;
    public SetType SetType { get; set; } = SetType.Normal;
    public int? RPE { get; set; }
    public string? Notes { get; set; }
    public int? SupersetGroupId { get; set; }
    public bool PendingSync { get; set; }
    /// <summary>La séance serveur ciblée n'existe plus : synchro suspendue jusqu'à décision de l'utilisateur.</summary>
    public bool SyncConflict { get; set; }
    public int Revision { get; set; }
    public DateTime SavedAtUtc { get; set; }
    public int? WorkoutSessionId { get; set; }
}

public sealed class LiveSetDraft
{
    public int Id { get; set; }
    public double Weight { get; set; }
    public int Repetitions { get; set; }
    public SetType SetType { get; set; } = SetType.Normal;
    public int? RPE { get; set; }
}
