import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  patchStagingReviewErrorResponseSchema,
  patchStagingReviewRequestSchema,
  patchStagingReviewResponseSchema,
  type PatchStagingReviewErrorCode,
} from "@/features/patch-update/api";
import {
  PatchStagingHeroNotFoundError,
  PatchStagingNotFoundError,
  PatchStagingReviewSaveError,
  updatePatchStagingReview,
} from "@/features/patch-update/staging-repository";

type RouteContext = {
  params: Promise<{
    importId: string;
    stagingId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { importId, stagingId } = await context.params;
  const body = await readJson(request);
  const parsedRequest = patchStagingReviewRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_STAGING_REVIEW_REQUEST",
      "Patch staging review request payload is invalid.",
      400,
      formatZodIssues(parsedRequest.error),
    );
  }

  try {
    const stagingChange = await updatePatchStagingReview(
      importId,
      stagingId,
      parsedRequest.data,
    );
    const response = patchStagingReviewResponseSchema.parse({
      data: stagingChange,
      meta: {
        reviewed:
          stagingChange.status === "APPROVED" ||
          stagingChange.status === "REJECTED",
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PatchStagingNotFoundError) {
      captureReviewError(error, "PATCH_STAGING_NOT_FOUND");

      return errorResponse("PATCH_STAGING_NOT_FOUND", error.message, 404);
    }

    if (error instanceof PatchStagingHeroNotFoundError) {
      captureReviewError(error, "PATCH_STAGING_HERO_NOT_FOUND");

      return errorResponse("PATCH_STAGING_HERO_NOT_FOUND", error.message, 422);
    }

    if (error instanceof PatchStagingReviewSaveError) {
      captureReviewError(error, "PATCH_STAGING_REVIEW_FAILED");

      return errorResponse("PATCH_STAGING_REVIEW_FAILED", error.message, 409);
    }

    captureReviewError(error, "PATCH_STAGING_REVIEW_FAILED");

    return errorResponse(
      "PATCH_STAGING_REVIEW_FAILED",
      "Patch staging review failed.",
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
  code: PatchStagingReviewErrorCode,
  message: string,
  status: number,
  issues?: string[],
) {
  const response = patchStagingReviewErrorResponseSchema.parse({
    error: {
      code,
      message,
      issues,
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

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";

    return `${path}: ${issue.message}`;
  });
}
