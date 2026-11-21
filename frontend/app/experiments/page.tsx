"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { experimentSchema } from "@/lib/validation";
import { EXPERIMENT_STATUSES } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import type { Experiment, ExperimentCreate, ExperimentUpdate } from "@/types";

const EXPERIMENT_STATUS_LABELS: Record<string, string> = {
  proposed: "Proposed",
  approved: "Approved",
  running: "Running",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
};

const DEFAULT_DIALOG_VALUES = {
  hypothesis: "",
  problem: "",
  action: "",
  targetAudience: "",
  successMetric: "",
  baseline: "",
  target: "",
  startDate: "",
  endDate: "",
  status: "proposed" as const,
};

export default function ExperimentsPage() {
  const { company: activeCompany, loading: loadingCompany, error: companyError } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";
  const { data: experiments, loading, error } = useApi<Experiment[]>(companyId ? () => growthosApi.listExperiments(companyId) : null, "experiments");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Experiment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const form = useForm({
    resolver: zodResolver(experimentSchema),
    mode: "onChange",
    defaultValues: DEFAULT_DIALOG_VALUES,
  });

  async function saveExperiment(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      if (editing) {
        await growthosApi.updateExperiment(companyId, editing.id, values as unknown as ExperimentUpdate);
        toast.success("Experiment updated");
      } else {
        await growthosApi.createExperiment(companyId, values as unknown as ExperimentCreate);
        toast.success("Experiment created");
      }
      setDialogOpen(false);
      setEditing(null);
      form.reset(DEFAULT_DIALOG_VALUES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the experiment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteExperiment(experimentId: string) {
    setDeleting(true);
    try {
      await growthosApi.deleteExperiment(companyId, experimentId);
      toast.success("Experiment deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the experiment.");
    } finally {
      setDeleting(false);
    }
  }

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
    form.reset(DEFAULT_DIALOG_VALUES);
  };

  const openEdit = (experiment: Experiment) => {
    setEditing(experiment);
    setDialogOpen(true);
    form.reset({
      hypothesis: experiment.hypothesis,
      problem: experiment.problem,
      action: experiment.action,
      targetAudience: experiment.targetAudience,
      successMetric: experiment.successMetric,
      baseline: experiment.baseline,
      target: experiment.target,
      startDate: experiment.startDate ?? "",
      endDate: experiment.endDate ?? "",
      status: experiment.status,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiments"
        description="Measurable experiments derived from opportunities — hypothesis, success metric, baseline and target."
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add experiment</Button>}
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
        <EmptyState title="No experiments yet" description="Add your first experiment to start the experiment lifecycle: Proposed → Approved → Running → Completed/Paused/Cancelled." action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add experiment</Button>} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hypothesis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Target audience</TableHead>
              <TableHead>Success metric</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(experiments ?? []).map((experiment) => (
              <TableRow key={experiment.id}>
                <TableCell className="max-w-sm truncate font-medium text-fg">{experiment.hypothesis}</TableCell>
                <TableCell><StatusBadge status={experiment.status} /></TableCell>
                <TableCell className="text-fg-muted">{experiment.targetAudience || "—"}</TableCell>
                <TableCell className="max-w-sm truncate text-fg-muted">{experiment.successMetric || "—"}</TableCell>
                <TableCell className="text-fg-muted">{experiment.startDate ? new Date(experiment.startDate).toISOString().slice(0, 10) : "—"}</TableCell>
                <TableCell className="text-fg-muted">{experiment.endDate ? new Date(experiment.endDate).toISOString().slice(0, 10) : "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Edit ${experiment.hypothesis}`} onClick={() => openEdit(experiment)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg></button>
                    <button type="button" aria-label={`Delete ${experiment.hypothesis}`} onClick={() => setConfirmDeleteId(experiment.id)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Edit experiment" : "Add experiment"} className="max-w-2xl">
        <div className="space-y-4">
          <Input label="Hypothesis" {...form.register("hypothesis")} error={form.formState.errors.hypothesis?.message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Problem" {...form.register("problem")} />
            <Input label="Proposed action" {...form.register("action")} />
            <Input label="Target audience" {...form.register("targetAudience")} />
            <Input label="Success metric" {...form.register("successMetric")} />
            <Input label="Baseline" {...form.register("baseline")} />
            <Input label="Target" {...form.register("target")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start date" type="date" {...form.register("startDate")} />
            <Input label="End date" type="date" {...form.register("endDate")} />
          </div>
          <Select label="Status" value={form.watch("status") ?? "proposed"} onChange={(value) => form.setValue("status", value as Experiment["status"])} options={EXPERIMENT_STATUSES.map((status) => ({ value: status, label: EXPERIMENT_STATUS_LABELS[status] ?? status }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void form.handleSubmit((values) => void saveExperiment(values as Record<string, unknown>))()} disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update experiment" : "Add experiment"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete experiment" description={`Delete ${experiments?.find((e) => e.id === confirmDeleteId)?.hypothesis ?? "this experiment"}? This cannot be undone.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={() => void deleteExperiment(confirmDeleteId!)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
