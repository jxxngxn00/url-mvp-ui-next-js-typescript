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
import type { ReactNode } from "react";
import styles from "@/app/page.module.css";
import {
  changeTypeColor,
  changeTypeLabel,
  changeTypes,
  impactColor,
  impactLabel,
  impactLevels,
  roleLabel,
  roles,
} from "./constants";
import type {
  ChangeType,
  HeroChange,
  HeroRole,
  ImpactLevel,
  MetaTimelinePatch,
  PatchAnalysis,
  PatchSummary,
} from "./types";

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
          {long ? "PatchSignal" : "PatchSignal"}
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
        <Button component="a" href="#meta-timeline" variant="plain">
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
      <Button component="a" href="#meta-timeline" variant="plain">
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
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <Card className={styles.stateCard} variant="outlined">
        <Stack spacing={1.25}>
          <Typography level="title-md">{title}</Typography>
          {description ? (
            <Typography level="body-sm" textColor="text.tertiary">
              {description}
            </Typography>
          ) : null}
          {action ? <Box className={styles.stateAction}>{action}</Box> : null}
        </Stack>
      </Card>
    </main>
  );
}

export function InlineStateCard({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={styles.inlineStateCard} variant="outlined">
      <Stack spacing={1}>
        <Typography level="title-md">{title}</Typography>
        {description ? (
          <Typography level="body-sm" textColor="text.tertiary">
            {description}
          </Typography>
        ) : null}
        {action ? <Box className={styles.stateAction}>{action}</Box> : null}
      </Stack>
    </Card>
  );
}

export function PatchListPanel({
  patches,
  selectedPatchId,
  onPatchSelect,
}: {
  patches: PatchSummary[];
  selectedPatchId: string;
  onPatchSelect: (patchId: string) => void;
}) {
  return (
    <Card className={styles.patchListPanel} variant="outlined">
      <Stack
        alignItems="center"
        className={styles.panelHeader}
        direction="row"
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography level="title-md">패치 목록</Typography>
          <Typography level="body-sm" textColor="text.tertiary">
            분석된 패치를 선택해 상세 변경사항을 확인하세요.
          </Typography>
        </Box>
        <Chip size="sm" variant="soft">
          {patches.length}건
        </Chip>
      </Stack>

      <Stack className={styles.patchList} component="section" spacing={1}>
        {patches.length === 0 ? (
          <InlineStateCard
            description="패치 분석을 실행하면 이곳에 저장된 패치가 표시됩니다."
            title="아직 분석된 패치가 없습니다."
          />
        ) : (
          patches.map((patch) => {
            const selected = patch.patchId === selectedPatchId;

            return (
              <Button
                className={styles.patchListItem}
                color={selected ? "primary" : "neutral"}
                key={patch.patchId}
                onClick={() => onPatchSelect(patch.patchId)}
                variant={selected ? "soft" : "plain"}
              >
                <Box className={styles.patchListItemBody}>
                  <Stack
                    alignItems="center"
                    className={styles.patchListItemHeader}
                    direction="row"
                    justifyContent="space-between"
                    spacing={1.5}
                  >
                    <Typography level="title-sm">{patch.patchTitle}</Typography>
                    <Typography
                      component="time"
                      dateTime={patch.patchDate}
                      level="body-xs"
                      textColor="text.tertiary"
                    >
                      {patch.patchDate}
                    </Typography>
                  </Stack>
                  <Typography level="body-sm" textColor="text.secondary">
                    {patch.overallSummary}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    <Chip size="sm" variant="soft">
                      변경 {patch.changeCount}
                    </Chip>
                    <Chip color="danger" size="sm" variant="soft">
                      높은 영향 {patch.highImpactChangeCount}
                    </Chip>
                  </Stack>
                </Box>
              </Button>
            );
          })
        )}
      </Stack>
    </Card>
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
        className={styles.panelHeader}
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

export function MetaTimelinePanel({
  patches,
}: {
  patches: MetaTimelinePatch[];
}) {
  const totalEntryCount = patches.reduce(
    (count, patch) => count + patch.entries.length,
    0,
  );

  return (
    <Card className={styles.timelinePanel} id="meta-timeline" variant="outlined">
      <Stack
        alignItems="center"
        className={styles.panelHeader}
        direction="row"
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography level="title-md">메타 타임라인</Typography>
          <Typography level="body-sm" textColor="text.tertiary">
            패치별 메타 영향 흐름을 시간순으로 확인하세요.
          </Typography>
        </Box>
        <Chip size="sm" variant="soft">
          {totalEntryCount}개 변화
        </Chip>
      </Stack>

      {totalEntryCount === 0 ? (
        <InlineStateCard
          description="필터나 검색어를 조정하면 다른 메타 변화가 표시됩니다."
          title="표시할 메타 변화가 없습니다."
        />
      ) : (
        <Stack className={styles.timelineList} component="ol">
          {patches.map((patch) => (
            <Box className={styles.timelinePatch} component="li" key={patch.patchId}>
              <Box className={styles.timelineMarker} />
              <Box className={styles.timelinePatchBody}>
                <Stack
                  alignItems="flex-start"
                  className={styles.panelHeader}
                  direction="row"
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Box className={styles.heroTitleBlock}>
                    <Typography component="h3" level="title-md">
                      {patch.patchTitle}
                    </Typography>
                    <Typography
                      component="time"
                      dateTime={patch.patchDate}
                      level="body-xs"
                      textColor="text.tertiary"
                    >
                      {patch.patchDate}
                    </Typography>
                  </Box>
                  <Chip color="danger" size="sm" variant="soft">
                    높은 영향 {patch.highImpactChangeCount}
                  </Chip>
                </Stack>

                <Typography level="body-sm" textColor="text.secondary">
                  {patch.metaSummary}
                </Typography>

                <Stack className={styles.timelineEntryList} spacing={1}>
                  {patch.entries.map((entry) => (
                    <Sheet
                      className={styles.timelineEntry}
                      key={entry.timelineId}
                      variant="soft"
                    >
                      <Stack
                        alignItems="flex-start"
                        className={styles.heroCardHeader}
                        direction="row"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Box className={styles.heroTitleBlock}>
                          <Typography
                            component="a"
                            href={`/heroes/${entry.hero.heroId}`}
                            level="title-sm"
                          >
                            {entry.hero.nameKo}
                          </Typography>
                          <Typography level="body-xs" textColor="text.tertiary">
                            {entry.hero.nameEn} · {roleLabel[entry.hero.role]}
                          </Typography>
                        </Box>
                        <Stack
                          className={styles.chipRow}
                          direction="row"
                          flexWrap="wrap"
                          gap={0.75}
                        >
                          <Chip
                            color={changeTypeColor[entry.changeType]}
                            size="sm"
                            variant="soft"
                          >
                            {changeTypeLabel[entry.changeType]}
                          </Chip>
                          <Chip
                            color={impactColor[entry.impactLevel]}
                            size="sm"
                            variant="soft"
                          >
                            영향 {impactLabel[entry.impactLevel]}
                          </Chip>
                        </Stack>
                      </Stack>

                      <Typography level="body-sm" textColor="text.secondary">
                        {entry.metaImpact}
                      </Typography>
                    </Sheet>
                  ))}
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}

export function PatchFilters({
  keyword,
  selectedChangeType,
  selectedImpactLevel,
  selectedRole,
  onChangeTypeChange,
  onImpactLevelChange,
  onKeywordChange,
  onRoleChange,
}: {
  keyword: string;
  selectedChangeType: ChangeType | "ALL";
  selectedImpactLevel: ImpactLevel | "ALL";
  selectedRole: HeroRole | "ALL";
  onChangeTypeChange: (changeType: ChangeType | "ALL") => void;
  onImpactLevelChange: (impactLevel: ImpactLevel | "ALL") => void;
  onKeywordChange: (keyword: string) => void;
  onRoleChange: (role: HeroRole | "ALL") => void;
}) {
  return (
    <Box className={styles.toolbar}>
      <FilterGroup label="역할">
        {roles.map((role) => (
          <FilterButton
            key={role.value}
            onClick={() => onRoleChange(role.value)}
            selected={selectedRole === role.value}
          >
            {role.label}
          </FilterButton>
        ))}
      </FilterGroup>

      <FilterGroup label="변경 타입">
        {changeTypes.map((changeType) => (
          <FilterButton
            key={changeType.value}
            onClick={() => onChangeTypeChange(changeType.value)}
            selected={selectedChangeType === changeType.value}
          >
            {changeType.label}
          </FilterButton>
        ))}
      </FilterGroup>

      <FilterGroup label="영향도">
        {impactLevels.map((impactLevel) => (
          <FilterButton
            key={impactLevel.value}
            onClick={() => onImpactLevelChange(impactLevel.value)}
            selected={selectedImpactLevel === impactLevel.value}
          >
            {impactLevel.label}
          </FilterButton>
        ))}
      </FilterGroup>

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

function FilterGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <Stack className={styles.segmentedControl} direction="row" spacing={0.75}>
        {children}
      </Stack>
    </FormControl>
  );
}

function FilterButton({
  children,
  onClick,
  selected,
}: {
  children: ReactNode;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <Button
      color={selected ? "primary" : "neutral"}
      onClick={onClick}
      size="sm"
      variant={selected ? "solid" : "soft"}
    >
      {children}
    </Button>
  );
}

export function HeroChangeList({ changes }: { changes: HeroChange[] }) {
  return (
    <Stack className={styles.cardList} component="section" id="heroes">
      {changes.length === 0 ? (
        <InlineStateCard
          description="역할, 변경 타입, 영향도 또는 검색어를 조정해 주세요."
          title="일치하는 변경사항이 없습니다."
        />
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
          <Box className={styles.heroTitleBlock} minWidth={0}>
            <Typography
              component="a"
              href={`/heroes/${change.hero.heroId}`}
              level="title-lg"
            >
              {change.hero.nameKo}
            </Typography>
            <Typography level="body-sm" textColor="text.tertiary">
              {change.hero.nameEn} · {roleLabel[change.hero.role]}
            </Typography>
          </Box>
        </Stack>

        <Stack className={styles.chipRow} direction="row" flexWrap="wrap" gap={0.75}>
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
