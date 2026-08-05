import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PatchAnalysis } from "@/features/patch-analysis/types";
import {
  PatchStagingHeroNotFoundError,
  updatePatchStagingReview,
  savePatchAnalysisToStaging,
} from "./staging-repository";

const mockTx = vi.hoisted(() => ({
  hero: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  patchChangeStaging: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
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
          originalChange: "Damage increased from 70 to 75.",
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
            numericExtraction: {
              status: "EXACT",
              reason: null,
              numericTokens: ["70", "75"],
            },
            confidenceBreakdown: {
              hero: 0.35,
              changeType: 0.1,
              impactLevel: 0.1,
              originalChange: 0.15,
              summaryFields: 0.15000000000000002,
              relatedHeroes: 0.05,
              numericExtraction: 0.1,
            },
            reviewDecision: {
              status: "PENDING",
              autoApplyCandidate: true,
              reasons: [],
            },
            change: expect.objectContaining({
              changeId: "change-1",
              hero: expect.objectContaining({
                heroId: "cassidy",
              }),
            }),
          },
          confidence: 1,
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

  it("영웅 매칭에 실패하면 원문 이름을 보존하고 NEEDS_MAPPING 상태로 저장한다", async () => {
    mockTx.hero.findMany.mockResolvedValueOnce([]);
    mockTx.patchChangeStaging.deleteMany.mockResolvedValueOnce({ count: 0 });
    mockTx.patchChangeStaging.create.mockResolvedValueOnce({ id: "staging_1" });

    await savePatchAnalysisToStaging("patch_import_1", createPatchAnalysis());

    expect(mockTx.patchChangeStaging.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
          heroId: null,
          heroNameRaw: "Cassidy",
          confidence: 0.65,
          status: "NEEDS_MAPPING",
          reviewerNote:
            '영웅 매칭 실패: parser가 추출한 "Cassidy" 값을 heroes 테이블과 연결해야 합니다. confidence 0.650로 자동 승인 기준보다 낮습니다.',
          parsedPayload: expect.objectContaining({
            reviewDecision: expect.objectContaining({
              status: "NEEDS_MAPPING",
              autoApplyCandidate: false,
              reasons: expect.arrayContaining([
                expect.stringContaining("영웅 매칭 실패"),
              ]),
            }),
          }),
        }),
    });
  });

  it("영웅은 매칭됐지만 confidence가 낮으면 PENDING_REVIEW 상태로 저장한다", async () => {
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

    await savePatchAnalysisToStaging(
      "patch_import_1",
      createPatchAnalysis({
        simpleSummary: "",
        metaImpact: "",
        recommendedPlaystyle: "",
      }),
    );

    expect(mockTx.patchChangeStaging.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        heroId: "hero_cassidy",
        confidence: 0.85,
        status: "PENDING_REVIEW",
        reviewerNote: "confidence 0.850로 자동 승인 기준보다 낮습니다.",
        parsedPayload: expect.objectContaining({
          reviewDecision: {
            status: "PENDING_REVIEW",
            autoApplyCandidate: false,
            reasons: ["confidence 0.850로 자동 승인 기준보다 낮습니다."],
          },
        }),
      }),
    });
  });

  it("수치형 변경의 기존값과 변경값이 불명확하면 원문을 보존하고 confidence를 낮춘다", async () => {
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

    await savePatchAnalysisToStaging(
      "patch_import_1",
      createPatchAnalysis({
        originalChange: "Damage increased.",
      }),
    );

    expect(mockTx.patchChangeStaging.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        heroId: "hero_cassidy",
        originalChange: "Damage increased.",
        confidence: 0.9,
        status: "PENDING_REVIEW",
        reviewerNote:
          "수치 변경의 기존값/변경값이 명확하지 않아 원문 확인이 필요합니다.",
        parsedPayload: expect.objectContaining({
          numericExtraction: {
            status: "UNCLEAR",
            reason:
              "수치 변경의 기존값/변경값이 명확하지 않아 원문 확인이 필요합니다.",
            numericTokens: [],
          },
          reviewDecision: expect.objectContaining({
            status: "PENDING_REVIEW",
            autoApplyCandidate: false,
            reasons: expect.arrayContaining([
              "수치 변경의 기존값/변경값이 명확하지 않아 원문 확인이 필요합니다.",
            ]),
          }),
          change: expect.objectContaining({
            originalChange: "Damage increased.",
          }),
        }),
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

  it("관련 영웅 일부가 매칭되지 않으면 confidence 세부 점수를 낮추고 PENDING_REVIEW로 저장한다", async () => {
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
        confidence: 0.95,
        status: "PENDING_REVIEW",
        reviewerNote: "관련 영웅 매칭 실패: Winston 값을 확인해야 합니다.",
        parsedPayload: expect.objectContaining({
          confidenceBreakdown: expect.objectContaining({
            relatedHeroes: 0,
          }),
          reviewDecision: expect.objectContaining({
            status: "PENDING_REVIEW",
            autoApplyCandidate: false,
            reasons: expect.arrayContaining([
              "관련 영웅 매칭 실패: Winston 값을 확인해야 합니다.",
            ]),
          }),
        }),
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
              targetHeroId: null,
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

  it("검수자가 staging row를 승인하면 상태와 reviewedAt을 함께 저장한다", async () => {
    mockTx.patchChangeStaging.findFirst.mockResolvedValueOnce(
      createStagingChangeRecord(),
    );
    mockTx.patchChangeStaging.update.mockResolvedValueOnce({
      ...createStagingChangeRecord({
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
        reviewedAt: new Date("2026-07-14T02:00:00.000Z"),
      }),
      hero: createHeroRecord(),
      relations: [],
    });

    const result = await updatePatchStagingReview(
      "patch_import_1",
      "staging_1",
      {
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
      },
    );

    expect(mockTx.patchChangeStaging.findFirst).toHaveBeenCalledWith({
      where: {
        id: "staging_1",
        patchImportId: "patch_import_1",
      },
    });
    expect(mockTx.patchChangeStaging.update).toHaveBeenCalledWith({
      where: {
        id: "staging_1",
      },
      data: expect.objectContaining({
        status: "APPROVED",
        reviewerNote: "원문 확인 완료",
        reviewedAt: expect.any(Date),
      }),
      include: {
        hero: true,
        relations: {
          include: {
            targetHero: true,
          },
        },
      },
    });
    expect(result).toMatchObject({
      id: "staging_1",
      status: "APPROVED",
      reviewerNote: "원문 확인 완료",
    });
  });

  it("검수자가 공개 heroId로 매핑하면 내부 hero id로 저장한다", async () => {
    mockTx.patchChangeStaging.findFirst.mockResolvedValueOnce(
      createStagingChangeRecord({
        heroId: null,
        status: "NEEDS_MAPPING",
      }),
    );
    mockTx.hero.findUnique.mockResolvedValueOnce(createHeroRecord());
    mockTx.patchChangeStaging.update.mockResolvedValueOnce({
      ...createStagingChangeRecord({
        heroId: "hero_cassidy",
        status: "PENDING_REVIEW",
      }),
      hero: createHeroRecord(),
      relations: [],
    });

    await updatePatchStagingReview("patch_import_1", "staging_1", {
      heroId: "cassidy",
      status: "PENDING_REVIEW",
    });

    expect(mockTx.hero.findUnique).toHaveBeenCalledWith({
      where: {
        heroId: "cassidy",
      },
    });
    expect(mockTx.patchChangeStaging.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          heroId: "hero_cassidy",
          status: "PENDING_REVIEW",
        }),
      }),
    );
  });

  it("없는 heroId로 검수 매핑을 시도하면 실패한다", async () => {
    mockTx.patchChangeStaging.findFirst.mockResolvedValueOnce(
      createStagingChangeRecord(),
    );
    mockTx.hero.findUnique.mockResolvedValueOnce(null);

    await expect(
      updatePatchStagingReview("patch_import_1", "staging_1", {
        heroId: "unknown-hero",
      }),
    ).rejects.toBeInstanceOf(PatchStagingHeroNotFoundError);
    expect(mockTx.patchChangeStaging.update).not.toHaveBeenCalled();
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
        originalChange: "Damage increased from 70 to 75.",
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

function createHeroRecord() {
  return {
    id: "hero_cassidy",
    heroId: "cassidy",
    nameKo: "캐서디",
    nameEn: "Cassidy",
    role: "DAMAGE",
    difficulty: null,
    imageUrl: null,
    createdAt: new Date("2026-07-14T01:00:00.000Z"),
    updatedAt: new Date("2026-07-14T01:00:00.000Z"),
  };
}

function createStagingChangeRecord(
  overrides: Partial<{
    heroId: string | null;
    status:
      | "PENDING"
      | "PENDING_REVIEW"
      | "NEEDS_MAPPING"
      | "APPROVED"
      | "REJECTED"
      | "APPLIED"
      | "FAILED";
    reviewerNote: string | null;
    reviewedAt: Date | null;
  }> = {},
) {
  return {
    id: "staging_1",
    patchImportId: "patch_import_1",
    heroId: "hero_cassidy",
    heroNameRaw: "Cassidy",
    abilityName: null,
    changeType: "BUFF",
    impactLevel: "MEDIUM",
    originalChange: "Damage increased from 70 to 75.",
    simpleSummary: "Damage increased.",
    metaImpact: "Cassidy is stronger.",
    recommendedPlaystyle: "Take mid-range fights.",
    parsedPayload: {},
    confidence: 0.95,
    status: "PENDING_REVIEW",
    reviewerNote: null,
    reviewedAt: null,
    appliedHeroChangeId: null,
    createdAt: new Date("2026-07-14T01:00:00.000Z"),
    updatedAt: new Date("2026-07-14T01:00:00.000Z"),
    ...overrides,
  };
}
