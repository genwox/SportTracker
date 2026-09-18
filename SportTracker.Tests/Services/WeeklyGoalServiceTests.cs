using System.Net;
using System.Text;
using Microsoft.JSInterop;
using SportTracker.App.Auth;
using SportTracker.App.Services;

namespace SportTracker.Tests.Services;

public class WeeklyGoalServiceTests
{
    private const string GoalKeyPrefix = "st-weekly-goal:v1:";

    private FakeJsRuntime _js = null!;
    private FakeManageInfoHandler _api = null!;
    private TokenStore _tokens = null!;
    private WeeklyGoalService _service = null!;

    public WeeklyGoalServiceTests() => Setup();

    private void Setup()
    {
        _js = new FakeJsRuntime();
        _api = new FakeManageInfoHandler();
        _tokens = new TokenStore(_js);
        var http = new HttpClient(_api) { BaseAddress = new Uri("http://localhost:5294/") };
        _service = new WeeklyGoalService(http, _js, _tokens);
    }

    private async Task SignInAsync(string token, string email)
    {
        _api.CurrentEmail = email;
        await _tokens.SetTokenAsync(token);
    }

    // -------------------------------------------------------------------------
    // Valeur par défaut et validation
    // -------------------------------------------------------------------------

    [Fact]
    public async Task NoToken_ReturnsDefault_AndRefusesSave_WithoutCallingApi()
    {
        // ACT
        var goal = await _service.GetGoalAsync();
        var saved = await _service.SetGoalAsync(6);

        // ASSERT
        Assert.Equal(WeeklyGoalService.DefaultGoal, goal);
        Assert.False(saved);
        Assert.Equal(0, _api.Calls);
        Assert.DoesNotContain(_js.Storage.Keys, k => k.StartsWith(GoalKeyPrefix));
    }

    [Fact]
    public async Task SaveThenRead_UsesKeyVersionedByNormalizedEmail()
    {
        // ARRANGE
        await SignInAsync("token-a", "  Alice@Example.COM ");

        // ACT
        var before = await _service.GetGoalAsync();
        var saved = await _service.SetGoalAsync(6);
        var after = await _service.GetGoalAsync();

        // ASSERT
        Assert.Equal(4, before);
        Assert.True(saved);
        Assert.Equal(6, after);
        Assert.Equal("6", _js.Storage[GoalKeyPrefix + "alice@example.com"]);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task SaveNonPositive_IsRefused_AndNothingWritten(int value)
    {
        // ARRANGE
        await SignInAsync("token-a", "alice@example.com");

        // ACT
        var saved = await _service.SetGoalAsync(value);

        // ASSERT
        Assert.False(saved);
        Assert.False(_js.Storage.ContainsKey(GoalKeyPrefix + "alice@example.com"));
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("0")]
    [InlineData("-2")]
    [InlineData("2.5")]
    public async Task InvalidStoredValue_FallsBackToDefault(string raw)
    {
        // ARRANGE
        await SignInAsync("token-a", "alice@example.com");
        _js.Storage[GoalKeyPrefix + "alice@example.com"] = raw;

        // ACT
        var goal = await _service.GetGoalAsync();

        // ASSERT
        Assert.Equal(WeeklyGoalService.DefaultGoal, goal);
    }

    [Fact]
    public async Task ResponseWithoutEmail_IsUnavailable_AndSaveRefused()
    {
        // ARRANGE
        await SignInAsync("token-a", "");

        // ACT / ASSERT
        Assert.False(await _service.IsAvailableAsync());
        Assert.False(await _service.SetGoalAsync(5));
    }

    // -------------------------------------------------------------------------
    // Stockage indisponible
    // -------------------------------------------------------------------------

    [Fact]
    public async Task StorageThrowing_ReturnsDefault_AndSaveFails()
    {
        // ARRANGE
        await SignInAsync("token-a", "alice@example.com");
        _js.ThrowOnGoalStorage = true;

        // ACT
        var goal = await _service.GetGoalAsync();
        var saved = await _service.SetGoalAsync(6);

        // ASSERT
        Assert.Equal(WeeklyGoalService.DefaultGoal, goal);
        Assert.False(saved);
    }

    // -------------------------------------------------------------------------
    // Coupure réseau puis retry
    // -------------------------------------------------------------------------

    [Fact]
    public async Task NetworkFailure_IsNotCached_RetryFindsStoredGoal()
    {
        // ARRANGE
        await SignInAsync("token-a", "alice@example.com");
        _js.Storage[GoalKeyPrefix + "alice@example.com"] = "6";
        _api.Offline = true;

        // ACT — coupure
        var availableDuringOutage = await _service.IsAvailableAsync();
        var goalDuringOutage = await _service.GetGoalAsync();
        var savedDuringOutage = await _service.SetGoalAsync(7);

        // ACT — API revenue
        _api.Offline = false;
        var availableAfter = await _service.IsAvailableAsync();
        var goalAfter = await _service.GetGoalAsync();

        // ASSERT
        Assert.False(availableDuringOutage);
        Assert.Equal(WeeklyGoalService.DefaultGoal, goalDuringOutage);
        Assert.False(savedDuringOutage);
        Assert.Equal("6", _js.Storage[GoalKeyPrefix + "alice@example.com"]);
        Assert.True(availableAfter);
        Assert.Equal(6, goalAfter);
    }

    [Fact]
    public async Task SuccessfulIdentity_IsCachedForSameToken()
    {
        // ARRANGE
        await SignInAsync("token-a", "alice@example.com");

        // ACT
        await _service.GetGoalAsync();
        await _service.GetGoalAsync();
        await _service.IsAvailableAsync();

        // ASSERT
        Assert.Equal(1, _api.Calls);
    }

    [Fact]
    public async Task ConcurrentCalls_ShareASingleIdentityRequest()
    {
        // ARRANGE
        await SignInAsync("token-a", "alice@example.com");
        _api.Delay = TimeSpan.FromMilliseconds(50);

        // ACT
        var results = await Task.WhenAll(
            _service.GetEmailAsync(), _service.GetEmailAsync(), _service.GetEmailAsync());

        // ASSERT
        Assert.All(results, e => Assert.Equal("alice@example.com", e));
        Assert.Equal(1, _api.Calls);
    }

    // -------------------------------------------------------------------------
    // Changement de compte sans rechargement
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AccountSwitch_ReadsNewIdentity_AndNeverTouchesPreviousAccountGoal()
    {
        // ARRANGE — compte A avec objectif 6
        await SignInAsync("token-a", "alice@example.com");
        Assert.True(await _service.SetGoalAsync(6));

        // ACT — déconnexion puis connexion B dans la même instance
        await _tokens.ClearAsync();
        var goalSignedOut = await _service.GetGoalAsync();
        await SignInAsync("token-b", "bob@example.com");
        var goalB = await _service.GetGoalAsync();
        var emailB = await _service.GetEmailAsync();
        var savedB = await _service.SetGoalAsync(2);

        // ASSERT
        Assert.Equal(WeeklyGoalService.DefaultGoal, goalSignedOut);
        Assert.Equal(WeeklyGoalService.DefaultGoal, goalB);
        Assert.Equal("bob@example.com", emailB);
        Assert.True(savedB);
        Assert.Equal("6", _js.Storage[GoalKeyPrefix + "alice@example.com"]);
        Assert.Equal("2", _js.Storage[GoalKeyPrefix + "bob@example.com"]);
    }

    // -------------------------------------------------------------------------
    // Doublures
    // -------------------------------------------------------------------------

    /// <summary>localStorage en mémoire ; peut simuler un stockage d'objectif indisponible.</summary>
    private sealed class FakeJsRuntime : IJSRuntime
    {
        public Dictionary<string, string> Storage { get; } = new();
        public bool ThrowOnGoalStorage { get; set; }

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args)
            => InvokeAsync<TValue>(identifier, CancellationToken.None, args);

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args)
        {
            var key = (string)args![0]!;
            if (ThrowOnGoalStorage && key.StartsWith(GoalKeyPrefix))
                throw new JSException("SecurityError: localStorage indisponible");

            switch (identifier)
            {
                case "localStorage.getItem":
                    return ValueTask.FromResult((TValue)(object?)Storage.GetValueOrDefault(key)!);
                case "localStorage.setItem":
                    Storage[key] = (string)args[1]!;
                    return ValueTask.FromResult(default(TValue)!);
                case "localStorage.removeItem":
                    Storage.Remove(key);
                    return ValueTask.FromResult(default(TValue)!);
                default:
                    throw new InvalidOperationException(identifier);
            }
        }
    }

    /// <summary>Simule GET manage/info : email selon le jeton, ou coupure réseau.</summary>
    private sealed class FakeManageInfoHandler : HttpMessageHandler
    {
        public string CurrentEmail { get; set; } = "";
        public bool Offline { get; set; }
        public TimeSpan Delay { get; set; }
        public int Calls { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            if (Delay > TimeSpan.Zero) await Task.Delay(Delay, cancellationToken);
            if (Offline) throw new HttpRequestException("TypeError: Failed to fetch");

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent($$"""{"email":"{{CurrentEmail}}"}""", Encoding.UTF8, "application/json")
            };
        }
    }
}
