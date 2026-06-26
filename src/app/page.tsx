"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import styles from "./page.module.css";

type HeroRole = "TANK" | "DAMAGE" | "SUPPORT";
type ChangeType = "BUFF" | "NERF" | "ADJUSTMENT" | "BUG_FIX";
type ImpactLevel = "LOW" | "MEDIUM" | "HIGH";

type HeroInfo = {
  heroId: string;
  nameKo: string;
  nameEn: string;
  role: HeroRole;
};

type HeroChange = {
  changeId: string;
  hero: HeroInfo;
  changeType: ChangeType;
  impactLevel: ImpactLevel;
  originalChange: string;
  simpleSummary: string;
  metaImpact: string;
  affectedTiers: string[];
  recommendedPlaystyle: string;
  counterPicks: string[];
  synergyPicks: string[];
};

type PatchAnalysis = {
  patchId: string;
  patchTitle: string;
  patchDate: string;
  sourceUrl: string;
  overallSummary: string;
  metaSummary: string;
  changes: HeroChange[];
};

const patchAnalysis: PatchAnalysis = {
  patchId: "ow2-2026-06-sample",
  patchTitle: "시즌 중반 밸런스 패치 샘플",
  patchDate: "2026-06-20",
  sourceUrl: "https://overwatch.blizzard.com/patch-notes/",
  overallSummary:
    "탱커 유지력은 낮추고, 교전 개시형 딜러와 보호형 지원가의 선택지를 넓히는 방향의 패치입니다.",
  metaSummary:
    "러시 조합은 진입 타이밍 관리가 더 중요해졌고, 포킹 조합은 중거리 압박을 안정적으로 이어갈 수 있습니다.",
  changes: [
    {
      changeId: "chg-reinhardt-01",
      hero: {
        heroId: "reinhardt",
        nameKo: "라인하르트",
        nameEn: "Reinhardt",
        role: "TANK",
      },
      changeType: "NERF",
      impactLevel: "MEDIUM",
      originalChange: "방벽 방패 내구도가 감소했습니다.",
      simpleSummary: "장시간 대치 능력이 줄어들었습니다.",
      metaImpact:
        "라인하르트 중심 러시는 여전히 가능하지만, 방벽으로 천천히 전진하는 운영은 더 큰 리스크를 가집니다.",
      affectedTiers: ["Gold", "Platinum", "Diamond"],
      recommendedPlaystyle:
        "방벽을 아끼며 코너를 활용하고, 루시우 속도 증가나 메이 벽처럼 진입을 보장하는 자원과 함께 움직이세요.",
      counterPicks: ["바스티온", "젠야타"],
      synergyPicks: ["루시우", "메이"],
    },
    {
      changeId: "chg-sojourn-01",
      hero: {
        heroId: "sojourn",
        nameKo: "소전",
        nameEn: "Sojourn",
        role: "DAMAGE",
      },
      changeType: "BUFF",
      impactLevel: "HIGH",
      originalChange: "레일건 보조 발사 충전 유지 시간이 증가했습니다.",
      simpleSummary: "킬 결정력을 더 오래 유지할 수 있습니다.",
      metaImpact:
        "중거리 포킹과 고지대 장악 가치가 상승하며, 소전이 교전 시작 전부터 압박을 누적하기 쉬워졌습니다.",
      affectedTiers: ["Platinum", "Diamond", "Master+"],
      recommendedPlaystyle:
        "고지대에서 충전을 보존한 뒤, 상대 지원가가 이동기를 사용한 직후 보조 발사로 마무리를 노리세요.",
      counterPicks: ["윈스턴", "솜브라"],
      synergyPicks: ["메르시", "키리코"],
    },
    {
      changeId: "chg-ana-01",
      hero: {
        heroId: "ana",
        nameKo: "아나",
        nameEn: "Ana",
        role: "SUPPORT",
      },
      changeType: "ADJUSTMENT",
      impactLevel: "MEDIUM",
      originalChange: "생체 수류탄 회복량은 감소하고 피해량은 증가했습니다.",
      simpleSummary: "수비형 회복보다 공격적 변수 창출에 무게가 실렸습니다.",
      metaImpact:
        "아나는 여전히 강력한 유틸리티 지원가지만, 팀 생존을 혼자 버티는 능력은 조금 낮아졌습니다.",
      affectedTiers: ["Silver", "Gold", "Platinum", "Diamond"],
      recommendedPlaystyle:
        "수류탄을 아군 회복용으로만 쓰기보다, 상대 탱커가 방어 자원을 소모한 순간 공격적으로 던지세요.",
      counterPicks: ["트레이서", "키리코"],
      synergyPicks: ["윈스턴", "겐지"],
    },
  ],
};

const roles: Array<{ label: string; value: HeroRole | "ALL" }> = [
  { label: "전체", value: "ALL" },
  { label: "탱커", value: "TANK" },
  { label: "공격", value: "DAMAGE" },
  { label: "지원", value: "SUPPORT" },
];

const changeTypeLabel: Record<ChangeType, string> = {
  BUFF: "상향",
  NERF: "하향",
  ADJUSTMENT: "조정",
  BUG_FIX: "버그 수정",
};

const impactLabel: Record<ImpactLevel, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

const roleLabel: Record<HeroRole, string> = {
  TANK: "탱커",
  DAMAGE: "공격",
  SUPPORT: "지원",
};

const changeTypeColor: Record<
  ChangeType,
  "success" | "danger" | "primary" | "neutral"
> = {
  BUFF: "success",
  NERF: "danger",
  ADJUSTMENT: "primary",
  BUG_FIX: "neutral",
};

const impactColor: Record<ImpactLevel, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

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
      <main className={styles.page}>
        <Card className={styles.stateCard}>
          <Typography level="title-md">패치 분석을 불러오지 못했습니다.</Typography>
          <Typography level="body-sm" textColor="text.tertiary">
            잠시 후 다시 시도해 주세요.
          </Typography>
        </Card>
      </main>
    );
  }

  if (isLoading || !data) {
    return (
      <main className={styles.page}>
        <Card className={styles.stateCard}>
          <Typography level="title-md">패치 분석을 불러오는 중입니다.</Typography>
        </Card>
      </main>
    );
  }

  const highImpactChanges = data.changes.filter(
    (change) => change.impactLevel === "HIGH",
  );

  return (
    <main className={styles.page}>
      <Sheet className={styles.sidebar} component="aside">
        <Brand long />
        <Stack className={styles.nav} component="nav" spacing={0.75}>
          <Button aria-current="page" component="a" href="#patches" variant="soft">
            패치노트
          </Button>
          <Button component="a" href="#heroes" variant="plain">
            영웅 분석
          </Button>
          <Button component="a" href="#meta" variant="plain">
            메타 타임라인
          </Button>
          <Button component="a" href="#search" variant="plain">
            검색
          </Button>
        </Stack>
      </Sheet>

      <Box className={styles.content}>
        <header className={styles.mobileHeader}>
          <Brand />
        </header>

        <Card className={styles.summaryPanel} id="patches" variant="outlined">
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
            spacing={2}
          >
            <Chip color="primary" size="sm" variant="soft">
              최신 분석
            </Chip>
            <Typography component="time" dateTime={data.patchDate} level="body-sm">
              {data.patchDate}
            </Typography>
          </Stack>

          <Box className={styles.summaryGrid}>
            <Stack spacing={1.5}>
              <Typography component="h1" level="h1">
                {data.patchTitle}
              </Typography>
              <Typography level="body-md" textColor="text.secondary">
                {data.overallSummary}
              </Typography>
              <Button
                component="a"
                href={data.sourceUrl}
                size="sm"
                sx={{ alignSelf: "flex-start" }}
                variant="soft"
              >
                원문 패치노트 보기
              </Button>
            </Stack>

            <Box className={styles.stats}>
              <StatCard label="변경 영웅" value={data.changes.length} />
              <StatCard label="높은 영향" value={highImpactChanges.length} />
              <StatCard label="분석 상태" value="Mock" />
            </Box>
          </Box>
        </Card>

        <Card className={styles.metaPanel} id="meta" variant="outlined">
          <Typography level="title-sm" textColor="primary.600">
            메타 요약
          </Typography>
          <Typography level="body-md" textColor="text.secondary">
            {data.metaSummary}
          </Typography>
        </Card>

        <Box className={styles.toolbar}>
          <Stack
            className={styles.segmentedControl}
            direction="row"
            spacing={0.75}
          >
            {roles.map((role) => (
              <Button
                color={selectedRole === role.value ? "primary" : "neutral"}
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                size="sm"
                variant={selectedRole === role.value ? "solid" : "soft"}
              >
                {role.label}
              </Button>
            ))}
          </Stack>

          <FormControl id="search">
            <FormLabel>영웅 검색</FormLabel>
            <Input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="예: 소전, Ana"
              type="search"
              value={keyword}
            />
          </FormControl>
        </Box>

        <Stack className={styles.cardList} component="section" id="heroes">
          {filteredChanges.length === 0 ? (
            <Card variant="outlined">
              <Typography level="title-md">일치하는 변경사항이 없습니다.</Typography>
              <Typography level="body-sm" textColor="text.tertiary">
                역할 필터나 검색어를 조정해 주세요.
              </Typography>
            </Card>
          ) : (
            filteredChanges.map((change) => (
              <HeroChangeCard change={change} key={change.changeId} />
            ))
          )}
        </Stack>
      </Box>

      <Sheet className={styles.bottomNav} component="nav" variant="outlined">
        <Button aria-current="page" component="a" href="#patches" variant="solid">
          패치
        </Button>
        <Button component="a" href="#heroes" variant="plain">
          영웅
        </Button>
        <Button component="a" href="#meta" variant="plain">
          메타
        </Button>
        <Button component="a" href="#search" variant="plain">
          검색
        </Button>
      </Sheet>
    </main>
  );
}

function Brand({ long = false }: { long?: boolean }) {
  return (
    <Stack alignItems="center" direction="row" spacing={1.25}>
      <Box className={styles.brandMark}>
        <img alt="Overwatch Logo" src="/logo_icons.png" />
      </Box>
      <Box>
        <Typography level="title-sm">
          {long ? "Overwatch Patch Insight" : "Patch Insight"}
        </Typography>
        {long ? (
          <Typography level="body-xs" textColor="text.tertiary">
            Patch analysis MVP
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Sheet className={styles.statCard} variant="soft">
      <Typography level="body-xs" textColor="text.tertiary">
        {label}
      </Typography>
      <Typography level="h3">{value}</Typography>
    </Sheet>
  );
}

function HeroChangeCard({ change }: { change: HeroChange }) {
  return (
    <Card className={styles.heroCard} variant="outlined">
      <Stack
        alignItems="flex-start"
        direction={{ sm: "row" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Stack alignItems="center" direction="row" minWidth={0} spacing={1.5}>
          <Box className={styles.heroAvatar}>{change.hero.nameKo.slice(0, 1)}</Box>
          <Box minWidth={0}>
            <Typography level="title-lg">{change.hero.nameKo}</Typography>
            <Typography level="body-sm" textColor="text.tertiary">
              {change.hero.nameEn} · {roleLabel[change.hero.role]}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          <Chip color={changeTypeColor[change.changeType]} size="sm" variant="soft">
            {changeTypeLabel[change.changeType]}
          </Chip>
          <Chip color={impactColor[change.impactLevel]} size="sm" variant="soft">
            영향 {impactLabel[change.impactLevel]}
          </Chip>
        </Stack>
      </Stack>

      <Divider />

      <Box className={styles.changeBody}>
        <AnalysisBlock label="원문 변경" value={change.originalChange} />
        <AnalysisBlock label="핵심 해석" value={change.simpleSummary} />
        <AnalysisBlock label="메타 영향" value={change.metaImpact} />
        <AnalysisBlock label="추천 플레이스타일" value={change.recommendedPlaystyle} />
      </Box>

      <Box className={styles.cardFooter}>
        <MiniSummary label="영향 티어" value={change.affectedTiers.join(", ")} />
        <MiniSummary label="시너지" value={change.synergyPicks.join(", ")} />
        <MiniSummary label="주의 상대" value={change.counterPicks.join(", ")} />
      </Box>
    </Card>
  );
}

function AnalysisBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography level="body-xs" textColor="text.tertiary">
        {label}
      </Typography>
      <Typography level="body-sm" textColor="text.secondary">
        {value}
      </Typography>
    </Box>
  );
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <Sheet className={styles.miniSummary} variant="soft">
      <Typography level="body-xs" textColor="text.tertiary">
        {label}
      </Typography>
      <Typography level="body-sm">{value}</Typography>
    </Sheet>
  );
}
