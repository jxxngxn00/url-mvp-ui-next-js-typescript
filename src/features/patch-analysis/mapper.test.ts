import { describe, expect, it } from "vitest";
import {
  mapPatchNoteToMetaTimelinePatch,
  mapPatchNoteToPatchAnalysis,
  mapPatchNoteToPatchSummary,
  type MetaTimelinePatchRecord,
  type PatchAnalysisRecord,
  type PatchSummaryRecord,
} from "./mapper";

const createdAt = new Date("2026-06-20T00:00:00.000Z");
const updatedAt = new Date("2026-06-20T00:00:00.000Z");

const sojournHero = {
  id: "hero-db-sojourn",
  heroId: "sojourn",
  nameKo: "소전",
  nameEn: "Sojourn",
  role: "DAMAGE",
  difficulty: 3,
  imageUrl: null,
  createdAt,
  updatedAt,
};

const mercyHero = {
  id: "hero-db-mercy",
  heroId: "mercy",
  nameKo: "메르시",
  nameEn: "Mercy",
  role: "SUPPORT",
  difficulty: 1,
  imageUrl: null,
  createdAt,
  updatedAt,
};

const winstonHero = {
  id: "hero-db-winston",
  heroId: "winston",
  nameKo: "윈스턴",
  nameEn: "Winston",
  role: "TANK",
  difficulty: 2,
  imageUrl: null,
  createdAt,
  updatedAt,
};

const patchBase = {
  id: "patch-db-id",
  patchId: "ow2-2026-06-sample",
  title: "2026년 6월 밸런스 패치",
  patchDate: new Date("2026-06-20T00:00:00.000Z"),
  sourceUrl: "https://example.com/patch-notes",
  rawContent: "raw patch note",
  overallSummary: "상위권 영웅 중심의 밸런스 조정입니다.",
  metaSummary: "돌진 조합과 중거리 교전의 균형이 바뀝니다.",
  createdAt,
  updatedAt,
};

const heroChange = {
  id: "change-db-sojourn",
  changeId: "change-sojourn-railgun",
  patchNoteId: "patch-db-id",
  heroId: "hero-db-sojourn",
  changeType: "NERF",
  impactLevel: "HIGH",
  originalChange: "레일건 보조 발사 피해량이 감소했습니다.",
  simpleSummary: "원거리 킬 결정력이 낮아졌습니다.",
  metaImpact: "포킹 조합에서 소전의 우선순위가 내려갑니다.",
  recommendedPlaystyle: "초반 교전보다 마무리 각을 신중히 잡아야 합니다.",
  createdAt,
  updatedAt,
  hero: sojournHero,
};

describe("patch analysis mapper", () => {
  it("maps patch summaries with aggregate counts", () => {
    const patch = {
      ...patchBase,
      changes: [{ impactLevel: "HIGH" }, { impactLevel: "LOW" }],
    } as PatchSummaryRecord;

    expect(mapPatchNoteToPatchSummary(patch)).toMatchObject({
      patchId: "ow2-2026-06-sample",
      patchDate: "2026-06-20",
      changeCount: 2,
      highImpactChangeCount: 1,
    });
  });

  it("maps patch analysis relations into UI-ready arrays", () => {
    const patch = {
      ...patchBase,
      changes: [
        {
          ...heroChange,
          affectedTiers: [
            { id: "tier-1", heroChangeId: heroChange.id, tier: "Master", reason: null },
          ],
          synergies: [
            {
              id: "synergy-1",
              heroChangeId: heroChange.id,
              targetHeroId: mercyHero.id,
              reason: null,
              targetHero: mercyHero,
            },
          ],
          counters: [
            {
              id: "counter-1",
              heroChangeId: heroChange.id,
              targetHeroId: winstonHero.id,
              reason: null,
              targetHero: winstonHero,
            },
          ],
        },
      ],
    } as unknown as PatchAnalysisRecord;

    expect(mapPatchNoteToPatchAnalysis(patch).changes[0]).toMatchObject({
      hero: {
        heroId: "sojourn",
        nameKo: "소전",
      },
      affectedTiers: ["Master"],
      synergyPicks: ["메르시"],
      counterPicks: ["윈스턴"],
    });
  });

  it("maps meta timeline patches without requiring extra tables", () => {
    const patch = {
      ...patchBase,
      changes: [heroChange],
    } as unknown as MetaTimelinePatchRecord;

    expect(mapPatchNoteToMetaTimelinePatch(patch)).toMatchObject({
      patchId: "ow2-2026-06-sample",
      patchDate: "2026-06-20",
      highImpactChangeCount: 1,
      entries: [
        {
          timelineId: "ow2-2026-06-sample:change-sojourn-railgun",
          hero: {
            heroId: "sojourn",
          },
          impactLevel: "HIGH",
        },
      ],
    });
  });
});
