import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  patchStagingRelationReviewRequestSchema,
  patchStagingRelationReviewResponseSchema,
  patchStagingReviewErrorResponseSchema,
  type PatchStagingReviewErrorCode,
} from "@/features/patch-update/api";
import {
  PatchStagingHeroNotFoundError,
  PatchStagingNotFoundError,
  PatchStagingRelationNotFoundError,
  PatchStagingReviewSaveError,
  updatePatchStagingRelationReview,
} from "@/features/patch-update/staging-repository";

type RouteContext = {
  params: Promise<{
    importId: string;
    stagingId: string;
    relationId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { importId, stagingId, relationId } = await context.params;
  const body = await readJson(request);
  const parsedRequest =
    patchStagingRelationReviewRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_STAGING_REVIEW_REQUEST",
      "Patch staging relation review request payload is invalid.",
      400,
      formatZodIssues(parsedRequest.error),
    );
  }

  try {
    const stagingChange = await updatePatchStagingRelationReview(
      importId,
      stagingId,
      relationId,
      parsedRequest.data,
    );
    const response = patchStagingRelationReviewResponseSchema.parse({
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
      captureRelationReviewError(error, "PATCH_STAGING_NOT_FOUND");

      return errorResponse("PATCH_STAGING_NOT_FOUND", error.message, 404);
    }

    if (error instanceof PatchStagingRelationNotFoundError) {
      captureRelationReviewError(error, "PATCH_STAGING_RELATION_NOT_FOUND");

      return errorResponse(
        "PATCH_STAGING_RELATION_NOT_FOUND",
        error.message,
        404,
      );
    }

    if (error instanceof PatchStagingHeroNotFoundError) {
      captureRelationReviewError(error, "PATCH_STAGING_HERO_NOT_FOUND");

      return errorResponse("PATCH_STAGING_HERO_NOT_FOUND", error.message, 422);
    }

    if (error instanceof PatchStagingReviewSaveError) {
      captureRelationReviewError(error, "PATCH_STAGING_REVIEW_FAILED");

      return errorResponse("PATCH_STAGING_REVIEW_FAILED", error.message, 409);
    }

    captureRelationReviewError(error, "PATCH_STAGING_REVIEW_FAILED");

    return errorResponse(
      "PATCH_STAGING_REVIEW_FAILED",
      "Patch staging relation review failed.",
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

function captureRelationReviewError(
  error: unknown,
  code: PatchStagingReviewErrorCode,
) {
  Sentry.withScope((scope) => {
    scope.setTag("patch_staging_relation_review_error_code", code);
    Sentry.captureException(error);
  });
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";

    return `${path}: ${issue.message}`;
  });
}
