/**
 * Pure normalization functions.
 *
 * Each provider returns a *different* raw shape. These functions convert each
 * raw shape into the canonical {@link OrganicResult} array, applying the same
 * business rules everywhere:
 *
 *   1. Drop results that don't have BOTH a title and a URL (not a real result).
 *   2. Re-number positions 1..N based on surviving order (Google page 1 = top
 *      to bottom), so the output is always a clean, gapless ranking even when
 *      the provider omits a `position` field or returns holes.
 *   3. Coerce missing fields to safe defaults (empty string / null).
 *
 * These functions are intentionally pure (no I/O, no side effects) so they can
 * be exhaustively unit-tested without mocking any network calls.
 */

import type {
  GoogleCseItem,
  OrganicResult,
  SerpApiOrganicResult,
  ZaiSearchItem,
} from "./types";

/** A result counts as "organic & valid" only if it has a title AND a URL. */
export function isOrganicResult(
  candidate: Partial<OrganicResult>,
): candidate is OrganicResult {
  const hasTitle =
    typeof candidate.title === "string" && candidate.title.trim().length > 0;
  const hasUrl =
    typeof candidate.url === "string" && candidate.url.trim().length > 0;
  return hasTitle && hasUrl;
}

/**
 * Re-number any list of (already-validated) results into a gapless 1..N
 * ranking. This is the single source of truth for `position` in the output.
 */
export function renumberPositions(results: OrganicResult[]): OrganicResult[] {
  return results.map((result, index) => ({
    ...result,
    position: index + 1,
  }));
}

/**
 * Normalize a raw SerpAPI organic_results[] payload.
 *
 * SerpAPI returns objects shaped like:
 *   `{ position, title, link, displayed_link, snippet, date }`
 */
export function normalizeSerpApi(
  raw: SerpApiOrganicResult[],
): OrganicResult[] {
  const mapped: Partial<OrganicResult>[] = (raw ?? []).map((item) => ({
    position: typeof item.position === "number" ? item.position : 0,
    title: item.title ?? "",
    url: item.link ?? "",
    displayedUrl: item.displayed_link ?? item.link ?? "",
    snippet: item.snippet ?? "",
    date: item.date ?? null,
  }));

  const valid = mapped.filter(isOrganicResult) as OrganicResult[];
  return renumberPositions(valid);
}

/**
 * Normalize a raw Google Custom Search API `items[]` payload.
 *
 * Google CSE does NOT return a position field, so positions are derived purely
 * from array order.
 */
export function normalizeGoogleCse(raw: GoogleCseItem[]): OrganicResult[] {
  const mapped: Partial<OrganicResult>[] = (raw ?? []).map((item) => ({
    position: 0,
    title: item.title ?? "",
    url: item.link ?? "",
    displayedUrl: item.formattedUrl ?? item.displayLink ?? item.link ?? "",
    snippet: item.snippet ?? "",
    date: null,
  }));

  const valid = mapped.filter(isOrganicResult) as OrganicResult[];
  return renumberPositions(valid);
}

/**
 * Normalize a raw z-ai-web-dev-sdk `web_search` payload.
 *
 * The SDK returns objects shaped like:
 *   `{ url, name, snippet, host_name, rank, date, favicon }`
 */
export function normalizeZaiSdk(raw: ZaiSearchItem[]): OrganicResult[] {
  const mapped: Partial<OrganicResult>[] = (raw ?? []).map((item) => ({
    position: typeof item.rank === "number" ? item.rank : 0,
    title: item.name ?? "",
    url: item.url ?? "",
    displayedUrl: item.host_name ?? item.url ?? "",
    snippet: item.snippet ?? "",
    date: item.date && item.date !== "N/A" ? item.date : null,
  }));

  const valid = mapped.filter(isOrganicResult) as OrganicResult[];
  return renumberPositions(valid);
}
