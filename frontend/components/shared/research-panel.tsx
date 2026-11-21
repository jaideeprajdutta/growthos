"use client";

import { useEffect, useState } from "react";
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
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60_000;

/** Real website-research workspace: start runs, poll state, list pages, retry failures, show extracted evidence. */
export function ResearchPanel({ company }: { company: Company }) {
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [runsData, setRunsData] = useState<ResearchRun[] | null>(null);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRunsLoading(true);
      try {
        const list = await api.listResearchRuns(company.id);
        if (!cancelled) {
          setRunsData(list);
          setRunsError(null);
        }
      } catch (err) {
        // Transient failure: keep showing the last known runs.
        if (!cancelled) setRunsError(err instanceof Error ? err.message : "Failed to load research.");
      } finally {
        if (!cancelled) setRunsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [company.id, refreshKey]);

  const latestRun = runsData?.[0] ?? null;
  const activeRun = runId ? (runsData?.find((run) => run.id === runId) ?? null) : latestRun;
  const pages = useApi<ResearchPage[]>(
    activeRun ? () => api.listResearchPages(company.id, activeRun.id) : null,
    `research-pages-${company.id}-${activeRun?.id}-${refreshKey}`
  );

  // The run we are actively polling: a non-terminal run after refresh.
  const pollingRunId = activeRun && !TERMINAL_STATUSES.has(activeRun.status) && !pollTimedOut ? activeRun.id : null;

  // Bounded polling: refresh the runs list every few seconds until the run is terminal.
  useEffect(() => {
    if (!pollingRunId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    const poll = async () => {
      if (cancelled) return;
      setRefreshKey((key) => key + 1);
      try {
        const list = await api.listResearchRuns(company.id);
        const current = list.find((item) => item.id === pollingRunId) ?? null;
        if (cancelled) return;
        if (current && !TERMINAL_STATUSES.has(current.status)) {
          if (Date.now() < deadline) timer = setTimeout(poll, POLL_INTERVAL_MS);
          else setPollTimedOut(true);
        }
      } catch {
        // Transient network failure: poll again shortly after.
        if (!cancelled && Date.now() < deadline) timer = setTimeout(poll, 5000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollingRunId, company.id]);

  async function startResearch() {
    setStarting(true);
    setStartError(null);
    setRetryError(null);
    setPollTimedOut(false);
    try {
      const run = await api.startResearch(company.id, company.website || "");
      setRunId(run.id);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start research.");
    } finally {
      setStarting(false);
      setRefreshKey((key) => key + 1);
    }
  }

  async function retryPage(pageId: string) {
    setRetryError(null);
    try {
      await api.retryResearchPage(company.id, pageId);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Failed to retry the page.");
    }
  }

  function handleRefresh() {
    setPollTimedOut(false);
    setRefreshKey((key) => key + 1);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Website research</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={runsLoading}>
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
        {startError ? <p className="text-sm text-destructive">{startError}</p> : null}
        {runsLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : runsError && !activeRun ? (
          <p className="text-sm text-destructive">{runsError}</p>
        ) : !activeRun ? (
          <EmptyState
            title="No research yet"
            description="Start research to crawl the company's public website: sitemap discovery, robots.txt compliance, a BFS crawl and per-page extracted evidence."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="max-w-md truncate text-fg-muted">Source: {activeRun.sourceUrl}</span>
              <StatusBadge status={activeRun.status} />
              <span className="text-fg-muted">{activeRun.pagesScanned} pages scanned</span>
              {pollingRunId ? <span className="text-xs text-fg-muted">updating automatically…</span> : null}
              {pollTimedOut && activeRun.status !== "failed" ? <span className="text-xs text-fg-muted">polling paused — press Refresh to resume</span> : null}
              {activeRun.errorMessage && <span className="text-destructive">{activeRun.errorMessage}</span>}
            </div>
            {retryError ? <p className="text-sm text-destructive">{retryError}</p> : null}
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
            {TERMINAL_STATUSES.has(activeRun.status) && (pages.data ?? []).length === 0 ? (
              <EmptyState
                title="No pages found"
                description="This website-research run finished with no pages. Try starting research again with a different URL."
              />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
