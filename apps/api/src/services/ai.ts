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

/**
 * Call OpenAI with an image for vision analysis. Uses the multi-part
 * content format so GPT-4o can actually see the provided image.
 */
export async function callAIVision<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  imageUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  parse: (raw: string) => T;
}): Promise<T> {
  const {
    systemPrompt,
    userPrompt,
    imageUrl,
    model = process.env.OPENAI_MODEL || "gpt-4o",
    temperature = 0.4,
    maxTokens = 1024,
    parse,
  } = opts;

  const response = await getOpenAI().chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          { type: "text", text: userPrompt },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty AI vision response");
  }

  return parse(content);
}
