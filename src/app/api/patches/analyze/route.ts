import { NextResponse } from "next/server";
import { z } from "zod";
import {
  patchAnalyzeErrorResponseSchema,
  patchAnalyzeRequestSchema,
  patchAnalyzeResponseSchema,
  type PatchAnalyzeErrorCode,
} from "@/features/patch-analysis/api";
import {
  PatchAnalysisLlmError,
  analyzePatchWithLlm,
} from "@/features/patch-analysis/analyzer";
import {
  PatchAnalysisSaveError,
  savePatchAnalysis,
} from "@/features/patch-analysis/repository";
import { PatchAnalysisJsonValidationError } from "@/features/patch-analysis/validator";

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsedRequest = patchAnalyzeRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_ANALYZE_REQUEST",
      "Analyze request payload is invalid.",
      400,
      formatZodIssues(parsedRequest.error),
    );
  }

  try {
    const analysis = await analyzePatchWithLlm(parsedRequest.data);
    const savedAnalysis = await savePatchAnalysis(
      analysis,
      parsedRequest.data.rawContent,
    );
    const response = patchAnalyzeResponseSchema.parse({
      data: savedAnalysis,
      meta: {
        saved: true,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PatchAnalysisJsonValidationError) {
      return errorResponse(
        "INVALID_ANALYSIS_JSON",
        error.message,
        422,
        error.issues,
      );
    }

    if (error instanceof PatchAnalysisSaveError) {
      return errorResponse(
        "ANALYSIS_SAVE_FAILED",
        error.message,
        422,
        error.missingHeroIds,
      );
    }

    if (error instanceof PatchAnalysisLlmError) {
      return errorResponse("LLM_ANALYSIS_FAILED", error.message, 500);
    }

    return errorResponse(
      "LLM_ANALYSIS_FAILED",
      "Patch analysis failed.",
      500,
    );
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function errorResponse(
  code: PatchAnalyzeErrorCode,
  message: string,
  status: number,
  issues?: string[],
) {
  const response = patchAnalyzeErrorResponseSchema.parse({
    error: {
      code,
      message,
      issues,
    },
  });

  return NextResponse.json(response, { status });
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";

    return `${path}: ${issue.message}`;
  });
}
