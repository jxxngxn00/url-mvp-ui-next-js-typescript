import type { Prisma } from "@/generated/prisma/client";
import type { PatchStagingStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { PatchAnalysis } from "@/features/patch-analysis/types";
import { mapPatchStagingChange } from "./repository";
import type {
  PatchStagingChange,
  PatchStagingReviewRequest,
} from "./types";

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

type NumericExtractionReview = {
  status: "EXACT" | "UNCLEAR" | "NOT_NUMERIC";
  reason: string | null;
  numericTokens: string[];
};

type RelationResolutionStatus = "NONE" | "ALL_RESOLVED" | "HAS_UNRESOLVED";

type StagingConfidenceResult = {
  score: number;
  breakdown: {
    hero: number;
    changeType: number;
    impactLevel: number;
    originalChange: number;
    summaryFields: number;
    relatedHeroes: number;
    numericExtraction: number;
  };
};

type StagingReviewContext = {
  heroNameRaw: string;
  status: PatchStagingStatus;
  reviewerNote: string | null;
  autoApplyCandidate: boolean;
  reviewReasons: string[];
};
type PatchStagingReviewRecord = Prisma.PatchChangeStagingGetPayload<{
  include: {
    hero: true;
    relations: {
      include: {
        targetHero: true;
      };
    };
  };
}>;

const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.85;

export type SavePatchAnalysisToStagingResult = {
  stagingChangeCount: number;
};

export class PatchStagingSaveError extends Error {
  constructor(message = "Failed to save patch analysis staging rows.") {
    super(message);
    this.name = "PatchStagingSaveError";
  }
}

export class PatchStagingNotFoundError extends Error {
  constructor(message = "Patch staging change was not found.") {
    super(message);
    this.name = "PatchStagingNotFoundError";
  }
}

export class PatchStagingRelationNotFoundError extends Error {
  constructor(message = "Patch staging relation was not found.") {
    super(message);
    this.name = "PatchStagingRelationNotFoundError";
  }
}

export class PatchStagingHeroNotFoundError extends Error {
  constructor(message = "Requested hero was not found.") {
    super(message);
    this.name = "PatchStagingHeroNotFoundError";
  }
}

export class PatchStagingReviewSaveError extends Error {
  constructor(message = "Failed to save patch staging review.") {
    super(message);
    this.name = "PatchStagingReviewSaveError";
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
        const numericExtraction = reviewNumericExtraction(
          change.originalChange,
        );
        const confidenceResult = calculateStagingConfidence({
          heroResolved: Boolean(hero),
          changeTypePresent: Boolean(change.changeType),
          impactLevelPresent: Boolean(change.impactLevel),
          originalChangePresent: Boolean(change.originalChange),
          completedSummaryFieldCount: countCompletedSummaryFields(change),
          relationResolutionStatus: relationDrafts.resolutionStatus,
          numericExtractionStatus: numericExtraction.status,
        });
        const confidence = confidenceResult.score;
        const reviewContext = buildStagingReviewContext({
          heroResolved: Boolean(hero),
          heroNameRaw:
            change.hero.nameEn || change.hero.nameKo || change.hero.heroId,
          confidence,
          numericExtraction,
          unresolvedRelatedHeroNames: relationDrafts.unresolvedRelatedHeroNames,
        });

        await tx.patchChangeStaging.create({
          data: {
            patchImportId,
            heroId: hero?.id ?? null,
            heroNameRaw: reviewContext.heroNameRaw,
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
              numericExtraction,
              confidenceBreakdown: confidenceResult.breakdown,
              reviewDecision: {
                status: reviewContext.status,
                autoApplyCandidate: reviewContext.autoApplyCandidate,
                reasons: reviewContext.reviewReasons,
              },
              change,
            },
            confidence,
            status: reviewContext.status,
            reviewerNote: reviewContext.reviewerNote,
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

export async function updatePatchStagingReview(
  patchImportId: string,
  stagingChangeId: string,
  request: PatchStagingReviewRequest,
): Promise<PatchStagingChange> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.patchChangeStaging.findFirst({
        where: {
          id: stagingChangeId,
          patchImportId,
        },
      });

      if (!existing) {
        throw new PatchStagingNotFoundError();
      }

      if (existing.status === "APPLIED") {
        throw new PatchStagingReviewSaveError(
          "Applied staging rows cannot be edited.",
        );
      }

      const hero = await resolveReviewHero(tx, request.heroId);
      const status = request.status ?? existing.status;
      const nextHeroId =
        request.heroId === undefined ? existing.heroId : hero?.id ?? null;
      const reviewedAt =
        status === "APPROVED" || status === "REJECTED" ? new Date() : null;

      if (status === "APPROVED" && !nextHeroId) {
        throw new PatchStagingReviewSaveError(
          "Approved staging rows must be mapped to a hero.",
        );
      }

      const updated = await tx.patchChangeStaging.update({
        where: {
          id: stagingChangeId,
        },
        data: {
          status,
          heroId: request.heroId === undefined ? undefined : nextHeroId,
          changeType: request.changeType,
          impactLevel: request.impactLevel,
          originalChange: request.originalChange,
          simpleSummary: request.simpleSummary,
          metaImpact: request.metaImpact,
          recommendedPlaystyle: request.recommendedPlaystyle,
          reviewerNote: request.reviewerNote,
          reviewedAt,
        },
        include: {
          hero: true,
          relations: {
            include: {
              targetHero: true,
            },
          },
        },
      });

      return mapPatchStagingChange(updated as PatchStagingReviewRecord);
    });
  } catch (error) {
    if (
      error instanceof PatchStagingNotFoundError ||
      error instanceof PatchStagingHeroNotFoundError ||
      error instanceof PatchStagingReviewSaveError
    ) {
      throw error;
    }

    throw new PatchStagingReviewSaveError(getErrorMessage(error));
  }
}

export async function updatePatchStagingRelationReview(
  patchImportId: string,
  stagingChangeId: string,
  relationId: string,
  request: {
    targetHeroId: string | null;
  },
): Promise<PatchStagingChange> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.patchChangeStaging.findFirst({
        where: {
          id: stagingChangeId,
          patchImportId,
        },
      });

      if (!existing) {
        throw new PatchStagingNotFoundError();
      }

      if (existing.status === "APPLIED") {
        throw new PatchStagingReviewSaveError(
          "Applied staging rows cannot be edited.",
        );
      }

      const relation = await tx.patchStagingRelation.findFirst({
        where: {
          id: relationId,
          stagingChangeId,
        },
      });

      if (!relation) {
        throw new PatchStagingRelationNotFoundError();
      }

      if (
        relation.relationType !== "SYNERGY" &&
        relation.relationType !== "COUNTER"
      ) {
        throw new PatchStagingReviewSaveError(
          "Only related hero relations can be remapped.",
        );
      }

      const hero = await resolveReviewHero(tx, request.targetHeroId);

      await tx.patchStagingRelation.update({
        where: {
          id: relationId,
        },
        data: {
          targetHeroId: hero?.id ?? null,
        },
      });

      const updated = await tx.patchChangeStaging.findUniqueOrThrow({
        where: {
          id: stagingChangeId,
        },
        include: {
          hero: true,
          relations: {
            include: {
              targetHero: true,
            },
          },
        },
      });

      return mapPatchStagingChange(updated as PatchStagingReviewRecord);
    });
  } catch (error) {
    if (
      error instanceof PatchStagingNotFoundError ||
      error instanceof PatchStagingRelationNotFoundError ||
      error instanceof PatchStagingHeroNotFoundError ||
      error instanceof PatchStagingReviewSaveError
    ) {
      throw error;
    }

    throw new PatchStagingReviewSaveError(getErrorMessage(error));
  }
}

async function resolveReviewHero(
  tx: TransactionClient,
  heroId: string | null | undefined,
) {
  if (heroId === undefined || heroId === null) {
    return null;
  }

  const hero = await tx.hero.findUnique({
    where: {
      heroId,
    },
  });

  if (!hero) {
    throw new PatchStagingHeroNotFoundError();
  }

  return hero;
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

function buildStagingReviewContext({
  heroResolved,
  heroNameRaw,
  confidence,
  numericExtraction,
  unresolvedRelatedHeroNames,
}: {
  heroResolved: boolean;
  heroNameRaw: string;
  confidence: number;
  numericExtraction: NumericExtractionReview;
  unresolvedRelatedHeroNames: string[];
}): StagingReviewContext {
  const reviewReasons = [
    numericExtraction.reason,
    unresolvedRelatedHeroNames.length > 0
      ? `관련 영웅 매칭 실패: ${unresolvedRelatedHeroNames.join(", ")} 값을 확인해야 합니다.`
      : null,
    confidence <= AUTO_APPLY_CONFIDENCE_THRESHOLD
      ? `confidence ${confidence.toFixed(3)}로 자동 승인 기준보다 낮습니다.`
      : null,
  ].filter((reason): reason is string => Boolean(reason));

  if (!heroResolved) {
    // 영웅 매칭 실패는 자동 적용 전에 관리자가 DB hero와 직접 연결해야 하는 상태로 분리한다.
    return {
      heroNameRaw,
      status: "NEEDS_MAPPING",
      reviewerNote: [
        `영웅 매칭 실패: parser가 추출한 "${heroNameRaw}" 값을 heroes 테이블과 연결해야 합니다.`,
        ...reviewReasons,
      ].join(" "),
      autoApplyCandidate: false,
      reviewReasons: [
        `영웅 매칭 실패: parser가 추출한 "${heroNameRaw}" 값을 heroes 테이블과 연결해야 합니다.`,
        ...reviewReasons,
      ],
    };
  }

  if (confidence <= AUTO_APPLY_CONFIDENCE_THRESHOLD) {
    return {
      heroNameRaw,
      status: "PENDING_REVIEW",
      reviewerNote: reviewReasons.join(" "),
      autoApplyCandidate: false,
      reviewReasons,
    };
  }

  if (
    unresolvedRelatedHeroNames.length > 0 ||
    numericExtraction.status === "UNCLEAR"
  ) {
    return {
      heroNameRaw,
      status: "PENDING_REVIEW",
      reviewerNote: reviewReasons.join(" "),
      autoApplyCandidate: false,
      reviewReasons,
    };
  }

  return {
    heroNameRaw,
    status: "PENDING",
    reviewerNote: null,
    autoApplyCandidate: true,
    reviewReasons: [],
  };
}

function reviewNumericExtraction(
  originalChange: string,
): NumericExtractionReview {
  const numericTokens = originalChange.match(/\d+(?:\.\d+)?%?/g) ?? [];
  const expectsNumericChange = hasNumericChangeContext(originalChange);

  if (!expectsNumericChange) {
    return {
      status: "NOT_NUMERIC",
      reason: null,
      numericTokens,
    };
  }

  if (hasBeforeAfterNumericPattern(originalChange)) {
    return {
      status: "EXACT",
      reason: null,
      numericTokens,
    };
  }

  // 수치형 변경처럼 보이지만 기존값/변경값 한 쌍이 보이지 않으면 검수자가 원문을 확인해야 한다.
  return {
    status: "UNCLEAR",
    reason:
      "수치 변경의 기존값/변경값이 명확하지 않아 원문 확인이 필요합니다.",
    numericTokens,
  };
}

function hasBeforeAfterNumericPattern(originalChange: string) {
  return [
    /\bfrom\s+\d+(?:\.\d+)?%?\s+to\s+\d+(?:\.\d+)?%?\b/i,
    /\b\d+(?:\.\d+)?%?\s*(?:->|→)\s*\d+(?:\.\d+)?%?\b/,
    /\b\d+(?:\.\d+)?%?\s+to\s+\d+(?:\.\d+)?%?\b/i,
    /\d+(?:\.\d+)?%?\s*에서\s*\d+(?:\.\d+)?%?\s*로/,
  ].some((pattern) => pattern.test(originalChange));
}

function hasNumericChangeContext(originalChange: string) {
  const numericKeywords = [
    "damage",
    "healing",
    "cooldown",
    "duration",
    "range",
    "radius",
    "health",
    "armor",
    "shield",
    "ammo",
    "speed",
    "cost",
    "charge",
    "spread",
    "recoil",
    "피해",
    "대미지",
    "회복",
    "쿨다운",
    "재사용",
    "지속",
    "범위",
    "거리",
    "반경",
    "생명력",
    "방어력",
    "보호막",
    "탄약",
    "속도",
    "충전",
  ];
  const changeKeywords = [
    "increased",
    "decreased",
    "reduced",
    "raised",
    "lowered",
    "changed",
    "증가",
    "감소",
    "상향",
    "하향",
    "변경",
    "줄",
    "늘",
  ];
  const normalizedChange = originalChange.toLowerCase();

  return (
    numericKeywords.some((keyword) => normalizedChange.includes(keyword)) &&
    changeKeywords.some((keyword) => normalizedChange.includes(keyword))
  );
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
  const unresolvedRelatedHeroNames = relatedHeroRelations
    .filter((relation) => !relation.targetHeroId)
    .map((relation) => relation.value)
    .filter((value): value is string => Boolean(value));

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
    resolutionStatus: getRelationResolutionStatus(relatedHeroRelations),
    unresolvedRelatedHeroNames,
  };
}

function getRelationResolutionStatus(
  relatedHeroRelations: Array<{
    targetHeroId: string | null;
  }>,
): RelationResolutionStatus {
  if (relatedHeroRelations.length === 0) {
    return "NONE";
  }

  return relatedHeroRelations.every((relation) => relation.targetHeroId)
    ? "ALL_RESOLVED"
    : "HAS_UNRESOLVED";
}

function calculateStagingConfidence({
  heroResolved,
  changeTypePresent,
  impactLevelPresent,
  originalChangePresent,
  completedSummaryFieldCount,
  relationResolutionStatus,
  numericExtractionStatus,
}: {
  heroResolved: boolean;
  changeTypePresent: boolean;
  impactLevelPresent: boolean;
  originalChangePresent: boolean;
  completedSummaryFieldCount: number;
  relationResolutionStatus: RelationResolutionStatus;
  numericExtractionStatus: NumericExtractionReview["status"];
}): StagingConfidenceResult {
  const breakdown = {
    hero: heroResolved ? 0.35 : 0,
    changeType: changeTypePresent ? 0.1 : 0,
    impactLevel: impactLevelPresent ? 0.1 : 0,
    originalChange: originalChangePresent ? 0.15 : 0,
    summaryFields: Math.min(completedSummaryFieldCount, 3) * 0.05,
    relatedHeroes: getRelatedHeroConfidence(relationResolutionStatus),
    numericExtraction: getNumericExtractionConfidence(numericExtractionStatus),
  };
  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  // 각 항목별 점수 합산 결과를 0~1 사이로 고정해 DB confidence 제약 조건을 지킨다.
  return {
    score: Math.max(Math.min(score, 1), 0),
    breakdown,
  };
}

function countCompletedSummaryFields(change: PatchAnalysis["changes"][number]) {
  return [
    change.simpleSummary,
    change.metaImpact,
    change.recommendedPlaystyle,
  ].filter((value) => value.trim().length > 0).length;
}

function getRelatedHeroConfidence(status: RelationResolutionStatus) {
  if (status === "ALL_RESOLVED") {
    return 0.1;
  }

  if (status === "NONE") {
    return 0.05;
  }

  return 0;
}

function getNumericExtractionConfidence(
  status: NumericExtractionReview["status"],
) {
  return status === "UNCLEAR" ? 0 : 0.1;
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
