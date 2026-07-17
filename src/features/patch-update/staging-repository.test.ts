import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchAnalysis } from "@/features/patch-analysis/types";
import { savePatchAnalysisToStaging } from "./staging-repository";

const mockTx = vi.hoisted(() => ({
  hero: {
    findMany: vi.fn(),
  },
  patchChangeStaging: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
}));

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn((callback: (tx: typeof mockTx) => unknown) =>
    callback(mockTx),
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("savePatchAnalysisToStaging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("기존 staging row를 지우고 parser 결과를 PENDING row로 저장한다", async () => {
    mockTx.hero.findMany.mockResolvedValueOnce([
      {
        id: "hero_cassidy",
        heroId: "cassidy",
        nameEn: "Cassidy",
        nameKo: "캐서디",
      },
    ]);
    mockTx.patchChangeStaging.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockTx.patchChangeStaging.create.mockResolvedValueOnce({ id: "staging_1" });

    const result = await savePatchAnalysisToStaging(
      "patch_import_1",
      createPatchAnalysis(),
    );

    expect(mockTx.patchChangeStaging.deleteMany).toHaveBeenCalledWith({
      where: {
        patchImportId: "patch_import_1",
      },
    });
    expect(mockTx.hero.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { heroId: { in: ["cassidy", "cassidy", "캐서디"] } },
          { nameEn: { in: ["cassidy", "Cassidy", "캐서디"] } },
          { nameKo: { in: ["cassidy", "Cassidy", "캐서디"] } },
        ],
      },
    });
    expect(mockTx.patchChangeStaging.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
          patchImportId: "patch_import_1",
          heroId: "hero_cassidy",
          heroNameRaw: "Cassidy",
          changeType: "BUFF",
          impactLevel: "MEDIUM",
          originalChange: "Damage increased.",
          simpleSummary: "Damage increased.",
          metaImpact: "Cassidy is stronger.",
          recommendedPlaystyle: "Take mid-range fights.",
          parsedPayload: {
            patchId: "ow2-2026-07-14-overwatch-retail-patch-notes",
            patchTitle: "Overwatch Retail Patch Notes - July 14, 2026",
            patchDate: "2026-07-14",
            sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
            overallSummary: "Overall summary",
            metaSummary: "Meta summary",
            change: expect.objectContaining({
              changeId: "change-1",
              hero: expect.objectContaining({
                heroId: "cassidy",
              }),
            }),
          },
          confidence: 0.9,
          status: "PENDING",
          relations: {
            create: [
              {
                relationType: "AFFECTED_TIER",
                value: "Gold",
                targetHeroId: null,
              },
            ],
          },
        }),
    });
    expect(result).toEqual({
      stagingChangeCount: 1,
    });
  });

  it("변경점이 여러 개면 각 change를 staging row로 저장하고 저장 개수를 반환한다", async () => {
    mockTx.hero.findMany.mockResolvedValueOnce([
      {
        id: "hero_cassidy",
        heroId: "cassidy",
        nameEn: "Cassidy",
        nameKo: "캐서디",
      },
      {
        id: "hero_ana",
        heroId: "ana",
        nameEn: "Ana",
        nameKo: "아나",
      },
    ]);
    mockTx.patchChangeStaging.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockTx.patchChangeStaging.create
      .mockResolvedValueOnce({ id: "staging_1" })
      .mockResolvedValueOnce({ id: "staging_2" });

    const result = await savePatchAnalysisToStaging("patch_import_1", {
      ...createPatchAnalysis(),
      changes: [
        createPatchAnalysis().changes[0],
        {
          ...createPatchAnalysis().changes[0],
          changeId: "change-2",
          hero: {
            heroId: "ana",
            nameKo: "아나",
            nameEn: "Ana",
            role: "SUPPORT",
          },
          changeType: "NERF",
          originalChange: "Biotic Grenade cooldown increased.",
          simpleSummary: "Biotic Grenade cooldown increased.",
        },
      ],
    });

    expect(mockTx.patchChangeStaging.create).toHaveBeenCalledTimes(2);
    expect(mockTx.patchChangeStaging.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          heroId: "hero_ana",
          heroNameRaw: "Ana",
          changeType: "NERF",
          parsedPayload: expect.objectContaining({
            change: expect.objectContaining({
              changeId: "change-2",
            }),
          }),
        }),
      }),
    );
    expect(result).toEqual({
      stagingChangeCount: 2,
    });
  });

  it("영웅 매칭에 실패해도 원문 이름을 보존하고 낮은 confidence로 저장한다", async () => {
    mockTx.hero.findMany.mockResolvedValueOnce([]);
    mockTx.patchChangeStaging.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockTx.patchChangeStaging.create.mockResolvedValueOnce({ id: "staging_1" });

    await savePatchAnalysisToStaging("patch_import_1", createPatchAnalysis());

    expect(mockTx.patchChangeStaging.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
          heroId: null,
          heroNameRaw: "Cassidy",
          confidence: 0.55,
        }),
    });
  });

  it("synergyPicks와 counterPicks를 patch_staging_relations로 함께 저장한다", async () => {
    mockTx.hero.findMany.mockResolvedValueOnce([
      {
        id: "hero_cassidy",
        heroId: "cassidy",
        nameEn: "Cassidy",
        nameKo: "캐서디",
      },
      {
        id: "hero_mercy",
        heroId: "mercy",
        nameEn: "Mercy",
        nameKo: "메르시",
      },
      {
        id: "hero_winston",
        heroId: "winston",
        nameEn: "Winston",
        nameKo: "윈스턴",
      },
    ]);
    mockTx.patchChangeStaging.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockTx.patchChangeStaging.create.mockResolvedValueOnce({ id: "staging_1" });

    await savePatchAnalysisToStaging(
      "patch_import_1",
      createPatchAnalysis({
        synergyPicks: ["Mercy"],
        counterPicks: ["Winston"],
      }),
    );

    expect(mockTx.patchChangeStaging.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        confidence: 1,
        relations: {
          create: [
            {
              relationType: "AFFECTED_TIER",
              value: "Gold",
              targetHeroId: null,
            },
            {
              relationType: "SYNERGY",
              value: "Mercy",
              targetHeroId: "hero_mercy",
            },
            {
              relationType: "COUNTER",
              value: "Winston",
              targetHeroId: "hero_winston",
            },
          ],
        },
      }),
    });
  });

  it("변경사항이 없으면 delete만 수행하고 createMany를 호출하지 않는다", async () => {
    mockTx.hero.findMany.mockResolvedValueOnce([]);
    mockTx.patchChangeStaging.deleteMany.mockResolvedValueOnce({ count: 0 });

    const result = await savePatchAnalysisToStaging("patch_import_1", {
      ...createPatchAnalysis(),
      changes: [],
    });

    expect(mockTx.patchChangeStaging.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      stagingChangeCount: 0,
    });
  });
});

function createPatchAnalysis(
  changeOverrides: Partial<PatchAnalysis["changes"][number]> = {},
): PatchAnalysis {
  return {
    patchId: "ow2-2026-07-14-overwatch-retail-patch-notes",
    patchTitle: "Overwatch Retail Patch Notes - July 14, 2026",
    patchDate: "2026-07-14",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    overallSummary: "Overall summary",
    metaSummary: "Meta summary",
    changes: [
      {
        changeId: "change-1",
        hero: {
          heroId: "cassidy",
          nameKo: "캐서디",
          nameEn: "Cassidy",
          role: "DAMAGE",
        },
        changeType: "BUFF",
        impactLevel: "MEDIUM",
        originalChange: "Damage increased.",
        simpleSummary: "Damage increased.",
        metaImpact: "Cassidy is stronger.",
        affectedTiers: ["Gold"],
        recommendedPlaystyle: "Take mid-range fights.",
        counterPicks: [],
        synergyPicks: [],
        ...changeOverrides,
      },
    ],
  };
}
