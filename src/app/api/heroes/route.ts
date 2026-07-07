import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { heroListResponseSchema } from "@/features/heroes/api";
import {
  heroSummaryInclude,
  mapHeroToHeroSummary,
} from "@/features/heroes/mapper";
import { heroRoleSchema } from "@/features/patch-analysis/schema";

export async function GET(request: NextRequest) {
  const roleParam = request.nextUrl.searchParams.get("role");
  const parsedRole = roleParam ? heroRoleSchema.safeParse(roleParam) : null;

  if (parsedRole && !parsedRole.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_HERO_ROLE",
          message: "Hero role must be one of TANK, DAMAGE, or SUPPORT.",
        },
      },
      { status: 400 },
    );
  }

  const role = parsedRole?.data;

  const heroes = await prisma.hero.findMany({
    where: role ? { role } : undefined,
    include: heroSummaryInclude,
    orderBy: [{ role: "asc" }, { nameKo: "asc" }],
  });

  const response = heroListResponseSchema.parse({
    data: heroes.map(mapHeroToHeroSummary),
  });

  return NextResponse.json(response);
}
