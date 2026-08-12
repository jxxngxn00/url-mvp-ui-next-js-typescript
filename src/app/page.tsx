"use client";

import { Box, Button } from "@mui/joy";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BottomNavigation,
  Brand,
  HeroChangeList,
  LoadingScreen,
  MetaSummaryPanel,
  MetaTimelinePanel,
  PatchFilters,
  PatchListPanel,
  PatchSummaryPanel,
  SideNavigation,
  StateCard,
} from "@/features/patch-analysis/components";
import {
  fetchMetaTimeline,
  fetchPatchAnalysis,
  fetchPatchList,
} from "@/features/patch-analysis/api";
import {
  filterHeroChanges,
  filterMetaTimeline,
  type PatchChangeFilters,
} from "@/features/patch-analysis/filters";
import type {
  ChangeType,
  HeroRole,
  ImpactLevel,
} from "@/features/patch-analysis/types";
import styles from "./page.module.css";
import logoIcon from "./logo_icons.png";

export default function Home() {
  const [selectedRole, setSelectedRole] = useState<HeroRole | "ALL">("ALL");
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);
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
    refetch: refetchPatchList,
  } = useQuery({
    queryKey: ["patches"],
    queryFn: fetchPatchList,
  });

  const activePatchId = selectedPatchId ?? patches[0]?.patchId ?? null;

  const {
    data: timeline = [],
    isLoading: isTimelineLoading,
    isError: isTimelineError,
    refetch: refetchTimeline,
  } = useQuery({
    queryKey: ["meta-timeline"],
    queryFn: fetchMetaTimeline,
  });

  const {
    data,
    isLoading,
    isError,
    refetch: refetchPatchAnalysis,
  } = useQuery({
    enabled: activePatchId !== null,
    queryKey: ["patch-analysis", activePatchId],
    queryFn: () => fetchPatchAnalysis(activePatchId as string),
  });

  const selectedFilters = useMemo<PatchChangeFilters>(
    () => ({
      role: selectedRole,
      changeType: selectedChangeType,
      impactLevel: selectedImpactLevel,
      keyword,
    }),
    [keyword, selectedChangeType, selectedImpactLevel, selectedRole],
  );

  const filteredChanges = useMemo(() => {
    if (!data) {
      return [];
    }

    return filterHeroChanges(data.changes, selectedFilters);
  }, [data, selectedFilters]);

  const filteredTimeline = useMemo(() => {
    return filterMetaTimeline(timeline, selectedFilters);
  }, [selectedFilters, timeline]);

  if (isError || isPatchListError || isTimelineError) {
    return (
      <StateCard
        action={
          <Button
            onClick={() => {
              void refetchPatchList();
              void refetchPatchAnalysis();
              void refetchTimeline();
            }}
            size="sm"
            variant="soft"
          >
            다시 시도
          </Button>
        }
        description="잠시 후 다시 시도해 주세요."
        title="패치 분석을 불러오지 못했습니다."
      />
    );
  }

  if (isLoading || isPatchListLoading || isTimelineLoading) {
    return <LoadingScreen logo={logoIcon} />;
  }

  if (patches.length === 0 || activePatchId === null || !data) {
    return <StateCard title="아직 저장된 패치 분석 데이터가 없습니다." />;
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
          selectedPatchId={activePatchId}
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
        <MetaTimelinePanel patches={filteredTimeline} />
        <HeroChangeList changes={filteredChanges} />
      </Box>

      <BottomNavigation />
    </main>
  );
}
