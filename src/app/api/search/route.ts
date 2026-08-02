/**
 * POST /api/search
 *
 * Body: { "query": "<keyword phrase>" }
 * Optional query string: ?format=json|csv  (defaults to json)
 *
 * Returns the first page of Google organic results for the given query. The
 * response is always JSON unless `?format=csv` is requested, in which case a
 * CSV document is returned with `text/csv` content-type (handy for a direct
 * "save as" download).
 *
 * The actual search is delegated to the provider resolved in `src/lib/search`
 * (SerpAPI / Google CSE / z-ai SDK fallback), so this route stays thin.
 */

import { NextResponse } from "next/server";

import { performSearch } from "@/lib/search";
import { formatResponse } from "@/lib/formatters";
import type { OutputFormat } from "@/lib/search/types";

// Always run on the Node.js runtime — we need `fetch` + z-ai SDK, not the edge.
export const runtime = "nodejs";
// Keep responses dynamic; never cache a live SERP.
export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 200;

function parseFormat(value: string | null): OutputFormat {
  return value === "csv" ? "csv" : "json";
}

function buildFilename(query: string): string {
  const safeQuery = query.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${safeQuery}-google-results.csv`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const query =
    typeof (body as { query?: unknown })?.query === "string"
      ? ((body as { query: string }).query).trim()
      : "";

  if (!query) {
    return NextResponse.json(
      { error: 'Field "query" is required and must be a non-empty string.' },
      { status: 400 },
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at most ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const format = parseFormat(
    new URL(request.url).searchParams.get("format"),
  );

  try {
    const response = await performSearch(query);

    if (format === "csv") {
      const csv = formatResponse(response, "csv");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildFilename(query)}"`,
        },
      });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown search error.";
    return NextResponse.json(
      { error: "Search failed.", detail: message },
      { status: 502 },
    );
  }
}

/**
 * GET /api/search?q=<query>&format=json|csv
 *
 * Convenience GET form of the same endpoint, so the tool also works from a
 * plain `<a href>` link or curl.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required.' },
      { status: 400 },
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at most ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const format = parseFormat(url.searchParams.get("format"));

  try {
    const response = await performSearch(query);

    if (format === "csv") {
      const csv = formatResponse(response, "csv");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildFilename(query)}"`,
        },
      });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown search error.";
    return NextResponse.json(
      { error: "Search failed.", detail: message },
      { status: 502 },
    );
  }
}
