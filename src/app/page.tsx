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
  PatchListPanel,
  PatchSummaryPanel,
  SideNavigation,
  StateCard,
} from "@/features/patch-analysis/components";
import { fetchPatchAnalysis, fetchPatchList } from "@/features/patch-analysis/api";
import { DEFAULT_PATCH_ID } from "@/features/patch-analysis/constants";
import type {
  ChangeType,
  HeroRole,
  ImpactLevel,
} from "@/features/patch-analysis/types";
import styles from "./page.module.css";
import logoIcon from "./logo_icons.png";

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<HeroRole | "ALL">("ALL");
  const [selectedPatchId, setSelectedPatchId] = useState(DEFAULT_PATCH_ID);
  const [selectedChangeType, setSelectedChangeType] = useState<
    ChangeType | "ALL"
  >("ALL");
  const [selectedImpactLevel, setSelectedImpactLevel] = useState<
    ImpactLevel | "ALL"
  >("ALL");
  const [keyword, setKeyword] = useState("");

  const {
    data: patches = [],
    isLoading: isPatchListLoading,
    isError: isPatchListError,
  } = useQuery({
    queryKey: ["patches"],
    queryFn: fetchPatchList,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patch-analysis", selectedPatchId],
    queryFn: () => fetchPatchAnalysis(selectedPatchId),
  });

  const filteredChanges = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedKeyword = keyword.trim().toLowerCase();

    return data.changes.filter((change) => {
      const matchesRole =
        selectedRole === "ALL" || change.hero.role === selectedRole;
      const matchesChangeType =
        selectedChangeType === "ALL" ||
        change.changeType === selectedChangeType;
      const matchesImpactLevel =
        selectedImpactLevel === "ALL" ||
        change.impactLevel === selectedImpactLevel;
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        change.hero.nameKo.includes(normalizedKeyword) ||
        change.hero.nameEn.toLowerCase().includes(normalizedKeyword);

      return (
        matchesRole &&
        matchesChangeType &&
        matchesImpactLevel &&
        matchesKeyword
      );
    });
  }, [data, keyword, selectedChangeType, selectedImpactLevel, selectedRole]);

  if (isError || isPatchListError) {
    return (
      <StateCard
        description="잠시 후 다시 시도해 주세요."
        title="패치 분석을 불러오지 못했습니다."
      />
    );
  }

  if (isLoading || isPatchListLoading || !data) {
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

        <PatchListPanel
          onPatchSelect={setSelectedPatchId}
          patches={patches}
          selectedPatchId={selectedPatchId}
        />
        <PatchSummaryPanel
          highImpactCount={highImpactChanges.length}
          patch={data}
          status="DB"
        />
        <MetaSummaryPanel summary={data.metaSummary} />
        <PatchFilters
          keyword={keyword}
          onChangeTypeChange={setSelectedChangeType}
          onImpactLevelChange={setSelectedImpactLevel}
          onKeywordChange={setKeyword}
          onRoleChange={setSelectedRole}
          selectedChangeType={selectedChangeType}
          selectedImpactLevel={selectedImpactLevel}
          selectedRole={selectedRole}
        />
        <HeroChangeList changes={filteredChanges} />
      </Box>

      <BottomNavigation />
    </main>
  );
}
