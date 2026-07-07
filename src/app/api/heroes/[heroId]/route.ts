import { NextResponse, type NextRequest } from "next/server";
import { heroDetailResponseSchema } from "@/features/heroes/api";
import {
  heroDetailInclude,
  mapHeroToHeroDetail,
} from "@/features/heroes/mapper";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    heroId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { heroId } = await context.params;

  const hero = await prisma.hero.findUnique({
    where: { heroId },
    include: heroDetailInclude,
  });

  if (!hero) {
    return NextResponse.json(
      {
        error: {
          code: "HERO_NOT_FOUND",
          message: "Hero was not found.",
        },
      },
      { status: 404 },
    );
  }

  const response = heroDetailResponseSchema.parse({
    data: mapHeroToHeroDetail(hero),
  });

  return NextResponse.json(response);
}
