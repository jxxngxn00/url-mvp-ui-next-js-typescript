import type { z } from "zod";
import type {
  changeTypeSchema,
  heroChangeSchema,
  heroInfoSchema,
  heroRoleSchema,
  impactLevelSchema,
  metaTimelineEntrySchema,
  metaTimelinePatchSchema,
  patchAnalysisInputSchema,
  patchAnalysisSchema,
  patchSummarySchema,
} from "./schema";

export type HeroRole = z.infer<typeof heroRoleSchema>;
export type ChangeType = z.infer<typeof changeTypeSchema>;
export type ImpactLevel = z.infer<typeof impactLevelSchema>;
export type HeroInfo = z.infer<typeof heroInfoSchema>;
export type HeroChange = z.infer<typeof heroChangeSchema>;
export type PatchAnalysisInput = z.infer<typeof patchAnalysisInputSchema>;
export type PatchAnalysis = z.infer<typeof patchAnalysisSchema>;
export type PatchSummary = z.infer<typeof patchSummarySchema>;
export type MetaTimelineEntry = z.infer<typeof metaTimelineEntrySchema>;
export type MetaTimelinePatch = z.infer<typeof metaTimelinePatchSchema>;
