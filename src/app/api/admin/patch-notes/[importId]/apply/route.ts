import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import {
  patchApplyErrorResponseSchema,
  patchApplyResponseSchema,
  type PatchApplyErrorCode,
} from "@/features/patch-update/api";
import {
  applyReviewedPatchImport,
  PatchApplyNotFoundError,
  PatchApplyNotReadyError,
  PatchApplySaveError,
} from "@/features/patch-update/apply-service";

type RouteContext = {
  params: Promise<{
    importId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { importId } = await context.params;

  try {
    const result = await applyReviewedPatchImport(importId);
    const response = patchApplyResponseSchema.parse({
      data: result,
      meta: {
        applied: true,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PatchApplyNotFoundError) {
      captureApplyError(error, "PATCH_IMPORT_NOT_FOUND");

      return errorResponse("PATCH_IMPORT_NOT_FOUND", error.message, 404);
    }

    if (error instanceof PatchApplyNotReadyError) {
      captureApplyError(error, "PATCH_APPLY_NOT_READY");

      return errorResponse(
        "PATCH_APPLY_NOT_READY",
        error.message,
        409,
        error.issues,
      );
    }

    if (error instanceof PatchApplySaveError) {
      captureApplyError(error, "PATCH_APPLY_FAILED");

      return errorResponse("PATCH_APPLY_FAILED", error.message, 500);
    }

    captureApplyError(error, "PATCH_APPLY_FAILED");

    return errorResponse("PATCH_APPLY_FAILED", "Patch apply failed.", 500);
  }
}

function errorResponse(
  code: PatchApplyErrorCode,
  message: string,
  status: number,
  issues?: string[],
) {
  const response = patchApplyErrorResponseSchema.parse({
    error: {
      code,
      message,
      issues,
    },
  });

  return NextResponse.json(response, { status });
}

function captureApplyError(error: unknown, code: PatchApplyErrorCode) {
  Sentry.withScope((scope) => {
    scope.setTag("patch_apply_error_code", code);
    Sentry.captureException(error);
  });
}
