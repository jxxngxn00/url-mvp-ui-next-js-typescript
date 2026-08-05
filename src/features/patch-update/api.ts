import {
  patchImportErrorResponseSchema,
  patchImportListResponseSchema,
  patchImportRequestSchema,
  patchImportReviewResponseSchema,
  patchImportResponseSchema,
  patchApplyErrorResponseSchema,
  patchApplyResponseSchema,
  patchParseErrorResponseSchema,
  patchParseRequestSchema,
  patchParseResponseSchema,
  patchStagingReviewErrorResponseSchema,
  patchStagingRelationReviewRequestSchema,
  patchStagingRelationReviewResponseSchema,
  patchStagingReviewRequestSchema,
  patchStagingReviewResponseSchema,
} from "./schema";
import type {
  PatchImport,
  PatchApplyErrorCode,
  PatchApplyErrorResponse,
  PatchApplyResponse,
  PatchImportErrorCode,
  PatchImportErrorResponse,
  PatchImportListResponse,
  PatchImportRequest,
  PatchImportReviewResponse,
  PatchImportResponse,
  PatchParseErrorCode,
  PatchParseErrorResponse,
  PatchParseRequest,
  PatchParseResponse,
  PatchStagingReviewErrorCode,
  PatchStagingReviewErrorResponse,
  PatchStagingRelationReviewRequest,
  PatchStagingRelationReviewResponse,
  PatchStagingReviewRequest,
  PatchStagingReviewResponse,
} from "./types";

export {
  patchImportErrorResponseSchema,
  patchImportListResponseSchema,
  patchImportRequestSchema,
  patchImportReviewResponseSchema,
  patchImportResponseSchema,
  patchApplyErrorResponseSchema,
  patchApplyResponseSchema,
  patchParseErrorResponseSchema,
  patchParseRequestSchema,
  patchParseResponseSchema,
  patchStagingReviewErrorResponseSchema,
  patchStagingRelationReviewRequestSchema,
  patchStagingRelationReviewResponseSchema,
  patchStagingReviewRequestSchema,
  patchStagingReviewResponseSchema,
};

export type {
  PatchImportErrorCode,
  PatchApplyErrorCode,
  PatchApplyErrorResponse,
  PatchApplyResponse,
  PatchImportErrorResponse,
  PatchImportListResponse,
  PatchImportRequest,
  PatchImportReviewResponse,
  PatchImportResponse,
  PatchParseErrorCode,
  PatchParseErrorResponse,
  PatchParseRequest,
  PatchParseResponse,
  PatchStagingReviewErrorCode,
  PatchStagingReviewErrorResponse,
  PatchStagingRelationReviewRequest,
  PatchStagingRelationReviewResponse,
  PatchStagingReviewRequest,
  PatchStagingReviewResponse,
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

export async function fetchPatchImportsForReview(): Promise<
  PatchImportListResponse["data"]
> {
  const response = await fetch("/api/admin/patch-notes");
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error("Patch import list request failed.");
  }

  return patchImportListResponseSchema.parse(payload).data;
}

export async function fetchPatchImportForReview(
  patchImportId: string,
): Promise<PatchImportReviewResponse["data"]> {
  const response = await fetch(
    `/api/admin/patch-notes/${encodeURIComponent(patchImportId)}`,
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = patchStagingReviewErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Patch import review request failed.";

    throw new Error(message);
  }

  return patchImportReviewResponseSchema.parse(payload).data;
}

export async function updatePatchStagingChange(
  patchImportId: string,
  stagingChangeId: string,
  request: PatchStagingReviewRequest,
): Promise<PatchStagingReviewResponse["data"]> {
  const response = await fetch(
    `/api/admin/patch-notes/${encodeURIComponent(
      patchImportId,
    )}/staging/${encodeURIComponent(stagingChangeId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = patchStagingReviewErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Patch staging review request failed.";

    throw new Error(message);
  }

  return patchStagingReviewResponseSchema.parse(payload).data;
}

export async function updatePatchStagingRelation(
  patchImportId: string,
  stagingChangeId: string,
  relationId: string,
  request: PatchStagingRelationReviewRequest,
): Promise<PatchStagingRelationReviewResponse["data"]> {
  const response = await fetch(
    `/api/admin/patch-notes/${encodeURIComponent(
      patchImportId,
    )}/staging/${encodeURIComponent(
      stagingChangeId,
    )}/relations/${encodeURIComponent(relationId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = patchStagingReviewErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Patch staging relation review request failed.";

    throw new Error(message);
  }

  return patchStagingRelationReviewResponseSchema.parse(payload).data;
}

export async function applyPatchImport(
  patchImportId: string,
): Promise<PatchApplyResponse["data"]> {
  const response = await fetch(
    `/api/admin/patch-notes/${encodeURIComponent(patchImportId)}/apply`,
    {
      method: "POST",
    },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = patchApplyErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? formatErrorMessage(
          parsedError.data.error.message,
          parsedError.data.error.issues,
        )
      : "Patch apply request failed.";

    throw new Error(message);
  }

  return patchApplyResponseSchema.parse(payload).data;
}

function formatErrorMessage(message: string, issues: string[] | undefined) {
  return issues && issues.length > 0
    ? `${message}\n${issues.join("\n")}`
    : message;
}
