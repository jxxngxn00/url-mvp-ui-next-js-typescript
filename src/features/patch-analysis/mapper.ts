import type { Prisma } from "@/generated/prisma/client";
import {
  metaTimelinePatchSchema,
  patchAnalysisSchema,
  patchSummarySchema,
} from "./schema";
import type {
  MetaTimelinePatch,
  PatchAnalysis,
  PatchSummary,
} from "./types";

export const patchAnalysisInclude = {
  changes: {
    include: {
      hero: true,
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
    orderBy: {
      hero: {
        nameKo: "asc",
      },
    },
  },
} satisfies Prisma.PatchNoteInclude;

export type PatchAnalysisRecord = Prisma.PatchNoteGetPayload<{
  include: typeof patchAnalysisInclude;
}>;

export const patchSummaryInclude = {
  changes: {
    select: {
      impactLevel: true,
    },
  },
} satisfies Prisma.PatchNoteInclude;

export type PatchSummaryRecord = Prisma.PatchNoteGetPayload<{
  include: typeof patchSummaryInclude;
}>;

export const metaTimelineInclude = {
  changes: {
    include: {
      hero: true,
    },
    orderBy: [
      {
        impactLevel: "desc",
      },
      {
        hero: {
          nameKo: "asc",
        },
      },
    ],
  },
} satisfies Prisma.PatchNoteInclude;

export type MetaTimelinePatchRecord = Prisma.PatchNoteGetPayload<{
  include: typeof metaTimelineInclude;
}>;

function formatPatchDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countHighImpactChanges(changes: Array<{ impactLevel: string }>) {
  return changes.filter((change) => change.impactLevel === "HIGH").length;
}

export function mapPatchNoteToPatchSummary(
  patchNote: PatchSummaryRecord,
): PatchSummary {
  return patchSummarySchema.parse({
    patchId: patchNote.patchId,
    patchTitle: patchNote.title,
    patchDate: formatPatchDate(patchNote.patchDate),
    sourceUrl: patchNote.sourceUrl,
    overallSummary: patchNote.overallSummary,
    metaSummary: patchNote.metaSummary,
    changeCount: patchNote.changes.length,
    highImpactChangeCount: countHighImpactChanges(patchNote.changes),
  });
}

export function mapPatchNoteToPatchAnalysis(
  patchNote: PatchAnalysisRecord,
): PatchAnalysis {
  return patchAnalysisSchema.parse({
    patchId: patchNote.patchId,
    patchTitle: patchNote.title,
    patchDate: formatPatchDate(patchNote.patchDate),
    sourceUrl: patchNote.sourceUrl,
    overallSummary: patchNote.overallSummary,
    metaSummary: patchNote.metaSummary,
    changes: patchNote.changes.map((change) => ({
      changeId: change.changeId,
      hero: {
        heroId: change.hero.heroId,
        nameKo: change.hero.nameKo,
        nameEn: change.hero.nameEn,
        role: change.hero.role,
      },
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
  });
}

export function mapPatchNoteToMetaTimelinePatch(
  patchNote: MetaTimelinePatchRecord,
): MetaTimelinePatch {
  return metaTimelinePatchSchema.parse({
    patchId: patchNote.patchId,
    patchTitle: patchNote.title,
    patchDate: formatPatchDate(patchNote.patchDate),
    metaSummary: patchNote.metaSummary,
    highImpactChangeCount: countHighImpactChanges(patchNote.changes),
    entries: patchNote.changes.map((change) => ({
      timelineId: `${patchNote.patchId}:${change.changeId}`,
      patchId: patchNote.patchId,
      patchTitle: patchNote.title,
      patchDate: formatPatchDate(patchNote.patchDate),
      hero: {
        heroId: change.hero.heroId,
        nameKo: change.hero.nameKo,
        nameEn: change.hero.nameEn,
        role: change.hero.role,
      },
      changeType: change.changeType,
      impactLevel: change.impactLevel,
      simpleSummary: change.simpleSummary,
      metaImpact: change.metaImpact,
    })),
  });
}
