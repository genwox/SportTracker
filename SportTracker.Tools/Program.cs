using Microsoft.EntityFrameworkCore;
using SportTracker.Core.Models;
using SportTracker.Data;
using SportTracker.Data.ExternalMappings;
using SportTracker.Tools;
using SportTracker.Tools.Hevy;
using SportTracker.Tools.Matching;

const string Source = "hevy";

var apply = args.Contains("--apply");

var apiKey = Environment.GetEnvironmentVariable("HEVY_API_KEY");
if (string.IsNullOrWhiteSpace(apiKey))
{
    Console.Error.WriteLine("Variable d'environnement HEVY_API_KEY manquante.");
    Console.Error.WriteLine("Récupère ta clé sur https://hevy.com/settings?developer (compte Hevy Pro requis),");
    Console.Error.WriteLine("puis relance avec : HEVY_API_KEY=<ta-clé> dotnet run --project SportTracker.Tools");
    return 1;
}

var dbPath = Environment.GetEnvironmentVariable("SPORTTRACKER_DB_PATH") ?? "sporttracker.db";
if (!File.Exists(dbPath))
{
    Console.Error.WriteLine($"Base introuvable : {Path.GetFullPath(dbPath)}");
    Console.Error.WriteLine("Lance ce programme depuis le dossier SportTracker.Api, ou fixe SPORTTRACKER_DB_PATH.");
    return 1;
}

Console.WriteLine($"Mode : {(apply ? "APPLICATION (écriture en base)" : "DRY-RUN (aucune écriture, rapport seul)")}");
Console.WriteLine($"Base utilisée : {Path.GetFullPath(dbPath)}");

var optionsBuilder = new DbContextOptionsBuilder<SportTrackerDbContext>();
optionsBuilder.UseSqlite($"Data Source={dbPath}");
await using var db = new SportTrackerDbContext(optionsBuilder.Options, new NullCurrentUserService());

var existingExercises = await db.Exercises.ToListAsync();
var existingMappings = await db.ExerciseExternalMappings
    .Where(m => m.Source == Source)
    .ToListAsync();
var alreadyLinkedHevyIds = existingMappings.Select(m => m.ExternalId).ToHashSet();

var byNormalizedName = existingExercises
    .GroupBy(e => NameMatcher.Normalize(e.Name))
    .ToDictionary(g => g.Key, g => g.ToList());

using var http = new HttpClient();
var hevyClient = new HevyClient(http, apiKey);

Console.WriteLine("Récupération des exercices Hevy…");
List<HevyExerciseTemplate> templates;
try
{
    templates = await hevyClient.GetAllExerciseTemplatesAsync();
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Échec de l'appel à l'API Hevy : {ex.Message}");
    return 1;
}
Console.WriteLine($"{templates.Count} exercices récupérés depuis Hevy.");

var alreadyLinked = new List<HevyExerciseTemplate>();
var toLink = new List<(HevyExerciseTemplate Template, Exercise Match)>();
var toCreate = new List<HevyExerciseTemplate>();
var needsReview = new List<(HevyExerciseTemplate Template, List<Exercise> Candidates)>();

foreach (var template in templates)
{
    if (alreadyLinkedHevyIds.Contains(template.Id))
    {
        alreadyLinked.Add(template);
        continue;
    }

    var normalized = NameMatcher.Normalize(template.Title);

    if (byNormalizedName.TryGetValue(normalized, out var exactMatches) && exactMatches.Count == 1)
    {
        toLink.Add((template, exactMatches[0]));
        continue;
    }

    if (exactMatches is { Count: > 1 })
    {
        needsReview.Add((template, exactMatches));
        continue;
    }

    var closeCandidates = existingExercises
        .Where(e => NameMatcher.IsCloseMatch(normalized, NameMatcher.Normalize(e.Name)))
        .ToList();

    switch (closeCandidates.Count)
    {
        case 0:
            toCreate.Add(template);
            break;
        case 1:
            needsReview.Add((template, closeCandidates));
            break;
        default:
            needsReview.Add((template, closeCandidates));
            break;
    }
}

Console.WriteLine();
Console.WriteLine("── Résumé ──────────────────────────────────────────");
Console.WriteLine($"Déjà liés               : {alreadyLinked.Count}");
Console.WriteLine($"Correspondance exacte    : {toLink.Count}");
Console.WriteLine($"Nouveaux à créer         : {toCreate.Count}");
Console.WriteLine($"À vérifier manuellement  : {needsReview.Count}");
Console.WriteLine("─────────────────────────────────────────────────────");

if (needsReview.Count > 0)
{
    Console.WriteLine();
    Console.WriteLine("À vérifier manuellement (aucune écriture automatique) :");
    foreach (var (template, candidates) in needsReview)
    {
        var candidateNames = string.Join(", ", candidates.Select(c => $"#{c.Id} \"{c.Name}\""));
        Console.WriteLine($"  Hevy \"{template.Title}\" ~ {candidateNames}");
    }
}

var reportPath = Path.Combine(AppContext.BaseDirectory, "hevy-sync-report.csv");
await WriteReportAsync(reportPath, alreadyLinked, toLink, toCreate, needsReview);
Console.WriteLine();
Console.WriteLine($"Rapport détaillé écrit dans : {reportPath}");

if (!apply)
{
    Console.WriteLine();
    Console.WriteLine("Dry-run terminé, rien n'a été modifié. Relance avec --apply pour écrire en base :");
    Console.WriteLine("  HEVY_API_KEY=... dotnet run --project SportTracker.Tools -- --apply");
    return 0;
}

Console.WriteLine();
Console.WriteLine("Application des changements…");

foreach (var (template, match) in toLink)
{
    db.ExerciseExternalMappings.Add(new ExerciseExternalMapping
    {
        ExerciseId = match.Id,
        Source = Source,
        ExternalId = template.Id
    });
}

foreach (var template in toCreate)
{
    var exercise = new Exercise
    {
        Name = template.Title,
        Type = ExerciseTypeMapper.Map(template.Type),
        MuscleGroups = MuscleGroupMapper.Map(template.PrimaryMuscleGroup, template.SecondaryMuscleGroups)
    };
    db.Exercises.Add(exercise);
    db.ExerciseExternalMappings.Add(new ExerciseExternalMapping
    {
        Exercise = exercise,
        Source = Source,
        ExternalId = template.Id
    });
}

await db.SaveChangesAsync();
Console.WriteLine($"{toLink.Count} exercice(s) lié(s), {toCreate.Count} exercice(s) créé(s).");
Console.WriteLine("Rappel : les nouveaux exercices n'ont pas de GifUrl / InstructionsFr (non fournis par l'API Hevy).");

return 0;

static async Task WriteReportAsync(
    string path,
    List<HevyExerciseTemplate> alreadyLinked,
    List<(HevyExerciseTemplate Template, Exercise Match)> toLink,
    List<HevyExerciseTemplate> toCreate,
    List<(HevyExerciseTemplate Template, List<Exercise> Candidates)> needsReview)
{
    await using var writer = new StreamWriter(path, append: false);
    await writer.WriteLineAsync("HevyId,HevyTitle,Statut,ExerciceCorrespondant");

    foreach (var t in alreadyLinked)
        await writer.WriteLineAsync(Csv(t.Id, t.Title, "deja_lie", ""));

    foreach (var (t, match) in toLink)
        await writer.WriteLineAsync(Csv(t.Id, t.Title, "a_lier", $"#{match.Id} {match.Name}"));

    foreach (var t in toCreate)
        await writer.WriteLineAsync(Csv(t.Id, t.Title, "a_creer", ""));

    foreach (var (t, candidates) in needsReview)
        await writer.WriteLineAsync(Csv(t.Id, t.Title, "a_verifier",
            string.Join(" | ", candidates.Select(c => $"#{c.Id} {c.Name}"))));
}

static string Csv(params string[] fields) =>
    string.Join(",", fields.Select(f => $"\"{f.Replace("\"", "\"\"")}\""));
