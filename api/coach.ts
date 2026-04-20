import { Request, Response } from "express";

// 🧠 INTENT DETECTION - Only handles fitness-specific topics
function detectIntent(message: string): string {
  const text = message.toLowerCase();

  if ((text.includes("leg") || text.includes("knee") || text.includes("ankle")) && (text.includes("injury") || text.includes("pain") || text.includes("hurt"))) return "LEG_INJURY";
  if ((text.includes("hand") || text.includes("arm") || text.includes("wrist") || text.includes("elbow")) && (text.includes("injury") || text.includes("pain"))) return "ARM_INJURY";
  if ((text.includes("back") || text.includes("spine")) && (text.includes("injury") || text.includes("pain"))) return "BACK_INJURY";
  if ((text.includes("shoulder")) && (text.includes("injury") || text.includes("pain"))) return "SHOULDER_INJURY";
  if (text.includes("not interested") || text.includes("lazy") || text.includes("unmotivated") || text.includes("no motivation")) return "LOW_MOTIVATION";
  if (text.includes("tired") || text.includes("low energy") || text.includes("exhausted") || text.includes("fatigued")) return "LOW_ENERGY";
  if ((text.includes("time") || text.includes("minutes") || text.includes("min")) && (text.includes("only") || text.includes("just") || text.includes("limited"))) return "TIME_LIMIT";
  if (text.includes("weight loss") || text.includes("lose weight") || text.includes("cutting") || text.includes("fat loss")) return "WEIGHT_LOSS";
  if (text.includes("muscle") && (text.includes("gain") || text.includes("build") || text.includes("grow"))) return "MUSCLE_GAIN";
  if (text.includes("help") || text.includes("how") || text.includes("tell me")) return "SEEKING_HELP";

  return "UNKNOWN";
}

// 💬 SMART RESPONSE GENERATION - Dynamic but controlled
function generateResponse(intent: string): { response: string; injuryType: string } {
  const responses: Record<string, { response: string; injuryType: string }> = {
    LEG_INJURY: {
      response: "Got it! 🦵 Avoiding squats, lunges, and leg presses. Switching to upper body, chest, and core exercises instead. Your upper body gets a great workout today! 💪",
      injuryType: "leg",
    },
    ARM_INJURY: {
      response: "Understood! 🤝 Skipping push-ups, pull-ups, and pressing movements. Let's focus on legs, glutes, and lower body strength today. Lower body gains incoming! 🦵",
      injuryType: "hand",
    },
    BACK_INJURY: {
      response: "Got it! 🫀 Avoiding heavy deadlifts, rows, and intense core work. Let's do leg presses, shoulder raises, and light cardio instead. Protect that spine! 🔒",
      injuryType: "back",
    },
    SHOULDER_INJURY: {
      response: "Noted! 💪 Skipping overhead presses, pull-ups, and lateral raises. Focus on lower body, legs, and core today. Strong legs = overall strength! 🦵",
      injuryType: "shoulder",
    },
    LOW_MOTIVATION: {
      response: "No problem! 🚀 Let's keep it simple. Short 10-minute workout to stay consistent. Consistency builds champions! ⚡",
      injuryType: "none",
    },
    LOW_ENERGY: {
      response: "I hear you! 💤 Reducing intensity by 30%. Light exercises, steady cardio, and stretching. Recovery is training too! 🧘",
      injuryType: "none",
    },
    TIME_LIMIT: {
      response: "Got it! ⏱️ Switching to a quick 15-minute workout with compound exercises. Maximum gains in minimum time! 🔥",
      injuryType: "none",
    },
    WEIGHT_LOSS: {
      response: "Perfect! 🔥 We'll focus on high-intensity cardio, circuit training, and fat-burning exercises. Let's shred! 💪",
      injuryType: "none",
    },
    MUSCLE_GAIN: {
      response: "Excellent! 💪 Progressive overload time! Heavy compounds, strength focus, and controlled reps. Let's build muscle! 🚀",
      injuryType: "none",
    },
    SEEKING_HELP: {
      response: "I've got you! 💪 Tell me: Do you have an injury? Low energy? Time limit? Or specific goal (muscle gain/weight loss)? I'll adjust your workout!",
      injuryType: "none",
    },
    UNKNOWN: {
      response: "Tell me your goal, injury, or how you're feeling today! I can help with: injuries, energy levels, time limits, muscle gain, or weight loss. 💪",
      injuryType: "none",
    },
  };

  return responses[intent] || responses["UNKNOWN"];
}

export default async function coachHandler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    console.log("🤖 Intent Coach:", message);

    // Detect user intent
    const intent = detectIntent(message);
    const { response: coachResponse, injuryType } = generateResponse(intent);

    console.log(`✅ Intent detected: ${intent}`);

    res.json({
      response: coachResponse,
      detectedInjury: injuryType,
      intent: intent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ Coach error:", err.message || err);
    res.status(500).json({
      error: err.message || "Coach processing failed",
      response: "Let me help! Tell me about your workout needs.",
      detectedInjury: "none",
    });
  }
}
