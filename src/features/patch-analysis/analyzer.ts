import {
  PatchAnalysisJsonValidationError,
  parsePatchAnalysisJson,
} from "./validator";
import { buildPatchAnalysisPrompt, patchAnalysisJsonSchema } from "./prompt";
import type { PatchAnalysis, PatchAnalysisInput } from "./types";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiErrorResponse = {
  error?: {
    message?: string;
  };
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new PatchAnalysisLlmError("GEMINI_API_KEY is not configured.");
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: "You convert Overwatch patch notes into strict structured JSON for a Korean MVP analytics app.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildPatchAnalysisPrompt(input) }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: patchAnalysisJsonSchema,
      },
    }),
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new PatchAnalysisLlmError(
      getGeminiErrorMessage(payload),
      response.status,
    );
  }

  try {
    return parsePatchAnalysisJson(extractResponseText(payload));
  } catch (error) {
    if (error instanceof PatchAnalysisJsonValidationError) {
      throw error;
    }

    throw new PatchAnalysisLlmError("Failed to parse Gemini response.");
  }
}

function extractResponseText(payload: unknown) {
  const response = payload as GeminiGenerateContentResponse;

  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .find((partText) => typeof partText === "string");

  if (!text) {
    throw new PatchAnalysisLlmError("Gemini response did not include text.");
  }

  return text;
}

function getGeminiErrorMessage(payload: unknown) {
  const response = payload as GeminiErrorResponse;

  if (typeof response.error?.message === "string") {
    return response.error.message;
  }

  return "Gemini request failed.";
}
