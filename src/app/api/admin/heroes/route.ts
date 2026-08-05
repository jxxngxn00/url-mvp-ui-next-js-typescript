import { NextResponse } from "next/server";
import { heroAdminListResponseSchema } from "@/features/heroes/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const heroes = await prisma.hero.findMany({
    orderBy: [{ role: "asc" }, { nameKo: "asc" }],
  });
  const response = heroAdminListResponseSchema.parse({
    data: heroes.map((hero) => ({
      id: hero.id,
      heroId: hero.heroId,
      nameKo: hero.nameKo,
      nameEn: hero.nameEn,
      role: hero.role,
      difficulty: hero.difficulty,
      imageUrl: hero.imageUrl,
      createdAt: hero.createdAt.toISOString(),
      updatedAt: hero.updatedAt.toISOString(),
    })),
  });

  return NextResponse.json(response);
}
