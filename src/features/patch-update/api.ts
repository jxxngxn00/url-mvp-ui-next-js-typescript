import {
  patchImportErrorResponseSchema,
  patchImportRequestSchema,
  patchImportResponseSchema,
} from "./schema";
import type {
  PatchImport,
  PatchImportErrorCode,
  PatchImportErrorResponse,
  PatchImportRequest,
  PatchImportResponse,
} from "./types";

export {
  patchImportErrorResponseSchema,
  patchImportRequestSchema,
  patchImportResponseSchema,
};

export type {
  PatchImportErrorCode,
  PatchImportErrorResponse,
  PatchImportRequest,
  PatchImportResponse,
};

export async function importPatchNote(
  request: PatchImportRequest,
): Promise<PatchImport> {
  const response = await fetch("/api/admin/patch-notes/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = patchImportErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Patch import request failed.";

    throw new Error(message);
  }

  return patchImportResponseSchema.parse(payload).data;
}
