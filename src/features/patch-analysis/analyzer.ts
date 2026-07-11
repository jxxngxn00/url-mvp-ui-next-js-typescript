import {
  PatchAnalysisJsonValidationError,
  parsePatchAnalysisJson,
} from "./validator";
import { buildPatchAnalysisPrompt, patchAnalysisJsonSchema } from "./prompt";
import type { PatchAnalysis, PatchAnalysisInput } from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

const openAiResponseSchema = {
  text: {
    format: {
      type: "json_schema",
      name: "patch_analysis",
      strict: true,
      schema: patchAnalysisJsonSchema,
    },
  },
} as const;

type OpenAIResponseOutput = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

export class PatchAnalysisLlmError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "PatchAnalysisLlmError";
    this.status = status;
  }
}

export async function analyzePatchWithLlm(
  input: PatchAnalysisInput,
): Promise<PatchAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new PatchAnalysisLlmError("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You convert Overwatch patch notes into strict structured JSON for a Korean MVP analytics app.",
        },
        {
          role: "user",
          content: buildPatchAnalysisPrompt(input),
        },
      ],
      ...openAiResponseSchema,
    }),
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new PatchAnalysisLlmError(
      getOpenAIErrorMessage(payload),
      response.status,
    );
  }

  try {
    return parsePatchAnalysisJson(extractResponseText(payload));
  } catch (error) {
    if (error instanceof PatchAnalysisJsonValidationError) {
      throw error;
    }

    throw new PatchAnalysisLlmError("Failed to parse OpenAI response.");
  }
}

function extractResponseText(payload: unknown) {
  const response = payload as OpenAIResponseOutput;

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => typeof content.text === "string")?.text;

  if (!text) {
    throw new PatchAnalysisLlmError("OpenAI response did not include text.");
  }

  return text;
}

function getOpenAIErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return "OpenAI request failed.";
}
