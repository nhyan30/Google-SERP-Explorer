/**
 * Google Custom Search JSON API provider —
 * https://developers.google.com/custom-search/v1/overview
 *
 * This is the second provider recommended by the assignment. It is an official
 * Google API, so its results are genuine Google results (scoped to a Custom
 * Search Engine). Free tier: 100 queries/day.
 *
 * Activate it by setting BOTH `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_CX`
 * (CX = the Custom Search Engine ID) in your environment.
 */

import type {
  GoogleCseItem,
  OrganicResult,
  SearchProvider,
} from "../types";
import { normalizeGoogleCse } from "../normalize";

const GOOGLE_CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

export class GoogleCseProvider implements SearchProvider {
  readonly name = "google-cse" as const;

  constructor(
    private readonly apiKey: string,
    private readonly cx: string,
  ) {
    if (!apiKey || !cx) {
      throw new Error(
        "GoogleCseProvider requires both GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX.",
      );
    }
  }

  async search(query: string): Promise<OrganicResult[]> {
    const url = new URL(GOOGLE_CSE_ENDPOINT);
    url.searchParams.set("q", query);
    // First page of Google = 10 results.
    url.searchParams.set("num", "10");
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("cx", this.cx);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `Google CSE request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as { items?: GoogleCseItem[] };

    return normalizeGoogleCse(payload.items ?? []);
  }
}
