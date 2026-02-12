import { callAI } from "./ai.js";
import { AIPlanOutputSchema, type AIPlanOutput } from "@deezed/shared";
import { SPLIT_RECOMMENDATIONS } from "@deezed/shared";

// ── System Prompt ────────────────────────────────────────
const PLAN_SYSTEM_PROMPT = `You are Deezed AI, an expert strength & hypertrophy coach.
You create structured, periodized 4-week workout plans.

RULES:
- Output ONLY valid JSON matching the schema below.
- Use progressive overload: increase reps, sets, or weight each week.
- Week 4 should be a slight deload (reduce volume 15-20%, keep intensity).
- Assign appropriate RPE targets (beginners: 6-7, intermediate: 7-8, advanced: 8-9).
- Rest periods: compound lifts 120-180s, isolation 60-90s.
- Include warm-up notes where appropriate.
- Every exercise must exist in a standard gym exercise library.
- Respect equipment constraints and injury limitations.
- If user has injuries, avoid exercises that stress the affected area and suggest alternatives.

OUTPUT JSON SCHEMA:
{
  "explanation": "string - brief explanation of the plan for the user",
  "splitType": "string",
  "weeks": [
    {
      "weekNumber": number,
      "progressionNotes": "string",
      "days": [
        {
          "dayNumber": number,
          "label": "string (e.g. Push Day, Upper Body)",
          "isRestDay": boolean,
          "exercises": [
            {
              "exerciseName": "string",
              "muscleGroups": ["string"],
              "sets": number,
              "repsMin": number,
              "repsMax": number,
              "restSeconds": number,
              "rpeTarget": number,
              "notes": "string (optional)"
            }
          ]
        }
      ]
    }
  ]
}`;

// ── User Prompt Template ─────────────────────────────────
function buildUserPrompt(input: {
  experienceLevel: string;
  goal: string;
  daysPerWeek: number;
  equipment: string[];
  injuries: string[];
}): string {
  const splitType = SPLIT_RECOMMENDATIONS[input.daysPerWeek] || "upper_lower";

  return `Create a 4-week workout plan with these parameters:
- Experience level: ${input.experienceLevel}
- Goal: ${input.goal}
- Days per week: ${input.daysPerWeek}
- Recommended split: ${splitType}
- Available equipment: ${input.equipment.join(", ")}
- Injuries/limitations: ${input.injuries.length > 0 ? input.injuries.join(", ") : "None"}

Include ${input.daysPerWeek} training days and ${7 - input.daysPerWeek} rest days per week.
For rest days, set isRestDay=true and exercises=[] array.
Number days 1-7 for each week.`;
}

// ── Generate Plan ────────────────────────────────────────
export async function generateWorkoutPlan(input: {
  experienceLevel: string;
  goal: string;
  daysPerWeek: number;
  equipment: string[];
  injuries: string[];
}): Promise<AIPlanOutput> {
  return callAI({
    systemPrompt: PLAN_SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input),
    temperature: 0.6,
    maxTokens: 8192,
    parse: (raw: string) => {
      const parsed = JSON.parse(raw);
      return AIPlanOutputSchema.parse(parsed);
    },
  });
}
