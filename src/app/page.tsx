"use client";

import { useCallback, useState } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Globe,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

import type { OrganicResult, SearchResponse } from "@/lib/search/types";

type Status = "idle" | "loading" | "success" | "error";

const PROVIDER_LABELS: Record<string, string> = {
  "serpapi": "SerpAPI",
  "google-cse": "Google Custom Search API",
  "zai-sdk": "Built-in Web Search (z-ai SDK)",
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string>("");

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error("Please enter a keyword phrase first.");
      return;
    }

    setStatus("loading");
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(
          body.detail || body.error || `Request failed (${res.status}).`,
        );
      }

      const data = (await res.json()) as SearchResponse;
      setResponse(data);
      setStatus("success");
      toast.success(
        `Found ${data.meta.resultCount} organic result${
          data.meta.resultCount === 1 ? "" : "s"
        } via ${PROVIDER_LABELS[data.meta.provider] ?? data.meta.provider}.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed.";
      setError(message);
      setStatus("error");
      toast.error(message);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  };

  const download = useCallback(
    (format: "json" | "csv") => {
      if (!response) return;
      const trimmed = response.meta.query;
      const params = new URLSearchParams({ q: trimmed, format });
      // Triggers the browser's native download via the GET endpoint.
      window.location.href = `/api/search?${params.toString()}`;
    },
    [response],
  );

  const copyJson = useCallback(async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      toast.success("JSON copied to clipboard.");
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }, [response]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Toaster richColors position="top-center" />

      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Search className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold leading-tight truncate">
                Google SERP Explorer
              </h1>
              <p className="text-xs text-muted-foreground leading-tight truncate">
                First-page organic results &middot; exportable to JSON / CSV
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Search a keyword phrase</CardTitle>
            <CardDescription>
              Enter a query and we&apos;ll fetch the first page of Google
              organic results. Save them to your computer as structured JSON or
              CSV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="search"
                inputMode="search"
                placeholder="e.g. best espresso machine 2025"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Keyword phrase"
                className="h-12 text-base flex-1"
                maxLength={200}
              />
              <Button
                onClick={runSearch}
                disabled={status === "loading"}
                className="h-12 px-6 text-base shrink-0"
                size="lg"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Enter</kbd> to search.
            </p>
          </CardContent>
        </Card>

        <section className="mt-6">
          {status === "loading" && <LoadingSkeleton />}

          {status === "error" && (
            <Card className="border-destructive/40">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive font-medium">
                  {error || "Something went wrong."}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  If the built-in provider is unavailable, configure a
                  SerpAPI or Google Custom Search API key in your environment.
                </p>
              </CardContent>
            </Card>
          )}

          {status === "success" && response && (
            <ResultsView
              response={response}
              onDownload={download}
              onCopyJson={copyJson}
            />
          )}

          {status === "idle" && <EmptyState />}
        </section>
      </main>

      <footer className="border-t bg-background mt-auto">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-5 text-center text-xs text-muted-foreground">
          &middot; Next.js + TypeScript +
          Jest &middot; provider:{" "}
          {response ? (
            <span className="font-medium text-foreground">
              {PROVIDER_LABELS[response.meta.provider] ?? response.meta.provider}
            </span>
          ) : (
            "auto-detected from env"
          )}
        </div>
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 flex flex-col items-center text-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Globe className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No results yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Type a keyword phrase above and hit Search to retrieve the first
            page of Google organic results.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ResultsView({
  response,
  onDownload,
  onCopyJson,
}: {
  response: SearchResponse;
  onDownload: (format: "json" | "csv") => void;
  onCopyJson: () => void;
}) {
  const { meta, results } = response;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                Results for
                <span className="text-primary">&ldquo;{meta.query}&rdquo;</span>
              </CardTitle>
              <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{meta.resultCount} organic result{results.length === 1 ? "" : "s"}</span>
                <span aria-hidden>·</span>
                <span>via {PROVIDER_LABELS[meta.provider] ?? meta.provider}</span>
                <span aria-hidden>·</span>
                <span>{new Date(meta.searchedAt).toLocaleString()}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onCopyJson}
                disabled={results.length === 0}
              >
                <FileJson className="h-4 w-4" />
                Copy JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload("json")}
                disabled={results.length === 0}
              >
                <Download className="h-4 w-4" />
                JSON
              </Button>
              <Button
                size="sm"
                onClick={() => onDownload("csv")}
                disabled={results.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No organic results returned for this query.
            </p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[16rem]">Title &amp; URL</TableHead>
                    <TableHead className="min-w-[20rem]">Snippet</TableHead>
                    <TableHead className="w-28 text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r: OrganicResult) => (
                    <TableRow key={`${r.position}-${r.url}`}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {r.position}
                      </TableCell>
                      <TableCell>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground hover:text-primary hover:underline line-clamp-2"
                        >
                          {r.title}
                        </a>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {r.displayedUrl || r.url}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="line-clamp-3">{r.snippet || "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {r.date ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
