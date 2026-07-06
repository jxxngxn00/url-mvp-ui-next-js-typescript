import { z } from "zod";
import { patchAnalysisSchema, patchSummarySchema } from "./schema";
import type { PatchAnalysis, PatchSummary } from "./types";

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
