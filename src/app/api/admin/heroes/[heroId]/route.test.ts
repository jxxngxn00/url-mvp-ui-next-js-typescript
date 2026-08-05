import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH } from "./route";

const mockPrisma = vi.hoisted(() => ({
  hero: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("PATCH /api/admin/heroes/[heroId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("영웅 정보를 수정한다", async () => {
    vi.mocked(prisma.hero.findUnique).mockResolvedValueOnce(
      createHeroFixture({ heroId: "ana" }),
    );
    vi.mocked(prisma.hero.update).mockResolvedValueOnce(
      createHeroFixture({
        heroId: "ana",
        nameKo: "아나",
        difficulty: 4,
      }),
    );

    const response = await PATCH(
      new Request("http://localhost/api/admin/heroes/ana", {
        method: "PATCH",
        body: JSON.stringify({
          nameKo: "아나",
          difficulty: 4,
        }),
      }),
      createRouteContext("ana"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      data: {
        heroId: "ana",
        nameKo: "아나",
        difficulty: 4,
      },
    });
    expect(prisma.hero.update).toHaveBeenCalledWith({
      where: { heroId: "ana" },
      data: {
        nameKo: "아나",
        difficulty: 4,
      },
    });
  });

  it("요청 payload가 유효하지 않으면 400을 반환한다", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/heroes/ana", {
        method: "PATCH",
        body: JSON.stringify({
          difficulty: -1,
        }),
      }),
      createRouteContext("ana"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: {
        code: "INVALID_HERO_UPDATE_REQUEST",
      },
    });
    expect(prisma.hero.findUnique).not.toHaveBeenCalled();
  });

  it("영웅이 없으면 404를 반환한다", async () => {
    vi.mocked(prisma.hero.findUnique).mockResolvedValueOnce(null);

    const response = await PATCH(
      new Request("http://localhost/api/admin/heroes/unknown", {
        method: "PATCH",
        body: JSON.stringify({
          nameKo: "미확인",
        }),
      }),
      createRouteContext("unknown"),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      error: {
        code: "HERO_NOT_FOUND",
      },
    });
    expect(prisma.hero.update).not.toHaveBeenCalled();
  });
});

function createRouteContext(heroId: string) {
  return {
    params: Promise.resolve({
      heroId,
    }),
  };
}

function createHeroFixture(
  overrides: Partial<{
    heroId: string;
    nameKo: string;
    nameEn: string;
    role: "TANK" | "DAMAGE" | "SUPPORT";
    difficulty: number | null;
    imageUrl: string | null;
  }> = {},
) {
  return {
    id: "hero_db_id",
    heroId: "ana",
    nameKo: "아나",
    nameEn: "Ana",
    role: "SUPPORT" as const,
    difficulty: 3,
    imageUrl: "https://example.com/ana.png",
    createdAt: new Date("2026-07-14T01:00:00.000Z"),
    updatedAt: new Date("2026-07-14T01:00:00.000Z"),
    ...overrides,
  };
}
