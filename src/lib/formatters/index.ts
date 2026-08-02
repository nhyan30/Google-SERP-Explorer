/**
 * Output formatters — convert a {@link SearchResponse} into a machine-readable,
 * structured (non-HTML) string that can be downloaded and saved.
 *
 * Two formats are supported:
 *   - `json` : pretty-printed, 2-space indented JSON (the canonical shape).
 *   - `csv`  : RFC-4180-ish CSV with a header row, proper quoting of commas,
 *              quotes and newlines.
 *
 * Both formatters are pure functions so they can be unit-tested exhaustively.
 */

import type { OrganicResult, SearchResponse } from "../search/types";

/** Shared, stable column order used by the CSV formatter. */
export const CSV_COLUMNS = [
  "position",
  "title",
  "url",
  "displayedUrl",
  "snippet",
  "date",
] as const;

/**
 * Quote a single CSV field per RFC 4180:
 *   - wrap in double quotes,
 *   - escape embedded double quotes by doubling them.
 */
export function escapeCsvField(value: string): string {
  if (value === "") return "";
  const needsQuoting = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

/** Format a {@link SearchResponse} as pretty-printed JSON. */
export function formatAsJson(response: SearchResponse): string {
  return JSON.stringify(response, null, 2);
}

/** Convert a single {@link OrganicResult} into one CSV row (no trailing newline). */
export function resultToCsvRow(result: OrganicResult): string {
  const fields: string[] = CSV_COLUMNS.map((column) => {
    const value = result[column] ?? "";
    return escapeCsvField(String(value));
  });
  return fields.join(",");
}

/** Format a {@link SearchResponse} as CSV (header row + one row per result). */
export function formatAsCsv(response: SearchResponse): string {
  const header = CSV_COLUMNS.join(",");
  const rows = response.results.map(resultToCsvRow);
  // Trailing newline keeps the file POSIX-friendly.
  return [header, ...rows].join("\n") + "\n";
}

/** Dispatcher: format a response in the requested format. */
export function formatResponse(
  response: SearchResponse,
  format: "json" | "csv",
): string {
  if (format === "csv") return formatAsCsv(response);
  return formatAsJson(response);
}
