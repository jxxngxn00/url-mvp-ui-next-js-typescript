import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PatchAnalysisLlmError } from "@/features/patch-analysis/analyzer";
import { PatchAnalysisJsonValidationError } from "@/features/patch-analysis/validator";
import {
  patchParseErrorResponseSchema,
  patchParseRequestSchema,
  patchParseResponseSchema,
  type PatchParseErrorCode,
} from "@/features/patch-update/api";
import {
  parsePatchImport,
  PatchImportNotFoundError,
  PatchImportNotReadyError,
} from "@/features/patch-update/service";
import { PatchStagingSaveError } from "@/features/patch-update/staging-repository";

type RouteContext = {
  params: Promise<{
    importId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { importId } = await context.params;
  const body = await readJson(request);
  const parsedRequest = patchParseRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_PARSE_REQUEST",
      "Patch parse request payload is invalid.",
      400,
      formatZodIssues(parsedRequest.error),
    );
  }

  try {
    const result = await parsePatchImport(importId, parsedRequest.data);
    const response = patchParseResponseSchema.parse({
      data: {
        patchImportId: result.patchImportId,
        status: result.status,
        stagingChangeCount: result.stagingChangeCount,
      },
      meta: {
        parsed: true,
      },
    });

    // parser 결과 원문은 서비스 계층에만 남기고, route 응답은 관리자 화면에 필요한 최소 상태만 노출한다.
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PatchImportNotFoundError) {
      captureParseError(error, "PATCH_IMPORT_NOT_FOUND");

      return errorResponse("PATCH_IMPORT_NOT_FOUND", error.message, 404);
    }

    if (error instanceof PatchImportNotReadyError) {
      captureParseError(error, "PATCH_IMPORT_NOT_READY");

      return errorResponse("PATCH_IMPORT_NOT_READY", error.message, 409);
    }

    if (error instanceof PatchStagingSaveError) {
      captureParseError(error, "PATCH_STAGING_SAVE_FAILED");

      return errorResponse("PATCH_STAGING_SAVE_FAILED", error.message, 500);
    }

    if (error instanceof PatchAnalysisJsonValidationError) {
      captureParseError(error, "PATCH_PARSE_FAILED");

      return errorResponse("PATCH_PARSE_FAILED", error.message, 422, error.issues);
    }

    if (error instanceof PatchAnalysisLlmError) {
      captureParseError(error, "PATCH_PARSE_FAILED");

      return errorResponse("PATCH_PARSE_FAILED", error.message, 502);
    }

    captureParseError(error, "PATCH_PARSE_FAILED");

    return errorResponse("PATCH_PARSE_FAILED", "Patch parse failed.", 500);
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    // parse API는 body 없이 호출해도 기본 옵션(forceReparse=false)으로 동작해야 한다.
    return {};
  }
}

function errorResponse(
  code: PatchParseErrorCode,
  message: string,
  status: number,
  issues?: string[],
) {
  const response = patchParseErrorResponseSchema.parse({
    error: {
      code,
      message,
      issues,
    },
  });

  return NextResponse.json(response, { status });
}

function captureParseError(error: unknown, code: PatchParseErrorCode) {
  Sentry.withScope((scope) => {
    scope.setTag("patch_parse_error_code", code);
    Sentry.captureException(error);
  });
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";

    return `${path}: ${issue.message}`;
  });
}
