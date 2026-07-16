import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PatchFetchError,
  UnsupportedPatchSourceError,
} from "@/features/patch-update/importer";
import { POST } from "./route";

const mockImportPatchNoteFromUrl = vi.hoisted(() => vi.fn());
const mockSentryScope = vi.hoisted(() => ({
  setTag: vi.fn(),
}));
const mockSentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback: (scope: typeof mockSentryScope) => void) => {
    callback(mockSentryScope);
  }),
}));

vi.mock("@/features/patch-update/service", () => ({
  importPatchNoteFromUrl: mockImportPatchNoteFromUrl,
}));

vi.mock("@/features/patch-update/repository", () => ({
  PatchImportSaveError: class PatchImportSaveError extends Error {
    constructor(message = "Failed to save patch import.") {
      super(message);
      this.name = "PatchImportSaveError";
    }
  },
}));

vi.mock("@sentry/nextjs", () => mockSentry);

type PatchImportResponseFixture = {
  id: string;
  sourceUrl: string;
  title: string | null;
  patchDate: string | null;
  contentHash: string | null;
  status: "IMPORTED" | "PARSED" | "REVIEWING" | "APPLIED" | "FAILED";
  errorMessage: string | null;
  importedAt: string;
  parsedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

describe("POST /api/admin/patch-notes/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("새 패치노트 URL import가 성공하면 201과 import 데이터를 반환한다", async () => {
    mockImportPatchNoteFromUrl.mockResolvedValueOnce({
      patchImport: createPatchImportResponseData({
        id: "patch_import_new",
      }),
      created: true,
      duplicate: false,
    });

    const response = await POST(
      createJsonRequest({
        sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({
      data: {
        id: "patch_import_new",
        status: "IMPORTED",
      },
      meta: {
        created: true,
        duplicate: false,
      },
    });
    expect(mockImportPatchNoteFromUrl).toHaveBeenCalledWith(
      "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    );
  });

  it("이미 import된 URL이면 200과 duplicate meta를 반환한다", async () => {
    mockImportPatchNoteFromUrl.mockResolvedValueOnce({
      patchImport: createPatchImportResponseData({
        id: "patch_import_existing",
      }),
      created: false,
      duplicate: true,
    });

    const response = await POST(
      createJsonRequest({
        sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: {
        id: "patch_import_existing",
      },
      meta: {
        created: false,
        duplicate: true,
      },
    });
  });

  it("공식 패치노트 URL이 아니면 422를 반환한다", async () => {
    mockImportPatchNoteFromUrl.mockRejectedValueOnce(
      new UnsupportedPatchSourceError(
        "URL must point to an official Overwatch patch notes page.",
      ),
    );

    const response = await POST(
      createJsonRequest({
        sourceUrl: "https://example.com/en-us/news/patch-notes/",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      error: {
        code: "UNSUPPORTED_PATCH_SOURCE",
      },
    });
    expect(mockSentry.captureException).toHaveBeenCalled();
  });

  it("HTML 수집에 실패하면 502를 반환한다", async () => {
    mockImportPatchNoteFromUrl.mockRejectedValueOnce(
      new PatchFetchError("Patch note request failed with status 502."),
    );

    const response = await POST(
      createJsonRequest({
        sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_FETCH_FAILED",
        message: "Patch note request failed with status 502.",
      },
    });
    expect(mockSentryScope.setTag).toHaveBeenCalledWith(
      "patch_import_error_code",
      "PATCH_FETCH_FAILED",
    );
  });

  it("요청 body가 URL 형식이 아니면 400을 반환한다", async () => {
    const response = await POST(
      createJsonRequest({
        sourceUrl: "not-a-url",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: {
        code: "INVALID_IMPORT_REQUEST",
      },
    });
    expect(mockImportPatchNoteFromUrl).not.toHaveBeenCalled();
  });
});

function createJsonRequest(body: unknown) {
  return new Request("http://localhost/api/admin/patch-notes/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function createPatchImportResponseData(
  overrides: Partial<PatchImportResponseFixture> = {},
): PatchImportResponseFixture {
  return {
    id: "patch_import",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    title: "Overwatch Retail Patch Notes",
    patchDate: "2026-07-14",
    contentHash: "a".repeat(64),
    status: "IMPORTED",
    errorMessage: null,
    importedAt: "2026-07-14T01:00:00.000Z",
    parsedAt: null,
    appliedAt: null,
    createdAt: "2026-07-14T01:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
    ...overrides,
  };
}
