import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PatchStagingHeroNotFoundError,
  PatchStagingNotFoundError,
  PatchStagingReviewSaveError,
  updatePatchStagingReview,
} from "@/features/patch-update/staging-repository";
import { PATCH } from "./route";

const mockStagingRepository = vi.hoisted(() => {
  class PatchStagingNotFoundError extends Error {
    constructor(message = "Patch staging change was not found.") {
      super(message);
      this.name = "PatchStagingNotFoundError";
    }
  }

  class PatchStagingHeroNotFoundError extends Error {
    constructor(message = "Requested hero was not found.") {
      super(message);
      this.name = "PatchStagingHeroNotFoundError";
    }
  }

  class PatchStagingReviewSaveError extends Error {
    constructor(message = "Failed to save patch staging review.") {
      super(message);
      this.name = "PatchStagingReviewSaveError";
    }
  }

  return {
    updatePatchStagingReview: vi.fn(),
    PatchStagingNotFoundError,
    PatchStagingHeroNotFoundError,
    PatchStagingReviewSaveError,
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

vi.mock("@/features/patch-update/staging-repository", () => mockStagingRepository);
vi.mock("@sentry/nextjs", () => mockSentry);

describe("PATCH /api/admin/patch-notes/[importId]/staging/[stagingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("staging row 승인 요청이 성공하면 reviewed=true를 반환한다", async () => {
    vi.mocked(updatePatchStagingReview).mockResolvedValueOnce(
      createStagingChangeFixture({
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
        reviewedAt: "2026-07-14T02:00:00.000Z",
      }),
    );

    const response = await PATCH(
      createJsonRequest({
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: {
        id: "staging_1",
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
      },
      meta: {
        reviewed: true,
      },
    });
    expect(updatePatchStagingReview).toHaveBeenCalledWith(
      "patch_import_1",
      "staging_1",
      {
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
      },
    );
  });

  it("heroId 재매핑 요청을 repository에 전달한다", async () => {
    vi.mocked(updatePatchStagingReview).mockResolvedValueOnce(
      createStagingChangeFixture({
        status: "PENDING_REVIEW",
      }),
    );

    const response = await PATCH(
      createJsonRequest({
        heroId: "cassidy",
        status: "PENDING_REVIEW",
      }),
      createRouteContext(),
    );

    expect(response.status).toBe(200);
    expect(updatePatchStagingReview).toHaveBeenCalledWith(
      "patch_import_1",
      "staging_1",
      {
        heroId: "cassidy",
        status: "PENDING_REVIEW",
      },
    );
  });

  it("요청 payload가 schema와 맞지 않으면 400을 반환한다", async () => {
    const response = await PATCH(
      createJsonRequest({
        status: "UNKNOWN",
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: {
        code: "INVALID_STAGING_REVIEW_REQUEST",
      },
    });
    expect(updatePatchStagingReview).not.toHaveBeenCalled();
  });

  it("staging row가 없으면 404를 반환한다", async () => {
    vi.mocked(updatePatchStagingReview).mockRejectedValueOnce(
      new PatchStagingNotFoundError(),
    );

    const response = await PATCH(
      createJsonRequest({
        status: "APPROVED",
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_STAGING_NOT_FOUND",
      },
    });
  });

  it("없는 heroId면 422를 반환한다", async () => {
    vi.mocked(updatePatchStagingReview).mockRejectedValueOnce(
      new PatchStagingHeroNotFoundError(),
    );

    const response = await PATCH(
      createJsonRequest({
        heroId: "unknown-hero",
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_STAGING_HERO_NOT_FOUND",
      },
    });
  });

  it("검수 저장 정책 위반은 409를 반환한다", async () => {
    vi.mocked(updatePatchStagingReview).mockRejectedValueOnce(
      new PatchStagingReviewSaveError(
        "Approved staging rows must be mapped to a hero.",
      ),
    );

    const response = await PATCH(
      createJsonRequest({
        status: "APPROVED",
        heroId: null,
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_STAGING_REVIEW_FAILED",
        message: "Approved staging rows must be mapped to a hero.",
      },
    });
    expect(mockSentryScope.setTag).toHaveBeenCalledWith(
      "patch_staging_review_error_code",
      "PATCH_STAGING_REVIEW_FAILED",
    );
  });
});

function createRouteContext(
  importId = "patch_import_1",
  stagingId = "staging_1",
) {
  return {
    params: Promise.resolve({
      importId,
      stagingId,
    }),
  };
}

function createJsonRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/patch-notes/patch_import_1/staging/staging_1",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

function createStagingChangeFixture(
  overrides: Partial<{
    status:
      | "PENDING"
      | "PENDING_REVIEW"
      | "NEEDS_MAPPING"
      | "APPROVED"
      | "REJECTED"
      | "APPLIED"
      | "FAILED";
    reviewerNote: string | null;
    reviewedAt: string | null;
  }> = {},
) {
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
    reviewerNote: null,
    reviewedAt: null,
    appliedHeroChangeId: null,
    relations: [],
    createdAt: "2026-07-14T01:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
    ...overrides,
  };
}
