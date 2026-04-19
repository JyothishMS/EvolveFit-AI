import { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("📥 Plan generation request received");
    console.log("🔥 MOCK PLAN MODE - Demo workout plan");

    const { profile } = req.body;

    if (!profile) {
      console.error("❌ No profile provided");
      return res.status(400).json({ error: "No profile provided" });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log("✨ Workout plan generated");

    // Generate realistic mock workout plan
    const mockPlan = {
      startDate: new Date().toISOString(),
      days: [
        {
          day: "Monday",
          name: "Chest & Triceps Focus",
          muscleGroups: ["chest", "triceps", "shoulders"],
          exercises: [
            "Barbell Bench Press - 4x6-8 reps",
            "Incline Dumbbell Press - 3x8-10 reps",
            "Barbell Rows - 4x6-8 reps",
            "Tricep Dips - 3x8-10 reps",
            "Cable Flyes - 3x12-15 reps",
          ],
          isRestDay: false,
          activityType: "strength",
        },
        {
          day: "Tuesday",
          name: "Back & Biceps",
          muscleGroups: ["back", "biceps", "lats"],
          exercises: [
            "Deadlifts - 4x4-6 reps",
            "Pull-ups - 4x6-10 reps",
            "Barbell Rows - 4x8 reps",
            "Barbell Curls - 3x8-10 reps",
            "Lat Pulldowns - 3x10-12 reps",
          ],
          isRestDay: false,
          activityType: "strength",
        },
        {
          day: "Wednesday",
          name: "Active Recovery & Cardio",
          muscleGroups: ["full_body"],
          exercises: [
            "Light jogging - 20 mins",
            "Yoga or stretching - 15 mins",
            "Core work - 10 mins",
          ],
          isRestDay: false,
          activityType: "cardio",
        },
        {
          day: "Thursday",
          name: "Legs Focus",
          muscleGroups: ["quads", "hamstrings", "glutes", "calves"],
          exercises: [
            "Barbell Squats - 4x6-8 reps",
            "Romanian Deadlifts - 3x8-10 reps",
            "Leg Press - 3x10-12 reps",
            "Leg Curls - 3x10-12 reps",
            "Calf Raises - 3x12-15 reps",
          ],
          isRestDay: false,
          activityType: "strength",
        },
        {
          day: "Friday",
          name: "Shoulders & Arms",
          muscleGroups: ["shoulders", "biceps", "triceps"],
          exercises: [
            "Military Press - 4x6-8 reps",
            "Lateral Raises - 3x12-15 reps",
            "Face Pulls - 3x12-15 reps",
            "Barbell Curls - 3x8-10 reps",
            "Tricep Rope Extensions - 3x12-15 reps",
          ],
          isRestDay: false,
          activityType: "strength",
        },
        {
          day: "Saturday",
          name: "HIIT & Cardio",
          muscleGroups: ["full_body"],
          exercises: [
            "HIIT Sprint Intervals - 20 mins",
            "Battle Ropes - 3x30 secs",
            "Box Jumps - 3x8 reps",
          ],
          isRestDay: false,
          activityType: "cardio",
        },
        {
          day: "Sunday",
          name: "Rest Day",
          muscleGroups: [],
          exercises: ["Rest and recovery", "Light stretching if desired"],
          isRestDay: true,
          activityType: "rest",
        },
      ],
    };

    res.json(mockPlan);
  } catch (err: any) {
    console.error("❌ REAL ERROR:", err.message || err);
    res.status(500).json({
      error: err.message || "Plan generation failed",
    });
  }
}
