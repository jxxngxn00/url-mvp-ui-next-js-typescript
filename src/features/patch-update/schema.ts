import { z } from "zod";

export const patchImportStatusSchema = z.enum([
  "IMPORTED",
  "PARSED",
  "REVIEWING",
  "APPLIED",
  "FAILED",
]);

export const patchStagingStatusSchema = z.enum([
  "PENDING",
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
