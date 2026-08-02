/**
 * Search provider factory + high-level orchestration.
 *
 * Provider selection is **environment driven** so the exact same code runs
 * locally, in Docker, and on Render/Railway without code changes:
 *
 *   1. `SERPAPI_API_KEY` set                       -> SerpApiProvider
 *   2. `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` set  -> GoogleCseProvider
 *   3. otherwise                                   -> ZaiSdkProvider (built-in)
 *
 * This keeps the demo instantly runnable while still being production-grade:
 * just drop a SerpAPI key into the environment to switch to real Google SERP
 * data with no code changes.
 */

import type {
  OrganicResult,
  SearchProvider,
  SearchProviderName,
  SearchResponse,
} from "./types";
import { SerpApiProvider } from "./providers/serpapi";
import { GoogleCseProvider } from "./providers/google-cse";
import { ZaiSdkProvider } from "./providers/zai-sdk";

export type { SearchProvider, SearchProviderName, SearchResponse, OrganicResult };

/**
 * Resolve which provider to use based on the current environment.
 *
 * Accepts an optional `env` override purely so unit tests can inject a fake
 * environment without touching `process.env`.
 */
export function resolveProvider(env: NodeJS.ProcessEnv = process.env): SearchProvider {
  const serpApiKey = env.SERPAPI_API_KEY?.trim();
  if (serpApiKey) {
    return new SerpApiProvider(serpApiKey);
  }

  const googleKey = env.GOOGLE_CSE_API_KEY?.trim();
  const googleCx = env.GOOGLE_CSE_CX?.trim();
  if (googleKey && googleCx) {
    return new GoogleCseProvider(googleKey, googleCx);
  }

  return new ZaiSdkProvider();
}

/**
 * Run a full search through the resolved provider and wrap the raw results in
 * a {@link SearchResponse} enriched with metadata (query, timestamp, provider,
 * result count).
 *
 * This is the single entry point used by the API route.
 */
export async function performSearch(
  query: string,
  provider?: SearchProvider,
): Promise<SearchResponse> {
  const activeProvider = provider ?? resolveProvider();
  const trimmed = query.trim();

  const results = await activeProvider.search(trimmed);

  return {
    meta: {
      query: trimmed,
      searchedAt: new Date().toISOString(),
      provider: activeProvider.name,
      resultCount: results.length,
    },
    results,
  };
}
