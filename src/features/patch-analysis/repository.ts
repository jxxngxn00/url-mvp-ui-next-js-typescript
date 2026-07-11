import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  mapPatchNoteToPatchAnalysis,
  patchAnalysisInclude,
} from "./mapper";
import type { PatchAnalysis } from "./types";

type TransactionClient = Prisma.TransactionClient;

type HeroLookupRecord = {
  heroId: string;
  id: string;
  nameEn: string;
  nameKo: string;
};

type HeroLookup = {
  byHeroId: Map<string, HeroLookupRecord>;
  byAlias: Map<string, HeroLookupRecord>;
};

export class PatchAnalysisSaveError extends Error {
  missingHeroIds: string[];

  constructor(message: string, missingHeroIds: string[] = []) {
    super(message);
    this.name = "PatchAnalysisSaveError";
    this.missingHeroIds = missingHeroIds;
  }
}

export async function savePatchAnalysis(
  analysis: PatchAnalysis,
  rawContent?: string,
): Promise<PatchAnalysis> {
  return prisma.$transaction(async (tx) => {
    const heroLookup = await getRequiredHeroLookup(tx, analysis);

    const patchNote = await tx.patchNote.upsert({
      where: { patchId: analysis.patchId },
      update: {
        title: analysis.patchTitle,
        patchDate: toPatchDate(analysis.patchDate),
        sourceUrl: analysis.sourceUrl,
        rawContent,
        overallSummary: analysis.overallSummary,
        metaSummary: analysis.metaSummary,
      },
      create: {
        patchId: analysis.patchId,
        title: analysis.patchTitle,
        patchDate: toPatchDate(analysis.patchDate),
        sourceUrl: analysis.sourceUrl,
        rawContent,
        overallSummary: analysis.overallSummary,
        metaSummary: analysis.metaSummary,
      },
    });

    const changeIds = analysis.changes.map((change) => change.changeId);

    await tx.heroChange.deleteMany({
      where:
        changeIds.length > 0
          ? {
              patchNoteId: patchNote.id,
              changeId: {
                notIn: changeIds,
              },
            }
          : {
              patchNoteId: patchNote.id,
            },
    });

    for (const change of analysis.changes) {
      const changedHero = heroLookup.byHeroId.get(change.hero.heroId);

      if (!changedHero) {
        throw new PatchAnalysisSaveError(
          `Hero was not found: ${change.hero.heroId}`,
          [change.hero.heroId],
        );
      }

      const heroChange = await tx.heroChange.upsert({
        where: { changeId: change.changeId },
        update: {
          patchNote: { connect: { id: patchNote.id } },
          hero: { connect: { id: changedHero.id } },
          changeType: change.changeType,
          impactLevel: change.impactLevel,
          originalChange: change.originalChange,
          simpleSummary: change.simpleSummary,
          metaImpact: change.metaImpact,
          recommendedPlaystyle: change.recommendedPlaystyle,
        },
        create: {
          changeId: change.changeId,
          patchNote: { connect: { id: patchNote.id } },
          hero: { connect: { id: changedHero.id } },
          changeType: change.changeType,
          impactLevel: change.impactLevel,
          originalChange: change.originalChange,
          simpleSummary: change.simpleSummary,
          metaImpact: change.metaImpact,
          recommendedPlaystyle: change.recommendedPlaystyle,
        },
      });

      await replaceHeroChangeRelations(tx, heroChange.id, change, heroLookup);
    }

    const savedPatchNote = await tx.patchNote.findUniqueOrThrow({
      where: { id: patchNote.id },
      include: patchAnalysisInclude,
    });

    return mapPatchNoteToPatchAnalysis(savedPatchNote);
  });
}

async function getRequiredHeroLookup(
  tx: TransactionClient,
  analysis: PatchAnalysis,
) {
  const changedHeroIds = unique(
    analysis.changes.map((change) => change.hero.heroId),
  );
  const relatedHeroRefs = unique(
    analysis.changes.flatMap((change) => [
      ...change.counterPicks,
      ...change.synergyPicks,
    ]),
  );
  const normalizedRelatedHeroRefs = relatedHeroRefs.map(normalizeHeroName);

  const heroes = await tx.hero.findMany({
    where: {
      OR: [
        { heroId: { in: [...changedHeroIds, ...normalizedRelatedHeroRefs] } },
        { nameKo: { in: relatedHeroRefs } },
        { nameEn: { in: relatedHeroRefs } },
      ],
    },
  });
  const heroLookup = buildHeroLookup(heroes);

  const missingChangedHeroIds = changedHeroIds.filter(
    (heroId) => !heroLookup.byHeroId.has(heroId),
  );

  const missingRelatedHeroRefs = relatedHeroRefs.filter(
    (heroRef) => !heroLookup.byAlias.has(normalizeHeroName(heroRef)),
  );
  const missingHeroIds = [
    ...new Set([...missingChangedHeroIds, ...missingRelatedHeroRefs]),
  ];

  if (missingHeroIds.length > 0) {
    throw new PatchAnalysisSaveError(
      "Patch analysis references heroes that do not exist in hero master data.",
      missingHeroIds,
    );
  }

  return heroLookup;
}

function buildHeroLookup(heroes: HeroLookupRecord[]): HeroLookup {
  const byHeroId = new Map<string, HeroLookupRecord>();
  const byAlias = new Map<string, HeroLookupRecord>();

  for (const hero of heroes) {
    byHeroId.set(hero.heroId, hero);
    byAlias.set(normalizeHeroName(hero.heroId), hero);
    byAlias.set(normalizeHeroName(hero.nameKo), hero);
    byAlias.set(normalizeHeroName(hero.nameEn), hero);
  }

  return { byAlias, byHeroId };
}

async function replaceHeroChangeRelations(
  tx: TransactionClient,
  heroChangeId: string,
  change: PatchAnalysis["changes"][number],
  heroLookup: HeroLookup,
) {
  await tx.affectedTier.deleteMany({
    where: { heroChangeId },
  });
  await tx.heroSynergy.deleteMany({
    where: { heroChangeId },
  });
  await tx.heroCounter.deleteMany({
    where: { heroChangeId },
  });

  if (change.affectedTiers.length > 0) {
    await tx.affectedTier.createMany({
      data: unique(change.affectedTiers).map((tier) => ({
        heroChangeId,
        tier,
      })),
    });
  }

  if (change.synergyPicks.length > 0) {
    await tx.heroSynergy.createMany({
      data: unique(change.synergyPicks).map((heroName) => ({
        heroChangeId,
        targetHeroId: getRelatedHeroIdOrThrow(heroLookup, heroName),
      })),
    });
  }

  if (change.counterPicks.length > 0) {
    await tx.heroCounter.createMany({
      data: unique(change.counterPicks).map((heroName) => ({
        heroChangeId,
        targetHeroId: getRelatedHeroIdOrThrow(heroLookup, heroName),
      })),
    });
  }
}

function getRelatedHeroIdOrThrow(
  heroLookup: HeroLookup,
  heroName: string,
) {
  const hero = heroLookup.byAlias.get(normalizeHeroName(heroName));

  if (!hero) {
    throw new PatchAnalysisSaveError(`Hero was not found: ${heroName}`, [
      heroName,
    ]);
  }

  return hero.id;
}

function toPatchDate(patchDate: string) {
  return new Date(`${patchDate}T00:00:00.000Z`);
}

function normalizeHeroName(heroName: string) {
  return heroName.trim().toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values)];
}
