import OpenAI from "openai";

let openaiClient: OpenAI;

export function initOpenAI() {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
}

export function getOpenAI(): OpenAI {
  if (!openaiClient) initOpenAI();
  return openaiClient;
}

/**
 * Generic function to call OpenAI with structured JSON output.
 * All AI calls in the app go through this to keep things consistent.
 */
export async function callAI<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  parse: (raw: string) => T;
}): Promise<T> {
  const {
    systemPrompt,
    userPrompt,
    model = process.env.OPENAI_MODEL || "gpt-4o",
    temperature = 0.7,
    maxTokens = 4096,
    parse,
  } = opts;

  const response = await getOpenAI().chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty AI response");
  }

  return parse(content);
}
