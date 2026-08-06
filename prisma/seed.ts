import { HeroRole, PrismaClient } from "../src/generated/prisma/client";
import { createPrismaAdapter } from "../src/lib/prisma-adapter";

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

const heroes = [
  { heroId: "reinhardt", nameKo: "라인하르트", nameEn: "Reinhardt", role: HeroRole.TANK },
  { heroId: "winston", nameKo: "윈스턴", nameEn: "Winston", role: HeroRole.TANK },
  { heroId: "bastion", nameKo: "바스티온", nameEn: "Bastion", role: HeroRole.DAMAGE },
  { heroId: "genji", nameKo: "겐지", nameEn: "Genji", role: HeroRole.DAMAGE },
  { heroId: "mei", nameKo: "메이", nameEn: "Mei", role: HeroRole.DAMAGE },
  { heroId: "sojourn", nameKo: "소전", nameEn: "Sojourn", role: HeroRole.DAMAGE },
  { heroId: "sombra", nameKo: "솜브라", nameEn: "Sombra", role: HeroRole.DAMAGE },
  { heroId: "tracer", nameKo: "트레이서", nameEn: "Tracer", role: HeroRole.DAMAGE },
  { heroId: "ana", nameKo: "아나", nameEn: "Ana", role: HeroRole.SUPPORT },
  { heroId: "kiriko", nameKo: "키리코", nameEn: "Kiriko", role: HeroRole.SUPPORT },
  { heroId: "lucio", nameKo: "루시우", nameEn: "Lucio", role: HeroRole.SUPPORT },
  { heroId: "mercy", nameKo: "메르시", nameEn: "Mercy", role: HeroRole.SUPPORT },
  { heroId: "zenyatta", nameKo: "젠야타", nameEn: "Zenyatta", role: HeroRole.SUPPORT },
];

async function main() {
  for (const hero of heroes) {
    await prisma.hero.upsert({
      where: { heroId: hero.heroId },
      update: hero,
      create: hero,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
