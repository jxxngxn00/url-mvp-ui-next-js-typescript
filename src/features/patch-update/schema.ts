import { z } from "zod";
import {
  changeTypeSchema,
  impactLevelSchema,
} from "@/features/patch-analysis/schema";

export const patchImportStatusSchema = z.enum([
  "IMPORTED",
  "PARSED",
  "REVIEWING",
  "APPLIED",
  "FAILED",
]);

export const patchStagingStatusSchema = z.enum([
  "PENDING",
  "PENDING_REVIEW",
  "NEEDS_MAPPING",
  "APPROVED",
  "REJECTED",
  "APPLIED",
  "FAILED",
]);

export const patchApplyActionSchema = z.enum([
  "IMPORT",
  "PARSE",
  "APPROVE",
  "REJECT",
  "APPLY",
  "RETRY",
]);

export const patchApplyStatusSchema = z.enum(["SUCCESS", "FAILED"]);

export const patchImportRequestSchema = z.object({
  sourceUrl: z.url(),
  parseImmediately: z.boolean().optional().default(false),
});

export const patchImportSchema = z.object({
  id: z.string().min(1),
  sourceUrl: z.url(),
  title: z.string().nullable(),
  patchDate: z.iso.date().nullable(),
  contentHash: z.string().nullable(),
  status: patchImportStatusSchema,
  errorMessage: z.string().nullable(),
  importedAt: z.iso.datetime(),
  parsedAt: z.iso.datetime().nullable(),
  appliedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const patchImportResponseSchema = z.object({
  data: patchImportSchema,
  meta: z.object({
    created: z.boolean(),
    duplicate: z.boolean(),
  }),
});

export const patchParseRequestSchema = z.object({
  // 이미 파싱된 import를 관리자 판단으로 다시 파싱할 때만 true로 보낸다.
  forceReparse: z.boolean().optional().default(false),
});

export const patchParseResponseSchema = z.object({
  data: z.object({
    patchImportId: z.string().min(1),
    // 성공 시 REVIEWING 상태가 기본이며, route 구현에서 최종 상태를 검증한다.
    status: patchImportStatusSchema,
    stagingChangeCount: z.number().int().nonnegative(),
  }),
  meta: z.object({
    parsed: z.boolean(),
  }),
});

export const patchApplyResponseSchema = z.object({
  data: z.object({
    patchImportId: z.string().min(1),
    patchId: z.string().min(1),
    status: patchImportStatusSchema,
    appliedChangeCount: z.number().int().nonnegative(),
  }),
  meta: z.object({
    applied: z.boolean(),
  }),
});

export const patchStagingRelationSchema = z.object({
  id: z.string().min(1),
  relationType: z.string().min(1),
  value: z.string().nullable(),
  targetHero: z
    .object({
      id: z.string().min(1),
      heroId: z.string().min(1),
      nameKo: z.string().min(1),
      nameEn: z.string().min(1),
    })
    .nullable(),
  reason: z.string().nullable(),
});

export const patchStagingChangeSchema = z.object({
  id: z.string().min(1),
  patchImportId: z.string().min(1),
  hero: z
    .object({
      id: z.string().min(1),
      heroId: z.string().min(1),
      nameKo: z.string().min(1),
      nameEn: z.string().min(1),
      role: z.string().min(1),
    })
    .nullable(),
  heroNameRaw: z.string().min(1),
  abilityName: z.string().nullable(),
  changeType: changeTypeSchema.nullable(),
  impactLevel: impactLevelSchema.nullable(),
  originalChange: z.string().min(1),
  simpleSummary: z.string().nullable(),
  metaImpact: z.string().nullable(),
  recommendedPlaystyle: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  status: patchStagingStatusSchema,
  reviewerNote: z.string().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  appliedHeroChangeId: z.string().nullable(),
  relations: z.array(patchStagingRelationSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const patchImportListResponseSchema = z.object({
  data: z.array(
    patchImportSchema.extend({
      stagingChangeCount: z.number().int().nonnegative(),
      pendingReviewCount: z.number().int().nonnegative(),
      approvedCount: z.number().int().nonnegative(),
      rejectedCount: z.number().int().nonnegative(),
    }),
  ),
  meta: z.object({
    count: z.number().int().nonnegative(),
  }),
});

export const patchImportReviewResponseSchema = z.object({
  data: patchImportSchema.extend({
    stagingChanges: z.array(patchStagingChangeSchema),
  }),
});

export const patchStagingReviewRequestSchema = z.object({
  status: patchStagingStatusSchema
    .extract([
      "PENDING",
      "PENDING_REVIEW",
      "NEEDS_MAPPING",
      "APPROVED",
      "REJECTED",
    ])
    .optional(),
  heroId: z.string().min(1).nullable().optional(),
  changeType: changeTypeSchema.nullable().optional(),
  impactLevel: impactLevelSchema.nullable().optional(),
  originalChange: z.string().min(1).optional(),
  simpleSummary: z.string().min(1).nullable().optional(),
  metaImpact: z.string().min(1).nullable().optional(),
  recommendedPlaystyle: z.string().min(1).nullable().optional(),
  reviewerNote: z.string().nullable().optional(),
});

export const patchStagingReviewResponseSchema = z.object({
  data: patchStagingChangeSchema,
  meta: z.object({
    reviewed: z.boolean(),
  }),
});

export const patchStagingRelationReviewRequestSchema = z.object({
  targetHeroId: z.string().min(1).nullable(),
});

export const patchStagingRelationReviewResponseSchema = z.object({
  data: patchStagingChangeSchema,
  meta: z.object({
    reviewed: z.boolean(),
  }),
});

export const patchImportErrorCodeSchema = z.enum([
  "INVALID_IMPORT_REQUEST",
  "UNSUPPORTED_PATCH_SOURCE",
  "PATCH_FETCH_FAILED",
  "PATCH_IMPORT_SAVE_FAILED",
]);

export const patchImportErrorResponseSchema = z.object({
  error: z.object({
    code: patchImportErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.string()).optional(),
  }),
});

export const patchParseErrorCodeSchema = z.enum([
  "INVALID_PARSE_REQUEST",
  "PATCH_IMPORT_NOT_FOUND",
  "PATCH_IMPORT_NOT_READY",
  "PATCH_PARSE_FAILED",
  "PATCH_STAGING_SAVE_FAILED",
]);

export const patchParseErrorResponseSchema = z.object({
  error: z.object({
    code: patchParseErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.string()).optional(),
  }),
});

export const patchApplyErrorCodeSchema = z.enum([
  "PATCH_IMPORT_NOT_FOUND",
  "PATCH_APPLY_NOT_READY",
  "PATCH_APPLY_FAILED",
]);

export const patchApplyErrorResponseSchema = z.object({
  error: z.object({
    code: patchApplyErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.string()).optional(),
  }),
});

export const patchStagingReviewErrorCodeSchema = z.enum([
  "INVALID_STAGING_REVIEW_REQUEST",
  "PATCH_IMPORT_NOT_FOUND",
  "PATCH_STAGING_NOT_FOUND",
  "PATCH_STAGING_RELATION_NOT_FOUND",
  "PATCH_STAGING_HERO_NOT_FOUND",
  "PATCH_STAGING_REVIEW_FAILED",
]);

export const patchStagingReviewErrorResponseSchema = z.object({
  error: z.object({
    code: patchStagingReviewErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.string()).optional(),
  }),
});
