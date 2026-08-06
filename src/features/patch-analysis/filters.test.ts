import { describe, expect, it } from "vitest";
import {
  filterHeroChanges,
  filterMetaTimeline,
  matchesPatchChangeFilters,
} from "./filters";
import type { HeroChange, MetaTimelinePatch } from "./types";

const heroChanges: HeroChange[] = [
  {
    changeId: "change-sojourn",
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
    affectedTiers: ["Master"],
    recommendedPlaystyle: "마무리 각을 신중히 잡아야 합니다.",
    counterPicks: ["윈스턴"],
    synergyPicks: ["메르시"],
  },
  {
    changeId: "change-ana",
    hero: {
      heroId: "ana",
      nameKo: "아나",
      nameEn: "Ana",
      role: "SUPPORT",
    },
    changeType: "BUFF",
    impactLevel: "MEDIUM",
    originalChange: "생체 수류탄 회복량이 증가했습니다.",
    simpleSummary: "한타 유지력이 좋아졌습니다.",
    metaImpact: "지원가 조합에서 아나 선택 가치가 올라갑니다.",
    affectedTiers: ["Diamond"],
    recommendedPlaystyle: "수류탄으로 회복 압박을 강화합니다.",
    counterPicks: ["키리코"],
    synergyPicks: ["라인하르트"],
  },
];

const timeline: MetaTimelinePatch[] = [
  {
    patchId: "test-patch-2026-06",
    patchTitle: "2026년 6월 밸런스 패치",
    patchDate: "2026-06-20",
    metaSummary: "중거리 교전 구도가 바뀝니다.",
    highImpactChangeCount: 1,
    entries: heroChanges.map((change) => ({
      timelineId: `test-patch-2026-06:${change.changeId}`,
      patchId: "test-patch-2026-06",
      patchTitle: "2026년 6월 밸런스 패치",
      patchDate: "2026-06-20",
      hero: change.hero,
      changeType: change.changeType,
      impactLevel: change.impactLevel,
      simpleSummary: change.simpleSummary,
      metaImpact: change.metaImpact,
    })),
  },
];

describe("patch analysis filters", () => {
  it("matches hero changes by role, change type, impact level, and keyword", () => {
    expect(
      matchesPatchChangeFilters(heroChanges[0], {
        role: "DAMAGE",
        changeType: "NERF",
        impactLevel: "HIGH",
        keyword: "Soj",
      }),
    ).toBe(true);
  });

  it("filters hero change cards with the shared rules", () => {
    expect(
      filterHeroChanges(heroChanges, {
        role: "SUPPORT",
        changeType: "ALL",
        impactLevel: "ALL",
        keyword: "아나",
      }).map((change) => change.hero.heroId),
    ).toEqual(["ana"]);
  });

  it("filters timeline entries and removes empty patches", () => {
    const filteredTimeline = filterMetaTimeline(timeline, {
      role: "DAMAGE",
      changeType: "NERF",
      impactLevel: "HIGH",
      keyword: "",
    });

    expect(filteredTimeline).toHaveLength(1);
    expect(filteredTimeline[0].entries).toHaveLength(1);
    expect(filteredTimeline[0].entries[0].hero.heroId).toBe("sojourn");
  });

  it("returns no timeline patches when every entry is filtered out", () => {
    expect(
      filterMetaTimeline(timeline, {
        role: "TANK",
        changeType: "ALL",
        impactLevel: "ALL",
        keyword: "",
      }),
    ).toEqual([]);
  });
});
