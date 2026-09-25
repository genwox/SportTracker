using System.Text.Json;
using SportTracker.Core.Services;

namespace SportTracker.Tests.Services;

public class StrengthMathTests
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static TestCases Cases => JsonSerializer.Deserialize<TestCases>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "strength-math.json")), JsonOptions)!;

    [Fact]
    public void EstimateOneRm_MatchesSharedCases()
    {
        foreach (var test in Cases.EstimateCases)
        {
            var actual = StrengthMath.EstimateOneRm(test.Weight, test.Reps, test.Round);
            Assert.True(Math.Abs(actual - test.Expected) < 1e-9,
                $"{test.Name}: expected {test.Expected}, got {actual}");
        }
    }

    [Fact]
    public void DetectPersonalRecord_MatchesSharedCases()
    {
        foreach (var test in Cases.RecordCases)
        {
            var previousSets = test.HistorySets.Concat(test.TodaySets)
                .Select(set => new StrengthSet(set.Weight, set.Repetitions));
            var actual = StrengthMath.DetectPersonalRecord(previousSets, test.Weight, test.Reps);

            Assert.True(Math.Abs(actual.PreviousBest - test.ExpectedPreviousBest) < 1e-9,
                $"{test.Name}: previous best expected {test.ExpectedPreviousBest}, got {actual.PreviousBest}");
            Assert.True(Math.Abs(actual.Achieved - test.ExpectedAchieved) < 1e-9,
                $"{test.Name}: achieved expected {test.ExpectedAchieved}, got {actual.Achieved}");
            Assert.Equal(test.ExpectedIsPersonalRecord, actual.IsPersonalRecord);
            Assert.Equal(test.ExpectedIsFirst, actual.IsFirst);
        }
    }

    private sealed record TestCases(EstimateCase[] EstimateCases, RecordCase[] RecordCases);
    private sealed record EstimateCase(string Name, double Weight, int Reps, bool Round, double Expected);
    private sealed record SetCase(double Weight, int Repetitions);
    private sealed record RecordCase(
        string Name,
        SetCase[] HistorySets,
        SetCase[] TodaySets,
        double Weight,
        int Reps,
        double ExpectedPreviousBest,
        double ExpectedAchieved,
        bool ExpectedIsPersonalRecord,
        bool ExpectedIsFirst);
}
