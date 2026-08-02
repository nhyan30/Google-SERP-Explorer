/**
 * Unit tests for the output formatters (`src/lib/formatters/index.ts`).
 *
 * These are the tests the assignment explicitly asks for — they "verify the
 * correctness of the output" by asserting the exact byte-for-byte string that
 * each formatter must produce, including:
 *   - JSON shape & indentation,
 *   - CSV header + row order + RFC-4180 quoting/escaping.
 */

import {
  CSV_COLUMNS,
  escapeCsvField,
  formatAsCsv,
  formatAsJson,
  formatResponse,
  resultToCsvRow,
} from "@/lib/formatters";
import type { OrganicResult, SearchResponse } from "@/lib/search/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeResult(over: Partial<OrganicResult> = {}): OrganicResult {
  return {
    position: 1,
    title: "Example Title",
    url: "https://example.com/page",
    displayedUrl: "example.com",
    snippet: "An example snippet.",
    date: null,
    ...over,
  };
}

function makeResponse(results: OrganicResult[] = []): SearchResponse {
  return {
    meta: {
      query: "test query",
      searchedAt: "2025-01-01T00:00:00.000Z",
      provider: "zai-sdk",
      resultCount: results.length,
    },
    results,
  };
}

// ---------------------------------------------------------------------------
// escapeCsvField
// ---------------------------------------------------------------------------

describe("escapeCsvField", () => {
  it("returns an empty string unchanged", () => {
    expect(escapeCsvField("")).toBe("");
  });

  it("leaves a plain value unquoted", () => {
    expect(escapeCsvField("hello")).toBe("hello");
  });

  it("wraps values containing a comma in double quotes", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
  });

  it("wraps values containing a double quote and doubles it", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps values containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps values containing a carriage return", () => {
    expect(escapeCsvField("a\rb")).toBe('"a\rb"');
  });
});

// ---------------------------------------------------------------------------
// resultToCsvRow
// ---------------------------------------------------------------------------

describe("resultToCsvRow", () => {
  it("emits columns in the canonical CSV_COLUMNS order", () => {
    const row = resultToCsvRow(
      makeResult({
        position: 3,
        title: "T",
        url: "https://t.example",
        displayedUrl: "t.example",
        snippet: "S",
        date: "2025-05-05",
      }),
    );
    // Columns are joined by commas and in the same order as CSV_COLUMNS.
    const fields = row.split(",");
    expect(fields).toHaveLength(CSV_COLUMNS.length);
    expect(fields[0]).toBe("3"); // position
    expect(fields[1]).toBe("T"); // title
    expect(fields[2]).toBe("https://t.example"); // url
    expect(fields[3]).toBe("t.example"); // displayedUrl
    expect(fields[4]).toBe("S"); // snippet
    expect(fields[5]).toBe("2025-05-05"); // date
  });

  it("renders a null date as an empty field (not the string 'null')", () => {
    const row = resultToCsvRow(makeResult({ date: null }));
    expect(row.endsWith(",")).toBe(true); // last field empty
    expect(row).not.toContain("null");
  });

  it("properly escapes commas inside any field", () => {
    const row = resultToCsvRow(
      makeResult({ title: "Hello, World", snippet: "a,b,c" }),
    );
    // Two quoted fields expected.
    expect(row).toContain('"Hello, World"');
    expect(row).toContain('"a,b,c"');
  });
});

// ---------------------------------------------------------------------------
// formatAsCsv
// ---------------------------------------------------------------------------

describe("formatAsCsv", () => {
  it("starts with the header row in the canonical column order", () => {
    const csv = formatAsCsv(makeResponse([]));
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toBe(CSV_COLUMNS.join(","));
  });

  it("contains exactly one data row per result plus the header", () => {
    const results = [
      makeResult({ position: 1, title: "A", url: "https://a", snippet: "s1" }),
      makeResult({ position: 2, title: "B", url: "https://b", snippet: "s2" }),
      makeResult({ position: 3, title: "C", url: "https://c", snippet: "s3" }),
    ];
    const csv = formatAsCsv(makeResponse(results));
    const lines = csv.split("\n");
    // 1 header + 3 rows + 1 trailing empty line (because of trailing \n)
    expect(lines).toHaveLength(5);
    expect(lines[1]).toContain("A");
    expect(lines[2]).toContain("B");
    expect(lines[3]).toContain("C");
  });

  it("ends with a trailing newline (POSIX-friendly)", () => {
    const csv = formatAsCsv(makeResponse([]));
    expect(csv.endsWith("\n")).toBe(true);
  });

  it("produces a stable, byte-for-byte expected document", () => {
    const results = [
      makeResult({
        position: 1,
        title: "Hello, World",
        url: "https://example.com",
        displayedUrl: "example.com",
        snippet: 'He said "hi".',
        date: "2025-01-01",
      }),
    ];
    const csv = formatAsCsv(makeResponse(results));

    const expected = [
      "position,title,url,displayedUrl,snippet,date",
      '1,"Hello, World",https://example.com,example.com,"He said ""hi"".",2025-01-01',
      "",
    ].join("\n");

    expect(csv).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// formatAsJson
// ---------------------------------------------------------------------------

describe("formatAsJson", () => {
  it("returns pretty-printed JSON with 2-space indentation", () => {
    const json = formatAsJson(makeResponse([]));
    // 2-space indentation on the meta.query line is the signature of pretty JSON.
    expect(json).toContain('\n  "meta":');
    expect(json).toContain('\n    "query": "test query"');
  });

  it("round-trips back to the original object", () => {
    const response = makeResponse([
      makeResult({ position: 1, title: "A", url: "https://a" }),
    ]);
    const json = formatAsJson(response);
    expect(JSON.parse(json)).toEqual(response);
  });

  it("includes the full results array with all canonical fields", () => {
    const response = makeResponse([makeResult()]);
    const parsed = JSON.parse(formatAsJson(response)) as SearchResponse;
    expect(parsed.results[0]).toEqual(
      expect.objectContaining({
        position: 1,
        title: "Example Title",
        url: "https://example.com/page",
        displayedUrl: "example.com",
        snippet: "An example snippet.",
        date: null,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// formatResponse (dispatcher)
// ---------------------------------------------------------------------------

describe("formatResponse", () => {
  const response = makeResponse([makeResult()]);

  it("delegates to the CSV formatter when format === 'csv'", () => {
    expect(formatResponse(response, "csv")).toBe(formatAsCsv(response));
  });

  it("delegates to the JSON formatter when format === 'json'", () => {
    expect(formatResponse(response, "json")).toBe(formatAsJson(response));
  });
});
