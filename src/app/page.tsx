"use client";

import { Box } from "@mui/joy";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BottomNavigation,
  Brand,
  HeroChangeList,
  MetaSummaryPanel,
  PatchFilters,
  PatchSummaryPanel,
  SideNavigation,
  StateCard,
} from "@/features/patch-analysis/components";
import { patchAnalysis } from "@/features/patch-analysis/mock";
import type { HeroRole } from "@/features/patch-analysis/types";
import styles from "./page.module.css";
import logoIcon from "./logo_icons.png";

async function getPatchAnalysis() {
  return patchAnalysis;
}

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<HeroRole | "ALL">("ALL");
  const [keyword, setKeyword] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patch-analysis", patchAnalysis.patchId],
    queryFn: getPatchAnalysis,
  });

  const filteredChanges = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedKeyword = keyword.trim().toLowerCase();

    return data.changes.filter((change) => {
      const matchesRole =
        selectedRole === "ALL" || change.hero.role === selectedRole;
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        change.hero.nameKo.includes(normalizedKeyword) ||
        change.hero.nameEn.toLowerCase().includes(normalizedKeyword);

      return matchesRole && matchesKeyword;
    });
  }, [data, keyword, selectedRole]);

  if (isError) {
    return (
      <StateCard
        description="잠시 후 다시 시도해 주세요."
        title="패치 분석을 불러오지 못했습니다."
      />
    );
  }

  if (isLoading || !data) {
    return <StateCard title="패치 분석을 불러오는 중입니다." />;
  }

  const highImpactChanges = data.changes.filter(
    (change) => change.impactLevel === "HIGH",
  );

  return (
    <main className={styles.page}>
      <SideNavigation logo={logoIcon} />

      <Box className={styles.content}>
        <header className={styles.mobileHeader}>
          <Brand logo={logoIcon} />
        </header>

        <PatchSummaryPanel
          highImpactCount={highImpactChanges.length}
          patch={data}
          status="Mock"
        />
        <MetaSummaryPanel summary={data.metaSummary} />
        <PatchFilters
          keyword={keyword}
          onKeywordChange={setKeyword}
          onRoleChange={setSelectedRole}
          selectedRole={selectedRole}
        />
        <HeroChangeList changes={filteredChanges} />
      </Box>

      <BottomNavigation />
    </main>
  );
}
