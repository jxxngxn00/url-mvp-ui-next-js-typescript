import { z } from "zod";
import { patchAnalysisSchema, patchSummarySchema } from "./schema";

export const patchListResponseSchema = z.object({
  data: z.array(patchSummarySchema),
});

export const patchAnalysisResponseSchema = z.object({
  data: patchAnalysisSchema,
});

export const patchAnalysisErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type PatchListResponse = z.infer<typeof patchListResponseSchema>;
export type PatchAnalysisResponse = z.infer<typeof patchAnalysisResponseSchema>;
export type PatchAnalysisErrorResponse = z.infer<
  typeof patchAnalysisErrorResponseSchema
>;
