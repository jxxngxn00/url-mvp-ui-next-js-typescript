import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyReviewedPatchImport,
  PatchApplyNotFoundError,
  PatchApplyNotReadyError,
} from "@/features/patch-update/apply-service";
import { POST } from "./route";

const mockApplyService = vi.hoisted(() => {
  class PatchApplyNotFoundError extends Error {
    constructor(message = "Patch import was not found.") {
      super(message);
      this.name = "PatchApplyNotFoundError";
    }
  }

  class PatchApplyNotReadyError extends Error {
    issues: string[];

    constructor(
      message = "Patch import has unresolved review issues.",
      issues: string[] = [],
    ) {
      super(message);
      this.name = "PatchApplyNotReadyError";
      this.issues = issues;
    }
  }

  class PatchApplySaveError extends Error {
    constructor(message = "Failed to apply patch import.") {
      super(message);
      this.name = "PatchApplySaveError";
    }
  }

  return {
    applyReviewedPatchImport: vi.fn(),
    PatchApplyNotFoundError,
    PatchApplyNotReadyError,
    PatchApplySaveError,
  };
});
const mockSentryScope = vi.hoisted(() => ({
  setTag: vi.fn(),
}));
const mockSentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback: (scope: typeof mockSentryScope) => void) => {
    callback(mockSentryScope);
  }),
}));

vi.mock("@/features/patch-update/apply-service", () => mockApplyService);
vi.mock("@sentry/nextjs", () => mockSentry);

describe("POST /api/admin/patch-notes/[importId]/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("apply가 성공하면 APPLIED 상태와 반영 개수를 반환한다", async () => {
    vi.mocked(applyReviewedPatchImport).mockResolvedValueOnce({
      patchImportId: "patch_import_1",
      patchId: "ow2-2026-07-14",
      status: "APPLIED",
      appliedChangeCount: 2,
    });

    const response = await POST(createRequest(), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: {
        patchImportId: "patch_import_1",
        patchId: "ow2-2026-07-14",
        status: "APPLIED",
        appliedChangeCount: 2,
      },
      meta: {
        applied: true,
      },
    });
    expect(applyReviewedPatchImport).toHaveBeenCalledWith("patch_import_1");
  });

  it("import row가 없으면 404를 반환한다", async () => {
    vi.mocked(applyReviewedPatchImport).mockRejectedValueOnce(
      new PatchApplyNotFoundError(),
    );

    const response = await POST(createRequest(), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_IMPORT_NOT_FOUND",
      },
    });
  });

  it("apply 준비가 안 된 import는 409와 issues를 반환한다", async () => {
    vi.mocked(applyReviewedPatchImport).mockRejectedValueOnce(
      new PatchApplyNotReadyError("Patch import has unresolved review issues.", [
        "At least one APPROVED staging row is required before apply.",
      ]),
    );

    const response = await POST(createRequest(), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_APPLY_NOT_READY",
        issues: ["At least one APPROVED staging row is required before apply."],
      },
    });
    expect(mockSentryScope.setTag).toHaveBeenCalledWith(
      "patch_apply_error_code",
      "PATCH_APPLY_NOT_READY",
    );
  });
});

function createRouteContext(importId = "patch_import_1") {
  return {
    params: Promise.resolve({
      importId,
    }),
  };
}

function createRequest() {
  return new Request(
    "http://localhost/api/admin/patch-notes/patch_import_1/apply",
    {
      method: "POST",
    },
  );
}
