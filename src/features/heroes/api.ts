import { z } from "zod";
import {
  heroAdminSchema,
  heroAdminUpdateRequestSchema,
  heroDetailSchema,
  heroSummarySchema,
} from "./schema";
import type { HeroAdminUpdateRequest } from "./types";

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

export const heroAdminListResponseSchema = z.object({
  data: z.array(heroAdminSchema),
});

export const heroAdminUpdateResponseSchema = z.object({
  data: heroAdminSchema,
});

export type HeroListResponse = z.infer<typeof heroListResponseSchema>;
export type HeroDetailResponse = z.infer<typeof heroDetailResponseSchema>;
export type HeroErrorResponse = z.infer<typeof heroErrorResponseSchema>;
export type HeroAdminListResponse = z.infer<typeof heroAdminListResponseSchema>;
export type HeroAdminUpdateResponse = z.infer<
  typeof heroAdminUpdateResponseSchema
>;

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

export async function fetchHeroList() {
  const response = await fetch("/api/heroes");
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = heroErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Hero list request failed.";

    throw new Error(message);
  }

  return heroListResponseSchema.parse(payload).data;
}

export async function fetchAdminHeroList() {
  const response = await fetch("/api/admin/heroes");
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = heroErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Admin hero list request failed.";

    throw new Error(message);
  }

  return heroAdminListResponseSchema.parse(payload).data;
}

export async function updateAdminHero(
  heroId: string,
  request: HeroAdminUpdateRequest,
) {
  const response = await fetch(`/api/admin/heroes/${encodeURIComponent(heroId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const parsedError = heroErrorResponseSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error.message
      : "Admin hero update request failed.";

    throw new Error(message);
  }

  return heroAdminUpdateResponseSchema.parse(payload).data;
}

export { heroAdminUpdateRequestSchema };
