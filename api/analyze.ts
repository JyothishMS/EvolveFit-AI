import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.GOOGLE_GENAI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY)
  : null;

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("📥 Image analysis request received");

    const { imageBase64 } = req.body;

    if (!imageBase64) {
      console.error("❌ No image provided");
      return res.status(400).json({ error: "No image provided" });
    }

    // If Google API key not configured, use intelligent mock based on image
    if (!genAI) {
      console.log("⚠️ GOOGLE_GENAI_API_KEY not configured - using enhanced mock analysis");
      
      // Generate semi-random data based on image hash (so same image = same result)
      const imageHash = imageBase64.substring(0, 50).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
      const seed = Math.abs(imageHash % 100);
      
      const analysisData = {
        bodyFatPercentage: Math.floor((seed % 20) + 12), // 12-32%
        muscleMass: Math.floor((seed % 35) + 50), // 50-85 score
        postureScore: Math.floor((seed % 30) + 65), // 65-95 score
        recommendations: [
          `Focus on progressive overload in ${seed % 2 === 0 ? 'upper' : 'lower'} body`,
          `Increase daily protein intake to ${1.2 + (seed % 5) * 0.1}g per kg`,
          `Maintain consistent routine ${3 + (seed % 4)} times per week`,
          `Add ${seed % 2 === 0 ? 'cardio' : 'mobility'} work to your training`,
          `Ensure ${6 + (seed % 3)} hours of quality sleep for recovery`,
        ],
        weakPoints: [
          seed % 3 === 0 ? "Lower back stability - needs more core work" : "Shoulder mobility - add mobility drills",
          seed % 3 === 1 ? "Hip flexibility - incorporate dynamic stretching" : "Glute activation - add glute-focused exercises",
          seed % 2 === 0 ? "Ankle stability - add balance work" : "Knee tracking - mind form during squats",
        ],
        strongPoints: [
          seed % 2 === 0 ? "Overall upper body strength" : "Overall lower body strength",
          "Good posture foundation",
          seed % 2 === 0 ? "Strong grip strength" : "Strong leg drive potential",
        ],
      };

      return res.json({
        ...analysisData,
        lastAnalysisDate: new Date().toISOString(),
        note: "Enhanced mock analysis (add GOOGLE_GENAI_API_KEY for real AI)",
        isRealAnalysis: false,
      });
    }

    console.log("🤖 Using real Google Gemini Vision API for analysis");

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    let base64Data = imageBase64;
    if (imageBase64.includes(",")) {
      base64Data = imageBase64.split(",")[1];
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a professional fitness coach analyzing a body photo. Provide a detailed analysis in JSON format with these exact fields:

{
  "bodyFatPercentage": <number 8-40>,
  "muscleMass": <number 30-95 scale>,
  "postureScore": <number 20-100>,
  "recommendations": [<3-5 specific, actionable strings>],
  "weakPoints": [<2-3 body weaknesses to work on>],
  "strongPoints": [<2-3 strong body aspects>]
}

Be specific to what you see in the image. Provide REAL analysis, not generic advice.
Only return valid JSON, no other text.`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    const response = await model.generateContent([prompt, imagePart]);
    const text = response.response.text();

    console.log("✅ Analysis received from Gemini");

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    res.json({
      ...analysisData,
      lastAnalysisDate: new Date().toISOString(),
      isRealAnalysis: true,
    });
  } catch (err: any) {
    console.error("❌ Analysis error:", err.message || err);

    // Fallback to basic mock on error
    res.status(200).json({
      bodyFatPercentage: 18,
      muscleMass: 65,
      postureScore: 75,
      recommendations: [
        "Continue current training routine",
        "Increase protein intake",
        "Add mobility work",
        "Stay consistent with workout schedule",
        "Get 7-9 hours of sleep",
      ],
      weakPoints: [
        "Could improve posture",
        "Add more flexibility training",
      ],
      strongPoints: [
        "Consistent training foundation",
        "Good body awareness",
      ],
      lastAnalysisDate: new Date().toISOString(),
      note: "Fallback analysis - API error occurred",
      isRealAnalysis: false,
      error: err.message,
    });
  }
}
