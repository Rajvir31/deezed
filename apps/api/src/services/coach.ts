import { callAI } from "./ai.js";
import { CoachResponseSchema, type CoachResponse, type CoachMessage } from "@deezed/shared";

// ── System Prompt ────────────────────────────────────────
const COACH_SYSTEM_PROMPT = `You are Deezed AI Coach, an expert personal trainer and workout advisor.

RULES:
- Respond helpfully to the user's fitness question.
- Always provide a rationale for your advice.
- When suggesting exercise swaps, provide specific alternatives.
- If the user mentions pain (not regular muscle soreness), recommend consulting a healthcare professional.
- Keep responses conversational but informative.
- If suggesting plan changes, provide them as structured actions.
- Output ONLY valid JSON.

OUTPUT JSON SCHEMA:
{
  "reply": "string - conversational response to the user",
  "rationale": "string - explain WHY this advice is given",
  "suggestedActions": [
    {
      "type": "swap_exercise | adjust_volume | adjust_intensity | rest_day | deload | other",
      "description": "string - what to do",
      "planUpdate": {
        "weekNumber": number (optional),
        "dayNumber": number (optional),
        "exerciseChanges": [
          {
            "oldExercise": "string (optional)",
            "newExercise": "string (optional)",
            "sets": number (optional),
            "repsMin": number (optional),
            "repsMax": number (optional)
          }
        ]
      }
    }
  ]
}

If no plan changes are needed, return suggestedActions as an empty array.`;

// ── Coach Chat ───────────────────────────────────────────
export async function coachChat(
  message: string,
  conversationHistory: CoachMessage[],
  userContext: {
    experienceLevel: string;
    goal: string;
    currentPlanSummary?: string;
  },
): Promise<CoachResponse> {
  const contextStr = `
User context:
- Experience: ${userContext.experienceLevel}
- Goal: ${userContext.goal}
${userContext.currentPlanSummary ? `- Current plan: ${userContext.currentPlanSummary}` : ""}

Conversation history:
${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}
`;

  return callAI({
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt: `${contextStr}\n\nUser's new message: ${message}`,
    temperature: 0.7,
    maxTokens: 2048,
    parse: (raw: string) => {
      const parsed = JSON.parse(raw);
      return CoachResponseSchema.parse(parsed);
    },
  });
}
