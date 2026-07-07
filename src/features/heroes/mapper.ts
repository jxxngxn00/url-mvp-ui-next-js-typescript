import type { Prisma } from "@/generated/prisma/client";
import { heroDetailSchema, heroSummarySchema } from "./schema";
import type { HeroDetail, HeroSummary, RelatedHeroStat } from "./types";

export const heroSummaryInclude = {
  changes: {
    select: {
      impactLevel: true,
      patchNote: {
        select: {
          patchDate: true,
        },
      },
    },
  },
} satisfies Prisma.HeroInclude;

export type HeroSummaryRecord = Prisma.HeroGetPayload<{
  include: typeof heroSummaryInclude;
}>;

export const heroDetailInclude = {
  changes: {
    include: {
      patchNote: true,
      affectedTiers: true,
      synergies: {
        include: {
          targetHero: true,
        },
      },
      counters: {
        include: {
          targetHero: true,
        },
      },
    },
  },
} satisfies Prisma.HeroInclude;

export type HeroDetailRecord = Prisma.HeroGetPayload<{
  include: typeof heroDetailInclude;
}>;

function formatPatchDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function mapHeroToHeroSummary(hero: HeroSummaryRecord): HeroSummary {
  const latestPatchDate = hero.changes.reduce<Date | null>((latest, change) => {
    const patchDate = change.patchNote.patchDate;

    if (!latest || patchDate > latest) {
      return patchDate;
    }

    return latest;
  }, null);

  return heroSummarySchema.parse({
    heroId: hero.heroId,
    nameKo: hero.nameKo,
    nameEn: hero.nameEn,
    role: hero.role,
    difficulty: hero.difficulty,
    imageUrl: hero.imageUrl,
    changeCount: hero.changes.length,
    highImpactChangeCount: hero.changes.filter(
      (change) => change.impactLevel === "HIGH",
    ).length,
    latestPatchDate: latestPatchDate ? formatPatchDate(latestPatchDate) : null,
  });
}

function mapRelatedHeroStats(
  heroes: Array<{
    targetHero: {
      heroId: string;
      nameKo: string;
      nameEn: string;
      role: HeroDetail["role"];
    };
  }>,
): RelatedHeroStat[] {
  const stats = new Map<string, RelatedHeroStat>();

  for (const item of heroes) {
    const current = stats.get(item.targetHero.heroId);

    if (current) {
      current.count += 1;
      continue;
    }

    stats.set(item.targetHero.heroId, {
      heroId: item.targetHero.heroId,
      nameKo: item.targetHero.nameKo,
      nameEn: item.targetHero.nameEn,
      role: item.targetHero.role,
      count: 1,
    });
  }

  return [...stats.values()].sort(
    (first, second) =>
      second.count - first.count || first.nameKo.localeCompare(second.nameKo),
  );
}

export function mapHeroToHeroDetail(hero: HeroDetailRecord): HeroDetail {
  const sortedChanges = [...hero.changes].sort(
    (first, second) =>
      second.patchNote.patchDate.getTime() - first.patchNote.patchDate.getTime(),
  );

  const summary = mapHeroToHeroSummary(hero);

  return heroDetailSchema.parse({
    ...summary,
    changes: sortedChanges.map((change) => ({
      changeId: change.changeId,
      patchId: change.patchNote.patchId,
      patchTitle: change.patchNote.title,
      patchDate: formatPatchDate(change.patchNote.patchDate),
      sourceUrl: change.patchNote.sourceUrl,
      changeType: change.changeType,
      impactLevel: change.impactLevel,
      originalChange: change.originalChange,
      simpleSummary: change.simpleSummary,
      metaImpact: change.metaImpact,
      affectedTiers: change.affectedTiers.map((tier) => tier.tier),
      recommendedPlaystyle: change.recommendedPlaystyle,
      counterPicks: change.counters.map((counter) => counter.targetHero.nameKo),
      synergyPicks: change.synergies.map((synergy) => synergy.targetHero.nameKo),
    })),
    frequentSynergies: mapRelatedHeroStats(
      hero.changes.flatMap((change) => change.synergies),
    ),
    frequentCounters: mapRelatedHeroStats(
      hero.changes.flatMap((change) => change.counters),
    ),
  });
}
