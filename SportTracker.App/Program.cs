using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using SportTracker.App;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

var apiBaseUrl = builder.Configuration["ApiBaseUrl"]
    ?? throw new InvalidOperationException("ApiBaseUrl manquant dans appsettings.json");

builder.Services.AddScoped(sp => new HttpClient
    {
        BaseAddress = new Uri(apiBaseUrl)
    });

await builder.Build().RunAsync();
