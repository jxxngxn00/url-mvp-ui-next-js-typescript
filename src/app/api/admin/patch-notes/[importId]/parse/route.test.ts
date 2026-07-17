import { beforeEach, describe, expect, it, vi } from "vitest";
import { PatchAnalysisLlmError } from "@/features/patch-analysis/analyzer";
import type { PatchAnalysis } from "@/features/patch-analysis/types";
import { PatchAnalysisJsonValidationError } from "@/features/patch-analysis/validator";
import {
  parsePatchImport,
  PatchImportNotFoundError,
  PatchImportNotReadyError,
} from "@/features/patch-update/service";
import { PatchStagingSaveError } from "@/features/patch-update/staging-repository";
import { POST } from "./route";

const mockService = vi.hoisted(() => {
  class PatchImportNotFoundError extends Error {
    constructor(message = "Patch import was not found.") {
      super(message);
      this.name = "PatchImportNotFoundError";
    }
  }

  class PatchImportNotReadyError extends Error {
    constructor(message = "Patch import is not ready to parse.") {
      super(message);
      this.name = "PatchImportNotReadyError";
    }
  }

  return {
    parsePatchImport: vi.fn(),
    PatchImportNotFoundError,
    PatchImportNotReadyError,
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
const mockStagingRepository = vi.hoisted(() => {
  class PatchStagingSaveError extends Error {
    constructor(message = "Failed to save patch analysis staging rows.") {
      super(message);
      this.name = "PatchStagingSaveError";
    }
  }

  return {
    PatchStagingSaveError,
  };
});

vi.mock("@/features/patch-update/service", () => mockService);
vi.mock("@/features/patch-update/staging-repository", () => mockStagingRepository);
vi.mock("@sentry/nextjs", () => mockSentry);

describe("POST /api/admin/patch-notes/[importId]/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("importId 파싱이 성공하면 REVIEWING 상태와 staging 개수를 반환한다", async () => {
    vi.mocked(parsePatchImport).mockResolvedValueOnce({
      patchImportId: "patch_import_1",
      status: "REVIEWING",
      stagingChangeCount: 2,
      analysis: createPatchAnalysisFixture(),
    });

    const response = await POST(createJsonRequest({}), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: {
        patchImportId: "patch_import_1",
        status: "REVIEWING",
        stagingChangeCount: 2,
      },
      meta: {
        parsed: true,
      },
    });
    expect(payload.data).not.toHaveProperty("analysis");
    expect(parsePatchImport).toHaveBeenCalledWith("patch_import_1", {
      forceReparse: false,
    });
  });

  it("body 없이 호출해도 기본 forceReparse=false로 parse를 실행한다", async () => {
    vi.mocked(parsePatchImport).mockResolvedValueOnce({
      patchImportId: "patch_import_1",
      status: "REVIEWING",
      stagingChangeCount: 1,
      analysis: createPatchAnalysisFixture(),
    });

    const response = await POST(createEmptyRequest(), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: {
        patchImportId: "patch_import_1",
        stagingChangeCount: 1,
      },
      meta: {
        parsed: true,
      },
    });
    expect(parsePatchImport).toHaveBeenCalledWith("patch_import_1", {
      forceReparse: false,
    });
  });

  it("forceReparse 옵션이 true면 서비스에 그대로 전달한다", async () => {
    vi.mocked(parsePatchImport).mockResolvedValueOnce({
      patchImportId: "patch_import_1",
      status: "REVIEWING",
      stagingChangeCount: 1,
      analysis: createPatchAnalysisFixture(),
    });

    await POST(createJsonRequest({ forceReparse: true }), createRouteContext());

    expect(parsePatchImport).toHaveBeenCalledWith("patch_import_1", {
      forceReparse: true,
    });
  });

  it("요청 body가 parse schema와 맞지 않으면 400을 반환한다", async () => {
    const response = await POST(
      createJsonRequest({
        forceReparse: "true",
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: {
        code: "INVALID_PARSE_REQUEST",
      },
    });
    expect(parsePatchImport).not.toHaveBeenCalled();
  });

  it("patch_imports row가 없으면 404를 반환한다", async () => {
    vi.mocked(parsePatchImport).mockRejectedValueOnce(
      new PatchImportNotFoundError(),
    );

    const response = await POST(createJsonRequest({}), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_IMPORT_NOT_FOUND",
      },
    });
    expect(mockSentryScope.setTag).toHaveBeenCalledWith(
      "patch_parse_error_code",
      "PATCH_IMPORT_NOT_FOUND",
    );
  });

  it("파싱 가능한 상태가 아니면 409를 반환한다", async () => {
    vi.mocked(parsePatchImport).mockRejectedValueOnce(
      new PatchImportNotReadyError(
        "Patch import was already parsed. Use forceReparse to parse again.",
      ),
    );

    const response = await POST(createJsonRequest({}), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_IMPORT_NOT_READY",
        message:
          "Patch import was already parsed. Use forceReparse to parse again.",
      },
    });
  });

  it("LLM 호출이 실패하면 502와 PATCH_PARSE_FAILED를 반환한다", async () => {
    vi.mocked(parsePatchImport).mockRejectedValueOnce(
      new PatchAnalysisLlmError("GEMINI_API_KEY is not configured."),
    );

    const response = await POST(createJsonRequest({}), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_PARSE_FAILED",
        message: "GEMINI_API_KEY is not configured.",
      },
    });
  });

  it("LLM JSON 검증이 실패하면 issues와 함께 422를 반환한다", async () => {
    vi.mocked(parsePatchImport).mockRejectedValueOnce(
      new PatchAnalysisJsonValidationError(["changes: Required"]),
    );

    const response = await POST(createJsonRequest({}), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_PARSE_FAILED",
        issues: ["changes: Required"],
      },
    });
  });

  it("staging 저장이 실패하면 500과 PATCH_STAGING_SAVE_FAILED를 반환한다", async () => {
    vi.mocked(parsePatchImport).mockRejectedValueOnce(
      new PatchStagingSaveError("Failed to save patch analysis staging rows."),
    );

    const response = await POST(createJsonRequest({}), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_STAGING_SAVE_FAILED",
      },
    });
  });
});

function createRouteContext(importId = "patch_import_1") {
  return {
    params: Promise.resolve({
      importId,
    }),
  };
}

function createJsonRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/patch-notes/patch_import_1/parse",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

function createEmptyRequest() {
  return new Request(
    "http://localhost/api/admin/patch-notes/patch_import_1/parse",
    {
      method: "POST",
    },
  );
}

function createPatchAnalysisFixture(): PatchAnalysis {
  return {
    patchId: "ow2-2026-07-14-retail-patch-notes",
    patchTitle: "Overwatch Retail Patch Notes",
    patchDate: "2026-07-14",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    overallSummary: "Test patch summary.",
    metaSummary: "The meta impact is neutral in this fixture.",
    changes: [
      {
        changeId: "ana-biotic-rifle-healing",
        hero: {
          heroId: "ana",
          nameKo: "아나",
          nameEn: "Ana",
          role: "SUPPORT",
        },
        changeType: "BUFF",
        impactLevel: "MEDIUM",
        originalChange: "Biotic Rifle healing increased from 70 to 75.",
        simpleSummary: "Biotic Rifle healing increased.",
        metaImpact: "Ana gains slightly better sustain.",
        affectedTiers: ["Master"],
        recommendedPlaystyle: "Play around longer poke trades.",
        synergyPicks: [],
        counterPicks: [],
      },
    ],
  };
}
