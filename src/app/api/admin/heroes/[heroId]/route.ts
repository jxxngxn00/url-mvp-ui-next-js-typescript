import { NextResponse } from "next/server";
import {
  heroAdminUpdateRequestSchema,
  heroAdminUpdateResponseSchema,
  heroErrorResponseSchema,
} from "@/features/heroes/api";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    heroId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { heroId } = await context.params;
  const body = await readJson(request);
  const parsedRequest = heroAdminUpdateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_HERO_UPDATE_REQUEST",
      "Hero update request payload is invalid.",
      400,
    );
  }

  const existingHero = await prisma.hero.findUnique({
    where: { heroId },
  });

  if (!existingHero) {
    return errorResponse("HERO_NOT_FOUND", "Hero was not found.", 404);
  }

  try {
    const hero = await prisma.hero.update({
      where: { heroId },
      data: parsedRequest.data,
    });
    const response = heroAdminUpdateResponseSchema.parse({
      data: {
        id: hero.id,
        heroId: hero.heroId,
        nameKo: hero.nameKo,
        nameEn: hero.nameEn,
        role: hero.role,
        difficulty: hero.difficulty,
        imageUrl: hero.imageUrl,
        createdAt: hero.createdAt.toISOString(),
        updatedAt: hero.updatedAt.toISOString(),
      },
    });

    return NextResponse.json(response);
  } catch {
    return errorResponse("HERO_UPDATE_FAILED", "Hero update failed.", 500);
  }
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function errorResponse(code: string, message: string, status: number) {
  const response = heroErrorResponseSchema.parse({
    error: {
      code,
      message,
    },
  });

  return NextResponse.json(response, { status });
}
