import { z } from "zod";
import {
  patchAnalysisInputSchema,
  patchAnalysisSchema,
  metaTimelinePatchSchema,
  patchSummarySchema,
} from "./schema";
import type { MetaTimelinePatch, PatchAnalysis, PatchSummary } from "./types";

export const patchListResponseSchema = z.object({
  data: z.array(patchSummarySchema),
});

export const patchAnalysisResponseSchema = z.object({
  data: patchAnalysisSchema,
});

export const metaTimelineResponseSchema = z.object({
  data: z.array(metaTimelinePatchSchema),
});

export const patchAnalysisErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const patchAnalyzeRequestSchema = patchAnalysisInputSchema;

export const patchAnalyzeResponseSchema = z.object({
  data: patchAnalysisSchema,
  meta: z.object({
    saved: z.boolean(),
  }),
});

export const patchAnalyzeErrorCodeSchema = z.enum([
  "INVALID_ANALYZE_REQUEST",
  "LLM_ANALYSIS_FAILED",
  "INVALID_ANALYSIS_JSON",
  "ANALYSIS_SAVE_FAILED",
]);

export const patchAnalyzeErrorResponseSchema = z.object({
  error: z.object({
    code: patchAnalyzeErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.string()).optional(),
  }),
});

export type PatchListResponse = z.infer<typeof patchListResponseSchema>;
export type PatchAnalysisResponse = z.infer<typeof patchAnalysisResponseSchema>;
export type MetaTimelineResponse = z.infer<typeof metaTimelineResponseSchema>;
export type PatchAnalysisErrorResponse = z.infer<
  typeof patchAnalysisErrorResponseSchema
>;
export type PatchAnalyzeRequest = z.infer<typeof patchAnalyzeRequestSchema>;
export type PatchAnalyzeResponse = z.infer<typeof patchAnalyzeResponseSchema>;
export type PatchAnalyzeErrorCode = z.infer<typeof patchAnalyzeErrorCodeSchema>;
export type PatchAnalyzeErrorResponse = z.infer<
  typeof patchAnalyzeErrorResponseSchema
>;

export async function fetchPatchList(): Promise<PatchSummary[]> {
  const response = await fetch("/api/patches");
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error("Patch list request failed.");
  }

  return patchListResponseSchema.parse(payload).data;
}

export async function fetchPatchAnalysis(
  patchId: string,
): Promise<PatchAnalysis> {
  const response = await fetch(`/api/patches/${encodeURIComponent(patchId)}`);
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = patchAnalysisErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Patch analysis request failed.";

    throw new Error(message);
  }

  return patchAnalysisResponseSchema.parse(payload).data;
}

export async function fetchMetaTimeline(): Promise<MetaTimelinePatch[]> {
  const response = await fetch("/api/meta-timeline");
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error("Meta timeline request failed.");
  }

  return metaTimelineResponseSchema.parse(payload).data;
}
