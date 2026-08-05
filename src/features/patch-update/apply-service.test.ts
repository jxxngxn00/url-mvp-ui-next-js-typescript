import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchAnalysis } from "@/features/patch-analysis/types";
import {
  applyReviewedPatchImport,
  PatchApplyNotReadyError,
} from "./apply-service";

const mockTx = vi.hoisted(() => ({
  patchChangeStaging: {
    update: vi.fn(),
  },
  patchImport: {
    update: vi.fn(),
  },
}));

const mockPrisma = vi.hoisted(() => ({
  patchImport: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  heroChange: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: typeof mockTx) => unknown) =>
    callback(mockTx),
  ),
}));

const mockSavePatchAnalysis = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/features/patch-analysis/repository", () => ({
  savePatchAnalysis: mockSavePatchAnalysis,
}));

describe("applyReviewedPatchImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("승인된 staging row를 PatchAnalysis로 저장하고 상태를 APPLIED로 바꾼다", async () => {
    mockPrisma.patchImport.findUnique.mockResolvedValueOnce(
      createPatchImportRecord(),
    );
    mockSavePatchAnalysis.mockResolvedValueOnce(createSavedPatchAnalysis());
    mockPrisma.heroChange.findMany.mockResolvedValueOnce([
      {
        id: "hero_change_1",
        changeId: "cassidy-damage",
      },
    ]);

    const result = await applyReviewedPatchImport("patch_import_1");

    expect(mockSavePatchAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        patchId: "ow2-2026-07-14",
        patchTitle: "Overwatch Retail Patch Notes",
        changes: [
          expect.objectContaining({
            changeId: "cassidy-damage",
            hero: expect.objectContaining({
              heroId: "cassidy",
            }),
            affectedTiers: ["Gold"],
            synergyPicks: ["메르시"],
          }),
        ],
      }),
      "Cleaned patch text",
    );
    expect(mockTx.patchChangeStaging.update).toHaveBeenCalledWith({
      where: {
        id: "staging_1",
      },
      data: {
        status: "APPLIED",
        appliedHeroChangeId: "hero_change_1",
      },
    });
    expect(mockTx.patchImport.update).toHaveBeenCalledWith({
      where: {
        id: "patch_import_1",
      },
      data: expect.objectContaining({
        status: "APPLIED",
        errorMessage: null,
      }),
    });
    expect(result).toEqual({
      patchImportId: "patch_import_1",
      patchId: "ow2-2026-07-14",
      status: "APPLIED",
      appliedChangeCount: 1,
    });
  });

  it("승인된 staging row가 없으면 apply를 막고 실패 로그만 남긴다", async () => {
    mockPrisma.patchImport.findUnique.mockResolvedValueOnce({
      ...createPatchImportRecord(),
      stagedChanges: [],
    });

    await expect(
      applyReviewedPatchImport("patch_import_1"),
    ).rejects.toBeInstanceOf(PatchApplyNotReadyError);
    expect(mockSavePatchAnalysis).not.toHaveBeenCalled();
    expect(mockPrisma.patchImport.update).toHaveBeenCalledWith({
      where: {
        id: "patch_import_1",
      },
      data: expect.not.objectContaining({
        status: "FAILED",
      }),
    });
  });

  it("승인 row에 영웅 매핑이 없으면 apply를 막는다", async () => {
    mockPrisma.patchImport.findUnique.mockResolvedValueOnce({
      ...createPatchImportRecord(),
      stagedChanges: [
        {
          ...createPatchImportRecord().stagedChanges[0],
          hero: null,
        },
      ],
    });

    await expect(
      applyReviewedPatchImport("patch_import_1"),
    ).rejects.toBeInstanceOf(PatchApplyNotReadyError);
    expect(mockSavePatchAnalysis).not.toHaveBeenCalled();
  });
});

function createPatchImportRecord() {
  return {
    id: "patch_import_1",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    title: "Overwatch Retail Patch Notes",
    patchDate: new Date("2026-07-14T00:00:00.000Z"),
    rawHtml: "<html>raw</html>",
    rawText: "Cleaned patch text",
    contentHash: "a".repeat(64),
    status: "REVIEWING",
    errorMessage: null,
    importedAt: new Date("2026-07-14T01:00:00.000Z"),
    parsedAt: new Date("2026-07-14T01:05:00.000Z"),
    appliedAt: null,
    createdAt: new Date("2026-07-14T01:00:00.000Z"),
    updatedAt: new Date("2026-07-14T01:05:00.000Z"),
    stagedChanges: [
      {
        id: "staging_1",
        patchImportId: "patch_import_1",
        heroId: "hero_cassidy",
        hero: {
          id: "hero_cassidy",
          heroId: "cassidy",
          nameKo: "캐서디",
          nameEn: "Cassidy",
          role: "DAMAGE",
          difficulty: null,
          imageUrl: null,
          createdAt: new Date("2026-07-14T01:00:00.000Z"),
          updatedAt: new Date("2026-07-14T01:00:00.000Z"),
        },
        heroNameRaw: "Cassidy",
        abilityName: null,
        changeType: "BUFF",
        impactLevel: "MEDIUM",
        originalChange: "Damage increased from 70 to 75.",
        simpleSummary: "Damage increased.",
        metaImpact: "Cassidy is stronger.",
        recommendedPlaystyle: "Take mid-range fights.",
        parsedPayload: {
          patchId: "ow2-2026-07-14",
          patchTitle: "Overwatch Retail Patch Notes",
          patchDate: "2026-07-14",
          sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
          overallSummary: "Overall summary",
          metaSummary: "Meta summary",
          change: {
            changeId: "cassidy-damage",
          },
        },
        confidence: 0.95,
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
        reviewedAt: new Date("2026-07-14T02:00:00.000Z"),
        appliedHeroChangeId: null,
        createdAt: new Date("2026-07-14T01:05:00.000Z"),
        updatedAt: new Date("2026-07-14T02:00:00.000Z"),
        relations: [
          {
            id: "relation_tier_1",
            stagingChangeId: "staging_1",
            relationType: "AFFECTED_TIER",
            value: "Gold",
            targetHeroId: null,
            targetHero: null,
            reason: null,
            createdAt: new Date("2026-07-14T01:05:00.000Z"),
          },
          {
            id: "relation_synergy_1",
            stagingChangeId: "staging_1",
            relationType: "SYNERGY",
            value: "Mercy",
            targetHeroId: "hero_mercy",
            targetHero: {
              id: "hero_mercy",
              heroId: "mercy",
              nameKo: "메르시",
              nameEn: "Mercy",
              role: "SUPPORT",
              difficulty: null,
              imageUrl: null,
              createdAt: new Date("2026-07-14T01:00:00.000Z"),
              updatedAt: new Date("2026-07-14T01:00:00.000Z"),
            },
            reason: null,
            createdAt: new Date("2026-07-14T01:05:00.000Z"),
          },
        ],
      },
    ],
  };
}

function createSavedPatchAnalysis(): PatchAnalysis {
  return {
    patchId: "ow2-2026-07-14",
    patchTitle: "Overwatch Retail Patch Notes",
    patchDate: "2026-07-14",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    overallSummary: "Overall summary",
    metaSummary: "Meta summary",
    changes: [
      {
        changeId: "cassidy-damage",
        hero: {
          heroId: "cassidy",
          nameKo: "캐서디",
          nameEn: "Cassidy",
          role: "DAMAGE",
        },
        changeType: "BUFF",
        impactLevel: "MEDIUM",
        originalChange: "Damage increased from 70 to 75.",
        simpleSummary: "Damage increased.",
        metaImpact: "Cassidy is stronger.",
        affectedTiers: ["Gold"],
        recommendedPlaystyle: "Take mid-range fights.",
        synergyPicks: ["메르시"],
        counterPicks: [],
      },
    ],
  };
}
