using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using SportTracker.App;
using SportTracker.App.Auth;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseUrl = builder.Configuration["ApiBaseUrl"]
    ?? throw new InvalidOperationException("ApiBaseUrl manquant dans appsettings.json");

// ── Authentification ────────────────────────────────────────────────
// TokenStore en singleton : IHttpClientFactory crée le DelegatingHandler dans un
// scope distinct de l'app (WASM) ; un singleton garantit une seule source de vérité
// partagée entre AuthService, le provider et le handler (cache token cohérent).
builder.Services.AddSingleton<TokenStore>();
builder.Services.AddScoped<CustomAuthenticationStateProvider>();
builder.Services.AddScoped<AuthenticationStateProvider>(sp =>
    sp.GetRequiredService<CustomAuthenticationStateProvider>());
builder.Services.AddAuthorizationCore();

builder.Services.AddScoped<AuthHeaderHandler>();

// HttpClient partagé : BaseAddress + injection du bearer token via le handler.
builder.Services.AddHttpClient("SportTrackerApi", client =>
        client.BaseAddress = new Uri(apiBaseUrl))
    .AddHttpMessageHandler<AuthHeaderHandler>();

builder.Services.AddScoped(sp =>
    sp.GetRequiredService<IHttpClientFactory>().CreateClient("SportTrackerApi"));

builder.Services.AddScoped<AuthService>();

await builder.Build().RunAsync();
