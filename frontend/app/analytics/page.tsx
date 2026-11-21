"use client";

import Link from "next/link";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPercent, humanLabel } from "@/lib/utils";
import type { CompanyStats } from "@/types";

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-fg">{value}</p>
      {hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
    </Card>
  );
}

function CountRows({ counts, emptyLabel }: { counts: Record<string, number>; emptyLabel: string }) {
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (rows.length === 0 || rows.every(([, count]) => count === 0)) {
    return <p className="text-sm text-fg-muted">{emptyLabel}</p>;
  }
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map(([key, count]) => (
          <TableRow key={key}>
            <TableCell><StatusBadge status={key} /></TableCell>
            <TableCell className="text-right">{count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AnalyticsPage() {
  const { company, loading, error } = useActiveCompany();
  const companyId = company?.id ?? "";
  const stats = useApi<CompanyStats>(companyId ? () => growthosApi.getCompanyStats(companyId) : null, `analytics-stats-${companyId}`);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title="Couldn't load the workspace" description={error} />;
  }
  if (!company) {
    return <EmptyState title="No active company yet" description="Add a company to start recording growth data." action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>} />;
  }
  if (stats.loading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (stats.error || !stats.data) {
    return <EmptyState title="Couldn't load analytics" description={stats.error ?? "Statistics are unavailable for this company."} />;
  }

  const data = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Counts and summaries calculated from records stored in GrowthOS — no demo metrics or placeholder charts." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Growth objectives" value={data.objectives} />
        <StatCard label="Opportunities" value={data.opportunities} hint={`${data.opportunitiesByStatus.completed ?? 0} completed`} />
        <StatCard label="Experiments" value={data.totalExperiments} hint={`${data.runningExperiments} running · ${data.completedExperiments} completed`} />
        <StatCard label="Measurements" value={data.measurementsRecorded} hint="User-entered, imported or estimated" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Experiment outcomes</CardTitle><CardDescription>Outcome reviews recorded for completed experiments.</CardDescription></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard label="Successful" value={data.successfulExperiments} />
            <StatCard label="Unsuccessful" value={data.unsuccessfulExperiments} />
            <StatCard label="Inconclusive" value={data.inconclusiveExperiments} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Execution</CardTitle><CardDescription>Task progress across all experiments.</CardDescription></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard label="Tasks completed" value={`${data.tasksCompleted} / ${data.tasksTotal}`} />
            <StatCard label="In progress" value={data.tasksInProgress} />
            <StatCard label="Blocked" value={data.tasksBlocked} />
            <StatCard label="Awaiting approval" value={data.tasksAwaitingApproval} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Measurement sources</CardTitle><CardDescription>Every measurement keeps its origin.</CardDescription></CardHeader>
          <CardContent>
            <CountRows counts={data.outcomesBySource} emptyLabel="No measurements recorded yet." />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Opportunities by status</CardTitle><CardDescription>From the opportunity records for this company.</CardDescription></CardHeader>
          <CardContent><CountRows counts={data.opportunitiesByStatus} emptyLabel="No opportunities recorded yet." /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Experiments by status</CardTitle><CardDescription>From the current experiment lifecycle state.</CardDescription></CardHeader>
          <CardContent><CountRows counts={data.experimentsByStatus} emptyLabel="No experiments recorded yet." /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Experiment performance</CardTitle>
          <CardDescription>Latest recorded measurement, execution progress and outcome for each experiment.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.experimentSummaries.length === 0 ? (
            <EmptyState title="No experiments to summarise" description="Create an experiment to see real progress and measurement data here." action={<Link href="/experiments"><Button>Go to experiments</Button></Link>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Experiment</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Latest measurement</TableHead>
                  <TableHead>Learning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.experimentSummaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell className="max-w-[14rem]">
                      <Link href={`/experiments/${summary.id}`} className="font-medium text-fg hover:underline">{summary.name}</Link>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-fg-muted">{summary.opportunityTitle ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={summary.status} /></TableCell>
                    <TableCell className="text-sm text-fg">
                      {summary.tasksCompleted} / {summary.tasksTotal}
                      {summary.tasksAwaitingApproval > 0 ? <Badge color="amber" className="ml-2">{summary.tasksAwaitingApproval} awaiting approval</Badge> : null}
                    </TableCell>
                    <TableCell>
                      {summary.latestMeasurement ? (
                        <div className="text-xs text-fg-muted">
                          <p className="text-sm text-fg">
                            {formatNumber(summary.latestMeasurement.baselineValue)} → {formatNumber(summary.latestMeasurement.observedValue)}
                          </p>
                          <p>{humanLabel(summary.latestMeasurement.dataSource)} · {formatPercent(summary.latestMeasurement.targetAttainmentPct)} attainment</p>
                        </div>
                      ) : <span className="text-fg-muted">—</span>}
                    </TableCell>
                    <TableCell>{summary.learningOutcome ? <StatusBadge status={summary.learningOutcome} /> : <span className="text-fg-muted">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
