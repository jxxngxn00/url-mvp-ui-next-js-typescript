import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPatchImportsForReview } from "@/features/patch-update/repository";
import { GET } from "./route";

const mockRepository = vi.hoisted(() => ({
  listPatchImportsForReview: vi.fn(),
}));

vi.mock("@/features/patch-update/repository", () => mockRepository);

describe("GET /api/admin/patch-notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("검수용 import 목록과 상태별 staging 개수를 반환한다", async () => {
    vi.mocked(listPatchImportsForReview).mockResolvedValueOnce([
      {
        ...createPatchImportFixture({
          id: "patch_import_reviewing",
          status: "REVIEWING",
        }),
        stagingChangeCount: 3,
        pendingReviewCount: 2,
        approvedCount: 1,
        rejectedCount: 0,
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: [
        {
          id: "patch_import_reviewing",
          status: "REVIEWING",
          stagingChangeCount: 3,
          pendingReviewCount: 2,
          approvedCount: 1,
          rejectedCount: 0,
        },
      ],
      meta: {
        count: 1,
      },
    });
    expect(listPatchImportsForReview).toHaveBeenCalledTimes(1);
  });

  it("검수할 import가 없으면 빈 목록을 반환한다", async () => {
    vi.mocked(listPatchImportsForReview).mockResolvedValueOnce([]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      data: [],
      meta: {
        count: 0,
      },
    });
  });
});

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
