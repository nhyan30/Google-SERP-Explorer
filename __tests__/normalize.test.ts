/**
 * Unit tests for the normalization layer (`src/lib/search/normalize.ts`).
 *
 * These verify that, no matter which provider produced the raw payload, the
 * output always conforms to the canonical `OrganicResult[]` contract:
 *   - results without title OR url are dropped,
 *   - positions are always a gapless 1..N sequence,
 *   - missing optional fields fall back to safe defaults.
 */

import {
  isOrganicResult,
  normalizeGoogleCse,
  normalizeSerpApi,
  normalizeZaiSdk,
  renumberPositions,
} from "@/lib/search/normalize";
import type {
  GoogleCseItem,
  OrganicResult,
  SerpApiOrganicResult,
  ZaiSearchItem,
} from "@/lib/search/types";

// ---------------------------------------------------------------------------
// isOrganicResult
// ---------------------------------------------------------------------------

describe("isOrganicResult", () => {
  it("accepts a result with a non-empty title and url", () => {
    expect(
      isOrganicResult({ title: "Hello", url: "https://example.com" }),
    ).toBe(true);
  });

  it("rejects a result with an empty title", () => {
    expect(
      isOrganicResult({ title: "   ", url: "https://example.com" }),
    ).toBe(false);
  });

  it("rejects a result with a missing url", () => {
    expect(isOrganicResult({ title: "Hello", url: "" })).toBe(false);
  });

  it("rejects a result with neither title nor url", () => {
    expect(isOrganicResult({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// renumberPositions
// ---------------------------------------------------------------------------

describe("renumberPositions", () => {
  it("produces a gapless 1..N sequence", () => {
    const input: OrganicResult[] = [
      {
        position: 99,
        title: "A",
        url: "https://a",
        displayedUrl: "a",
        snippet: "",
        date: null,
      },
      {
        position: 5,
        title: "B",
        url: "https://b",
        displayedUrl: "b",
        snippet: "",
        date: null,
      },
      {
        position: 12,
        title: "C",
        url: "https://c",
        displayedUrl: "c",
        snippet: "",
        date: null,
      },
    ];

    const out = renumberPositions(input);
    expect(out.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("preserves all other fields verbatim", () => {
    const input: OrganicResult[] = [
      {
        position: 0,
        title: "A",
        url: "https://a",
        displayedUrl: "a",
        snippet: "keep me",
        date: "2025-01-01",
      },
    ];

    const [first] = renumberPositions(input);
    expect(first).toMatchObject({
      title: "A",
      url: "https://a",
      displayedUrl: "a",
      snippet: "keep me",
      date: "2025-01-01",
    });
  });

  it("returns an empty array for empty input", () => {
    expect(renumberPositions([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeSerpApi
// ---------------------------------------------------------------------------

describe("normalizeSerpApi", () => {
  const sample: SerpApiOrganicResult[] = [
    {
      position: 1,
      title: "First Result",
      link: "https://first.example.com",
      displayed_link: "first.example.com",
      snippet: "Snippet one",
      date: "3 days ago",
    },
    {
      position: 2,
      title: "Second Result",
      link: "https://second.example.com",
      displayed_link: "second.example.com",
      snippet: "Snippet two",
    },
  ];

  it("maps all SerpAPI fields onto the canonical shape", () => {
    const [first, second] = normalizeSerpApi(sample);

    expect(first).toEqual({
      position: 1,
      title: "First Result",
      url: "https://first.example.com",
      displayedUrl: "first.example.com",
      snippet: "Snippet one",
      date: "3 days ago",
    });

    expect(second).toEqual({
      position: 2,
      title: "Second Result",
      url: "https://second.example.com",
      displayedUrl: "second.example.com",
      snippet: "Snippet two",
      date: null,
    });
  });

  it("drops entries that lack a link", () => {
    const raw: SerpApiOrganicResult[] = [
      { title: "No link", snippet: "x" },
      ...sample,
    ];
    const out = normalizeSerpApi(raw);
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe("First Result");
  });

  it("drops entries that lack a title", () => {
    const raw: SerpApiOrganicResult[] = [
      { link: "https://no-title.example.com", snippet: "x" },
      ...sample,
    ];
    const out = normalizeSerpApi(raw);
    expect(out).toHaveLength(2);
  });

  it("renumbers positions when the provider omits them", () => {
    const raw: SerpApiOrganicResult[] = [
      { title: "A", link: "https://a" },
      { title: "B", link: "https://b" },
      { title: "C", link: "https://c" },
    ];
    expect(normalizeSerpApi(raw).map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("renumbers positions even when raw positions are out of order", () => {
    const raw: SerpApiOrganicResult[] = [
      { position: 5, title: "A", link: "https://a" },
      { position: 2, title: "B", link: "https://b" },
    ];
    expect(normalizeSerpApi(raw).map((r) => r.position)).toEqual([1, 2]);
  });

  it("returns an empty array for null/undefined input", () => {
    expect(normalizeSerpApi(undefined as unknown as SerpApiOrganicResult[])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeGoogleCse
// ---------------------------------------------------------------------------

describe("normalizeGoogleCse", () => {
  const sample: GoogleCseItem[] = [
    {
      title: "First",
      link: "https://first.example.com",
      displayLink: "first.example.com",
      formattedUrl: "https://first.example.com",
      snippet: "Snippet one",
    },
    {
      title: "Second",
      link: "https://second.example.com",
      displayLink: "second.example.com",
      snippet: "Snippet two",
    },
  ];

  it("prefers formattedUrl, then displayLink, then link for displayedUrl", () => {
    const [first, second] = normalizeGoogleCse(sample);
    expect(first.displayedUrl).toBe("https://first.example.com");
    expect(second.displayedUrl).toBe("second.example.com");
  });

  it("always derives positions from array order (CSE has no position field)", () => {
    expect(normalizeGoogleCse(sample).map((r) => r.position)).toEqual([1, 2]);
  });

  it("sets date to null because Google CSE does not return dates", () => {
    const out = normalizeGoogleCse(sample);
    expect(out.every((r) => r.date === null)).toBe(true);
  });

  it("drops entries missing a link", () => {
    const raw: GoogleCseItem[] = [{ title: "No link" }, ...sample];
    expect(normalizeGoogleCse(raw)).toHaveLength(2);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeGoogleCse([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeZaiSdk
// ---------------------------------------------------------------------------

describe("normalizeZaiSdk", () => {
  const sample: ZaiSearchItem[] = [
    {
      name: "First",
      url: "https://first.example.com",
      host_name: "first.example.com",
      snippet: "Snippet one",
      rank: 1,
      date: "2025-01-01",
      favicon: "https://first.example.com/favicon.ico",
    },
    {
      name: "Second",
      url: "https://second.example.com",
      host_name: "second.example.com",
      snippet: "Snippet two",
      rank: 2,
      date: "N/A",
    },
  ];

  it("maps z-ai SDK fields onto the canonical shape", () => {
    const [first, second] = normalizeZaiSdk(sample);

    expect(first).toEqual({
      position: 1,
      title: "First",
      url: "https://first.example.com",
      displayedUrl: "first.example.com",
      snippet: "Snippet one",
      date: "2025-01-01",
    });

    expect(second.date).toBeNull(); // "N/A" must be coerced to null
  });

  it("falls back from host_name to url for displayedUrl", () => {
    const raw: ZaiSearchItem[] = [
      { name: "A", url: "https://a.example.com" },
    ];
    expect(normalizeZaiSdk(raw)[0].displayedUrl).toBe("https://a.example.com");
  });

  it("drops entries without a url", () => {
    const raw: ZaiSearchItem[] = [{ name: "No url" }, ...sample];
    expect(normalizeZaiSdk(raw)).toHaveLength(2);
  });

  it("renumbers when rank is missing", () => {
    const raw: ZaiSearchItem[] = [
      { name: "A", url: "https://a" },
      { name: "B", url: "https://b" },
    ];
    expect(normalizeZaiSdk(raw).map((r) => r.position)).toEqual([1, 2]);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeZaiSdk([])).toEqual([]);
  });
});
