import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { savePatchAnalysis } from "@/features/patch-analysis/repository";
import type { PatchAnalysis } from "@/features/patch-analysis/types";
import type { PatchApplyResponse } from "./types";

type ApplyPatchImportRecord = Prisma.PatchImportGetPayload<{
  include: {
    stagedChanges: {
      where: {
        status: "APPROVED";
      };
      include: {
        hero: true;
        relations: {
          include: {
            targetHero: true;
          };
        };
      };
      orderBy: {
        createdAt: "asc";
      };
    };
  };
}>;

type ApprovedStagingChange = ApplyPatchImportRecord["stagedChanges"][number];

export class PatchApplyNotFoundError extends Error {
  constructor(message = "Patch import was not found.") {
    super(message);
    this.name = "PatchApplyNotFoundError";
  }
}

export class PatchApplyNotReadyError extends Error {
  issues: string[];

  constructor(
    message = "Patch import is not ready to apply.",
    issues: string[] = [],
  ) {
    super(message);
    this.name = "PatchApplyNotReadyError";
    this.issues = issues;
  }
}

export class PatchApplySaveError extends Error {
  constructor(message = "Failed to apply patch import.") {
    super(message);
    this.name = "PatchApplySaveError";
  }
}

export async function applyReviewedPatchImport(
  patchImportId: string,
): Promise<PatchApplyResponse["data"]> {
  const patchImport = await prisma.patchImport.findUnique({
    where: { id: patchImportId },
    include: {
      stagedChanges: {
        where: {
          status: "APPROVED",
        },
        include: {
          hero: true,
          relations: {
            include: {
              targetHero: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!patchImport) {
    throw new PatchApplyNotFoundError();
  }

  const issues = validatePatchImportForApply(patchImport);

  if (issues.length > 0) {
    await recordApplyFailure(patchImport.id, issues.join(" "), false);

    throw new PatchApplyNotReadyError(
      "Patch import has unresolved review issues.",
      issues,
    );
  }

  try {
    const analysis = buildPatchAnalysisFromStaging(patchImport);
    const savedAnalysis = await savePatchAnalysis(
      analysis,
      patchImport.rawText ?? undefined,
    );
    const heroChanges = await prisma.heroChange.findMany({
      where: {
        changeId: {
          in: analysis.changes.map((change) => change.changeId),
        },
      },
      select: {
        id: true,
        changeId: true,
      },
    });
    const heroChangeByChangeId = new Map(
      heroChanges.map((change) => [change.changeId, change.id]),
    );

    await prisma.$transaction(async (tx) => {
      for (const change of analysis.changes) {
        const stagingChange = patchImport.stagedChanges.find(
          (candidate) => getChangeId(analysis.patchId, candidate) === change.changeId,
        );

        await tx.patchChangeStaging.update({
          where: {
            id: stagingChange?.id ?? change.changeId,
          },
          data: {
            status: "APPLIED",
            appliedHeroChangeId: heroChangeByChangeId.get(change.changeId),
          },
        });
      }

      await tx.patchImport.update({
        where: {
          id: patchImport.id,
        },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
          errorMessage: null,
          applyLogs: {
            create: {
              action: "APPLY",
              status: "SUCCESS",
              message: "Approved staging rows were applied to public tables.",
              metadata: {
                patchId: savedAnalysis.patchId,
                appliedChangeCount: savedAnalysis.changes.length,
              },
            },
          },
        },
      });
    });

    return {
      patchImportId: patchImport.id,
      patchId: savedAnalysis.patchId,
      status: "APPLIED",
      appliedChangeCount: savedAnalysis.changes.length,
    };
  } catch (error) {
    await recordApplyFailure(patchImport.id, getErrorMessage(error), true);

    if (error instanceof PatchApplySaveError) {
      throw error;
    }

    throw new PatchApplySaveError(getErrorMessage(error));
  }
}

function validatePatchImportForApply(patchImport: ApplyPatchImportRecord) {
  const issues: string[] = [];

  if (patchImport.status !== "REVIEWING") {
    issues.push("Patch import must be in REVIEWING status before apply.");
  }

  if (!patchImport.title) {
    issues.push("Patch title is required before apply.");
  }

  if (!patchImport.patchDate) {
    issues.push("Patch date is required before apply.");
  }

  if (!patchImport.rawText) {
    issues.push("Cleaned patch note text is required before apply.");
  }

  if (patchImport.stagedChanges.length === 0) {
    issues.push("At least one APPROVED staging row is required before apply.");
  }

  for (const change of patchImport.stagedChanges) {
    if (!change.hero) {
      issues.push(`${change.heroNameRaw} must be mapped to a hero.`);
    }

    if (!change.changeType) {
      issues.push(`${change.heroNameRaw} must have a change type.`);
    }

    if (!change.impactLevel) {
      issues.push(`${change.heroNameRaw} must have an impact level.`);
    }

    for (const field of [
      ["originalChange", change.originalChange],
      ["simpleSummary", change.simpleSummary],
      ["metaImpact", change.metaImpact],
      ["recommendedPlaystyle", change.recommendedPlaystyle],
    ] as const) {
      if (!field[1] || field[1].trim().length === 0) {
        issues.push(`${change.heroNameRaw} must have ${field[0]}.`);
      }
    }

    const unresolvedRelations = change.relations.filter(
      (relation) =>
        (relation.relationType === "SYNERGY" ||
          relation.relationType === "COUNTER") &&
        !relation.targetHero,
    );

    if (unresolvedRelations.length > 0) {
      issues.push(`${change.heroNameRaw} has unresolved related heroes.`);
    }
  }

  return issues;
}

function buildPatchAnalysisFromStaging(
  patchImport: ApplyPatchImportRecord,
): PatchAnalysis {
  const patchId = getPatchStringValue(
    patchImport.stagedChanges[0]?.parsedPayload,
    "patchId",
    `patch-import-${patchImport.id}`,
  );

  return {
    patchId,
    patchTitle:
      patchImport.title ??
      getPatchStringValue(
        patchImport.stagedChanges[0]?.parsedPayload,
        "patchTitle",
        "Untitled patch",
      ),
    patchDate: patchImport.patchDate?.toISOString().slice(0, 10) ?? "",
    sourceUrl: patchImport.sourceUrl,
    overallSummary: getPatchStringValue(
      patchImport.stagedChanges[0]?.parsedPayload,
      "overallSummary",
      "No overall summary.",
    ),
    metaSummary: getPatchStringValue(
      patchImport.stagedChanges[0]?.parsedPayload,
      "metaSummary",
      "No meta summary.",
    ),
    changes: patchImport.stagedChanges.map((change) =>
      mapStagingChangeToHeroChange(patchId, change),
    ),
  };
}

function mapStagingChangeToHeroChange(
  patchId: string,
  change: ApprovedStagingChange,
): PatchAnalysis["changes"][number] {
  if (!change.hero || !change.changeType || !change.impactLevel) {
    throw new PatchApplySaveError("Approved staging row is incomplete.");
  }

  return {
    changeId: getChangeId(patchId, change),
    hero: {
      heroId: change.hero.heroId,
      nameKo: change.hero.nameKo,
      nameEn: change.hero.nameEn,
      role: change.hero.role,
    },
    changeType: change.changeType,
    impactLevel: change.impactLevel,
    originalChange: change.originalChange,
    simpleSummary: change.simpleSummary ?? "",
    metaImpact: change.metaImpact ?? "",
    affectedTiers: uniqueRelationValues(change, "AFFECTED_TIER"),
    recommendedPlaystyle: change.recommendedPlaystyle ?? "",
    synergyPicks: relatedHeroNames(change, "SYNERGY"),
    counterPicks: relatedHeroNames(change, "COUNTER"),
  };
}

function getChangeId(patchId: string, change: ApprovedStagingChange) {
  const parsedChange = getParsedPayloadRecord(change.parsedPayload).change;
  const parsedChangeId =
    typeof parsedChange === "object" &&
    parsedChange !== null &&
    "changeId" in parsedChange &&
    typeof parsedChange.changeId === "string"
      ? parsedChange.changeId
      : null;

  return parsedChangeId ?? `${patchId}:${change.id}`;
}

function uniqueRelationValues(
  change: ApprovedStagingChange,
  relationType: string,
) {
  return [
    ...new Set(
      change.relations
        .filter((relation) => relation.relationType === relationType)
        .map((relation) => relation.value)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function relatedHeroNames(change: ApprovedStagingChange, relationType: string) {
  return [
    ...new Set(
      change.relations
        .filter((relation) => relation.relationType === relationType)
        .map((relation) => relation.targetHero?.nameKo)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function getPatchStringValue(
  payload: Prisma.JsonValue | null | undefined,
  key: string,
  fallback: string,
) {
  const record = getParsedPayloadRecord(payload);
  const value = record[key];

  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function getParsedPayloadRecord(payload: Prisma.JsonValue | null | undefined) {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? payload
    : {};
}

async function recordApplyFailure(
  patchImportId: string,
  message: string,
  markFailed: boolean,
) {
  try {
    await prisma.patchImport.update({
      where: {
        id: patchImportId,
      },
      data: {
        ...(markFailed
          ? {
              status: "FAILED" as const,
              errorMessage: message,
            }
          : {}),
        applyLogs: {
          create: {
            action: "APPLY",
            status: "FAILED",
            message,
          },
        },
      },
    });
  } catch {
    // apply 실패 응답을 가리지 않도록 실패 로그 저장 오류는 삼킨다.
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown patch apply error.";
}
