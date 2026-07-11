import { z } from "zod";

export const heroRoleSchema = z.enum(["TANK", "DAMAGE", "SUPPORT"]);

export const changeTypeSchema = z.enum([
  "BUFF",
  "NERF",
  "ADJUSTMENT",
  "BUG_FIX",
]);

export const impactLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const heroInfoSchema = z.object({
  heroId: z.string().min(1),
  nameKo: z.string().min(1),
  nameEn: z.string().min(1),
  role: heroRoleSchema,
});

export const heroChangeSchema = z.object({
  changeId: z.string().min(1),
  hero: heroInfoSchema,
  changeType: changeTypeSchema,
  impactLevel: impactLevelSchema,
  originalChange: z.string().min(1),
  simpleSummary: z.string().min(1),
  metaImpact: z.string().min(1),
  affectedTiers: z.array(z.string().min(1)),
  recommendedPlaystyle: z.string().min(1),
  counterPicks: z.array(z.string().min(1)),
  synergyPicks: z.array(z.string().min(1)),
});

export const patchAnalysisSchema = z.object({
  patchId: z.string().min(1),
  patchTitle: z.string().min(1),
  patchDate: z.iso.date(),
  sourceUrl: z.url(),
  overallSummary: z.string().min(1),
  metaSummary: z.string().min(1),
  changes: z.array(heroChangeSchema),
});

export const patchAnalysisInputSchema = patchAnalysisSchema
  .pick({
    patchId: true,
    patchTitle: true,
    patchDate: true,
    sourceUrl: true,
  })
  .extend({
    rawContent: z.string().min(1),
  });

export const patchSummarySchema = patchAnalysisSchema
  .omit({
    changes: true,
  })
  .extend({
    changeCount: z.number().int().nonnegative(),
    highImpactChangeCount: z.number().int().nonnegative(),
  });
