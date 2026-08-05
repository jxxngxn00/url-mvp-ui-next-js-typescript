import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ImportedPatchContent } from "./importer";
import type {
  PatchApplyAction,
  PatchImport,
  PatchImportListResponse,
  PatchImportReviewResponse,
} from "./types";

type PatchImportRecord = Prisma.PatchImportGetPayload<Record<string, never>>;
type PatchImportListRecord = Prisma.PatchImportGetPayload<{
  include: {
    _count: {
      select: {
        stagedChanges: true;
      };
    };
    stagedChanges: {
      select: {
        status: true;
      };
    };
  };
}>;
type PatchImportReviewRecord = Prisma.PatchImportGetPayload<{
  include: {
    stagedChanges: {
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
export type PatchImportForParsing = PatchImport & {
  rawText: string | null;
};

export type PatchImportResult = {
  patchImport: PatchImport;
  created: boolean;
  duplicate: boolean;
};

export class PatchImportSaveError extends Error {
  constructor(message = "Failed to save patch import.") {
    super(message);
    this.name = "PatchImportSaveError";
  }
}

export class PatchImportNotFoundForReviewError extends Error {
  constructor(message = "Patch import was not found.") {
    super(message);
    this.name = "PatchImportNotFoundForReviewError";
  }
}

export type PatchImportFailureInput = {
  sourceUrl: string;
  action: Extract<PatchApplyAction, "IMPORT" | "PARSE">;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export type PatchImportParseSuccessInput = {
  patchImportId: string;
  sourceUrl: string;
  parsedTitle?: string;
  parsedDate?: string;
  parsedChangeCount: number;
  stagingChangeCount: number;
};

export async function findPatchImportBySourceUrl(sourceUrl: string) {
  const patchImport = await prisma.patchImport.findUnique({
    where: { sourceUrl },
  });

  return patchImport ? mapPatchImport(patchImport) : null;
}

export async function findPatchImportById(id: string) {
  const patchImport = await prisma.patchImport.findUnique({
    where: { id },
  });

  return patchImport ? mapPatchImportForParsing(patchImport) : null;
}

export async function listPatchImportsForReview(): Promise<
  PatchImportListResponse["data"]
> {
  const patchImports = await prisma.patchImport.findMany({
    orderBy: {
      importedAt: "desc",
    },
    include: {
      _count: {
        select: {
          stagedChanges: true,
        },
      },
      stagedChanges: {
        select: {
          status: true,
        },
      },
    },
    take: 50,
  });

  return patchImports.map(mapPatchImportListItem);
}

export async function getPatchImportForReview(
  id: string,
): Promise<PatchImportReviewResponse["data"]> {
  const patchImport = await prisma.patchImport.findUnique({
    where: { id },
    include: {
      stagedChanges: {
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
    throw new PatchImportNotFoundForReviewError();
  }

  return mapPatchImportReview(patchImport);
}

export async function saveImportedPatchContent(
  content: ImportedPatchContent,
): Promise<PatchImportResult> {
  try {
    const existingBySourceUrl = await prisma.patchImport.findUnique({
      where: { sourceUrl: content.sourceUrl },
    });

    if (existingBySourceUrl) {
      // 같은 URL은 이미 처리한 import로 보고 새 row를 만들지 않는다.
      return {
        patchImport: mapPatchImport(existingBySourceUrl),
        created: false,
        duplicate: true,
      };
    }

    const existingByHash = await prisma.patchImport.findUnique({
      where: { contentHash: content.contentHash },
    });

    if (existingByHash) {
      // 같은 본문이면 URL이 달라도 동일 패치로 보고 새 import 생성을 막는다.
      return {
        patchImport: mapPatchImport(existingByHash),
        created: false,
        duplicate: true,
      };
    }

    const patchImport = await prisma.patchImport.create({
      data: {
        sourceUrl: content.sourceUrl,
        title: content.title,
        patchDate: content.patchDate ? toPatchDate(content.patchDate) : null,
        rawHtml: content.rawHtml,
        rawText: content.rawText,
        contentHash: content.contentHash,
        status: "IMPORTED",
        applyLogs: {
          create: {
            action: "IMPORT",
            status: "SUCCESS",
            message: "Patch note HTML was imported.",
          },
        },
      },
    });

    return {
      patchImport: mapPatchImport(patchImport),
      created: true,
      duplicate: false,
    };
  } catch (error) {
    throw new PatchImportSaveError(getErrorMessage(error));
  }
}

export async function recordPatchImportFailure({
  sourceUrl,
  action,
  message,
  metadata = {},
}: PatchImportFailureInput): Promise<void> {
  try {
    // fetch/parse 실패도 import row에 남겨야 운영자가 원인을 보고 재시도할 수 있다.
    await prisma.patchImport.upsert({
      where: { sourceUrl },
      update: {
        status: "FAILED",
        errorMessage: message,
        applyLogs: {
          create: {
            action,
            status: "FAILED",
            message,
            metadata,
          },
        },
      },
      create: {
        sourceUrl,
        status: "FAILED",
        errorMessage: message,
        applyLogs: {
          create: {
            action,
            status: "FAILED",
            message,
            metadata,
          },
        },
      },
    });
  } catch {
    // 실패 로그 저장 자체가 실패해도 원래 에러 응답을 가리는 것은 피한다.
  }
}

export async function saveFailedPatchImport(
  sourceUrl: string,
  message: string,
): Promise<void> {
  await recordPatchImportFailure({
    sourceUrl,
    action: "IMPORT",
    message,
  });
}

export async function recordPatchParseSuccess({
  patchImportId,
  parsedDate,
  parsedTitle,
  sourceUrl,
  parsedChangeCount,
  stagingChangeCount,
}: PatchImportParseSuccessInput): Promise<PatchImport> {
  try {
    // parser 결과가 staging row까지 저장되어야 관리자 검수 단계로 넘길 수 있다.
    const patchImport = await prisma.patchImport.update({
      where: { id: patchImportId },
      data: {
        status: "REVIEWING",
        title: parsedTitle,
        patchDate: parsedDate ? toPatchDate(parsedDate) : undefined,
        errorMessage: null,
        parsedAt: new Date(),
        applyLogs: {
          create: {
            action: "PARSE",
            status: "SUCCESS",
            message: "Patch note parser completed and staging rows were saved.",
            metadata: {
              stage: "staging",
              sourceUrl,
              parsedChangeCount,
              stagingChangeCount,
            },
          },
        },
      },
    });

    return mapPatchImport(patchImport);
  } catch (error) {
    throw new PatchImportSaveError(getErrorMessage(error));
  }
}

export function mapPatchImport(record: PatchImportRecord): PatchImport {
  return {
    id: record.id,
    sourceUrl: record.sourceUrl,
    title: record.title,
    patchDate: record.patchDate ? toIsoDate(record.patchDate) : null,
    contentHash: record.contentHash,
    status: record.status,
    errorMessage: record.errorMessage,
    importedAt: record.importedAt.toISOString(),
    parsedAt: record.parsedAt?.toISOString() ?? null,
    appliedAt: record.appliedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapPatchImportListItem(record: PatchImportListRecord) {
  const pendingReviewStatuses = new Set(["PENDING_REVIEW", "NEEDS_MAPPING"]);

  return {
    ...mapPatchImport(record),
    stagingChangeCount: record._count.stagedChanges,
    pendingReviewCount: record.stagedChanges.filter((change) =>
      pendingReviewStatuses.has(change.status),
    ).length,
    approvedCount: record.stagedChanges.filter(
      (change) => change.status === "APPROVED",
    ).length,
    rejectedCount: record.stagedChanges.filter(
      (change) => change.status === "REJECTED",
    ).length,
  };
}

function mapPatchImportReview(record: PatchImportReviewRecord) {
  return {
    ...mapPatchImport(record),
    stagingChanges: record.stagedChanges.map(mapPatchStagingChange),
  };
}

export function mapPatchStagingChange(
  record: PatchImportReviewRecord["stagedChanges"][number],
) {
  return {
    id: record.id,
    patchImportId: record.patchImportId,
    hero: record.hero
      ? {
          id: record.hero.id,
          heroId: record.hero.heroId,
          nameKo: record.hero.nameKo,
          nameEn: record.hero.nameEn,
          role: record.hero.role,
        }
      : null,
    heroNameRaw: record.heroNameRaw,
    abilityName: record.abilityName,
    changeType: record.changeType,
    impactLevel: record.impactLevel,
    originalChange: record.originalChange,
    simpleSummary: record.simpleSummary,
    metaImpact: record.metaImpact,
    recommendedPlaystyle: record.recommendedPlaystyle,
    confidence: Number(record.confidence),
    status: record.status,
    reviewerNote: record.reviewerNote,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    appliedHeroChangeId: record.appliedHeroChangeId,
    relations: record.relations.map((relation) => ({
      id: relation.id,
      relationType: relation.relationType,
      value: relation.value,
      targetHero: relation.targetHero
        ? {
            id: relation.targetHero.id,
            heroId: relation.targetHero.heroId,
            nameKo: relation.targetHero.nameKo,
            nameEn: relation.targetHero.nameEn,
          }
        : null,
      reason: relation.reason,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapPatchImportForParsing(
  record: PatchImportRecord,
): PatchImportForParsing {
  return {
    ...mapPatchImport(record),
    rawText: record.rawText,
  };
}

function toPatchDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown patch import error.";
}
