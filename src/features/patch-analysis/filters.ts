import type {
  ChangeType,
  HeroChange,
  HeroInfo,
  HeroRole,
  ImpactLevel,
  MetaTimelinePatch,
} from "./types";

export type PatchChangeFilters = {
  role: HeroRole | "ALL";
  changeType: ChangeType | "ALL";
  impactLevel: ImpactLevel | "ALL";
  keyword: string;
};

type FilterableHeroChange = {
  hero: HeroInfo;
  changeType: ChangeType;
  impactLevel: ImpactLevel;
};

const defaultFilters: PatchChangeFilters = {
  role: "ALL",
  changeType: "ALL",
  impactLevel: "ALL",
  keyword: "",
};

export function normalizePatchChangeFilters(
  filters: Partial<PatchChangeFilters>,
): PatchChangeFilters {
  return {
    ...defaultFilters,
    ...filters,
    keyword: filters.keyword?.trim().toLowerCase() ?? defaultFilters.keyword,
  };
}

export function matchesPatchChangeFilters(
  change: FilterableHeroChange,
  filters: Partial<PatchChangeFilters>,
) {
  const normalizedFilters = normalizePatchChangeFilters(filters);
  const matchesRole =
    normalizedFilters.role === "ALL" ||
    change.hero.role === normalizedFilters.role;
  const matchesChangeType =
    normalizedFilters.changeType === "ALL" ||
    change.changeType === normalizedFilters.changeType;
  const matchesImpactLevel =
    normalizedFilters.impactLevel === "ALL" ||
    change.impactLevel === normalizedFilters.impactLevel;
  const matchesKeyword =
    normalizedFilters.keyword.length === 0 ||
    change.hero.nameKo.toLowerCase().includes(normalizedFilters.keyword) ||
    change.hero.nameEn.toLowerCase().includes(normalizedFilters.keyword);

  return (
    matchesRole &&
    matchesChangeType &&
    matchesImpactLevel &&
    matchesKeyword
  );
}

export function filterHeroChanges(
  changes: HeroChange[],
  filters: Partial<PatchChangeFilters>,
) {
  return changes.filter((change) => matchesPatchChangeFilters(change, filters));
}

export function filterMetaTimeline(
  patches: MetaTimelinePatch[],
  filters: Partial<PatchChangeFilters>,
) {
  return patches
    .map((patch) => ({
      ...patch,
      entries: patch.entries.filter((entry) =>
        matchesPatchChangeFilters(entry, filters),
      ),
    }))
    .filter((patch) => patch.entries.length > 0);
}
