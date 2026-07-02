import type { ChangeType, HeroRole, ImpactLevel } from "./types";

export const roles: Array<{ label: string; value: HeroRole | "ALL" }> = [
  { label: "전체", value: "ALL" },
  { label: "탱커", value: "TANK" },
  { label: "공격", value: "DAMAGE" },
  { label: "지원", value: "SUPPORT" },
];

export const changeTypeLabel: Record<ChangeType, string> = {
  BUFF: "상향",
  NERF: "하향",
  ADJUSTMENT: "조정",
  BUG_FIX: "버그 수정",
};

export const impactLabel: Record<ImpactLevel, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

export const roleLabel: Record<HeroRole, string> = {
  TANK: "탱커",
  DAMAGE: "공격",
  SUPPORT: "지원",
};

export const changeTypeColor: Record<
  ChangeType,
  "success" | "danger" | "primary" | "neutral"
> = {
  BUFF: "success",
  NERF: "danger",
  ADJUSTMENT: "primary",
  BUG_FIX: "neutral",
};

export const impactColor: Record<ImpactLevel, "neutral" | "warning" | "danger"> =
  {
    LOW: "neutral",
    MEDIUM: "warning",
    HIGH: "danger",
  };
