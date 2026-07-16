import type { z } from "zod";
import type {
  patchApplyActionSchema,
  patchApplyStatusSchema,
  patchImportErrorCodeSchema,
  patchImportErrorResponseSchema,
  patchImportRequestSchema,
  patchImportResponseSchema,
  patchImportSchema,
  patchImportStatusSchema,
  patchStagingStatusSchema,
} from "./schema";

export type PatchImportStatus = z.infer<typeof patchImportStatusSchema>;
export type PatchStagingStatus = z.infer<typeof patchStagingStatusSchema>;
export type PatchApplyAction = z.infer<typeof patchApplyActionSchema>;
export type PatchApplyStatus = z.infer<typeof patchApplyStatusSchema>;
export type PatchImport = z.infer<typeof patchImportSchema>;
export type PatchImportRequest = z.infer<typeof patchImportRequestSchema>;
export type PatchImportResponse = z.infer<typeof patchImportResponseSchema>;
export type PatchImportErrorCode = z.infer<
  typeof patchImportErrorCodeSchema
>;
export type PatchImportErrorResponse = z.infer<
  typeof patchImportErrorResponseSchema
>;
