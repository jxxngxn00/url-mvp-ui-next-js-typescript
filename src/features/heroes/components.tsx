import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import styles from "@/app/page.module.css";
import { InlineStateCard } from "@/features/patch-analysis/components";
import {
  changeTypeColor,
  changeTypeLabel,
  impactColor,
  impactLabel,
  roleLabel,
} from "@/features/patch-analysis/constants";
import type {
  HeroDetail,
  HeroDetailChange,
  RelatedHeroStat,
} from "./types";

export function HeroDetailView({ hero }: { hero: HeroDetail }) {
  return (
    <Stack spacing={1.5}>
      <HeroHeader hero={hero} />
      <HeroRelationPanel
        counters={hero.frequentCounters}
        synergies={hero.frequentSynergies}
      />
      <HeroChangeHistory changes={hero.changes} />
    </Stack>
  );
}

function HeroHeader({ hero }: { hero: HeroDetail }) {
  return (
    <Card className={styles.heroDetailHeroPanel} variant="outlined">
      <Stack
        alignItems="flex-start"
        className={styles.heroDetailHeader}
        direction={{ sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Stack alignItems="center" direction="row" minWidth={0} spacing={1.5}>
          <Box className={styles.heroDetailAvatar}>
            {hero.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" src={hero.imageUrl} />
            ) : (
              hero.nameKo.slice(0, 1)
            )}
          </Box>
          <Box className={styles.heroTitleBlock} minWidth={0}>
            <Typography component="h1" level="h1">
              {hero.nameKo}
            </Typography>
            <Typography level="body-md" textColor="text.secondary">
              {hero.nameEn} · {roleLabel[hero.role]}
            </Typography>
          </Box>
        </Stack>

        <Button component="a" href="/" size="sm" variant="soft">
          패치 목록으로
        </Button>
      </Stack>

      <Box className={styles.heroDetailStats}>
        <HeroStat label="변경 수" value={hero.changeCount} />
        <HeroStat label="높은 영향" value={hero.highImpactChangeCount} />
        <HeroStat label="최근 패치" value={hero.latestPatchDate ?? "-"} />
        <HeroStat label="난이도" value={hero.difficulty ?? "-"} />
      </Box>
    </Card>
  );
}

function HeroRelationPanel({
  counters,
  synergies,
}: {
  counters: RelatedHeroStat[];
  synergies: RelatedHeroStat[];
}) {
  return (
    <Box className={styles.heroRelationGrid}>
      <RelatedHeroList label="자주 맞는 시너지" heroes={synergies} />
      <RelatedHeroList label="자주 언급된 주의 상대" heroes={counters} />
    </Box>
  );
}

function RelatedHeroList({
  heroes,
  label,
}: {
  heroes: RelatedHeroStat[];
  label: string;
}) {
  return (
    <Card className={styles.relationCard} variant="outlined">
      <Typography level="title-md">{label}</Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.25 }}>
        {heroes.length === 0 ? (
          <Typography level="body-sm" textColor="text.tertiary">
            아직 누적된 데이터가 없습니다.
          </Typography>
        ) : (
          heroes.map((hero) => (
            <Chip
              component="a"
              href={`/heroes/${hero.heroId}`}
              key={hero.heroId}
              size="sm"
              variant="soft"
            >
              {hero.nameKo} {hero.count}
            </Chip>
          ))
        )}
      </Stack>
    </Card>
  );
}

function HeroChangeHistory({ changes }: { changes: HeroDetailChange[] }) {
  return (
    <Stack className={styles.cardList} component="section" id="changes">
      {changes.length === 0 ? (
        <InlineStateCard
          description="이 영웅이 포함된 패치 분석이 저장되면 변경 이력이 표시됩니다."
          title="아직 기록된 변경사항이 없습니다."
        />
      ) : (
        changes.map((change) => (
          <HeroDetailChangeCard change={change} key={change.changeId} />
        ))
      )}
    </Stack>
  );
}

function HeroDetailChangeCard({ change }: { change: HeroDetailChange }) {
  return (
    <Card className={styles.heroCard} variant="outlined">
      <Stack
        alignItems="flex-start"
        className={styles.heroCardHeader}
        direction={{ sm: "row" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box className={styles.heroTitleBlock}>
          <Typography level="title-lg">{change.patchTitle}</Typography>
          <Typography
            component="time"
            dateTime={change.patchDate}
            level="body-sm"
            textColor="text.tertiary"
          >
            {change.patchDate}
          </Typography>
        </Box>
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

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <Sheet className={styles.statCard} variant="soft">
      <Typography level="body-xs" textColor="text.tertiary">
        {label}
      </Typography>
      <Typography level="h3">{value}</Typography>
    </Sheet>
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
      <Typography level="body-sm">{value || "-"}</Typography>
    </Sheet>
  );
}
