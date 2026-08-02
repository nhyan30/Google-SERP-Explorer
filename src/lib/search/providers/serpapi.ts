/**
 * SerpAPI provider — https://serpapi.com/
 *
 * This is one of the two providers recommended by the assignment. It returns
 * the closest thing to a real Google SERP (including `organic_results` with
 * positions, displayed links, dates, etc.).
 *
 * Activate it by setting `SERPAPI_API_KEY` in your environment.
 */

import type { OrganicResult, SearchProvider, SerpApiOrganicResult } from "../types";
import { normalizeSerpApi } from "../normalize";

const SERPAPI_ENDPOINT = "https://serpapi.com/search";

export class SerpApiProvider implements SearchProvider {
  readonly name = "serpapi" as const;

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error("SerpApiProvider requires a SERPAPI_API_KEY.");
    }
  }

  async search(query: string): Promise<OrganicResult[]> {
    const url = new URL(SERPAPI_ENDPOINT);
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    // First page of Google = 10 organic results by default.
    url.searchParams.set("num", "10");
    url.searchParams.set("api_key", this.apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `SerpAPI request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as {
      organic_results?: SerpApiOrganicResult[];
    };

    return normalizeSerpApi(payload.organic_results ?? []);
  }
}
