import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PatchImportNotReadyError,
  loadPatchAnalysisInput,
  parsePatchImport,
} from "./service";

const mockAnalyzePatchWithLlm = vi.hoisted(() => vi.fn());
const mockRepository = vi.hoisted(() => ({
  findPatchImportById: vi.fn(),
  findPatchImportBySourceUrl: vi.fn(),
  recordPatchParseSuccess: vi.fn(),
  recordPatchImportFailure: vi.fn(),
  saveImportedPatchContent: vi.fn(),
}));
const mockStagingRepository = vi.hoisted(() => ({
  savePatchAnalysisToStaging: vi.fn(),
  PatchStagingSaveError: class PatchStagingSaveError extends Error {
    constructor(message = "Failed to save patch analysis staging rows.") {
      super(message);
      this.name = "PatchStagingSaveError";
    }
  },
}));

vi.mock("@/features/patch-analysis/analyzer", () => ({
  analyzePatchWithLlm: mockAnalyzePatchWithLlm,
}));

vi.mock("./repository", () => ({
  ...mockRepository,
}));

vi.mock("./staging-repository", () => ({
  ...mockStagingRepository,
}));

type PatchImportForParsingFixture = {
  id: string;
  sourceUrl: string;
  title: string | null;
  patchDate: string | null;
  contentHash: string | null;
  status: "IMPORTED" | "PARSED" | "REVIEWING" | "APPLIED" | "FAILED";
  errorMessage: string | null;
  importedAt: string;
  parsedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rawText: string | null;
};

describe("parsePatchImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patch_imports row를 LLM 입력으로 변환하고 parse 성공을 기록한다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing(),
    );
    mockAnalyzePatchWithLlm.mockResolvedValueOnce({
      patchId: "ow2-2026-07-14-overwatch-retail-patch-notes-july-14-2026",
      patchTitle: "Overwatch Retail Patch Notes – July 14, 2026",
      patchDate: "2026-07-14",
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      overallSummary: "summary",
      metaSummary: "meta",
      changes: [
        {
          changeId: "change-1",
          hero: {
            heroId: "cassidy",
            nameKo: "캐서디",
            nameEn: "Cassidy",
            role: "DAMAGE",
          },
          changeType: "BUFF",
          impactLevel: "MEDIUM",
          originalChange: "Damage increased.",
          simpleSummary: "Damage increased.",
          metaImpact: "Cassidy is stronger.",
          affectedTiers: ["Gold"],
          recommendedPlaystyle: "Take mid-range fights.",
          counterPicks: [],
          synergyPicks: [],
        },
      ],
    });
    mockStagingRepository.savePatchAnalysisToStaging.mockResolvedValueOnce({
      stagingChangeCount: 1,
    });
    mockRepository.recordPatchParseSuccess.mockResolvedValueOnce({
      ...createPatchImportForParsing(),
      status: "REVIEWING",
    });

    const result = await parsePatchImport("patch_import_1");

    expect(mockAnalyzePatchWithLlm).toHaveBeenCalledWith({
      patchId: "ow2-2026-07-14-overwatch-retail-patch-notes-july-14-2026",
      patchTitle: "Overwatch Retail Patch Notes – July 14, 2026",
      patchDate: "2026-07-14",
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      rawContent: "latest patch raw text",
    });
    expect(mockStagingRepository.savePatchAnalysisToStaging).toHaveBeenCalledWith(
      "patch_import_1",
      expect.objectContaining({
        changes: expect.arrayContaining([
          expect.objectContaining({
            changeId: "change-1",
          }),
        ]),
      }),
    );
    expect(mockRepository.recordPatchParseSuccess).toHaveBeenCalledWith({
      patchImportId: "patch_import_1",
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      parsedTitle: "Overwatch Retail Patch Notes – July 14, 2026",
      parsedDate: "2026-07-14",
      parsedChangeCount: 1,
      stagingChangeCount: 1,
    });
    expect(result).toMatchObject({
      patchImportId: "patch_import_1",
      status: "REVIEWING",
      stagingChangeCount: 1,
    });
  });

  it("rawText가 없으면 LLM을 호출하지 않고 준비 실패를 반환한다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing({
        rawText: null,
      }),
    );

    await expect(parsePatchImport("patch_import_1")).rejects.toThrow(
      PatchImportNotReadyError,
    );
    expect(mockAnalyzePatchWithLlm).not.toHaveBeenCalled();
  });

  it("contentHash가 없으면 parser input을 만들지 않고 준비 실패를 반환한다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing({
        contentHash: null,
      }),
    );

    await expect(parsePatchImport("patch_import_1")).rejects.toThrow(
      PatchImportNotReadyError,
    );
    expect(mockAnalyzePatchWithLlm).not.toHaveBeenCalled();
    expect(mockStagingRepository.savePatchAnalysisToStaging).not.toHaveBeenCalled();
  });

  it("LLM 분석이 실패하면 PARSE 실패 로그를 남긴다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing(),
    );
    mockAnalyzePatchWithLlm.mockRejectedValueOnce(
      new Error("Gemini request failed."),
    );

    await expect(parsePatchImport("patch_import_1")).rejects.toThrow(
      "Gemini request failed.",
    );
    expect(mockRepository.recordPatchImportFailure).toHaveBeenCalledWith({
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      action: "PARSE",
      message: "Gemini request failed.",
      metadata: {
        stage: "parse",
      },
    });
    expect(mockStagingRepository.savePatchAnalysisToStaging).not.toHaveBeenCalled();
    expect(mockRepository.recordPatchParseSuccess).not.toHaveBeenCalled();
  });

  it("staging 저장이 실패하면 PARSE 실패 로그에 staging 단계를 남긴다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing(),
    );
    mockAnalyzePatchWithLlm.mockResolvedValueOnce(createPatchAnalysis());
    mockStagingRepository.savePatchAnalysisToStaging.mockRejectedValueOnce(
      new mockStagingRepository.PatchStagingSaveError("Staging save failed."),
    );

    await expect(parsePatchImport("patch_import_1")).rejects.toThrow(
      "Staging save failed.",
    );
    expect(mockRepository.recordPatchImportFailure).toHaveBeenCalledWith({
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      action: "PARSE",
      message: "Staging save failed.",
      metadata: {
        stage: "staging",
      },
    });
    expect(mockRepository.recordPatchParseSuccess).not.toHaveBeenCalled();
  });
});

describe("loadPatchAnalysisInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patch_imports row를 PatchAnalysisInput으로 변환한다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing(),
    );

    const result = await loadPatchAnalysisInput("patch_import_1");

    expect(mockRepository.findPatchImportById).toHaveBeenCalledWith(
      "patch_import_1",
    );
    expect(result.input).toEqual({
      patchId: "ow2-2026-07-14-overwatch-retail-patch-notes-july-14-2026",
      patchTitle: "Overwatch Retail Patch Notes – July 14, 2026",
      patchDate: "2026-07-14",
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      rawContent: "latest patch raw text",
    });
  });

  it("기존 import row에 title/date가 없어도 rawText의 한국어 날짜로 parser input을 보완한다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing({
        sourceUrl:
          "https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/07",
        title: null,
        patchDate: null,
        rawText: "오버워치 2 패치 노트\n2026년 7월 15일\n영웅 밸런스 업데이트",
      }),
    );

    const result = await loadPatchAnalysisInput("patch_import_1");

    expect(result.input).toEqual({
      patchId: "ow2-2026-07-15-overwatch-2-patch-notes-2026-07-15",
      patchTitle: "Overwatch 2 Patch Notes - 2026-07-15",
      patchDate: "2026-07-15",
      sourceUrl:
        "https://overwatch.blizzard.com/ko-kr/news/patch-notes/live/2026/07",
      rawContent: "오버워치 2 패치 노트\n2026년 7월 15일\n영웅 밸런스 업데이트",
    });
  });

  it("이미 파싱된 import는 기본적으로 다시 파싱하지 않는다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing({
        status: "PARSED",
      }),
    );

    await expect(loadPatchAnalysisInput("patch_import_1")).rejects.toThrow(
      PatchImportNotReadyError,
    );
  });

  it("forceReparse가 true면 이미 파싱된 import도 입력으로 변환한다", async () => {
    mockRepository.findPatchImportById.mockResolvedValueOnce(
      createPatchImportForParsing({
        status: "PARSED",
      }),
    );

    const result = await loadPatchAnalysisInput("patch_import_1", {
      forceReparse: true,
    });

    expect(result.input.rawContent).toBe("latest patch raw text");
  });
});

function createPatchImportForParsing(
  overrides: Partial<PatchImportForParsingFixture> = {},
): PatchImportForParsingFixture {
  return {
    id: "patch_import_1",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    title: "Overwatch Retail Patch Notes – July 14, 2026",
    patchDate: "2026-07-14",
    contentHash: "a".repeat(64),
    status: "IMPORTED",
    errorMessage: null,
    importedAt: "2026-07-14T01:00:00.000Z",
    parsedAt: null,
    appliedAt: null,
    createdAt: "2026-07-14T01:00:00.000Z",
    updatedAt: "2026-07-14T01:00:00.000Z",
    rawText: "latest patch raw text",
    ...overrides,
  };
}

function createPatchAnalysis() {
  return {
    patchId: "ow2-2026-07-14-overwatch-retail-patch-notes-july-14-2026",
    patchTitle: "Overwatch Retail Patch Notes - July 14, 2026",
    patchDate: "2026-07-14",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    overallSummary: "summary",
    metaSummary: "meta",
    changes: [
      {
        changeId: "change-1",
        hero: {
          heroId: "cassidy",
          nameKo: "Cassidy",
          nameEn: "Cassidy",
          role: "DAMAGE" as const,
        },
        changeType: "BUFF" as const,
        impactLevel: "MEDIUM" as const,
        originalChange: "Damage increased.",
        simpleSummary: "Damage increased.",
        metaImpact: "Cassidy is stronger.",
        affectedTiers: ["Gold"],
        recommendedPlaystyle: "Take mid-range fights.",
        counterPicks: [],
        synergyPicks: [],
      },
    ],
  };
}
