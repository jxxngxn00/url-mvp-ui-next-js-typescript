import { z } from "zod";
import { heroDetailSchema, heroSummarySchema } from "./schema";

export const heroListResponseSchema = z.object({
  data: z.array(heroSummarySchema),
});

export const heroDetailResponseSchema = z.object({
  data: heroDetailSchema,
});

export const heroErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type HeroListResponse = z.infer<typeof heroListResponseSchema>;
export type HeroDetailResponse = z.infer<typeof heroDetailResponseSchema>;
export type HeroErrorResponse = z.infer<typeof heroErrorResponseSchema>;

export async function fetchHeroDetail(heroId: string) {
  const response = await fetch(`/api/heroes/${encodeURIComponent(heroId)}`);
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = heroErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Hero detail request failed.";

    throw new Error(message);
  }

  return heroDetailResponseSchema.parse(payload).data;
}
