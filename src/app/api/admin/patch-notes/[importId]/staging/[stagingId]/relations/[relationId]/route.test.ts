import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PatchStagingHeroNotFoundError,
  PatchStagingNotFoundError,
  PatchStagingRelationNotFoundError,
  updatePatchStagingRelationReview,
} from "@/features/patch-update/staging-repository";
import { PATCH } from "./route";

const mockStagingRepository = vi.hoisted(() => {
  class PatchStagingNotFoundError extends Error {
    constructor(message = "Patch staging change was not found.") {
      super(message);
      this.name = "PatchStagingNotFoundError";
    }
  }

  class PatchStagingRelationNotFoundError extends Error {
    constructor(message = "Patch staging relation was not found.") {
      super(message);
      this.name = "PatchStagingRelationNotFoundError";
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
    updatePatchStagingRelationReview: vi.fn(),
    PatchStagingNotFoundError,
    PatchStagingRelationNotFoundError,
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

describe("PATCH /api/admin/patch-notes/[importId]/staging/[stagingId]/relations/[relationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("staging relation 대상 영웅 매칭을 저장한다", async () => {
    vi.mocked(updatePatchStagingRelationReview).mockResolvedValueOnce(
      createStagingChangeFixture(),
    );

    const response = await PATCH(
      createJsonRequest({
        targetHeroId: "mercy",
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: {
        id: "staging_1",
        relations: [
          {
            id: "relation_1",
            relationType: "SYNERGY",
            value: "Mercy",
            targetHero: {
              heroId: "mercy",
            },
          },
        ],
      },
      meta: {
        reviewed: true,
      },
    });
    expect(updatePatchStagingRelationReview).toHaveBeenCalledWith(
      "patch_import_1",
      "staging_1",
      "relation_1",
      {
        targetHeroId: "mercy",
      },
    );
  });

  it("요청 payload가 schema와 맞지 않으면 400을 반환한다", async () => {
    const response = await PATCH(
      createJsonRequest({
        targetHeroId: "",
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
    expect(updatePatchStagingRelationReview).not.toHaveBeenCalled();
  });

  it("staging row가 없으면 404를 반환한다", async () => {
    vi.mocked(updatePatchStagingRelationReview).mockRejectedValueOnce(
      new PatchStagingNotFoundError(),
    );

    const response = await PATCH(
      createJsonRequest({
        targetHeroId: "mercy",
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

  it("relation이 없으면 404를 반환한다", async () => {
    vi.mocked(updatePatchStagingRelationReview).mockRejectedValueOnce(
      new PatchStagingRelationNotFoundError(),
    );

    const response = await PATCH(
      createJsonRequest({
        targetHeroId: "mercy",
      }),
      createRouteContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      error: {
        code: "PATCH_STAGING_RELATION_NOT_FOUND",
      },
    });
  });

  it("없는 heroId면 422를 반환한다", async () => {
    vi.mocked(updatePatchStagingRelationReview).mockRejectedValueOnce(
      new PatchStagingHeroNotFoundError(),
    );

    const response = await PATCH(
      createJsonRequest({
        targetHeroId: "unknown-hero",
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
});

function createRouteContext(
  importId = "patch_import_1",
  stagingId = "staging_1",
  relationId = "relation_1",
) {
  return {
    params: Promise.resolve({
      importId,
      stagingId,
      relationId,
    }),
  };
}

function createJsonRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/patch-notes/patch_import_1/staging/staging_1/relations/relation_1",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
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
    status: "APPROVED" as const,
    reviewerNote: null,
    reviewedAt: "2026-07-14T02:00:00.000Z",
    appliedHeroChangeId: null,
    relations: [
      {
        id: "relation_1",
        relationType: "SYNERGY",
        value: "Mercy",
        targetHero: {
          id: "hero_mercy",
          heroId: "mercy",
          nameKo: "메르시",
          nameEn: "Mercy",
        },
        reason: null,
      },
    ],
    createdAt: "2026-07-14T01:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
  };
}
