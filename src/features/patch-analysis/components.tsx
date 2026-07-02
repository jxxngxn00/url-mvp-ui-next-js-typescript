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
import Image, { type StaticImageData } from "next/image";
import styles from "@/app/page.module.css";
import {
  changeTypeColor,
  changeTypeLabel,
  impactColor,
  impactLabel,
  roleLabel,
  roles,
} from "./constants";
import type { HeroChange, HeroRole, PatchAnalysis } from "./types";

export function Brand({
  logo,
  long = false,
}: {
  logo: StaticImageData;
  long?: boolean;
}) {
  return (
    <Stack alignItems="center" direction="row" spacing={1.25}>
      <Box className={styles.brandMark}>
        <Image alt="Overwatch Logo" src={logo} />
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

export function SideNavigation({ logo }: { logo: StaticImageData }) {
  return (
    <Sheet className={styles.sidebar} component="aside">
      <Brand logo={logo} long />
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
  );
}

export function BottomNavigation() {
  return (
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
  );
}

export function StateCard({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <main className={styles.page}>
      <Card className={styles.stateCard}>
        <Typography level="title-md">{title}</Typography>
        {description ? (
          <Typography level="body-sm" textColor="text.tertiary">
            {description}
          </Typography>
        ) : null}
      </Card>
    </main>
  );
}

export function PatchSummaryPanel({
  patch,
  highImpactCount,
  status,
}: {
  patch: PatchAnalysis;
  highImpactCount: number;
  status: string;
}) {
  return (
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
        <Typography component="time" dateTime={patch.patchDate} level="body-sm">
          {patch.patchDate}
        </Typography>
      </Stack>

      <Box className={styles.summaryGrid}>
        <Stack spacing={1.5}>
          <Typography component="h1" level="h1">
            {patch.patchTitle}
          </Typography>
          <Typography level="body-md" textColor="text.secondary">
            {patch.overallSummary}
          </Typography>
          <Button
            component="a"
            href={patch.sourceUrl}
            size="sm"
            sx={{ alignSelf: "flex-start" }}
            variant="soft"
          >
            원문 패치노트 보기
          </Button>
        </Stack>

        <Box className={styles.stats}>
          <StatCard label="변경 영웅" value={patch.changes.length} />
          <StatCard label="높은 영향" value={highImpactCount} />
          <StatCard label="분석 상태" value={status} />
        </Box>
      </Box>
    </Card>
  );
}

export function MetaSummaryPanel({ summary }: { summary: string }) {
  return (
    <Card className={styles.metaPanel} id="meta" variant="outlined">
      <Typography level="title-sm" textColor="primary.600">
        메타 요약
      </Typography>
      <Typography level="body-md" textColor="text.secondary">
        {summary}
      </Typography>
    </Card>
  );
}

export function PatchFilters({
  keyword,
  selectedRole,
  onKeywordChange,
  onRoleChange,
}: {
  keyword: string;
  selectedRole: HeroRole | "ALL";
  onKeywordChange: (keyword: string) => void;
  onRoleChange: (role: HeroRole | "ALL") => void;
}) {
  return (
    <Box className={styles.toolbar}>
      <Stack className={styles.segmentedControl} direction="row" spacing={0.75}>
        {roles.map((role) => (
          <Button
            color={selectedRole === role.value ? "primary" : "neutral"}
            key={role.value}
            onClick={() => onRoleChange(role.value)}
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
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="예: 소전, Ana"
          type="search"
          value={keyword}
        />
      </FormControl>
    </Box>
  );
}

export function HeroChangeList({ changes }: { changes: HeroChange[] }) {
  return (
    <Stack className={styles.cardList} component="section" id="heroes">
      {changes.length === 0 ? (
        <Card variant="outlined">
          <Typography level="title-md">일치하는 변경사항이 없습니다.</Typography>
          <Typography level="body-sm" textColor="text.tertiary">
            역할 필터나 검색어를 조정해 주세요.
          </Typography>
        </Card>
      ) : (
        changes.map((change) => (
          <HeroChangeCard change={change} key={change.changeId} />
        ))
      )}
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
