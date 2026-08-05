import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import {
  patchImportReviewResponseSchema,
  patchStagingReviewErrorResponseSchema,
} from "@/features/patch-update/api";
import {
  getPatchImportForReview,
  PatchImportNotFoundForReviewError,
} from "@/features/patch-update/repository";
import type { PatchStagingReviewErrorCode } from "@/features/patch-update/types";

type RouteContext = {
  params: Promise<{
    importId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { importId } = await context.params;

  try {
    const patchImport = await getPatchImportForReview(importId);
    const response = patchImportReviewResponseSchema.parse({
      data: patchImport,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PatchImportNotFoundForReviewError) {
      captureReviewError(error, "PATCH_IMPORT_NOT_FOUND");

      return errorResponse("PATCH_IMPORT_NOT_FOUND", error.message, 404);
    }

    captureReviewError(error, "PATCH_STAGING_REVIEW_FAILED");

    return errorResponse(
      "PATCH_STAGING_REVIEW_FAILED",
      "Patch import review lookup failed.",
      500,
    );
  }
}

function errorResponse(
  code: PatchStagingReviewErrorCode,
  message: string,
  status: number,
) {
  const response = patchStagingReviewErrorResponseSchema.parse({
    error: {
      code,
      message,
    },
  });

  return NextResponse.json(response, { status });
}

function captureReviewError(
  error: unknown,
  code: PatchStagingReviewErrorCode,
) {
  Sentry.withScope((scope) => {
    scope.setTag("patch_staging_review_error_code", code);
    Sentry.captureException(error);
  });
}
