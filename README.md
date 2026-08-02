# Google SERP Explorer — INIZIO Practical Test

A small web application that lets you type a **keyword phrase** into a single
input field and receive the **first page of Google organic search results**,
which you can then **save to your computer** in a machine-readable, structured
format (**JSON** or **CSV**).

Built for the INIZIO Internet Media s.r.o. practical test.

---

## ✨ What it does

1. **One input field** — type any keyword phrase.
2. **First-page organic results** — fetched from Google (SerpAPI or Google
   Custom Search API), or from the built-in web-search provider for a no-config
   demo.
3. **Structured download** — export the results as **JSON** or **CSV** (not
   HTML), straight to your computer.
4. **Unit-tested** — 50 Jest tests verify the correctness of the output
   (normalization + JSON/CSV formatting), including RFC-4180 CSV escaping.
5. **Dockerized** — a single `docker compose up` runs the whole thing.
6. **Deployable** — ready for Render / Railway / Fly.

---

## 🧱 Tech stack

| Layer        | Choice                                              | Why                                             |
| ------------ | --------------------------------------------------- | ----------------------------------------------- |
| Frontend     | React + Next.js + Tailwind CSS + shadcn/ui          | Clean, accessible, responsive UI                |
| Backend      | Next.js Route Handlers (`/api/search`)              | Same process, no separate Express server needed |
| Google data  | **SerpAPI** _or_ **Google Custom Search API**       | Both recommended by the brief                   |
| Fallback     | built-in `z-ai-web-dev-sdk` `web_search` function   | Makes the app runnable with zero API keys       |
| Testing      | **Jest** + `ts-jest`                                | Required by the brief                           |
| Packaging    | Docker + docker-compose                             | Optional bonus from the brief                   |

> The brief lists Node.js + Express; we use Next.js Route Handlers which are
> the idiomatic Node.js HTTP layer in this stack. The search logic itself lives
> in plain TypeScript modules (`src/lib`) that are framework-agnostic and could
> be lifted into an Express app verbatim.

---

## 🚀 Quick start (local)

```bash
# 1. Install dependencies
bun install            # or: npm install / yarn

# 2. (Optional) configure a provider — see .env.example
cp .env.example .env   # then edit .env

# 3. Run the dev server
bun run dev            # http://localhost:3000
```

Open <http://localhost:3000>, type a query, hit **Search**, then **JSON** or
**CSV** to download.

### Run the unit tests

```bash
bun run test
# or: npm test
```

---

## 🐳 Quick start (Docker)

```bash
# Run the whole app (builds the image, serves on http://localhost:3000)
docker compose up --build

# In a separate terminal — run the unit tests in their own container
docker compose run --rm test
```

No `.env` file is required for the Docker demo: the built-in provider kicks in
automatically. To use real Google results, set `SERPAPI_API_KEY` (or the Google
CSE pair) in `.env` before `docker compose up`.

---

## 🔑 Provider configuration

Provider selection is **automatic**, based on which environment variables are
present (see `.env.example`):

| Priority | Env vars                                  | Provider used            |
| -------- | ----------------------------------------- | ------------------------ |
| 1        | `SERPAPI_API_KEY`                         | SerpAPI                  |
| 2        | `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`    | Google Custom Search API |
| 3        | _(none)_                                  | built-in z-ai SDK search |

- **SerpAPI** — <https://serpapi.com/> — free 100 searches/month. Returns the
  closest equivalent to a real Google SERP, including positions and dates.
- **Google Custom Search API** — official Google endpoint, free 100 queries/day.
  Create a Custom Search Engine with "Search the entire web" enabled to get
  general results.
- **Built-in fallback** — uses the `web_search` function of the
  `z-ai-web-dev-sdk`. Lets reviewers try the app instantly without signing up
  for anything.

---

## 🌐 API reference

### `POST /api/search`

```jsonc
// Request body
{ "query": "best espresso machine 2025" }

// Optional query string: ?format=json|csv  (default: json)
```

```jsonc
// 200 response (format=json)
{
  "meta": {
    "query": "best espresso machine 2025",
    "searchedAt": "2025-01-15T12:34:56.789Z",
    "provider": "zai-sdk",
    "resultCount": 10
  },
  "results": [
    {
      "position": 1,
      "title": "The Best Espresso Machines of 2025",
      "url": "https://example.com/article",
      "displayedUrl": "example.com › article",
      "snippet": "We tested 30 machines…",
      "date": "2025-01-02"
    }
    // …
  ]
}
```

### `GET /api/search?q=<query>&format=csv`

Returns the same data as a `text/csv` download — perfect for a direct
`<a href>` "save as" link or `curl`.

```bash
curl -o results.csv "http://localhost:3000/api/search?q=next+js+hosting&format=csv"
```

### `GET /api/health`

Returns `{ "status": "ok", "time": "…" }`. Used by the Docker `HEALTHCHECK`
and deployment probes.

---

## 🗂️ Project structure

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── search/route.ts      # POST/GET /api/search  (the API)
│   │   │   └── health/route.ts      # GET /api/health       (liveness)
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # The single-input UI
│   │   └── globals.css
│   ├── components/ui/               # shadcn/ui primitives
│   └── lib/
│       ├── search/
│       │   ├── types.ts             # Canonical OrganicResult / SearchResponse
│       │   ├── normalize.ts         # Pure provider → canonical mappers
│       │   ├── index.ts             # resolveProvider() + performSearch()
│       │   └── providers/
│       │       ├── serpapi.ts
│       │       ├── google-cse.ts
│       │       └── zai-sdk.ts
│       └── formatters/
│           └── index.ts             # JSON + CSV formatters (RFC-4180)
├── __tests__/
│   ├── normalize.test.ts            # Provider normalization correctness
│   ├── formatters.test.ts           # Output correctness (JSON + CSV bytes)
│   └── search.test.ts               # Factory selection + performSearch wrapping
├── jest.config.ts
├── Dockerfile                       # Multi-stage: deps → build → test → runtime
├── docker-compose.yml               # `docker compose up` runs everything
├── .env.example
└── README.md
```

---

## 🧪 Testing

The brief asks that tests _"at a minimum verify the correctness of the output"_.
All output-producing logic lives in pure, side-effect-free functions so it can
be tested exhaustively without mocking network calls.

```bash
bun run test            # run once, verbose
bun run test:watch      # TDD mode
bun run test:coverage   # with coverage report
```

### What's covered (50 tests, 3 suites)

| Suite                 | What it verifies                                                                 |
| --------------------- | -------------------------------------------------------------------------------- |
| `normalize.test.ts`   | Each provider's raw payload → canonical `OrganicResult[]`: field mapping, dropping invalid entries, gapless 1..N renumbering, default coercion. |
| `formatters.test.ts`  | **Byte-for-byte** JSON & CSV output, RFC-4180 quoting/escaping, header order, trailing newline, null handling, round-trip parse. |
| `search.test.ts`      | Environment-driven provider selection rules + `performSearch` response metadata (trimming, ISO timestamp, result count). |

Example — the formatter test asserts the exact CSV document:

```ts
expect(csv).toBe(
  [
    "position,title,url,displayedUrl,snippet,date",
    '1,"Hello, World",https://example.com,example.com,"He said ""hi"".",2025-01-01',
    "",
  ].join("\n"),
);
```

---

## ☁️ Deployment (Render / Railway)

The app is a standard Next.js standalone build.

### Render

1. **New → Web Service**, connect your GitHub repo.
2. Build command: `npm install && npm run build`
3. Start command: `npm run start`
4. Add env vars (`SERPAPI_API_KEY` _or_ `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`)
   — or leave blank to use the built-in provider.
5. Health check path: `/api/health`

### Railway

1. **New Project → Deploy from GitHub repo**.
2. Railway auto-detects Next.js. Add the same env vars as above.
3. Expose port `3000`.

### Docker (any host)

```bash
docker build -t serp-explorer .
docker run -p 3000:3000 --env-file .env serp-explorer
```

---

## 📄 License

Submitted as part of a job application to INIZIO Internet Media s.r.o.
