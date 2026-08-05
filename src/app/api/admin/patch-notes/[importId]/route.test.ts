import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPatchImportForReview,
  PatchImportNotFoundForReviewError,
} from "@/features/patch-update/repository";
import { GET } from "./route";

const mockRepository = vi.hoisted(() => {
  class PatchImportNotFoundForReviewError extends Error {
    constructor(message = "Patch import was not found.") {
      super(message);
      this.name = "PatchImportNotFoundForReviewError";
    }
  }

  return {
    getPatchImportForReview: vi.fn(),
    PatchImportNotFoundForReviewError,
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

vi.mock("@/features/patch-update/repository", () => mockRepository);
vi.mock("@sentry/nextjs", () => mockSentry);

describe("GET /api/admin/patch-notes/[importId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("import 상세와 staging 변경 목록을 함께 반환한다", async () => {
    vi.mocked(getPatchImportForReview).mockResolvedValueOnce({
      ...createPatchImportFixture({
        id: "patch_import_1",
        status: "REVIEWING",
      }),
      stagingChanges: [createStagingChangeFixture()],
    });

    const response = await GET(createRequest(), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: {
        id: "patch_import_1",
        status: "REVIEWING",
        stagingChanges: [
          {
            id: "staging_1",
            heroNameRaw: "Cassidy",
            confidence: 0.95,
            status: "PENDING_REVIEW",
          },
        ],
      },
    });
    expect(getPatchImportForReview).toHaveBeenCalledWith("patch_import_1");
  });

  it("import row가 없으면 404를 반환한다", async () => {
    vi.mocked(getPatchImportForReview).mockRejectedValueOnce(
      new PatchImportNotFoundForReviewError(),
    );

    const response = await GET(createRequest(), createRouteContext());
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_IMPORT_NOT_FOUND",
      },
    });
    expect(mockSentryScope.setTag).toHaveBeenCalledWith(
      "patch_staging_review_error_code",
      "PATCH_IMPORT_NOT_FOUND",
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
  return new Request("http://localhost/api/admin/patch-notes/patch_import_1");
}

function createPatchImportFixture(
  overrides: Partial<{
    id: string;
    status: "IMPORTED" | "PARSED" | "REVIEWING" | "APPLIED" | "FAILED";
  }> = {},
) {
  return {
    id: "patch_import_1",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    title: "Overwatch Retail Patch Notes",
    patchDate: "2026-07-14",
    contentHash: "a".repeat(64),
    status: "IMPORTED" as const,
    errorMessage: null,
    importedAt: "2026-07-14T01:00:00.000Z",
    parsedAt: null,
    appliedAt: null,
    createdAt: "2026-07-14T01:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
    ...overrides,
  };
}

function createStagingChangeFixture() {
  return {
    id: "staging_1",
    patchImportId: "patch_import_1",
    hero: {
      id: "hero_cassidy",
      heroId: "cassidy",
      nameKo: "캐서디",
      nameEn: "Cassidy",
      role: "DAMAGE",
    },
    heroNameRaw: "Cassidy",
    abilityName: null,
    changeType: "BUFF" as const,
    impactLevel: "MEDIUM" as const,
    originalChange: "Damage increased from 70 to 75.",
    simpleSummary: "Damage increased.",
    metaImpact: "Cassidy is stronger.",
    recommendedPlaystyle: "Take mid-range fights.",
    confidence: 0.95,
    status: "PENDING_REVIEW" as const,
    reviewerNote: "원문 확인 필요",
    reviewedAt: null,
    appliedHeroChangeId: null,
    relations: [],
    createdAt: "2026-07-14T01:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
  };
}
