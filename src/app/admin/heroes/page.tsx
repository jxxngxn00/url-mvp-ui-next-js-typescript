"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Stack,
  Typography,
} from "@mui/joy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Brand,
  InlineStateCard,
  StateCard,
} from "@/features/patch-analysis/components";
import { roleLabel, roles } from "@/features/patch-analysis/constants";
import type { HeroRole } from "@/features/patch-analysis/types";
import { fetchAdminHeroList, updateAdminHero } from "@/features/heroes/api";
import type {
  HeroAdmin,
  HeroAdminUpdateRequest,
} from "@/features/heroes/types";
import styles from "@/app/page.module.css";
import logoIcon from "@/app/logo_icons.png";

type HeroRoleFilter = HeroRole | "ALL";

type HeroDraft = {
  heroId: string;
  nameKo: string;
  nameEn: string;
  role: HeroRole;
  difficulty: string;
  imageUrl: string;
};

export default function AdminHeroesPage() {
  const [roleFilter, setRoleFilter] = useState<HeroRoleFilter>("ALL");
  const [keyword, setKeyword] = useState("");
  const {
    data: heroes = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-heroes"],
    queryFn: fetchAdminHeroList,
  });

  const filteredHeroes = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();

    return heroes.filter((hero) => {
      const matchesRole = roleFilter === "ALL" || hero.role === roleFilter;
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        hero.heroId.toLocaleLowerCase().includes(normalizedKeyword) ||
        hero.nameKo.toLocaleLowerCase().includes(normalizedKeyword) ||
        hero.nameEn.toLocaleLowerCase().includes(normalizedKeyword);

      return matchesRole && matchesKeyword;
    });
  }, [heroes, keyword, roleFilter]);

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
        description="관리자 영웅 데이터를 불러오지 못했습니다."
        title="영웅 DB 화면을 열 수 없습니다."
      />
    );
  }

  return (
    <main className={`${styles.page} ${styles.adminPage}`}>
      <Box className={styles.adminContent}>
        <header className={styles.adminHeader}>
          <Brand logo={logoIcon} long />
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Button
              component="a"
              href="/admin/patch-notes"
              size="sm"
              variant="soft"
            >
              패치 업데이트
            </Button>
            <Button component="a" href="/" size="sm" variant="soft">
              앱으로 돌아가기
            </Button>
          </Stack>
        </header>

        <Card className={styles.adminHeroPanel} variant="outlined">
          <Stack
            alignItems="flex-start"
            className={styles.panelHeader}
            direction="row"
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography component="h1" level="h2">
                영웅 DB
              </Typography>
              <Typography level="body-sm" textColor="text.secondary">
                패치 분석과 staging 매칭에 사용하는 영웅 기준 데이터를 관리합니다.
              </Typography>
            </Box>
            <Chip color="primary" size="sm" variant="soft">
              {heroes.length}명
            </Chip>
          </Stack>

          <Box className={styles.adminHeroToolbar}>
            <FormControl>
              <FormLabel>역할</FormLabel>
              <Select
                onChange={(_event, value) =>
                  setRoleFilter(value ?? "ALL")
                }
                value={roleFilter}
              >
                {roles.map((role) => (
                  <Option key={role.value} value={role.value}>
                    {role.label}
                  </Option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>검색</FormLabel>
              <Input
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="영웅 ID, 한글명, 영문명"
                value={keyword}
              />
            </FormControl>
          </Box>
        </Card>

        {isLoading ? (
          <Card className={styles.adminHeroManagerPanel} variant="outlined">
            <InlineStateCard title="영웅 목록을 불러오는 중입니다." />
          </Card>
        ) : filteredHeroes.length === 0 ? (
          <Card className={styles.adminHeroManagerPanel} variant="outlined">
            <InlineStateCard
              description="필터나 검색어를 조정해 보세요."
              title="조건에 맞는 영웅이 없습니다."
            />
          </Card>
        ) : (
          <Box className={styles.adminHeroGrid}>
            {filteredHeroes.map((hero) => (
              <HeroAdminCard hero={hero} key={`${hero.id}:${hero.updatedAt}`} />
            ))}
          </Box>
        )}
      </Box>
    </main>
  );
}

function HeroAdminCard({ hero }: { hero: HeroAdmin }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => createHeroDraft(hero));

  const updateMutation = useMutation({
    mutationFn: (request: HeroAdminUpdateRequest) =>
      updateAdminHero(hero.heroId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-heroes"] });
      void queryClient.invalidateQueries({ queryKey: ["heroes"] });
      void queryClient.invalidateQueries({ queryKey: ["patches"] });
      void queryClient.invalidateQueries({ queryKey: ["meta-timeline"] });
    },
  });

  return (
    <Card className={styles.adminHeroEditCard} variant="outlined">
      <Stack
        alignItems="center"
        className={styles.panelHeader}
        direction="row"
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box className={styles.heroTitleBlock}>
          <Typography level="title-md">{hero.nameKo}</Typography>
          <Typography level="body-xs" textColor="text.tertiary">
            {hero.nameEn} · {hero.heroId}
          </Typography>
        </Box>
        <Chip size="sm" variant="soft">
          {roleLabel[hero.role]}
        </Chip>
      </Stack>

      <Box className={styles.adminHeroEditGrid}>
        <FormControl>
          <FormLabel>영웅 ID</FormLabel>
          <Input
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                heroId: event.target.value,
              }))
            }
            value={draft.heroId}
          />
        </FormControl>
        <FormControl>
          <FormLabel>역할</FormLabel>
          <Select
            onChange={(_event, value) =>
              setDraft((current) => ({
                ...current,
                role: value ?? current.role,
              }))
            }
            value={draft.role}
          >
            <Option value="TANK">탱커</Option>
            <Option value="DAMAGE">공격</Option>
            <Option value="SUPPORT">지원</Option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>한글명</FormLabel>
          <Input
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                nameKo: event.target.value,
              }))
            }
            value={draft.nameKo}
          />
        </FormControl>
        <FormControl>
          <FormLabel>영문명</FormLabel>
          <Input
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                nameEn: event.target.value,
              }))
            }
            value={draft.nameEn}
          />
        </FormControl>
        <FormControl>
          <FormLabel>난이도</FormLabel>
          <Input
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                difficulty: event.target.value,
              }))
            }
            slotProps={{
              input: {
                min: 0,
              },
            }}
            type="number"
            value={draft.difficulty}
          />
        </FormControl>
        <FormControl>
          <FormLabel>이미지 URL</FormLabel>
          <Input
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                imageUrl: event.target.value,
              }))
            }
            placeholder="https://..."
            type="url"
            value={draft.imageUrl}
          />
        </FormControl>
      </Box>

      {updateMutation.isError ? (
        <InlineStateCard
          description={getErrorMessage(updateMutation.error)}
          title="영웅 정보를 저장하지 못했습니다."
        />
      ) : null}

      {updateMutation.isSuccess ? (
        <InlineStateCard title="영웅 정보를 저장했습니다." />
      ) : null}

      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        <Button
          disabled={!isHeroDraftValid(draft)}
          loading={updateMutation.isPending}
          onClick={() => updateMutation.mutate(toHeroUpdateRequest(draft))}
          size="sm"
          variant="solid"
        >
          저장
        </Button>
        <Button
          disabled={updateMutation.isPending}
          onClick={() => setDraft(createHeroDraft(hero))}
          size="sm"
          variant="soft"
        >
          되돌리기
        </Button>
      </Stack>
    </Card>
  );
}

function createHeroDraft(hero: HeroAdmin): HeroDraft {
  return {
    heroId: hero.heroId,
    nameKo: hero.nameKo,
    nameEn: hero.nameEn,
    role: hero.role,
    difficulty: hero.difficulty === null ? "" : String(hero.difficulty),
    imageUrl: hero.imageUrl ?? "",
  };
}

function toHeroUpdateRequest(draft: HeroDraft): HeroAdminUpdateRequest {
  return {
    heroId: draft.heroId.trim(),
    nameKo: draft.nameKo.trim(),
    nameEn: draft.nameEn.trim(),
    role: draft.role,
    difficulty:
      draft.difficulty.trim().length === 0 ? null : Number(draft.difficulty),
    imageUrl: draft.imageUrl.trim().length === 0 ? null : draft.imageUrl.trim(),
  };
}

function isHeroDraftValid(draft: HeroDraft) {
  const difficulty =
    draft.difficulty.trim().length === 0 ? null : Number(draft.difficulty);

  return (
    draft.heroId.trim().length > 0 &&
    draft.nameKo.trim().length > 0 &&
    draft.nameEn.trim().length > 0 &&
    (difficulty === null || (Number.isInteger(difficulty) && difficulty >= 0))
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}
