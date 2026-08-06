import { describe, expect, it } from "vitest";
import {
  PatchAnalysisJsonValidationError,
  parsePatchAnalysisJson,
  validatePatchAnalysisJson,
} from "./validator";

const validPatchAnalysis = {
  patchId: "test-patch-2026-06",
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

describe("patch analysis JSON validator", () => {
  it("parses valid object output", () => {
    const result = validatePatchAnalysisJson(validPatchAnalysis);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patchId).toBe("test-patch-2026-06");
    }
  });

  it("strips markdown JSON fences before parsing", () => {
    const output = `\`\`\`json\n${JSON.stringify(validPatchAnalysis)}\n\`\`\``;

    expect(parsePatchAnalysisJson(output).changes[0].hero.heroId).toBe(
      "sojourn",
    );
  });

  it("returns a validation issue for malformed JSON", () => {
    const result = validatePatchAnalysisJson("{ invalid json");

    expect(result).toEqual({
      success: false,
      issues: ["LLM output must be valid JSON."],
    });
  });

  it("throws a typed error when required fields are missing", () => {
    expect(() =>
      parsePatchAnalysisJson({
        ...validPatchAnalysis,
        changes: [],
        metaSummary: "",
      }),
    ).toThrow(PatchAnalysisJsonValidationError);
  });
});
