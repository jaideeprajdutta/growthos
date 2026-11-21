"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActivityLogEntry, Experiment, GrowthObjective, Opportunity } from "@/types";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatusCountsTable({ title, statuses }: { title: string; statuses: { status: string; count: number }[] }) {
  if (statuses.length === 0) {
    return <EmptyState title={`No ${title.toLowerCase()} data yet`} description="Record data — outcomes appear here as real data is added." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {statuses.map((row) => (
          <TableRow key={row.status}>
            <TableCell><StatusBadge status={row.status} /></TableCell>
            <TableCell className="text-right">{row.count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function statusCounts(data: Array<{ status: string }> | null | undefined): { status: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const item of data ?? []) counts[item.status] = (counts[item.status] ?? 0) + 1;
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => ({ status, count }));
}

export default function AnalyticsPage() {
  const { company, loading, error } = useActiveCompany();
  const companyId = company?.id ?? "";

  const opportunities = useApi<Opportunity[]>(companyId ? () => growthosApi.listOpportunities(companyId) : null, "analytics-opportunities");
  const experiments = useApi<Experiment[]>(companyId ? () => growthosApi.listExperiments(companyId) : null, "analytics-experiments");
  const activity = useApi<ActivityLogEntry[]>(companyId ? () => growthosApi.listActivity(companyId) : null, "analytics-activity");
  const objectives = useApi<GrowthObjective[]>(companyId ? () => growthosApi.listGrowthObjectives(companyId) : null, "analytics-objectives");

  const activityByDay = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const entry of activity.data ?? []) {
      const day = entry.createdAt.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
    return Object.entries(byDay).sort(([a], [b]) => (a > b ? -1 : 1));
  }, [activity.data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (error) {
    return <EmptyState title="Couldn't load the workspace" description={error} />;
  }
  if (!company) {
    return <EmptyState title="No active company yet" description="Add a company to start recording growth data." />;
  }

  const objectivesCount = objectives.data?.length ?? 0;
  const opportunitiesCount = opportunities.data?.length ?? 0;
  const experimentsCount = experiments.data?.length ?? 0;
  const activityCount = activity.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Growth performance, opportunity outcomes and experiment outcomes — from real data recorded in GrowthOS." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Growth objectives</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{objectivesCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Opportunities</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{opportunitiesCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Experiments</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{experimentsCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Activity entries</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{activityCount}</p>
        </Card>
      </div>

      <Section title="Opportunity outcomes" description="Opportunities by status, from real data.">
        <StatusCountsTable title="Opportunities" statuses={statusCounts(opportunities.data)} />
      </Section>

      <Section title="Experiment outcomes" description="Experiments by status, from real data.">
        <StatusCountsTable title="Experiments" statuses={statusCounts(experiments.data)} />
      </Section>

      <Section title="Activity trends" description="Entries recorded per day — newest first.">
        {activityByDay.length === 0 ? (
          <EmptyState title="No activity data yet" description="Record data — daily activity appears as company data is added." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead className="text-right">Entries</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {activityByDay.map(([day, count]) => (
                <TableRow key={day}>
                  <TableCell className="text-fg-muted">{day}</TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Growth performance">
        <EmptyState
          title="No results recorded yet"
          description="Performance metrics come from experiment results as they are recorded. Record outcomes on the Experiments page once experiments run."
        />
      </Section>
    </div>
  );
}
