using System.Net.Http.Json;
using System.Text.Json;

namespace SportTracker.Tools.Hevy;

public class HevyClient(HttpClient http, string apiKey)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    private const int PageSize = 100;

    public async Task<List<HevyExerciseTemplate>> GetAllExerciseTemplatesAsync()
    {
        var all = new List<HevyExerciseTemplate>();
        var page = 1;

        while (true)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://api.hevyapp.com/v1/exercise_templates?page={page}&pageSize={PageSize}");
            request.Headers.Add("api-key", apiKey);

            using var response = await http.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException(
                    $"Hevy API a répondu {(int)response.StatusCode} : {body}");
            }

            var pageResult = await response.Content.ReadFromJsonAsync<HevyExerciseTemplatesResponse>(JsonOptions)
                ?? throw new InvalidOperationException("Réponse Hevy vide ou invalide.");

            all.AddRange(pageResult.ExerciseTemplates);

            if (pageResult.ExerciseTemplates.Count == 0 || page >= pageResult.PageCount)
                break;

            page++;
        }

        return all;
    }
}
