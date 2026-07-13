"use client";

import { Box, Button } from "@mui/joy";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BottomNavigation,
  Brand,
  SideNavigation,
  StateCard,
} from "@/features/patch-analysis/components";
import { fetchHeroDetail } from "@/features/heroes/api";
import { HeroDetailView } from "@/features/heroes/components";
import styles from "@/app/page.module.css";
import logoIcon from "@/app/logo_icons.png";

export default function HeroDetailPage() {
  const params = useParams<{ heroId: string }>();
  const heroId = params.heroId;

  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ["hero-detail", heroId],
    queryFn: () => fetchHeroDetail(heroId),
  });

  if (isError) {
    return (
      <StateCard
        action={
          <Button
            onClick={() => {
              void refetch();
            }}
            size="sm"
            variant="soft"
          >
            다시 시도
          </Button>
        }
        description="영웅 ID를 확인하거나 잠시 후 다시 시도해 주세요."
        title="영웅 정보를 불러오지 못했습니다."
      />
    );
  }

  if (isLoading || !data) {
    return <StateCard title="영웅 정보를 불러오는 중입니다." />;
  }

  return (
    <main className={styles.page}>
      <SideNavigation logo={logoIcon} />

      <Box className={styles.content}>
        <header className={styles.mobileHeader}>
          <Brand logo={logoIcon} />
        </header>

        <HeroDetailView hero={data} />
      </Box>

      <BottomNavigation />
    </main>
  );
}
