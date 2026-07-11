import { z } from "zod";
import { patchAnalysisSchema } from "./schema";
import type { PatchAnalysis } from "./types";

export type PatchAnalysisJsonValidationResult =
  | {
      success: true;
      data: PatchAnalysis;
    }
  | {
      success: false;
      issues: string[];
    };

export class PatchAnalysisJsonValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super("LLM analysis JSON did not match the expected patch analysis schema.");
    this.name = "PatchAnalysisJsonValidationError";
    this.issues = issues;
  }
}

export function validatePatchAnalysisJson(
  output: unknown,
): PatchAnalysisJsonValidationResult {
  const parsedJson = parseJsonOutput(output);

  if (!parsedJson.success) {
    return {
      success: false,
      issues: parsedJson.issues,
    };
  }

  const parsedAnalysis = patchAnalysisSchema.safeParse(parsedJson.data);

  if (!parsedAnalysis.success) {
    return {
      success: false,
      issues: formatZodIssues(parsedAnalysis.error),
    };
  }

  return {
    success: true,
    data: parsedAnalysis.data,
  };
}

export function parsePatchAnalysisJson(output: unknown): PatchAnalysis {
  const result = validatePatchAnalysisJson(output);

  if (!result.success) {
    throw new PatchAnalysisJsonValidationError(result.issues);
  }

  return result.data;
}

function parseJsonOutput(output: unknown):
  | {
      success: true;
      data: unknown;
    }
  | {
      success: false;
      issues: string[];
    } {
  if (typeof output !== "string") {
    return {
      success: true,
      data: output,
    };
  }

  try {
    return {
      success: true,
      data: JSON.parse(stripJsonFence(output)),
    };
  } catch {
    return {
      success: false,
      issues: ["LLM output must be valid JSON."],
    };
  }
}

function stripJsonFence(output: string) {
  const trimmed = output.trim();
  const fencedJson = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fencedJson ? fencedJson[1].trim() : trimmed;
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";

    return `${path}: ${issue.message}`;
  });
}
