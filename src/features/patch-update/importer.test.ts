import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PatchFetchError,
  UnsupportedPatchSourceError,
  fetchOfficialPatchNote,
  normalizeOfficialPatchUrl,
} from "./importer";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeOfficialPatchUrl", () => {
  it("공식 오버워치 패치노트 URL을 정규화한다", () => {
    expect(
      normalizeOfficialPatchUrl(
        "https://overwatch.blizzard.com/en-us/news/patch-notes/#latest",
      ),
    ).toBe("https://overwatch.blizzard.com/en-us/news/patch-notes/");
  });

  it("중복 import를 줄이기 위해 query string과 hash를 제거한다", () => {
    expect(
      normalizeOfficialPatchUrl(
        "https://overwatch.blizzard.com/ko-kr/news/patch-notes/?utm_source=test#retail",
      ),
    ).toBe("https://overwatch.blizzard.com/ko-kr/news/patch-notes/");
  });

  it("구형 공식 패치노트 경로도 허용한다", () => {
    expect(normalizeOfficialPatchUrl("https://overwatch.blizzard.com/patch-notes")).toBe(
      "https://overwatch.blizzard.com/patch-notes",
    );
  });

  it("공식 도메인이 아니면 거절한다", () => {
    expect(() =>
      normalizeOfficialPatchUrl("https://example.com/en-us/news/patch-notes/"),
    ).toThrow(UnsupportedPatchSourceError);
  });

  it("공식 도메인의 다른 뉴스 URL은 거절한다", () => {
    expect(() =>
      normalizeOfficialPatchUrl("https://overwatch.blizzard.com/en-us/news/24000000/event"),
    ).toThrow(UnsupportedPatchSourceError);
  });

  it("패치노트 문자열만 포함한 비공식 경로는 거절한다", () => {
    expect(() =>
      normalizeOfficialPatchUrl(
        "https://overwatch.blizzard.com/foo/news/patch-notes-fake",
      ),
    ).toThrow(UnsupportedPatchSourceError);
  });

  it("HTTPS가 아니면 거절한다", () => {
    expect(() =>
      normalizeOfficialPatchUrl("http://overwatch.blizzard.com/en-us/news/patch-notes/"),
    ).toThrow(UnsupportedPatchSourceError);
  });
});

describe("fetchOfficialPatchNote", () => {
  it("공식 패치노트 HTML을 rawHtml, rawText, hash로 변환한다", async () => {
    const html = [
      "<html>",
      "<head>",
      '<meta property="og:title" content="Overwatch 2 Retail Patch Notes">',
      '<meta property="article:published_time" content="2026-02-24T18:00:00Z">',
      "</head>",
      "<body>",
      "<main>",
      "<h1>February 24, 2026</h1>",
      "<p>Hero Balance Changes</p>",
      "<script>window.__noise = true;</script>",
      "<p>Cassidy damage increased &amp; cooldown reduced.</p>",
      "</main>",
      "</body>",
      "</html>",
    ].join("");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(html, {
        status: 200,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOfficialPatchNote(
      "https://overwatch.blizzard.com/en-us/news/patch-notes/?utm_source=test#retail",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(result.sourceUrl).toBe(
      "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    );
    expect(result.title).toBe("Overwatch 2 Retail Patch Notes");
    expect(result.patchDate).toBe("2026-02-24");
    expect(result.rawHtml).toBe(html);
    expect(result.rawText).toContain("Hero Balance Changes");
    expect(result.rawText).toContain(
      "Cassidy damage increased & cooldown reduced.",
    );
    expect(result.rawText).not.toContain("window.__noise");
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("실제 공식 페이지의 PatchNotes-patch 구조에서 최신 첫 패치만 추출한다", async () => {
    const html = [
      '<div class="PatchNotes-list">',
      '<div class="PatchNotes-body">',
      '<div class="PatchNotes-patch PatchNotes-live">',
      '<div class="anchor" id="patch-2026-07-14"></div>',
      '<div class="PatchNotes-labels">',
      '<div class="PatchNotes-date">July 14, 2026</div>',
      "</div>",
      '<h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes – July 14, 2026</h3>',
      '<div class="PatchNotes-section PatchNotes-section-generic_update">',
      '<h4 class="PatchNotes-sectionTitle">Summer Games 2026</h4>',
      '<div class="PatchNotes-sectionDescription">',
      "<p>Summer Games 2026 is LIVE.</p>",
      "</div>",
      "</div>",
      "</div>",
      '<div class="PatchNotes-patch PatchNotes-live">',
      '<div class="anchor" id="patch-2026-07-02"></div>',
      '<div class="PatchNotes-labels">',
      '<div class="PatchNotes-date">July 2, 2026</div>',
      "</div>",
      '<h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes – July 2, 2026</h3>',
      '<p>This older patch should not be imported with the latest patch.</p>',
      "</div>",
      "</div>",
      "</div>",
    ].join("");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(html, {
          status: 200,
        }),
      ),
    );

    const result = await fetchOfficialPatchNote(
      "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    );

    expect(result.title).toBe("Overwatch Retail Patch Notes – July 14, 2026");
    expect(result.patchDate).toBe("2026-07-14");
    expect(result.rawText).toContain("Summer Games 2026");
    expect(result.rawText).toContain("Summer Games 2026 is LIVE.");
    expect(result.rawText).not.toContain("July 2, 2026");
    expect(result.rawText).not.toContain("older patch");
  });

  it("공식 페이지 응답이 실패하면 PatchFetchError를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not found", {
          status: 404,
        }),
      ),
    );

    await expect(
      fetchOfficialPatchNote(
        "https://overwatch.blizzard.com/en-us/news/patch-notes/",
      ),
    ).rejects.toThrow(PatchFetchError);
  });
});
