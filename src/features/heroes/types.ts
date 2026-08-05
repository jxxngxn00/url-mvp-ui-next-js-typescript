import type { z } from "zod";
import type {
  heroDetailChangeSchema,
  heroDetailSchema,
  heroAdminSchema,
  heroAdminUpdateRequestSchema,
  heroSummarySchema,
  relatedHeroStatSchema,
} from "./schema";

export type HeroSummary = z.infer<typeof heroSummarySchema>;
export type HeroDetailChange = z.infer<typeof heroDetailChangeSchema>;
export type RelatedHeroStat = z.infer<typeof relatedHeroStatSchema>;
export type HeroDetail = z.infer<typeof heroDetailSchema>;
export type HeroAdmin = z.infer<typeof heroAdminSchema>;
export type HeroAdminUpdateRequest = z.infer<
  typeof heroAdminUpdateRequestSchema
>;
