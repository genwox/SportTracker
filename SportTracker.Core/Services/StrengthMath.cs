namespace SportTracker.Core.Services;

public readonly record struct StrengthSet(double Weight, int Repetitions);

public readonly record struct PersonalRecordResult(
    double PreviousBest,
    double Achieved,
    bool IsPersonalRecord,
    bool IsFirst);

public static class StrengthMath
{
    public static double EstimateOneRm(double weight, int reps, bool round)
    {
        if (weight <= 0 || reps <= 0) return 0;

        var estimate = weight * (1 + reps / 30.0);
        return round ? Math.Round(estimate, 1) : estimate;
    }

    public static PersonalRecordResult DetectPersonalRecord(
        IEnumerable<StrengthSet> previousSets, double weight, int reps)
    {
        // Prior sets include warmups and sets recorded today. Their estimates stay unrounded.
        var previousBest = previousSets
            .Where(set => set.Weight > 0 && set.Repetitions > 0)
            .Select(set => EstimateOneRm(set.Weight, set.Repetitions, round: false))
            .DefaultIfEmpty(0)
            .Max();
        var achieved = EstimateOneRm(weight, reps, round: true);
        var isPersonalRecord = achieved > previousBest + 0.05;

        return new PersonalRecordResult(
            previousBest, achieved, isPersonalRecord, isPersonalRecord && previousBest == 0);
    }
}
