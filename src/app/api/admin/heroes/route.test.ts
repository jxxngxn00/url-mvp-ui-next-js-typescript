import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const mockPrisma = vi.hoisted(() => ({
  hero: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("GET /api/admin/heroes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("관리자용 영웅 목록을 반환한다", async () => {
    vi.mocked(prisma.hero.findMany).mockResolvedValueOnce([
      createHeroFixture({
        heroId: "ana",
        nameKo: "아나",
        nameEn: "Ana",
        role: "SUPPORT",
      }),
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: [
        {
          heroId: "ana",
          nameKo: "아나",
          nameEn: "Ana",
          role: "SUPPORT",
          difficulty: 3,
          imageUrl: "https://example.com/ana.png",
        },
      ],
    });
    expect(prisma.hero.findMany).toHaveBeenCalledWith({
      orderBy: [{ role: "asc" }, { nameKo: "asc" }],
    });
  });
});

function createHeroFixture(
  overrides: Partial<{
    heroId: string;
    nameKo: string;
    nameEn: string;
    role: "TANK" | "DAMAGE" | "SUPPORT";
  }> = {},
) {
  return {
    id: "hero_db_id",
    heroId: "tracer",
    nameKo: "트레이서",
    nameEn: "Tracer",
    role: "DAMAGE" as const,
    difficulty: 3,
    imageUrl: "https://example.com/ana.png",
    createdAt: new Date("2026-07-14T01:00:00.000Z"),
    updatedAt: new Date("2026-07-14T01:00:00.000Z"),
    ...overrides,
  };
}
