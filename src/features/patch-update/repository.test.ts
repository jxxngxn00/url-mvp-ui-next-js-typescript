import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportedPatchContent } from "./importer";
import {
  recordPatchParseSuccess,
  saveFailedPatchImport,
  saveImportedPatchContent,
} from "./repository";

const mockPrisma = vi.hoisted(() => ({
  patchImport: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

type PatchImportRecordFixture = {
  id: string;
  sourceUrl: string;
  title: string | null;
  patchDate: Date | null;
  rawHtml: string | null;
  rawText: string | null;
  contentHash: string | null;
  status: "IMPORTED" | "PARSED" | "REVIEWING" | "APPLIED" | "FAILED";
  errorMessage: string | null;
  importedAt: Date;
  parsedAt: Date | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

describe("patch update repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("같은 sourceUrl import가 있으면 새 row를 만들지 않는다", async () => {
    const existingRecord = createPatchImportRecord({
      id: "patch_import_existing_url",
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    });

    mockPrisma.patchImport.findUnique.mockResolvedValueOnce(existingRecord);

    const result = await saveImportedPatchContent(createImportedPatchContent());

    expect(result).toMatchObject({
      created: false,
      duplicate: true,
      patchImport: {
        id: "patch_import_existing_url",
      },
    });
    expect(mockPrisma.patchImport.create).not.toHaveBeenCalled();
  });

  it("같은 contentHash import가 있으면 같은 패치로 보고 중복 처리한다", async () => {
    const existingRecord = createPatchImportRecord({
      id: "patch_import_existing_hash",
      contentHash: "same-content-hash",
    });

    mockPrisma.patchImport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingRecord);

    const result = await saveImportedPatchContent(createImportedPatchContent());

    expect(result).toMatchObject({
      created: false,
      duplicate: true,
      patchImport: {
        id: "patch_import_existing_hash",
      },
    });
    expect(mockPrisma.patchImport.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      },
    });
    expect(mockPrisma.patchImport.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        contentHash: "same-content-hash",
      },
    });
    expect(mockPrisma.patchImport.create).not.toHaveBeenCalled();
  });

  it("새 import는 IMPORTED 상태와 성공 로그를 함께 저장한다", async () => {
    const createdRecord = createPatchImportRecord({
      id: "patch_import_new",
    });

    mockPrisma.patchImport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.patchImport.create.mockResolvedValueOnce(createdRecord);

    const result = await saveImportedPatchContent(createImportedPatchContent());

    expect(result).toMatchObject({
      created: true,
      duplicate: false,
      patchImport: {
        id: "patch_import_new",
        status: "IMPORTED",
      },
    });
    expect(mockPrisma.patchImport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
        rawHtml: "<html>raw</html>",
        rawText: "Overwatch Retail Patch Notes",
        contentHash: "same-content-hash",
        status: "IMPORTED",
        applyLogs: {
          create: {
            action: "IMPORT",
            status: "SUCCESS",
            message: "Patch note HTML was imported.",
          },
        },
      }),
    });
  });

  it("fetch 실패 import는 FAILED 상태와 실패 로그를 저장한다", async () => {
    await saveFailedPatchImport(
      "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      "Patch note request failed with status 502.",
    );

    expect(mockPrisma.patchImport.upsert).toHaveBeenCalledWith({
      where: {
        sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      },
      update: expect.objectContaining({
        status: "FAILED",
        errorMessage: "Patch note request failed with status 502.",
      }),
      create: expect.objectContaining({
        sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
        status: "FAILED",
        errorMessage: "Patch note request failed with status 502.",
      }),
    });
  });

  it("parse와 staging 저장 성공은 REVIEWING 상태와 성공 로그를 저장한다", async () => {
    mockPrisma.patchImport.update.mockResolvedValueOnce(
      createPatchImportRecord({
        status: "REVIEWING",
      }),
    );

    const result = await recordPatchParseSuccess({
      patchImportId: "patch_import_1",
      sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      parsedChangeCount: 2,
      stagingChangeCount: 2,
    });

    expect(mockPrisma.patchImport.update).toHaveBeenCalledWith({
      where: {
        id: "patch_import_1",
      },
      data: expect.objectContaining({
        status: "REVIEWING",
        errorMessage: null,
        applyLogs: {
          create: {
            action: "PARSE",
            status: "SUCCESS",
            message: "Patch note parser completed and staging rows were saved.",
            metadata: {
              stage: "staging",
              sourceUrl:
                "https://overwatch.blizzard.com/en-us/news/patch-notes/",
              parsedChangeCount: 2,
              stagingChangeCount: 2,
            },
          },
        },
      }),
    });
    expect(result.status).toBe("REVIEWING");
  });
});

function createImportedPatchContent(): ImportedPatchContent {
  return {
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    title: "Overwatch Retail Patch Notes",
    patchDate: "2026-07-14",
    rawHtml: "<html>raw</html>",
    rawText: "Overwatch Retail Patch Notes",
    contentHash: "same-content-hash",
  };
}

function createPatchImportRecord(
  overrides: Partial<PatchImportRecordFixture> = {},
): PatchImportRecordFixture {
  return {
    id: "patch_import",
    sourceUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    title: "Overwatch Retail Patch Notes",
    patchDate: new Date("2026-07-14T00:00:00.000Z"),
    rawHtml: "<html>raw</html>",
    rawText: "Overwatch Retail Patch Notes",
    contentHash: "same-content-hash",
    status: "IMPORTED",
    errorMessage: null,
    importedAt: new Date("2026-07-14T01:00:00.000Z"),
    parsedAt: null,
    appliedAt: null,
    createdAt: new Date("2026-07-14T01:00:00.000Z"),
    updatedAt: new Date("2026-07-14T01:00:00.000Z"),
    ...overrides,
  };
}
