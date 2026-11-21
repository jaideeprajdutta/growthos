"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { growthosApi as api } from "@/lib/api";
import type { Company, ResearchPage, ResearchRun } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TERMINAL_STATUSES = new Set<ResearchRun["status"]>(["completed", "partially_completed", "failed"]);

/** Real website-research workspace: start runs, poll state, list pages, retry failures, show extracted evidence. */
export function ResearchPanel({ company }: { company: Company }) {
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const runs = useApi<ResearchRun[]>(() => api.listResearchRuns(company.id), `research-runs-${company.id}-${refreshKey}`);
  const latestRun = (runId ? runs.data?.find((run) => run.id === runId) : null) ?? runs.data?.[0] ?? null;
  const pages = useApi<ResearchPage[]>(
    latestRun ? () => api.listResearchPages(company.id, latestRun.id) : null,
    `research-pages-${company.id}-${latestRun?.id}-${refreshKey}`
  );

  async function startResearch() {
    setStarting(true);
    setStartError(null);
    try {
      const run = await api.startResearch(company.id, company.website || "");
      setRunId(run.id);
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        const list = await api.listResearchRuns(company.id);
        const current = list.find((item) => item.id === run.id) ?? run;
        if (TERMINAL_STATUSES.has(current.status)) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start research.");
    } finally {
      setStarting(false);
      setRefreshKey((key) => key + 1);
    }
  }

  async function retryPage(pageId: string) {
    try {
      await api.retryResearchPage(company.id, pageId);
      setRefreshKey((key) => key + 1);
    } catch {
      /* the run page refresh will surface the failure via statuses */
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Website research</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRefreshKey((key) => key + 1)} disabled={runs.loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => void startResearch()} disabled={starting}>
              <RotateCcw className="h-4 w-4" />
              {starting ? "Starting…" : "Start research"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {runs.loading ? (
          <Skeleton className="h-8 w-64" />
        ) : runs.error ? (
          <p className="text-sm text-destructive">{runs.error}</p>
        ) : !latestRun ? (
          <EmptyState
            title="No research yet"
            description="Start research to crawl the company's public website: sitemap discovery, robots.txt compliance, a BFS crawl and per-page extracted evidence."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="max-w-md truncate text-fg-muted">Source: {latestRun.sourceUrl}</span>
              <StatusBadge status={latestRun.status} />
              <span className="text-fg-muted">{latestRun.pagesScanned} pages scanned</span>
              {latestRun.errorMessage && <span className="text-destructive">{latestRun.errorMessage}</span>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Words</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pages.data ?? []).map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="max-w-md truncate font-medium text-fg">{page.title || page.url}</TableCell>
                    <TableCell><StatusBadge status={page.status} /></TableCell>
                    <TableCell>{page.wordCount}</TableCell>
                    <TableCell className="text-right">
                      {page.status === "failed" && page.id && (
                        <Button variant="secondary" size="sm" onClick={() => void retryPage(page.id)}>Retry</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {startError && <p className="text-sm text-destructive">{startError}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
