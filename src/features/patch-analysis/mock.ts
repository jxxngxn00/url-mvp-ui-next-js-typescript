import { patchAnalysisSchema } from "./schema";
import type { PatchAnalysis } from "./types";

export const patchAnalysis: PatchAnalysis = patchAnalysisSchema.parse({
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
});
