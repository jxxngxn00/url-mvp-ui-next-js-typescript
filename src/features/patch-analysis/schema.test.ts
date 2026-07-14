import { describe, expect, it } from "vitest";
import {
  metaTimelinePatchSchema,
  patchAnalysisSchema,
} from "./schema";

const samplePatchAnalysis = {
  patchId: "ow2-2026-06-sample",
  patchTitle: "2026년 6월 밸런스 패치",
  patchDate: "2026-06-20",
  sourceUrl: "https://example.com/patch-notes",
  overallSummary: "상위권 영웅 중심의 밸런스 조정입니다.",
  metaSummary: "돌진 조합과 중거리 교전의 균형이 바뀝니다.",
  changes: [
    {
      changeId: "change-sojourn-railgun",
      hero: {
        heroId: "sojourn",
        nameKo: "소전",
        nameEn: "Sojourn",
        role: "DAMAGE",
      },
      changeType: "NERF",
      impactLevel: "HIGH",
      originalChange: "레일건 보조 발사 피해량이 감소했습니다.",
      simpleSummary: "원거리 킬 결정력이 낮아졌습니다.",
      metaImpact: "포킹 조합에서 소전의 우선순위가 내려갑니다.",
      affectedTiers: ["Diamond", "Master"],
      recommendedPlaystyle: "초반 교전보다 마무리 각을 신중히 잡아야 합니다.",
      counterPicks: ["윈스턴"],
      synergyPicks: ["메르시"],
    },
  ],
};

describe("patch analysis schemas", () => {
  it("accepts a valid patch analysis payload", () => {
    expect(() => patchAnalysisSchema.parse(samplePatchAnalysis)).not.toThrow();
  });

  it("rejects an invalid patch date", () => {
    expect(() =>
      patchAnalysisSchema.parse({
        ...samplePatchAnalysis,
        patchDate: "2026/06/20",
      }),
    ).toThrow();
  });

  it("accepts timeline payloads derived from patch analysis", () => {
    expect(() =>
      metaTimelinePatchSchema.parse({
        patchId: samplePatchAnalysis.patchId,
        patchTitle: samplePatchAnalysis.patchTitle,
        patchDate: samplePatchAnalysis.patchDate,
        metaSummary: samplePatchAnalysis.metaSummary,
        highImpactChangeCount: 1,
        entries: samplePatchAnalysis.changes.map((change) => ({
          timelineId: `${samplePatchAnalysis.patchId}:${change.changeId}`,
          patchId: samplePatchAnalysis.patchId,
          patchTitle: samplePatchAnalysis.patchTitle,
          patchDate: samplePatchAnalysis.patchDate,
          hero: change.hero,
          changeType: change.changeType,
          impactLevel: change.impactLevel,
          simpleSummary: change.simpleSummary,
          metaImpact: change.metaImpact,
        })),
      }),
    ).not.toThrow();
  });
});
