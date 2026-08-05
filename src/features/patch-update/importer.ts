import { createHash } from "node:crypto";

const ALLOWED_PATCH_HOST = "overwatch.blizzard.com";

export type ImportedPatchContent = {
  sourceUrl: string;
  title: string | null;
  patchDate: string | null;
  rawHtml: string;
  rawText: string;
  contentHash: string;
};

export class UnsupportedPatchSourceError extends Error {
  constructor(message = "Only official Overwatch patch note URLs are supported.") {
    super(message);
    this.name = "UnsupportedPatchSourceError";
  }
}

export class PatchFetchError extends Error {
  constructor(message = "Failed to fetch patch note HTML.") {
    super(message);
    this.name = "PatchFetchError";
  }
}

export async function fetchOfficialPatchNote(
  sourceUrl: string,
): Promise<ImportedPatchContent> {
  const normalizedUrl = normalizeOfficialPatchUrl(sourceUrl);
  const response = await fetch(normalizedUrl, {
    cache: "no-store",
    headers: {
      // 공식 페이지가 일반 브라우저 요청처럼 처리되도록 최소 User-Agent를 보낸다.
      "User-Agent": "overwatch-patch-insight/1.0",
    },
  });

  if (!response.ok) {
    throw new PatchFetchError(
      `Patch note request failed with status ${response.status}.`,
    );
  }

  const rawHtml = await response.text();
  const rawText = extractReadableText(rawHtml);

  if (!rawText) {
    throw new PatchFetchError("Patch note HTML did not include readable text.");
  }

  return {
    sourceUrl: normalizedUrl,
    title: extractTitle(rawHtml),
    patchDate: extractPatchDate(rawHtml, rawText),
    rawHtml,
    rawText,
    contentHash: createContentHash(rawText),
  };
}

export function normalizeOfficialPatchUrl(sourceUrl: string) {
  let url: URL;

  try {
    url = new URL(sourceUrl);
  } catch {
    throw new UnsupportedPatchSourceError("Patch source URL is invalid.");
  }

  if (url.protocol !== "https:" || url.hostname !== ALLOWED_PATCH_HOST) {
    throw new UnsupportedPatchSourceError();
  }

  if (!isOfficialPatchPath(url.pathname)) {
    throw new UnsupportedPatchSourceError(
      "URL must point to an official Overwatch patch notes page.",
    );
  }

  url.search = "";
  url.hash = "";

  return url.toString();
}

function isOfficialPatchPath(pathname: string) {
  const normalizedPath = pathname.toLowerCase();
  const localizedNewsPathPattern =
    /^\/[a-z]{2}-[a-z]{2}\/news\/patch-notes(?:\/.*)?$/;

  // 언어 prefix가 붙은 /en-us/news/patch-notes 형태와 구형 /patch-notes 형태를 모두 허용한다.
  return (
    localizedNewsPathPattern.test(normalizedPath) ||
    normalizedPath === "/news/patch-notes/" ||
    normalizedPath === "/news/patch-notes" ||
    normalizedPath === "/patch-notes/" ||
    normalizedPath === "/patch-notes"
  );
}

function extractTitle(rawHtml: string) {
  const patchTitle = matchClassText(rawHtml, "h3", "PatchNotes-patchTitle");
  const ogTitle = matchMetaContent(rawHtml, "property", "og:title");
  const documentTitle = matchTagText(rawHtml, "title");

  return cleanText(patchTitle ?? ogTitle ?? documentTitle ?? "");
}

function extractPatchDate(rawHtml: string, rawText: string) {
  const patchDate = matchClassText(rawHtml, "div", "PatchNotes-date");

  if (patchDate) {
    return parsePatchDateValue(patchDate);
  }

  const publishedTime = matchMetaContent(
    rawHtml,
    "property",
    "article:published_time",
  );

  if (publishedTime) {
    return publishedTime.slice(0, 10);
  }

  return inferPatchDateFromText(rawText);
}

export function inferPatchDateFromText(rawText: string) {
  const dateMatch = rawText.match(ENGLISH_PATCH_DATE_PATTERN);

  if (dateMatch) {
    return parseEnglishPatchDate(dateMatch[0]);
  }

  const koreanDateMatch = rawText.match(KOREAN_PATCH_DATE_PATTERN);

  if (koreanDateMatch) {
    return parseKoreanPatchDate(koreanDateMatch[0]);
  }

  return null;
}

function parsePatchDateValue(value: string) {
  return parseEnglishPatchDate(value) ?? parseKoreanPatchDate(value);
}

function extractReadableText(rawHtml: string) {
  const articleHtml =
    extractLatestPatchHtml(rawHtml) ??
    matchTagBlock(rawHtml, "main") ??
    matchTagBlock(rawHtml, "article") ??
    rawHtml;

  return cleanText(
    articleHtml
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h1|h2|h3|h4|section|div|ul)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

const ENGLISH_PATCH_DATE_PATTERN =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i;
const KOREAN_PATCH_DATE_PATTERN = /\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일/;

const ENGLISH_MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function extractLatestPatchHtml(rawHtml: string) {
  const firstPatchMatch = rawHtml.match(
    /<div[^>]+class=["'][^"']*\bPatchNotes-patch\b[^"']*["'][^>]*>/i,
  );

  if (firstPatchMatch?.index === undefined) {
    return null;
  }

  const startIndex = firstPatchMatch.index;
  const remainingHtml = rawHtml.slice(startIndex + firstPatchMatch[0].length);
  const nextPatchMatch = remainingHtml.match(
    /<div[^>]+class=["'][^"']*\bPatchNotes-patch\b[^"']*["'][^>]*>/i,
  );
  const nextPatchIndex = nextPatchMatch?.index;
  const endIndex = nextPatchIndex !== undefined
    ? startIndex + firstPatchMatch[0].length + nextPatchIndex
    : rawHtml.length;

  // 공식 패치노트 페이지는 여러 패치를 한 페이지에 렌더링하므로 최신 첫 블록만 잘라낸다.
  return rawHtml.slice(startIndex, endIndex);
}

function parseEnglishPatchDate(value: string) {
  const dateMatch = cleanText(value).match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/i,
  );

  if (!dateMatch) {
    return null;
  }

  const [, monthName, day, year] = dateMatch;
  const monthIndex = ENGLISH_MONTHS[monthName.toLowerCase()];

  if (monthIndex === undefined) {
    return null;
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseKoreanPatchDate(value: string) {
  const dateMatch = cleanText(value).match(
    /^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일$/,
  );

  if (!dateMatch) {
    return null;
  }

  const [, year, month, day] = dateMatch;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function matchMetaContent(rawHtml: string, attribute: string, value: string) {
  const escapedAttribute = escapeRegExp(attribute);
  const escapedValue = escapeRegExp(value);
  const metaPattern = new RegExp(
    `<meta[^>]+${escapedAttribute}=["']${escapedValue}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversedMetaPattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${escapedAttribute}=["']${escapedValue}["'][^>]*>`,
    "i",
  );

  return rawHtml.match(metaPattern)?.[1] ?? rawHtml.match(reversedMetaPattern)?.[1];
}

function matchTagText(rawHtml: string, tagName: string) {
  return matchTagBlock(rawHtml, tagName)?.replace(/<[^>]+>/g, " ");
}

function matchClassText(rawHtml: string, tagName: string, className: string) {
  const escapedTagName = escapeRegExp(tagName);
  const escapedClassName = escapeRegExp(className);
  const pattern = new RegExp(
    `<${escapedTagName}[^>]+class=["'][^"']*\\b${escapedClassName}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`,
    "i",
  );

  return rawHtml.match(pattern)?.[1]?.replace(/<[^>]+>/g, " ");
}

function matchTagBlock(rawHtml: string, tagName: string) {
  const escapedTagName = escapeRegExp(tagName);
  const pattern = new RegExp(
    `<${escapedTagName}[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`,
    "i",
  );

  return rawHtml.match(pattern)?.[1];
}

function createContentHash(rawText: string) {
  return createHash("sha256").update(rawText).digest("hex");
}

function cleanText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
