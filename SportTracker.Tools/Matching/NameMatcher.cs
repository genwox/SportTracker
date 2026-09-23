using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace SportTracker.Tools.Matching;

public static class NameMatcher
{
    // "Bench Press (Barbell)" -> "bench press"
    public static string Normalize(string name)
    {
        var noAccents = RemoveDiacritics(name.ToLowerInvariant());
        var noParens = Regex.Replace(noAccents, @"\(.*?\)", " ");
        var lettersOnly = Regex.Replace(noParens, @"[^a-z0-9]+", " ");
        return Regex.Replace(lettersOnly, @"\s+", " ").Trim();
    }

    // Distance d'édition simple, utilisée pour suggérer des correspondances proches
    // (fautes de frappe, singulier/pluriel) sans jamais les appliquer automatiquement.
    public static int LevenshteinDistance(string a, string b)
    {
        var lengthA = a.Length;
        var lengthB = b.Length;
        var distances = new int[lengthA + 1, lengthB + 1];

        for (var i = 0; i <= lengthA; i++) distances[i, 0] = i;
        for (var j = 0; j <= lengthB; j++) distances[0, j] = j;

        for (var i = 1; i <= lengthA; i++)
        {
            for (var j = 1; j <= lengthB; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                distances[i, j] = Math.Min(
                    Math.Min(distances[i - 1, j] + 1, distances[i, j - 1] + 1),
                    distances[i - 1, j - 1] + cost);
            }
        }

        return distances[lengthA, lengthB];
    }

    public static bool IsCloseMatch(string a, string b)
    {
        if (a == b) return true;
        if (a.Contains(b) || b.Contains(a)) return true;

        var maxLen = Math.Max(a.Length, b.Length);
        if (maxLen < 4) return false;

        var distance = LevenshteinDistance(a, b);
        return distance <= Math.Max(1, maxLen / 6);
    }

    private static string RemoveDiacritics(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category != UnicodeCategory.NonSpacingMark)
                builder.Append(c);
        }
        return builder.ToString().Normalize(NormalizationForm.FormC);
    }
}
