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
  Option,
  Select,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Brand,
  InlineStateCard,
  StateCard,
} from "@/features/patch-analysis/components";
import {
  changeTypeLabel,
  impactLabel,
  roleLabel,
} from "@/features/patch-analysis/constants";
import type { ChangeType, ImpactLevel } from "@/features/patch-analysis/types";
import { fetchHeroList } from "@/features/heroes/api";
import {
  fetchPatchImportForReview,
  fetchPatchImportsForReview,
  applyPatchImport,
  importPatchNote,
  parsePatchImport,
  updatePatchStagingChange,
  updatePatchStagingRelation,
} from "@/features/patch-update/api";
import type {
  PatchStagingChange,
  PatchStagingRelationReviewRequest,
  PatchStagingReviewRequest,
  PatchStagingStatus,
} from "@/features/patch-update/types";
import styles from "@/app/page.module.css";
import logoIcon from "@/app/logo_icons.png";

const stagingStatusLabel: Record<PatchStagingStatus, string> = {
  PENDING: "대기",
  PENDING_REVIEW: "검수 필요",
  NEEDS_MAPPING: "매핑 필요",
  APPROVED: "승인",
  REJECTED: "거절",
  APPLIED: "반영 완료",
  FAILED: "실패",
};

const editableStatuses = [
  "PENDING",
  "PENDING_REVIEW",
  "NEEDS_MAPPING",
  "APPROVED",
  "REJECTED",
] as const;

const changeTypes: ChangeType[] = ["BUFF", "NERF", "ADJUSTMENT", "BUG_FIX"];
const impactLevels: ImpactLevel[] = ["LOW", "MEDIUM", "HIGH"];

type StagingDraft = {
  heroId: string;
  status: PatchStagingStatus;
  changeType: ChangeType | "";
  impactLevel: ImpactLevel | "";
  originalChange: string;
  simpleSummary: string;
  metaImpact: string;
  recommendedPlaystyle: string;
  reviewerNote: string;
};

export default function AdminPatchNotesPage() {
  const queryClient = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

  const {
    data: imports = [],
    isLoading: isImportListLoading,
    isError: isImportListError,
    refetch: refetchImportList,
  } = useQuery({
    queryKey: ["admin-patch-imports"],
    queryFn: fetchPatchImportsForReview,
  });
  const activeImportId = selectedImportId ?? imports[0]?.id ?? null;

  const {
    data: selectedImport,
    isLoading: isSelectedImportLoading,
    isError: isSelectedImportError,
    refetch: refetchSelectedImport,
  } = useQuery({
    enabled: Boolean(activeImportId),
    queryKey: ["admin-patch-import", activeImportId],
    queryFn: () => fetchPatchImportForReview(activeImportId ?? ""),
  });

  const {
    data: heroes = [],
    isLoading: isHeroListLoading,
    isError: isHeroListError,
  } = useQuery({
    queryKey: ["heroes"],
    queryFn: fetchHeroList,
  });

  const importMutation = useMutation({
    mutationFn: importPatchNote,
    onSuccess: (patchImport) => {
      setSelectedImportId(patchImport.id);
      setSourceUrl("");
      void queryClient.invalidateQueries({ queryKey: ["admin-patch-imports"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin-patch-import", patchImport.id],
      });
    },
  });

  const parseMutation = useMutation({
    mutationFn: (patchImportId: string) =>
      parsePatchImport(patchImportId, { forceReparse: false }),
    onSuccess: (_result, patchImportId) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-patch-imports"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin-patch-import", patchImportId],
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (patchImportId: string) => applyPatchImport(patchImportId),
    onSuccess: (_result, patchImportId) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-patch-imports"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin-patch-import", patchImportId],
      });
      void queryClient.invalidateQueries({ queryKey: ["patches"] });
      void queryClient.invalidateQueries({ queryKey: ["meta-timeline"] });
    },
  });

  const selectedImportSummary = useMemo(() => {
    return imports.find((patchImport) => patchImport.id === activeImportId);
  }, [activeImportId, imports]);

  if (isImportListError || isHeroListError) {
    return (
      <StateCard
        action={
          <Button
            onClick={() => {
              void refetchImportList();
            }}
            size="sm"
            variant="soft"
          >
            다시 시도
          </Button>
        }
        description="관리자 검수 데이터를 불러오지 못했습니다."
        title="패치 업데이트 화면을 열 수 없습니다."
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
              href="/admin/heroes"
              size="sm"
              variant="soft"
            >
              영웅 DB
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
                패치노트 업데이트
              </Typography>
              <Typography level="body-sm" textColor="text.secondary">
                공식 패치노트를 가져오고 LLM 분석 결과를 staging에서 검수합니다.
              </Typography>
            </Box>
            <Chip color="primary" size="sm" variant="soft">
              Admin
            </Chip>
          </Stack>

          <Stack
            className={styles.adminImportForm}
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              importMutation.mutate({
                sourceUrl,
                parseImmediately: false,
              });
            }}
            spacing={1}
          >
            <FormControl>
              <FormLabel>공식 패치노트 URL</FormLabel>
              <Input
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://overwatch.blizzard.com/..."
                type="url"
                value={sourceUrl}
              />
            </FormControl>
            <Button
              disabled={sourceUrl.trim().length === 0}
              loading={importMutation.isPending}
              type="submit"
            >
              Import
            </Button>
          </Stack>

          {importMutation.isError ? (
            <InlineStateCard
              description={getErrorMessage(importMutation.error)}
              title="패치노트 import에 실패했습니다."
            />
          ) : null}
        </Card>

        <Box className={styles.adminLayout}>
          <Card className={styles.adminListPanel} variant="outlined">
            <Stack
              alignItems="center"
              className={styles.panelHeader}
              direction="row"
              justifyContent="space-between"
              spacing={1.5}
            >
              <Box>
                <Typography level="title-md">Import 목록</Typography>
                <Typography level="body-sm" textColor="text.tertiary">
                  staging 검수 상태를 기준으로 확인하세요.
                </Typography>
              </Box>
              <Chip size="sm" variant="soft">
                {imports.length}건
              </Chip>
            </Stack>

            <Stack className={styles.adminImportList} spacing={1}>
              {isImportListLoading ? (
                <InlineStateCard title="Import 목록을 불러오는 중입니다." />
              ) : imports.length === 0 ? (
                <InlineStateCard
                  description="URL을 입력해 새 패치노트를 가져오면 이곳에 표시됩니다."
                  title="아직 import된 패치노트가 없습니다."
                />
              ) : (
                imports.map((patchImport) => {
                  const selected = patchImport.id === selectedImportId;

                  return (
                    <Button
                      className={styles.adminImportItem}
                      color={selected ? "primary" : "neutral"}
                      key={patchImport.id}
                      onClick={() => setSelectedImportId(patchImport.id)}
                      variant={selected ? "soft" : "plain"}
                    >
                      <Box className={styles.patchListItemBody}>
                        <Stack
                          alignItems="flex-start"
                          className={styles.patchListItemHeader}
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography level="title-sm">
                            {patchImport.title ?? "제목 미확인 패치"}
                          </Typography>
                          <Chip size="sm" variant="soft">
                            {patchImport.status}
                          </Chip>
                        </Stack>
                        <Typography level="body-xs" textColor="text.tertiary">
                          {patchImport.patchDate ?? "날짜 미확인"}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                          <Chip size="sm" variant="soft">
                            staging {patchImport.stagingChangeCount}
                          </Chip>
                          <Chip color="warning" size="sm" variant="soft">
                            검수 {patchImport.pendingReviewCount}
                          </Chip>
                          <Chip color="success" size="sm" variant="soft">
                            승인 {patchImport.approvedCount}
                          </Chip>
                        </Stack>
                      </Box>
                    </Button>
                  );
                })
              )}
            </Stack>
          </Card>

          <Card className={styles.adminReviewPanel} variant="outlined">
            {!activeImportId ? (
              <InlineStateCard
                description="왼쪽 목록에서 import를 선택하거나 새 URL을 import해 주세요."
                title="검수할 패치노트를 선택하세요."
              />
            ) : isSelectedImportLoading || isHeroListLoading ? (
              <InlineStateCard title="검수 데이터를 불러오는 중입니다." />
            ) : isSelectedImportError || !selectedImport ? (
              <InlineStateCard
                action={
                  <Button
                    onClick={() => {
                      void refetchSelectedImport();
                    }}
                    size="sm"
                    variant="soft"
                  >
                    다시 시도
                  </Button>
                }
                title="검수 데이터를 불러오지 못했습니다."
              />
            ) : (
              <Stack spacing={2}>
                <Stack
                  alignItems="flex-start"
                  className={styles.panelHeader}
                  direction="row"
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Box>
                    <Typography level="title-lg">
                      {selectedImport.title ?? selectedImportSummary?.title ?? "검수 대기 패치"}
                    </Typography>
                    <Typography level="body-sm" textColor="text.tertiary">
                      {selectedImport.patchDate ?? "날짜 미확인"} ·{" "}
                      {selectedImport.stagingChanges.length}개 변경
                    </Typography>
                  </Box>
                  <Button
                    disabled={selectedImport.status !== "IMPORTED"}
                    loading={parseMutation.isPending}
                    onClick={() => parseMutation.mutate(selectedImport.id)}
                    size="sm"
                    variant="soft"
                  >
                    Parse
                  </Button>
                  <Button
                    color="success"
                    disabled={!canApplyImport(selectedImport)}
                    loading={applyMutation.isPending}
                    onClick={() => applyMutation.mutate(selectedImport.id)}
                    size="sm"
                    variant="solid"
                  >
                    최종 반영
                  </Button>
                </Stack>

                {parseMutation.isError ? (
                  <InlineStateCard
                    description={getErrorMessage(parseMutation.error)}
                    title="패치노트 parse에 실패했습니다."
                  />
                ) : null}

                {applyMutation.isError ? (
                  <InlineStateCard
                    description={getErrorMessage(applyMutation.error)}
                    title="최종 반영에 실패했습니다."
                  />
                ) : null}

                {applyMutation.isSuccess ? (
                  <InlineStateCard title="승인된 변경사항을 공개 데이터에 반영했습니다." />
                ) : null}

                {selectedImport.stagingChanges.length === 0 ? (
                  <InlineStateCard
                    description="Import 후 Parse를 실행하면 검수할 변경사항이 생성됩니다."
                    title="아직 staging 변경사항이 없습니다."
                  />
                ) : (
                  <Stack spacing={1.25}>
                    {selectedImport.stagingChanges.map((stagingChange) => (
                      <StagingReviewCard
                        heroes={heroes}
                        key={`${stagingChange.id}:${stagingChange.updatedAt}`}
                        patchImportId={selectedImport.id}
                        stagingChange={stagingChange}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Card>
        </Box>
      </Box>
    </main>
  );
}

function StagingReviewCard({
  heroes,
  patchImportId,
  stagingChange,
}: {
  heroes: Awaited<ReturnType<typeof fetchHeroList>>;
  patchImportId: string;
  stagingChange: PatchStagingChange;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => createDraft(stagingChange));

  const updateMutation = useMutation({
    mutationFn: (request: PatchStagingReviewRequest) =>
      updatePatchStagingChange(patchImportId, stagingChange.id, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-patch-imports"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin-patch-import", patchImportId],
      });
    },
  });

  const canEdit = stagingChange.status !== "APPLIED";

  return (
    <Card className={styles.adminStagingCard} variant="soft">
      <Stack
        alignItems="flex-start"
        className={styles.panelHeader}
        direction="row"
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box className={styles.heroTitleBlock}>
          <Typography level="title-md">
            {stagingChange.hero?.nameKo ?? stagingChange.heroNameRaw}
          </Typography>
          <Typography level="body-xs" textColor="text.tertiary">
            confidence {Math.round(stagingChange.confidence * 100)}%
            {stagingChange.hero ? ` · ${getRoleLabel(stagingChange.hero.role)}` : ""}
          </Typography>
        </Box>
        <Chip color={getStagingStatusColor(stagingChange.status)} size="sm">
          {stagingStatusLabel[stagingChange.status]}
        </Chip>
      </Stack>

      <Divider />

      <Box className={styles.adminReviewGrid}>
        <FormControl>
          <FormLabel>영웅 매핑</FormLabel>
          <Select
            disabled={!canEdit}
            onChange={(_event, value) =>
              setDraft((current) => ({
                ...current,
                heroId: value ?? "",
              }))
            }
            value={draft.heroId}
          >
            <Option value="">미매핑</Option>
            {heroes.map((hero) => (
              <Option key={hero.heroId} value={hero.heroId}>
                {hero.nameKo} · {hero.nameEn}
              </Option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>상태</FormLabel>
          <Select
            disabled={!canEdit}
            onChange={(_event, value) =>
              setDraft((current) => ({
                ...current,
                status: value ?? current.status,
              }))
            }
            value={draft.status}
          >
            {editableStatuses.map((status) => (
              <Option key={status} value={status}>
                {stagingStatusLabel[status]}
              </Option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>변경 타입</FormLabel>
          <Select
            disabled={!canEdit}
            onChange={(_event, value) =>
              setDraft((current) => ({
                ...current,
                changeType: value ?? "",
              }))
            }
            value={draft.changeType}
          >
            <Option value="">미분류</Option>
            {changeTypes.map((changeType) => (
              <Option key={changeType} value={changeType}>
                {changeTypeLabel[changeType]}
              </Option>
            ))}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>영향도</FormLabel>
          <Select
            disabled={!canEdit}
            onChange={(_event, value) =>
              setDraft((current) => ({
                ...current,
                impactLevel: value ?? "",
              }))
            }
            value={draft.impactLevel}
          >
            <Option value="">미분류</Option>
            {impactLevels.map((impactLevel) => (
              <Option key={impactLevel} value={impactLevel}>
                {impactLabel[impactLevel]}
              </Option>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box className={styles.adminTextGrid}>
        <ReviewTextarea
          disabled={!canEdit}
          label="원문 변경"
          onChange={(originalChange) =>
            setDraft((current) => ({ ...current, originalChange }))
          }
          value={draft.originalChange}
        />
        <ReviewTextarea
          disabled={!canEdit}
          label="요약"
          onChange={(simpleSummary) =>
            setDraft((current) => ({ ...current, simpleSummary }))
          }
          value={draft.simpleSummary}
        />
        <ReviewTextarea
          disabled={!canEdit}
          label="메타 영향"
          onChange={(metaImpact) =>
            setDraft((current) => ({ ...current, metaImpact }))
          }
          value={draft.metaImpact}
        />
        <ReviewTextarea
          disabled={!canEdit}
          label="추천 플레이"
          onChange={(recommendedPlaystyle) =>
            setDraft((current) => ({ ...current, recommendedPlaystyle }))
          }
          value={draft.recommendedPlaystyle}
        />
      </Box>

      <RelationReviewList
        canEdit={canEdit}
        heroes={heroes}
        patchImportId={patchImportId}
        stagingChange={stagingChange}
      />

      <FormControl>
        <FormLabel>검수 메모</FormLabel>
        <Textarea
          disabled={!canEdit}
          minRows={2}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              reviewerNote: event.target.value,
            }))
          }
          value={draft.reviewerNote}
        />
      </FormControl>

      {updateMutation.isError ? (
        <InlineStateCard
          description={getErrorMessage(updateMutation.error)}
          title="검수 저장에 실패했습니다."
        />
      ) : null}

      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        <Button
          disabled={!canEdit}
          loading={updateMutation.isPending}
          onClick={() => updateMutation.mutate(toReviewRequest(draft))}
          size="sm"
          variant="solid"
        >
          저장
        </Button>
        <Button
          disabled={!canEdit}
          loading={updateMutation.isPending}
          onClick={() =>
            updateMutation.mutate({
              ...toReviewRequest(draft),
              status: "APPROVED",
            })
          }
          size="sm"
          variant="soft"
        >
          승인
        </Button>
        <Button
          color="danger"
          disabled={!canEdit}
          loading={updateMutation.isPending}
          onClick={() =>
            updateMutation.mutate({
              ...toReviewRequest(draft),
              status: "REJECTED",
            })
          }
          size="sm"
          variant="soft"
        >
          거절
        </Button>
      </Stack>
    </Card>
  );
}

function RelationReviewList({
  canEdit,
  heroes,
  patchImportId,
  stagingChange,
}: {
  canEdit: boolean;
  heroes: Awaited<ReturnType<typeof fetchHeroList>>;
  patchImportId: string;
  stagingChange: PatchStagingChange;
}) {
  const relatedHeroRelations = stagingChange.relations.filter(
    (relation) =>
      relation.relationType === "SYNERGY" ||
      relation.relationType === "COUNTER",
  );

  if (relatedHeroRelations.length === 0) {
    return null;
  }

  return (
    <Box className={styles.adminRelationList}>
      <Typography level="title-sm">관련 영웅 매칭</Typography>
      <Typography level="body-xs" textColor="text.tertiary">
        시너지/카운터 대상 영웅이 비어 있으면 최종 반영이 막힙니다.
      </Typography>
      <Stack spacing={1}>
        {relatedHeroRelations.map((relation) => (
          <RelationReviewRow
            canEdit={canEdit}
            heroes={heroes}
            key={relation.id}
            patchImportId={patchImportId}
            relation={relation}
            stagingChangeId={stagingChange.id}
          />
        ))}
      </Stack>
    </Box>
  );
}

function RelationReviewRow({
  canEdit,
  heroes,
  patchImportId,
  relation,
  stagingChangeId,
}: {
  canEdit: boolean;
  heroes: Awaited<ReturnType<typeof fetchHeroList>>;
  patchImportId: string;
  relation: PatchStagingChange["relations"][number];
  stagingChangeId: string;
}) {
  const queryClient = useQueryClient();
  const [targetHeroId, setTargetHeroId] = useState(
    relation.targetHero?.heroId ?? "",
  );
  const updateMutation = useMutation({
    mutationFn: (request: PatchStagingRelationReviewRequest) =>
      updatePatchStagingRelation(
        patchImportId,
        stagingChangeId,
        relation.id,
        request,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-patch-imports"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin-patch-import", patchImportId],
      });
    },
  });

  return (
    <Box className={styles.adminRelationRow}>
      <Box className={styles.heroTitleBlock}>
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          <Chip
            color={relation.targetHero ? "success" : "warning"}
            size="sm"
            variant="soft"
          >
            {getRelationTypeLabel(relation.relationType)}
          </Chip>
          <Chip size="sm" variant="soft">
            {relation.value ?? "값 없음"}
          </Chip>
        </Stack>
        <Typography level="body-xs" textColor="text.tertiary">
          현재 매칭:{" "}
          {relation.targetHero
            ? `${relation.targetHero.nameKo} · ${relation.targetHero.nameEn}`
            : "미매칭"}
        </Typography>
      </Box>
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        <Select
          className={styles.adminRelationSelect}
          disabled={!canEdit}
          onChange={(_event, value) => setTargetHeroId(value ?? "")}
          size="sm"
          value={targetHeroId}
        >
          <Option value="">미매칭</Option>
          {heroes.map((hero) => (
            <Option key={hero.heroId} value={hero.heroId}>
              {hero.nameKo} · {hero.nameEn}
            </Option>
          ))}
        </Select>
        <Button
          disabled={!canEdit}
          loading={updateMutation.isPending}
          onClick={() =>
            updateMutation.mutate({
              targetHeroId: targetHeroId.length > 0 ? targetHeroId : null,
            })
          }
          size="sm"
          variant="soft"
        >
          저장
        </Button>
      </Stack>
      {updateMutation.isError ? (
        <InlineStateCard
          description={getErrorMessage(updateMutation.error)}
          title="관련 영웅 매칭을 저장하지 못했습니다."
        />
      ) : null}
    </Box>
  );
}

function ReviewTextarea({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <Textarea
        disabled={disabled}
        minRows={3}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </FormControl>
  );
}

function createDraft(stagingChange: PatchStagingChange): StagingDraft {
  return {
    heroId: stagingChange.hero?.heroId ?? "",
    status: stagingChange.status,
    changeType: stagingChange.changeType ?? "",
    impactLevel: stagingChange.impactLevel ?? "",
    originalChange: stagingChange.originalChange,
    simpleSummary: stagingChange.simpleSummary ?? "",
    metaImpact: stagingChange.metaImpact ?? "",
    recommendedPlaystyle: stagingChange.recommendedPlaystyle ?? "",
    reviewerNote: stagingChange.reviewerNote ?? "",
  };
}

function toReviewRequest(draft: StagingDraft): PatchStagingReviewRequest {
  return {
    heroId: draft.heroId.length > 0 ? draft.heroId : null,
    status: isEditableStatus(draft.status) ? draft.status : undefined,
    changeType: isChangeType(draft.changeType) ? draft.changeType : null,
    impactLevel: isImpactLevel(draft.impactLevel) ? draft.impactLevel : null,
    originalChange: draft.originalChange,
    simpleSummary: draft.simpleSummary.length > 0 ? draft.simpleSummary : null,
    metaImpact: draft.metaImpact.length > 0 ? draft.metaImpact : null,
    recommendedPlaystyle:
      draft.recommendedPlaystyle.length > 0
        ? draft.recommendedPlaystyle
        : null,
    reviewerNote: draft.reviewerNote.length > 0 ? draft.reviewerNote : null,
  };
}

function isEditableStatus(
  status: PatchStagingStatus,
): status is (typeof editableStatuses)[number] {
  return editableStatuses.some((editableStatus) => editableStatus === status);
}

function isChangeType(value: ChangeType | ""): value is ChangeType {
  return value.length > 0;
}

function isImpactLevel(value: ImpactLevel | ""): value is ImpactLevel {
  return value.length > 0;
}

function getRoleLabel(role: string) {
  return role === "TANK" || role === "DAMAGE" || role === "SUPPORT"
    ? roleLabel[role]
    : role;
}

function getStagingStatusColor(status: PatchStagingStatus) {
  if (status === "APPROVED" || status === "APPLIED") {
    return "success";
  }

  if (status === "REJECTED" || status === "FAILED") {
    return "danger";
  }

  if (status === "PENDING_REVIEW" || status === "NEEDS_MAPPING") {
    return "warning";
  }

  return "neutral";
}

function getRelationTypeLabel(relationType: string) {
  if (relationType === "SYNERGY") {
    return "시너지";
  }

  if (relationType === "COUNTER") {
    return "카운터";
  }

  return relationType;
}

function canApplyImport(
  patchImport: Awaited<ReturnType<typeof fetchPatchImportForReview>>,
) {
  return (
    patchImport.status === "REVIEWING" &&
    patchImport.stagingChanges.some((change) => change.status === "APPROVED")
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}
