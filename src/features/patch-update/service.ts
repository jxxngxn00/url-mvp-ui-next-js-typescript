import {
  PatchFetchError,
  fetchOfficialPatchNote,
  normalizeOfficialPatchUrl,
} from "./importer";
import {
  findPatchImportBySourceUrl,
  recordPatchImportFailure,
  saveImportedPatchContent,
  type PatchImportResult,
} from "./repository";

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
): Promise<void> {
  // parser 연결 단계에서 같은 로그 정책을 재사용하기 위한 얇은 wrapper다.
  await recordPatchImportFailure({
    sourceUrl: normalizeOfficialPatchUrl(sourceUrl),
    action: "PARSE",
    message,
    metadata: {
      stage: "parse",
    },
  });
}
