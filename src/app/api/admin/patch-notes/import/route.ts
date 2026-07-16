import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  patchImportErrorResponseSchema,
  patchImportRequestSchema,
  patchImportResponseSchema,
  type PatchImportErrorCode,
} from "@/features/patch-update/api";
import {
  PatchFetchError,
  UnsupportedPatchSourceError,
} from "@/features/patch-update/importer";
import { PatchImportSaveError } from "@/features/patch-update/repository";
import { importPatchNoteFromUrl } from "@/features/patch-update/service";

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsedRequest = patchImportRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_IMPORT_REQUEST",
      "Patch import request payload is invalid.",
      400,
      formatZodIssues(parsedRequest.error),
    );
  }

  try {
    const result = await importPatchNoteFromUrl(parsedRequest.data.sourceUrl);
    const response = patchImportResponseSchema.parse({
      data: result.patchImport,
      meta: {
        created: result.created,
        duplicate: result.duplicate,
      },
    });

    // MVP에서는 parseImmediately를 계약에만 열어두고, 실제 parser 연결은 다음 단계에서 붙인다.
    return NextResponse.json(response, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof UnsupportedPatchSourceError) {
      captureImportError(error, "UNSUPPORTED_PATCH_SOURCE");

      return errorResponse("UNSUPPORTED_PATCH_SOURCE", error.message, 422);
    }

    if (error instanceof PatchFetchError) {
      captureImportError(error, "PATCH_FETCH_FAILED");

      return errorResponse("PATCH_FETCH_FAILED", error.message, 502);
    }

    if (error instanceof PatchImportSaveError) {
      captureImportError(error, "PATCH_IMPORT_SAVE_FAILED");

      return errorResponse("PATCH_IMPORT_SAVE_FAILED", error.message, 500);
    }

    captureImportError(error, "PATCH_IMPORT_SAVE_FAILED");

    return errorResponse(
      "PATCH_IMPORT_SAVE_FAILED",
      "Patch import failed.",
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
  code: PatchImportErrorCode,
  message: string,
  status: number,
  issues?: string[],
) {
  const response = patchImportErrorResponseSchema.parse({
    error: {
      code,
      message,
      issues,
    },
  });

  return NextResponse.json(response, { status });
}

function captureImportError(error: unknown, code: PatchImportErrorCode) {
  Sentry.withScope((scope) => {
    scope.setTag("patch_import_error_code", code);
    Sentry.captureException(error);
  });
}

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";

    return `${path}: ${issue.message}`;
  });
}
