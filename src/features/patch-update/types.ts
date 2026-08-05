import type { z } from "zod";
import type {
  patchApplyActionSchema,
  patchApplyErrorCodeSchema,
  patchApplyErrorResponseSchema,
  patchApplyResponseSchema,
  patchApplyStatusSchema,
  patchImportErrorCodeSchema,
  patchImportErrorResponseSchema,
  patchImportRequestSchema,
  patchImportResponseSchema,
  patchImportListResponseSchema,
  patchImportReviewResponseSchema,
  patchImportSchema,
  patchImportStatusSchema,
  patchParseErrorCodeSchema,
  patchParseErrorResponseSchema,
  patchParseRequestSchema,
  patchParseResponseSchema,
  patchStagingChangeSchema,
  patchStagingRelationReviewRequestSchema,
  patchStagingRelationReviewResponseSchema,
  patchStagingReviewErrorCodeSchema,
  patchStagingReviewErrorResponseSchema,
  patchStagingReviewRequestSchema,
  patchStagingReviewResponseSchema,
  patchStagingStatusSchema,
} from "./schema";

export type PatchImportStatus = z.infer<typeof patchImportStatusSchema>;
export type PatchStagingStatus = z.infer<typeof patchStagingStatusSchema>;
export type PatchApplyAction = z.infer<typeof patchApplyActionSchema>;
export type PatchApplyStatus = z.infer<typeof patchApplyStatusSchema>;
export type PatchApplyResponse = z.infer<typeof patchApplyResponseSchema>;
export type PatchApplyErrorCode = z.infer<typeof patchApplyErrorCodeSchema>;
export type PatchApplyErrorResponse = z.infer<
  typeof patchApplyErrorResponseSchema
>;
export type PatchImport = z.infer<typeof patchImportSchema>;
export type PatchImportRequest = z.infer<typeof patchImportRequestSchema>;
export type PatchImportResponse = z.infer<typeof patchImportResponseSchema>;
export type PatchImportListResponse = z.infer<
  typeof patchImportListResponseSchema
>;
export type PatchImportReviewResponse = z.infer<
  typeof patchImportReviewResponseSchema
>;
export type PatchImportErrorCode = z.infer<
  typeof patchImportErrorCodeSchema
>;
export type PatchImportErrorResponse = z.infer<
  typeof patchImportErrorResponseSchema
>;
export type PatchParseRequest = z.infer<typeof patchParseRequestSchema>;
export type PatchParseResponse = z.infer<typeof patchParseResponseSchema>;
export type PatchParseErrorCode = z.infer<typeof patchParseErrorCodeSchema>;
export type PatchParseErrorResponse = z.infer<
  typeof patchParseErrorResponseSchema
>;
export type PatchStagingChange = z.infer<typeof patchStagingChangeSchema>;
export type PatchStagingRelationReviewRequest = z.infer<
  typeof patchStagingRelationReviewRequestSchema
>;
export type PatchStagingRelationReviewResponse = z.infer<
  typeof patchStagingRelationReviewResponseSchema
>;
export type PatchStagingReviewRequest = z.infer<
  typeof patchStagingReviewRequestSchema
>;
export type PatchStagingReviewResponse = z.infer<
  typeof patchStagingReviewResponseSchema
>;
export type PatchStagingReviewErrorCode = z.infer<
  typeof patchStagingReviewErrorCodeSchema
>;
export type PatchStagingReviewErrorResponse = z.infer<
  typeof patchStagingReviewErrorResponseSchema
>;
