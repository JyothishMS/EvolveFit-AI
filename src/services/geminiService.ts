import { GoogleGenAI, Type } from "@google/genai";
import { BodyAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeBodyPhotos(images: { data: string, mimeType: string }[]): Promise<BodyAnalysis> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Please add it to your environment variables.');
  }

  try {
    const prompt = `
      Analyze these body photos (front, side, back) for fitness assessment.
      Provide a realistic estimation of:
      1. Body Fat Percentage
      2. Muscle Mass (as a qualitative score 1-100)
      3. Posture Score (1-100)
      4. Specific recommendations for improvement
      5. Weak muscle groups that need more focus
      6. Strong muscle groups
      
      Return the data in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          ...images.map(img => ({
            inlineData: {
              data: img.data,
              mimeType: img.mimeType
            }
          })),
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bodyFatPercentage: { type: Type.NUMBER },
            muscleMass: { type: Type.NUMBER },
            postureScore: { type: Type.NUMBER },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            weakPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            strongPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["bodyFatPercentage", "muscleMass", "postureScore", "recommendations", "weakPoints", "strongPoints"]
        }
      }
    });

    const result = JSON.parse(response.text);
    
    return {
      ...result,
      lastAnalysisDate: new Date().toISOString()
    };
  } catch (error: any) {
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('AI analysis failed: Network error (Failed to fetch). Please check your internet connection or API key configuration.');
    }
    throw error;
  }
}

export async function generateWeeklyPlan(profile: any): Promise<any> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Please add it to your environment variables.');
  }

  try {
    const prompt = `
      Generate a 7-day workout schedule (Monday to Sunday) for a user with the following profile:
      - Goal: ${profile.goal}
      - Mode: ${profile.mode} (If 'home', use NO equipment)
      - Fitness Level: ${profile.level}
      - AI Analysis Weak Points: ${profile.bodyAnalysis?.weakPoints?.join(', ')}
      - External Activities: ${profile.externalActivities?.join(', ')}
      
      Rules for External Activities:
      - Distribute the selected external activities throughout the week.
      - If there are many activities, rotate them so each appears at least once or twice.
      - These activities should be in addition to or integrated with the strength training.
      
      Return a JSON object with a "days" array. Each day should have:
      - day: string (e.g., "Monday")
      - name: string (e.g., "Chest & Triceps Focus + Morning Run")
      - muscleGroups: string[]
      - isRestDay: boolean
      - activityType: "strength" | "cardio" | "both"
      
      Ensure weak points are prioritized early in the week.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  name: { type: Type.STRING },
                  muscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } },
                  isRestDay: { type: Type.BOOLEAN },
                  activityType: { type: Type.STRING, enum: ["strength", "cardio", "both"] }
                },
                required: ["day", "name", "muscleGroups", "isRestDay", "activityType"]
              }
            }
          },
          required: ["days"]
        }
      }
    });

    return {
      startDate: new Date().toISOString(),
      days: JSON.parse(response.text).days
    };
  } catch (error: any) {
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Plan generation failed: Network error (Failed to fetch). Please check your internet connection or API key configuration.');
    }
    throw error;
  }
}
