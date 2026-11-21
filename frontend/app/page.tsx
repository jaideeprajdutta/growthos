"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import type { ActivityLogEntry, ExecutionAction, Experiment, GrowthObjective, IntelligenceProfile, Opportunity, ResearchRun } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTimestamp } from "@/lib/utils";

const priorityValue = (opportunity: Opportunity) => opportunity.priorityScore ?? -1;

function StatCard({ title, count, href }: { title: string; count: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="h-30 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-fg">{count}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-fg-muted"><ArrowRight className="h-3 w-3" /> See details</p>
      </Card>
    </Link>
  );
}

export default function OverviewPage() {
  const { company: activeCompany, loading: loadingCompany, error: companyError } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";

  const opportunities = useApi<Opportunity[]>(companyId ? () => growthosApi.listOpportunities(companyId) : null, "company-opportunities");
  const experiments = useApi<Experiment[]>(companyId ? () => growthosApi.listExperiments(companyId) : null, "company-experiments");
  const objectives = useApi<GrowthObjective[]>(companyId ? () => growthosApi.listGrowthObjectives(companyId) : null, "company-objectives");
  const activity = useApi<ActivityLogEntry[]>(companyId ? () => growthosApi.listActivity(companyId) : null, "company-activity");
  const actions = useApi<ExecutionAction[]>(companyId ? () => growthosApi.listExecutionActions(companyId) : null, "company-actions");
  const researchRuns = useApi<ResearchRun[]>(companyId ? () => growthosApi.listResearchRuns(companyId) : null, "company-research");
  const intelligence = useApi<IntelligenceProfile | null>(companyId ? () => growthosApi.getIntelligenceProfile(companyId) : null, "company-intelligence");

  const loading = loadingCompany || (!activeCompany && !companyError);
  const opportunitiesList = opportunities.data ?? [];
  const experimentsList = experiments.data ?? [];
  const objectivesList = objectives.data ?? [];
  const activityList = activity.data ?? [];
  const actionsList = actions.data ?? [];
  const runningExperiments = experimentsList.filter((experiment) => experiment.status === "running");
  const priorityOpportunities = [...opportunitiesList].sort((a, b) => priorityValue(b) - priorityValue(a));
  const completedExperiments = experimentsList.filter((experiment) => experiment.status === "completed");

  const recommendedSteps: string[] = [];
  if (objectivesList.length === 0) recommendedSteps.push("Record your primary growth objective on the company profile page.");
  if (runningExperiments.length === 0) recommendedSteps.push("Start your first experiment from the Experiments page.");
  if (opportunitiesList.length === 0) recommendedSteps.push("Record your first growth opportunity on the Opportunities page.");

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description={activeCompany ? `Activity and status for ${activeCompany.name}.` : undefined} />
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="p-5"><div className="h-4 w-24 rounded bg-muted" /><div className="mt-3 h-8 w-20 rounded bg-muted" /></Card>
          ))}
        </div>
      ) : companyError ? (
        <EmptyState title="Couldn't load the workspace" description={companyError} />
      ) : !activeCompany ? (
        <EmptyState
          title="No active company yet"
          description="Add a company to start the GrowthOS workflow: Research → Diagnose → Prioritise → Experiment → Execute → Measure → Learn."
          action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Growth objectives" count={objectivesList.length} href="/companies" />
            <StatCard title="Opportunities" count={opportunitiesList.length} href="/opportunities" />
            <StatCard title="Running experiments" count={runningExperiments.length} href="/experiments" />
            <StatCard title="Completed experiments" count={completedExperiments.length} href="/experiments" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Active experiments</h3>
                <Link href="/experiments" className="text-xs text-fg-muted hover:text-fg">View all</Link>
              </div>
            </CardHeader>
            {runningExperiments.length === 0 ? (
              <EmptyState title="No active experiments yet" description="Start your first experiment from the Experiments page." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Experiment</TableHead><TableHead>Status</TableHead><TableHead>Target</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {runningExperiments.slice(0, 5).map((experiment) => (
                    <TableRow key={experiment.id}>
                      <TableCell className="max-w-sm truncate font-medium text-fg">{experiment.hypothesis}</TableCell>
                      <TableCell><StatusBadge status={experiment.status} /></TableCell>
                      <TableCell className="text-fg-muted">{experiment.targetAudience || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Priority opportunities</h3>
                <Link href="/opportunities" className="text-xs text-fg-muted hover:text-fg">View all</Link>
              </div>
            </CardHeader>
            {priorityOpportunities.length === 0 ? (
              <EmptyState title="No recorded opportunities yet" description="Record your first growth opportunity on the Opportunities page." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Title</TableHead><TableHead>Confidence</TableHead><TableHead>Status</TableHead><TableHead>Recommended action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {priorityOpportunities.slice(0, 5).map((opportunity) => (
                    <TableRow key={opportunity.id}>
                      <TableCell className="max-w-sm truncate text-fg">{opportunity.title}</TableCell>
                      <TableCell>{opportunity.confidence}%</TableCell>
                      <TableCell><StatusBadge status={opportunity.status} /></TableCell>
                      <TableCell className="text-fg-muted">{opportunity.recommendedNextAction || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Research & intelligence</h3>
                <Link href="/bi" className="text-xs text-fg-muted hover:text-fg">Business Intelligence</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-fg-muted">
                Research: {researchRuns.loading
                  ? "…"
                  : researchRuns.data?.[0]
                    ? `${researchRuns.data[0].pagesScanned} pages — ${researchRuns.data[0].status}`
                    : "not started"}
              </p>
              <p className="text-fg-muted">
                Intelligence profile: {intelligence.data
                  ? `v${intelligence.data.version}${intelligence.data.refreshedAt ? `, updated ${new Date(intelligence.data.refreshedAt).toLocaleDateString()}` : ""}`
                  : "not generated"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-fg">Recent activity</h3>
            </CardHeader>
            {activityList.length === 0 ? (
              <EmptyState title="No activity yet" description="Activity entries appear as company data changes — create or edit a company, or record opportunities and experiments." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Activity</TableHead><TableHead>Type</TableHead><TableHead>When</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {activityList.slice(0, 10).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="max-w-sm truncate text-fg">{entry.title}</TableCell>
                      <TableCell className="text-fg-muted">{entry.action}</TableCell>
                      <TableCell className="text-xs text-fg-muted">{formatTimestamp(entry.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Outstanding approvals</h3>
                <Link href="/execution" className="text-xs text-fg-muted hover:text-fg">Execution</Link>
              </div>
            </CardHeader>
            {actionsList.length === 0 ? (
              <EmptyState title="No outstanding approvals" description="Approved actions are tracked on the Execution page." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Action</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {actionsList.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="max-w-sm truncate text-fg">{action.title}</TableCell>
                      <TableCell><StatusBadge status={action.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-fg">Recommended next steps</h3>
            </CardHeader>
            {recommendedSteps.length === 0 ? (
              <EmptyState title="Nothing to recommend right now" description="Every stage has activities recorded — keep working through the Opportunities and Experiments pages." />
            ) : (
              <ul className="space-y-2">
                {recommendedSteps.map((step) => (
                  <li key={step} className="text-sm text-fg-muted">• {step}</li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
