/**
 * z-ai-web-dev-sdk provider (built-in fallback).
 *
 * This provider exists so the application is **fully runnable out of the box**
 * in the sandbox / on Render without requiring the applicant to sign up for a
 * SerpAPI trial or create a Google CSE. It uses the `web_search` function
 * exposed by `z-ai-web-dev-sdk`, which returns organic-style web search
 * results (title, url, snippet, host, rank).
 *
 * For production-grade "literal Google first page" results, configure either
 * `SERPAPI_API_KEY` or `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CSE` — the factory
 * will automatically prefer those providers over this one.
 */

import ZAI from "z-ai-web-dev-sdk";

import type { OrganicResult, SearchProvider, ZaiSearchItem } from "../types";
import { normalizeZaiSdk } from "../normalize";

export class ZaiSdkProvider implements SearchProvider {
  readonly name = "zai-sdk" as const;

  async search(query: string): Promise<OrganicResult[]> {
    const zai = await ZAI.create();

    const raw = (await zai.functions.invoke("web_search", {
      query,
      num: 10,
    })) as ZaiSearchItem[];

    if (!Array.isArray(raw)) {
      return [];
    }

    return normalizeZaiSdk(raw);
  }
}
