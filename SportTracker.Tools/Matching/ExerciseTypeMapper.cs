using SportTracker.Core.Enums;

namespace SportTracker.Tools.Matching;

public static class ExerciseTypeMapper
{
    // Types Hevy observés : weight_reps, reps_only, weight_only, duration,
    // distance_duration, short_distance_weight, bodyweight_reps, weighted_bodyweight,
    // assisted_bodyweight. Tout ce qui repose sur une durée/distance est traité comme cardio.
    public static ExerciseType Map(string hevyType) =>
        hevyType.Contains("duration") || hevyType.Contains("distance")
            ? ExerciseType.Cardio
            : ExerciseType.Strength;
}
