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

const isDevelopment = process.env.NODE_ENV === "development";

async function getDevFallbackPatchAnalysis() {
  const { devFallbackPatchAnalysis } = await import("./mock");

  return devFallbackPatchAnalysis;
}

async function getDevFallbackPatchList(): Promise<PatchSummary[]> {
  const fallback = await getDevFallbackPatchAnalysis();
  const highImpactChangeCount = fallback.changes.filter(
    (change) => change.impactLevel === "HIGH",
  ).length;

  return [
    patchSummarySchema.parse({
      patchId: fallback.patchId,
      patchTitle: fallback.patchTitle,
      patchDate: fallback.patchDate,
      sourceUrl: fallback.sourceUrl,
      overallSummary: fallback.overallSummary,
      metaSummary: fallback.metaSummary,
      changeCount: fallback.changes.length,
      highImpactChangeCount,
    }),
  ];
}

async function getDevFallbackMetaTimeline(): Promise<MetaTimelinePatch[]> {
  const fallback = await getDevFallbackPatchAnalysis();
  const highImpactChangeCount = fallback.changes.filter(
    (change) => change.impactLevel === "HIGH",
  ).length;

  return [
    metaTimelinePatchSchema.parse({
      patchId: fallback.patchId,
      patchTitle: fallback.patchTitle,
      patchDate: fallback.patchDate,
      metaSummary: fallback.metaSummary,
      highImpactChangeCount,
      entries: fallback.changes.map((change) => ({
        timelineId: `${fallback.patchId}:${change.changeId}`,
        patchId: fallback.patchId,
        patchTitle: fallback.patchTitle,
        patchDate: fallback.patchDate,
        hero: change.hero,
        changeType: change.changeType,
        impactLevel: change.impactLevel,
        simpleSummary: change.simpleSummary,
        metaImpact: change.metaImpact,
      })),
    }),
  ];
}

export async function fetchPatchList(): Promise<PatchSummary[]> {
  try {
    const response = await fetch("/api/patches");
    const payload: unknown = await response.json();

    if (!response.ok) {
      throw new Error("Patch list request failed.");
    }

    return patchListResponseSchema.parse(payload).data;
  } catch (error) {
    if (isDevelopment) {
      return getDevFallbackPatchList();
    }

    throw error;
  }
}

export async function fetchPatchAnalysis(
  patchId: string,
): Promise<PatchAnalysis> {
  try {
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
  } catch (error) {
    if (isDevelopment) {
      const fallback = await getDevFallbackPatchAnalysis();

      if (fallback.patchId === patchId) {
        return fallback;
      }
    }

    throw error;
  }
}

export async function fetchMetaTimeline(): Promise<MetaTimelinePatch[]> {
  try {
    const response = await fetch("/api/meta-timeline");
    const payload: unknown = await response.json();

    if (!response.ok) {
      throw new Error("Meta timeline request failed.");
    }

    return metaTimelineResponseSchema.parse(payload).data;
  } catch (error) {
    if (isDevelopment) {
      return getDevFallbackMetaTimeline();
    }

    throw error;
  }
}
