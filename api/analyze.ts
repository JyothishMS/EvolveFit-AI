import { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("📥 Request received");
    console.log("🔥 MOCK ANALYSIS MODE - Demo response");

    const { imageBase64 } = req.body;
    console.log("Image present:", !!imageBase64);

    if (!imageBase64) {
      console.error("❌ No image provided");
      return res.status(400).json({ error: "No image provided" });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("✨ Analysis complete");

    // Generate realistic mock analysis data
    const analysisData = {
      bodyFatPercentage: Math.floor(Math.random() * 15) + 12, // 12-27%
      muscleMass: Math.floor(Math.random() * 30) + 55, // 55-85 score
      postureScore: Math.floor(Math.random() * 25) + 70, // 70-95 score
      recommendations: [
        "Increase daily protein intake to 1.6g per kg of body weight",
        "Incorporate progressive overload in your strength training",
        "Maintain consistent workout routine 4-5 times per week",
        "Focus on compound exercises (squats, deadlifts, bench press)",
        "Ensure 7-9 hours of quality sleep for recovery",
      ],
      weakPoints: [
        "Lower back stability - needs more core work",
        "Shoulder mobility - add mobility drills",
        "Hip flexibility - incorporate dynamic stretching",
        "Glute activation - add glute-focused exercises",
      ],
      strongPoints: [
        "Overall upper body strength",
        "Good posture foundation",
        "Strong leg drive potential",
        "Decent body awareness",
      ],
    };

    res.json({
      ...analysisData,
      lastAnalysisDate: new Date().toISOString(),
      note: "Demo analysis - integrate real API for production",
    });
  } catch (err: any) {
    console.error("❌ REAL ERROR:", err.message || err);
    res.status(500).json({
      error: err.message || "Analysis failed",
    });
  }
}
