/**
 * Unit tests for the search factory (`src/lib/search/index.ts`).
 *
 * These verify the environment-driven provider selection rules and that
 * `performSearch` correctly wraps raw provider output into a `SearchResponse`
 * with the right metadata — without performing any real network calls (a fake
 * provider is injected).
 */

import { performSearch, resolveProvider } from "@/lib/search";
import type { OrganicResult, SearchProvider } from "@/lib/search/types";

/**
 * The factory test only exercises provider *selection* and response wrapping —
 * it never calls the real z-ai SDK. We stub the SDK so Jest doesn't have to
 * parse its ESM distribution, and so the test stays a pure unit test.
 */
jest.mock("z-ai-web-dev-sdk", () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({
      functions: { invoke: jest.fn().mockResolvedValue([]) },
    }),
  },
}));

// ---------------------------------------------------------------------------
// resolveProvider
// ---------------------------------------------------------------------------

describe("resolveProvider", () => {
  const baseEnv = { ...process.env };

  afterEach(() => {
    // Restore the original env after each test so tests stay isolated.
    process.env = { ...baseEnv };
  });

  it("selects SerpApiProvider when SERPAPI_API_KEY is set", () => {
    process.env.SERPAPI_API_KEY = "test-serp-key";
    process.env.GOOGLE_CSE_API_KEY = "test-google-key";
    process.env.GOOGLE_CSE_CX = "test-cx";
    expect(resolveProvider().name).toBe("serpapi");
  });

  it("selects GoogleCseProvider when only Google CSE creds are set", () => {
    delete process.env.SERPAPI_API_KEY;
    process.env.GOOGLE_CSE_API_KEY = "test-google-key";
    process.env.GOOGLE_CSE_CX = "test-cx";
    expect(resolveProvider().name).toBe("google-cse");
  });

  it("falls back to ZaiSdkProvider when no keys are configured", () => {
    delete process.env.SERPAPI_API_KEY;
    delete process.env.GOOGLE_CSE_API_KEY;
    delete process.env.GOOGLE_CSE_CX;
    expect(resolveProvider().name).toBe("zai-sdk");
  });

  it("ignores whitespace-only SERPAPI_API_KEY", () => {
    process.env.SERPAPI_API_KEY = "   ";
    process.env.GOOGLE_CSE_API_KEY = "test-google-key";
    process.env.GOOGLE_CSE_CX = "test-cx";
    expect(resolveProvider().name).toBe("google-cse");
  });

  it("falls back to ZaiSdkProvider when GOOGLE_CSE_CX is missing", () => {
    delete process.env.SERPAPI_API_KEY;
    process.env.GOOGLE_CSE_API_KEY = "test-google-key";
    delete process.env.GOOGLE_CSE_CX;
    expect(resolveProvider().name).toBe("zai-sdk");
  });

  it("accepts an injected env object without mutating process.env", () => {
    const provider = resolveProvider({
      SERPAPI_API_KEY: "injected",
    });
    expect(provider.name).toBe("serpapi");
    // process.env must NOT have been polluted by the call.
    expect(process.env.SERPAPI_API_KEY).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// performSearch
// ---------------------------------------------------------------------------

describe("performSearch", () => {
  const fakeResults: OrganicResult[] = [
    {
      position: 1,
      title: "A",
      url: "https://a.example.com",
      displayedUrl: "a.example.com",
      snippet: "snippet a",
      date: null,
    },
    {
      position: 2,
      title: "B",
      url: "https://b.example.com",
      displayedUrl: "b.example.com",
      snippet: "snippet b",
      date: "2025-01-01",
    },
  ];

  const fakeProvider: SearchProvider = {
    name: "zai-sdk",
    async search() {
      return fakeResults;
    },
  };

  it("wraps the provider output in a SearchResponse with correct metadata", async () => {
    const response = await performSearch("  hello world  ", fakeProvider);

    expect(response.meta.query).toBe("hello world"); // trimmed
    expect(response.meta.provider).toBe("zai-sdk");
    expect(response.meta.resultCount).toBe(2);
    expect(response.results).toEqual(fakeResults);
  });

  it("records an ISO-8601 searchedAt timestamp", async () => {
    const response = await performSearch("query", fakeProvider);
    const parsed = Date.parse(response.meta.searchedAt);
    expect(Number.isNaN(parsed)).toBe(false);
    // Should be recent (within the last 5 seconds).
    expect(Date.now() - parsed).toBeLessThan(5000);
  });

  it("returns an empty results array when the provider returns none", async () => {
    const emptyProvider: SearchProvider = {
      name: "zai-sdk",
      async search() {
        return [];
      },
    };
    const response = await performSearch("nothing here", emptyProvider);
    expect(response.results).toEqual([]);
    expect(response.meta.resultCount).toBe(0);
  });
});
