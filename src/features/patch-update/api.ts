import {
  patchImportErrorResponseSchema,
  patchImportRequestSchema,
  patchImportResponseSchema,
  patchParseErrorResponseSchema,
  patchParseRequestSchema,
  patchParseResponseSchema,
} from "./schema";
import type {
  PatchImport,
  PatchImportErrorCode,
  PatchImportErrorResponse,
  PatchImportRequest,
  PatchImportResponse,
  PatchParseErrorCode,
  PatchParseErrorResponse,
  PatchParseRequest,
  PatchParseResponse,
} from "./types";

export {
  patchImportErrorResponseSchema,
  patchImportRequestSchema,
  patchImportResponseSchema,
  patchParseErrorResponseSchema,
  patchParseRequestSchema,
  patchParseResponseSchema,
};

export type {
  PatchImportErrorCode,
  PatchImportErrorResponse,
  PatchImportRequest,
  PatchImportResponse,
  PatchParseErrorCode,
  PatchParseErrorResponse,
  PatchParseRequest,
  PatchParseResponse,
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

export async function parsePatchImport(
  patchImportId: string,
  request: PatchParseRequest = { forceReparse: false },
): Promise<PatchParseResponse["data"]> {
  // 관리자 화면과 route 테스트가 같은 parse API 계약을 쓰도록 클라이언트 helper를 둔다.
  const response = await fetch(
    `/api/admin/patch-notes/${encodeURIComponent(patchImportId)}/parse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = patchParseErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Patch parse request failed.";

    throw new Error(message);
  }

  return patchParseResponseSchema.parse(payload).data;
}
