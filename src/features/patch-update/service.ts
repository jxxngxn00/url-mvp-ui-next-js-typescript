import { analyzePatchWithLlm } from "@/features/patch-analysis/analyzer";
import type {
  PatchAnalysis,
  PatchAnalysisInput,
} from "@/features/patch-analysis/types";
import {
  PatchFetchError,
  fetchOfficialPatchNote,
  normalizeOfficialPatchUrl,
} from "./importer";
import {
  findPatchImportById,
  findPatchImportBySourceUrl,
  recordPatchImportFailure,
  recordPatchParseSuccess,
  saveImportedPatchContent,
  type PatchImportForParsing,
  type PatchImportResult,
} from "./repository";
import {
  PatchStagingSaveError,
  savePatchAnalysisToStaging,
} from "./staging-repository";
import type { PatchImportStatus } from "./types";

export type PatchParseResult = {
  patchImportId: string;
  status: PatchImportStatus;
  stagingChangeCount: number;
  analysis: PatchAnalysis;
};

export type PatchAnalysisInputLoadResult = {
  patchImport: PatchImportForParsing;
  input: PatchAnalysisInput;
};

export class PatchImportNotFoundError extends Error {
  constructor(message = "Patch import was not found.") {
    super(message);
    this.name = "PatchImportNotFoundError";
  }
}

export class PatchImportNotReadyError extends Error {
  constructor(message = "Patch import is not ready to parse.") {
    super(message);
    this.name = "PatchImportNotReadyError";
  }
}

export async function importPatchNoteFromUrl(
  sourceUrl: string,
): Promise<PatchImportResult> {
  const normalizedUrl = normalizeOfficialPatchUrl(sourceUrl);
  const existingImport = await findPatchImportBySourceUrl(normalizedUrl);

  if (existingImport) {
    // 이미 같은 URL로 가져온 패치라면 외부 fetch를 다시 하지 않고 기존 import를 재사용한다.
    return {
      patchImport: existingImport,
      created: false,
      duplicate: true,
    };
  }

  try {
    const importedContent = await fetchOfficialPatchNote(normalizedUrl);

    return await saveImportedPatchContent(importedContent);
  } catch (error) {
    if (error instanceof PatchFetchError) {
      // 공식 페이지 fetch 실패도 DB에 남겨야 운영자가 실패 이력을 확인하고 재시도할 수 있다.
      await recordPatchImportFailure({
        sourceUrl: normalizedUrl,
        action: "IMPORT",
        message: error.message,
        metadata: {
          stage: "fetch",
          sourceUrl: normalizedUrl,
        },
      });
    }

    throw error;
  }
}

export async function recordPatchParseFailure(
  sourceUrl: string,
  message: string,
  stage: "parse" | "staging" = "parse",
): Promise<void> {
  // parser/staging 실패를 같은 PARSE 액션 로그로 남기되, metadata.stage로 원인을 구분한다.
  await recordPatchImportFailure({
    sourceUrl: normalizeOfficialPatchUrl(sourceUrl),
    action: "PARSE",
    message,
    metadata: {
      stage,
    },
  });
}

export async function parsePatchImport(
  patchImportId: string,
  options: { forceReparse?: boolean } = {},
): Promise<PatchParseResult> {
  const { input, patchImport } = await loadPatchAnalysisInput(
    patchImportId,
    options,
  );

  try {
    const analysis = await analyzePatchWithLlm(input);
    const stagingResult = await savePatchAnalysisToStaging(
      patchImport.id,
      analysis,
    );
    const updatedPatchImport = await recordPatchParseSuccess({
      patchImportId: patchImport.id,
      sourceUrl: patchImport.sourceUrl,
      parsedChangeCount: analysis.changes.length,
      stagingChangeCount: stagingResult.stagingChangeCount,
    });

    return {
      patchImportId: updatedPatchImport.id,
      status: updatedPatchImport.status,
      stagingChangeCount: stagingResult.stagingChangeCount,
      analysis,
    };
  } catch (error) {
    await recordPatchParseFailure(
      patchImport.sourceUrl,
      error instanceof Error ? error.message : "Patch parser failed.",
      error instanceof PatchStagingSaveError ? "staging" : "parse",
    );

    throw error;
  }
}

export async function loadPatchAnalysisInput(
  patchImportId: string,
  options: { forceReparse?: boolean } = {},
): Promise<PatchAnalysisInputLoadResult> {
  const patchImport = await findPatchImportById(patchImportId);

  if (!patchImport) {
    throw new PatchImportNotFoundError();
  }

  assertPatchImportCanParse(patchImport, options.forceReparse ?? false);

  return {
    patchImport,
    input: buildPatchAnalysisInput(patchImport),
  };
}

function assertPatchImportCanParse(
  patchImport: PatchImportForParsing,
  forceReparse: boolean,
) {
  if (!patchImport.title || !patchImport.patchDate) {
    throw new PatchImportNotReadyError(
      "Patch import requires title and patch date before parsing.",
    );
  }

  if (!patchImport.contentHash) {
    throw new PatchImportNotReadyError(
      "Patch import requires content hash before parsing.",
    );
  }

  if (!forceReparse && ["PARSED", "REVIEWING", "APPLIED"].includes(patchImport.status)) {
    throw new PatchImportNotReadyError(
      "Patch import was already parsed. Use forceReparse to parse again.",
    );
  }
}

function buildPatchAnalysisInput(
  patchImport: PatchImportForParsing,
): PatchAnalysisInput {
  if (!patchImport.title || !patchImport.patchDate) {
    throw new PatchImportNotReadyError(
      "Patch import requires title and patch date before parsing.",
    );
  }

  // rawText는 공개 응답에는 숨기고, parser 입력을 만들 때만 내부 record에서 꺼낸다.
  const rawContent = getRawContentForParser(patchImport);

  return {
    patchId: createPatchId(patchImport),
    patchTitle: patchImport.title,
    patchDate: patchImport.patchDate,
    sourceUrl: patchImport.sourceUrl,
    rawContent,
  };
}

function getRawContentForParser(patchImport: PatchImportForParsing) {
  const rawText = patchImport.rawText;

  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    throw new PatchImportNotReadyError(
      "Patch import requires raw text before parsing.",
    );
  }

  return rawText;
}

function createPatchId(patchImport: PatchImportForParsing) {
  const titleSlug = slugify(patchImport.title ?? "overwatch-patch-notes");
  const dateSlug = patchImport.patchDate ?? "unknown-date";

  return `ow2-${dateSlug}-${titleSlug}`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "patch-notes";
}
