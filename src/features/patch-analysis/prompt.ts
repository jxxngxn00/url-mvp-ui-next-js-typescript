import type { PatchAnalysisInput } from "./types";

export const patchAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "patchId",
    "patchTitle",
    "patchDate",
    "sourceUrl",
    "overallSummary",
    "metaSummary",
    "changes",
  ],
  properties: {
    patchId: { type: "string" },
    patchTitle: { type: "string" },
    patchDate: { type: "string" },
    sourceUrl: { type: "string" },
    overallSummary: { type: "string" },
    metaSummary: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "changeId",
          "hero",
          "changeType",
          "impactLevel",
          "originalChange",
          "simpleSummary",
          "metaImpact",
          "affectedTiers",
          "recommendedPlaystyle",
          "counterPicks",
          "synergyPicks",
        ],
        properties: {
          changeId: { type: "string" },
          hero: {
            type: "object",
            additionalProperties: false,
            required: ["heroId", "nameKo", "nameEn", "role"],
            properties: {
              heroId: { type: "string" },
              nameKo: { type: "string" },
              nameEn: { type: "string" },
              role: {
                type: "string",
                enum: ["TANK", "DAMAGE", "SUPPORT"],
              },
            },
          },
          changeType: {
            type: "string",
            enum: ["BUFF", "NERF", "ADJUSTMENT", "BUG_FIX"],
          },
          impactLevel: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH"],
          },
          originalChange: { type: "string" },
          simpleSummary: { type: "string" },
          metaImpact: { type: "string" },
          affectedTiers: {
            type: "array",
            items: { type: "string" },
          },
          recommendedPlaystyle: { type: "string" },
          counterPicks: {
            type: "array",
            items: { type: "string" },
          },
          synergyPicks: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export function buildPatchAnalysisPrompt(input: PatchAnalysisInput) {
  return [
    "다음 오버워치 패치노트 원문을 영웅별 플레이 영향 분석 JSON으로 변환하세요.",
    "반드시 제공된 patchId, patchTitle, patchDate, sourceUrl 값을 그대로 사용하세요.",
    "heroId는 영어 영웅명의 canonical id로 작성하세요. 예: reinhardt, sojourn, ana.",
    "changeId는 patchId와 heroId를 기반으로 안정적으로 생성하세요.",
    "한국어 사용자를 위한 요약과 플레이 조언을 작성하세요.",
    "",
    `patchId: ${input.patchId}`,
    `patchTitle: ${input.patchTitle}`,
    `patchDate: ${input.patchDate}`,
    `sourceUrl: ${input.sourceUrl}`,
    "",
    "patch note raw content:",
    input.rawContent,
  ].join("\n");
}
