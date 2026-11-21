"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ExperimentFormDialog } from "@/components/growth/experiment-form-dialog";
import { formatDate } from "@/lib/utils";
import type { Experiment, Opportunity } from "@/types";

export default function ExperimentsPage() {
  const { company: activeCompany, loading: loadingCompany, error: companyError } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";
  const [listKey, setListKey] = useState(0);
  const { data: experiments, loading, error } = useApi<Experiment[]>(
    companyId ? () => growthosApi.listExperiments(companyId) : null,
    `experiments-${companyId}-${listKey}`
  );
  const opportunities = useApi<Opportunity[]>(
    companyId ? () => growthosApi.listOpportunities(companyId) : null,
    `experiment-list-opportunities-${companyId}`
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Experiment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const opportunityTitles = new Map((opportunities.data ?? []).map((item) => [item.id, item.title]));

  async function deleteExperiment(experimentId: string) {
    setDeleting(true);
    try {
      await growthosApi.deleteExperiment(companyId, experimentId);
      toast.success("Experiment deleted");
      setConfirmDeleteId(null);
      setListKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the experiment.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiments"
        description="Plan, approve, run and learn from measurable experiments linked to real opportunities and diagnoses."
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add experiment
          </Button>
        }
      />

      {loadingCompany ? (
        <Card className="p-4"><Skeleton className="h-4 w-40" /><Skeleton className="mt-2 h-3 w-48" /></Card>
      ) : companyError ? (
        <EmptyState title="Couldn't load the workspace" description={companyError} />
      ) : !activeCompany ? (
        <EmptyState title="No active company yet" description="Add a company first — experiments are recorded per company." action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>} />
      ) : loading ? (
        <Card className="p-4"><Skeleton className="h-4 w-40" /><Skeleton className="mt-2 h-3 w-48" /></Card>
      ) : error ? (
        <EmptyState title="Couldn't load the experiments" description={error} />
      ) : experiments?.length === 0 ? (
        <EmptyState
          title="No experiments yet"
          description="Add an experiment to define a hypothesis, audience, intervention, success metric and guardrails."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add experiment</Button>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Experiment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Success metric</TableHead>
                <TableHead>Period</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(experiments ?? []).map((experiment) => (
                <TableRow key={experiment.id}>
                  <TableCell className="max-w-xs">
                    <Link
                      href={`/experiments/${experiment.id}`}
                      aria-label={`Open ${experiment.name}`}
                      className="font-medium text-fg hover:underline"
                    >
                      {experiment.name}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{experiment.hypothesis}</p>
                  </TableCell>
                  <TableCell><StatusBadge status={experiment.status} /></TableCell>
                  <TableCell className="max-w-[12rem] truncate text-fg-muted">
                    {experiment.opportunityId ? opportunityTitles.get(experiment.opportunityId) ?? "Linked opportunity" : "—"}
                  </TableCell>
                  <TableCell className="text-fg-muted">{experiment.owner || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-fg-muted">{experiment.successMetric || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-fg-muted">
                    {formatDate(experiment.startDate)} → {formatDate(experiment.endDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/experiments/${experiment.id}`}
                        aria-label={`View ${experiment.name}`}
                        className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        aria-label={`Edit ${experiment.name}`}
                        onClick={() => { setEditing(experiment); setDialogOpen(true); }}
                        className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${experiment.name}`}
                        onClick={() => setConfirmDeleteId(experiment.id)}
                        className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ExperimentFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        companyId={companyId}
        experiment={editing}
        onSaved={() => setListKey((key) => key + 1)}
      />

      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete experiment" description={`Delete ${experiments?.find((item) => item.id === confirmDeleteId)?.name ?? "this experiment"} and its tasks, measurements and review? This cannot be undone.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={() => void deleteExperiment(confirmDeleteId!)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
