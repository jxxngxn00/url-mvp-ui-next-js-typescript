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
