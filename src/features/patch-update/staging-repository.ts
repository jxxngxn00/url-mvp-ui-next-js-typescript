import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { PatchAnalysis } from "@/features/patch-analysis/types";

type TransactionClient = Prisma.TransactionClient;

type HeroLookupRecord = {
  id: string;
  heroId: string;
  nameEn: string;
  nameKo: string;
};

type HeroLookup = {
  byAlias: Map<string, HeroLookupRecord>;
};

export type SavePatchAnalysisToStagingResult = {
  stagingChangeCount: number;
};

export class PatchStagingSaveError extends Error {
  constructor(message = "Failed to save patch analysis staging rows.") {
    super(message);
    this.name = "PatchStagingSaveError";
  }
}

export async function savePatchAnalysisToStaging(
  patchImportId: string,
  analysis: PatchAnalysis,
): Promise<SavePatchAnalysisToStagingResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const heroLookup = await buildHeroLookup(tx, analysis);

      // 재파싱 시 이전 staging 초안을 제거하고 새 parser 결과를 단일 원천으로 다시 저장한다.
      await tx.patchChangeStaging.deleteMany({
        where: {
          patchImportId,
        },
      });

      if (analysis.changes.length === 0) {
        return {
          stagingChangeCount: 0,
        };
      }

      for (const change of analysis.changes) {
        const hero = resolveHero(heroLookup, change.hero.heroId);
        const relationDrafts = buildStagingRelationDrafts(heroLookup, change);

        await tx.patchChangeStaging.create({
          data: {
            patchImportId,
            heroId: hero?.id ?? null,
            heroNameRaw:
              change.hero.nameEn || change.hero.nameKo || change.hero.heroId,
            changeType: change.changeType,
            impactLevel: change.impactLevel,
            originalChange: change.originalChange,
            simpleSummary: change.simpleSummary,
            metaImpact: change.metaImpact,
            recommendedPlaystyle: change.recommendedPlaystyle,
            parsedPayload: {
              patchId: analysis.patchId,
              patchTitle: analysis.patchTitle,
              patchDate: analysis.patchDate,
              sourceUrl: analysis.sourceUrl,
              overallSummary: analysis.overallSummary,
              metaSummary: analysis.metaSummary,
              change,
            },
            confidence: calculateStagingConfidence({
              heroResolved: Boolean(hero),
              changeTypePresent: Boolean(change.changeType),
              impactLevelPresent: Boolean(change.impactLevel),
              originalChangePresent: Boolean(change.originalChange),
              summaryFieldsPresent: Boolean(
                change.simpleSummary &&
                  change.metaImpact &&
                  change.recommendedPlaystyle,
              ),
              relatedHeroesResolved: relationDrafts.relatedHeroesResolved,
            }),
            status: "PENDING",
            relations:
              relationDrafts.relations.length > 0
                ? {
                    create: relationDrafts.relations,
                  }
                : undefined,
          },
        });
      }

      return {
        stagingChangeCount: analysis.changes.length,
      };
    });
  } catch (error) {
    throw new PatchStagingSaveError(getErrorMessage(error));
  }
}

async function buildHeroLookup(
  tx: TransactionClient,
  analysis: PatchAnalysis,
): Promise<HeroLookup> {
  const heroRefs = unique(
    analysis.changes.flatMap((change) => [
      change.hero.heroId,
      change.hero.nameEn,
      change.hero.nameKo,
      ...change.synergyPicks,
      ...change.counterPicks,
    ]),
  ).filter((value) => value.length > 0);

  const heroes = await tx.hero.findMany({
    where: {
      OR: [
        { heroId: { in: heroRefs.map(normalizeHeroName) } },
        { nameEn: { in: heroRefs } },
        { nameKo: { in: heroRefs } },
      ],
    },
  });

  return {
    byAlias: buildHeroAliasMap(heroes),
  };
}

function buildHeroAliasMap(heroes: HeroLookupRecord[]) {
  const byAlias = new Map<string, HeroLookupRecord>();

  for (const hero of heroes) {
    byAlias.set(normalizeHeroName(hero.heroId), hero);
    byAlias.set(normalizeHeroName(hero.nameEn), hero);
    byAlias.set(normalizeHeroName(hero.nameKo), hero);
  }

  return byAlias;
}

function resolveHero(heroLookup: HeroLookup, heroRef: string) {
  return heroLookup.byAlias.get(normalizeHeroName(heroRef));
}

function buildStagingRelationDrafts(
  heroLookup: HeroLookup,
  change: PatchAnalysis["changes"][number],
) {
  const affectedTierRelations = unique(change.affectedTiers).map((tier) => ({
    relationType: "AFFECTED_TIER",
    value: tier,
    targetHeroId: null,
  }));
  const synergyRelations = unique(change.synergyPicks).map((heroName) => ({
    relationType: "SYNERGY",
    value: heroName,
    targetHeroId: resolveHero(heroLookup, heroName)?.id ?? null,
  }));
  const counterRelations = unique(change.counterPicks).map((heroName) => ({
    relationType: "COUNTER",
    value: heroName,
    targetHeroId: resolveHero(heroLookup, heroName)?.id ?? null,
  }));
  const relatedHeroRelations = [...synergyRelations, ...counterRelations];

  return {
    relations: [
      ...affectedTierRelations,
      ...synergyRelations,
      ...counterRelations,
    ],
    // 시너지/카운터가 있을 때 모두 hero_id로 매칭되면 confidence에 추가 점수를 준다.
    relatedHeroesResolved:
      relatedHeroRelations.length > 0 &&
      relatedHeroRelations.every((relation) => relation.targetHeroId),
  };
}

function calculateStagingConfidence({
  heroResolved,
  changeTypePresent,
  impactLevelPresent,
  originalChangePresent,
  summaryFieldsPresent,
  relatedHeroesResolved,
}: {
  heroResolved: boolean;
  changeTypePresent: boolean;
  impactLevelPresent: boolean;
  originalChangePresent: boolean;
  summaryFieldsPresent: boolean;
  relatedHeroesResolved: boolean;
}) {
  // Day1 매핑표의 MVP confidence 기준을 그대로 반영한다.
  const score =
    (heroResolved ? 0.35 : 0) +
    (changeTypePresent ? 0.15 : 0) +
    (impactLevelPresent ? 0.1 : 0) +
    (originalChangePresent ? 0.15 : 0) +
    (summaryFieldsPresent ? 0.15 : 0) +
    (relatedHeroesResolved ? 0.1 : 0);

  return Math.min(score, 1);
}

function normalizeHeroName(heroName: string) {
  return heroName.trim().toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown patch staging save error.";
}
