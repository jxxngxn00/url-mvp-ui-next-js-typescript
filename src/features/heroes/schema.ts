import { z } from "zod";
import {
  changeTypeSchema,
  heroInfoSchema,
  heroRoleSchema,
  impactLevelSchema,
} from "@/features/patch-analysis/schema";

export const heroSummarySchema = z.object({
  heroId: z.string().min(1),
  nameKo: z.string().min(1),
  nameEn: z.string().min(1),
  role: heroRoleSchema,
  difficulty: z.number().int().nonnegative().nullable(),
  imageUrl: z.url().nullable(),
  changeCount: z.number().int().nonnegative(),
  highImpactChangeCount: z.number().int().nonnegative(),
  latestPatchDate: z.iso.date().nullable(),
});

export const heroAdminSchema = z.object({
  id: z.string().min(1),
  heroId: z.string().min(1),
  nameKo: z.string().min(1),
  nameEn: z.string().min(1),
  role: heroRoleSchema,
  difficulty: z.number().int().nonnegative().nullable(),
  imageUrl: z.url().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const heroAdminUpdateRequestSchema = z.object({
  heroId: z.string().min(1).optional(),
  nameKo: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  role: heroRoleSchema.optional(),
  difficulty: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.url().nullable().optional(),
});

export const heroDetailChangeSchema = z.object({
  changeId: z.string().min(1),
  patchId: z.string().min(1),
  patchTitle: z.string().min(1),
  patchDate: z.iso.date(),
  sourceUrl: z.url(),
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

export const relatedHeroStatSchema = heroInfoSchema.extend({
  count: z.number().int().positive(),
});

export const heroDetailSchema = heroSummarySchema.extend({
  changes: z.array(heroDetailChangeSchema),
  frequentSynergies: z.array(relatedHeroStatSchema),
  frequentCounters: z.array(relatedHeroStatSchema),
});
