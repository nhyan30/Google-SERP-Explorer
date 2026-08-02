/**
 * Canonical types shared by every search provider and every output formatter.
 *
 * The whole point of this module is to give us ONE stable, provider-agnostic
 * shape for "a Google first-page organic result" so that:
 *   - providers (SerpAPI / Google CSE / z-ai SDK) only have to normalize INTO it,
 *   - formatters (JSON / CSV) only have to serialize FROM it,
 *   - unit tests can assert on it without caring which provider is active.
 */

/** A single organic search result, normalized across all providers. */
export interface OrganicResult {
  /** 1-based position on the first page of Google (1 = top result). */
  position: number;
  /** Result page title. */
  title: string;
  /** Fully-qualified result URL. */
  url: string;
  /** Display URL / breadcrumb shown by Google (falls back to `url` when absent). */
  displayedUrl: string;
  /** Short snippet / description shown under the result. */
  snippet: string;
  /** Publication or indexing date as returned by the provider (raw string). */
  date: string | null;
}

/** Metadata about the search request itself. */
export interface SearchMeta {
  /** The keyword phrase that was searched. */
  query: string;
  /** ISO-8601 timestamp of when the search was executed. */
  searchedAt: string;
  /** Name of the provider that produced the results. */
  provider: SearchProviderName;
  /** Number of organic results returned. */
  resultCount: number;
}

/** The complete, provider-agnostic search response. */
export interface SearchResponse {
  meta: SearchMeta;
  results: OrganicResult[];
}

/** Identifiers for every supported search provider. */
export type SearchProviderName = "serpapi" | "google-cse" | "zai-sdk";

/** Output formats the API can serialize results into. */
export type OutputFormat = "json" | "csv";

/** The interface every provider must implement. */
export interface SearchProvider {
  /** Provider identifier (matches `SearchProviderName`). */
  readonly name: SearchProviderName;
  /** Fetch the first page of Google organic results for `query`. */
  search(query: string): Promise<OrganicResult[]>;
}

/** Raw shape returned by the SerpAPI /engine endpoint (only the fields we use). */
export interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  snippet?: string;
  date?: string;
}

/** Raw shape returned by the Google Custom Search API items[] array. */
export interface GoogleCseItem {
  title?: string;
  link?: string;
  displayLink?: string;
  snippet?: string;
  formattedUrl?: string;
}

/** Raw shape returned by z-ai-web-dev-sdk's `web_search` function. */
export interface ZaiSearchItem {
  url?: string;
  name?: string;
  snippet?: string;
  host_name?: string;
  rank?: number;
  date?: string;
  favicon?: string;
}
