"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowDownUp } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { opportunitySchema } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EvidenceViewer } from "@/components/shared/evidence-viewer";
import { useToast } from "@/components/ui/toast";
import { OPPORTUNITY_STATUSES } from "@/lib/validation";
import type { Evidence, Opportunity, OpportunityCreate, OpportunityDetail, OpportunityStatus, OpportunityUpdate } from "@/types";

const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  proposed: "Proposed",
  prioritized: "Prioritized",
  selected: "Selected",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
};

const OPPORTUNITY_STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  ...OPPORTUNITY_STATUSES.map((status) => ({ value: status, label: OPPORTUNITY_STATUS_LABELS[status] ?? status })),
];

const DEFAULT_DIALOG_VALUES = {
  title: "",
  description: "",
  supportingEvidence: "",
  expectedImpact: "",
  confidence: 50,
  effort: 5,
  risk: "",
  priorityScore: null as number | null,
  status: "proposed" as const,
  recommendedNextAction: "",
};

function useOpportunityForm() {
  const form = useForm({
    resolver: zodResolver(opportunitySchema),
    mode: "onChange",
    defaultValues: DEFAULT_DIALOG_VALUES,
  });
  return form;
}

export default function OpportunitiesPage() {
  const { company: activeCompany, loading: loadingCompany, error: companyError } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";
  const { data: opportunities, loading, error } = useApi<Opportunity[]>(companyId ? () => growthosApi.listOpportunities(companyId) : null, "opportunities");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const [detail, setDetail] = useState<OpportunityDetail | null>(null);
  const [statusDraft, setStatusDraft] = useState<OpportunityStatus>("proposed");
  const [updating, setUpdating] = useState(false);
  const evidence = useApi<Evidence[]>(detail ? () => growthosApi.listEvidence(companyId) : null, detail ? `opp-evidence-${detail.opportunity.id}` : "opp-evidence");

  async function openDetail(opportunityId: string) {
    try {
      const loaded = await growthosApi.getOpportunityDetail(companyId, opportunityId);
      setDetail(loaded);
      setStatusDraft(loaded.opportunity.status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load the opportunity.");
    }
  }

  async function updateStatus() {
    if (!detail || updating) return;
    setUpdating(true);
    try {
      await growthosApi.updateOpportunityStatus(companyId, detail.opportunity.id, statusDraft);
      toast.success(`Status updated to ${statusDraft}.`);
      const reloaded = await growthosApi.getOpportunityDetail(companyId, detail.opportunity.id);
      setDetail(reloaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update the status.");
    } finally {
      setUpdating(false);
    }
  }

  async function createExperimentFor(opportunityId: string) {
    try {
      await growthosApi.createExperimentForOpportunity(companyId, opportunityId);
      toast.success("Experiment created — linked to the opportunity.");
      const reloaded = await growthosApi.getOpportunityDetail(companyId, opportunityId);
      setDetail(reloaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create the experiment.");
    }
  }

  const form = useOpportunityForm();
  const submittingNow = submitting;

  async function saveOpportunity(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      if (editing) {
        await growthosApi.updateOpportunity(companyId, editing.id, values as unknown as OpportunityUpdate);
        toast.success("Opportunity updated");
      } else {
        await growthosApi.createOpportunity(companyId, values as unknown as OpportunityCreate);
        toast.success("Opportunity created");
      }
      setDialogOpen(false);
      setEditing(null);
      form.reset(DEFAULT_DIALOG_VALUES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the opportunity.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteOpportunity(opportunityId: string) {
    setDeleting(true);
    try {
      await growthosApi.deleteOpportunity(companyId, opportunityId);
      toast.success("Opportunity deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the opportunity.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = (opportunities ?? []).filter((opportunity) => {
    if (statusFilter && opportunity.status !== statusFilter) return false;
    if (!search) return true;
    return opportunity.title.toLowerCase().includes(search.toLowerCase()) || opportunity.description.toLowerCase().includes(search.toLowerCase());
  });

  const priorityValue = (opportunity: Opportunity) => opportunity.priorityScore ?? -1;
  const sorted = [...filtered].sort((a, b) => priorityValue(b) - priorityValue(a));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        description="Growth opportunities identified for the active company — their supporting evidence, expected impact and priority."
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); form.reset(DEFAULT_DIALOG_VALUES); }}>
            <Plus className="h-4 w-4" />
            Record opportunity
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search opportunities…" aria-label="Search opportunities" className="sm:max-w-xs" startIcon={<ArrowDownUp className="h-4 w-4 text-fg-muted" />} />
        <Select value={statusFilter} onChange={setStatusFilter} options={OPPORTUNITY_STATUS_FILTERS} aria-label="Filter by status" className="sm:max-w-xs" />
      </div>

      {loadingCompany ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="p-4"><div className="h-4 w-36 rounded bg-muted" /><div className="mt-2 h-3 w-48 rounded bg-muted" /></Card>
          ))}
        </div>
      ) : companyError ? (
        <EmptyState title="Couldn't load the workspace" description={companyError} />
      ) : !activeCompany ? (
        <EmptyState title="No active company yet" description="Add a company first — opportunities are recorded per company." action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>} />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="p-4"><div className="h-4 w-36 rounded bg-muted" /><div className="mt-2 h-3 w-48 rounded bg-muted" /></Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load opportunities" description={error} />
      ) : opportunities?.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          description="Record your first growth opportunity: title, description, supporting evidence, expected impact, confidence and effort."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true); form.reset(DEFAULT_DIALOG_VALUES); }}><Plus className="h-4 w-4" /> Record opportunity</Button>}
        />
      ) : sorted.length === 0 ? (
        <EmptyState title="No opportunities match your filters" description="Try a different search or clear the status filter." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Effort</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Recommended action</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((opportunity) => (
              <TableRow key={opportunity.id}>
                <TableCell className="max-w-sm truncate font-medium text-fg">{opportunity.title}</TableCell>
                <TableCell><StatusBadge status={opportunity.status} /></TableCell>
                <TableCell>{opportunity.confidence}%</TableCell>
                <TableCell>{opportunity.effort}</TableCell>
                <TableCell>{opportunity.priorityScore ?? "—"}</TableCell>
                <TableCell className="max-w-sm truncate text-fg-muted">{opportunity.recommendedNextAction || "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`View ${opportunity.title}`} onClick={() => void openDetail(opportunity.id)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg"><span className="sr-only">View</span><EyeIcon /></button>
                    <button type="button" aria-label={`Edit ${opportunity.title}`} onClick={() => { setEditing(opportunity); setDialogOpen(true); form.reset({ title: opportunity.title, description: opportunity.description, supportingEvidence: opportunity.supportingEvidence, expectedImpact: opportunity.expectedImpact, confidence: opportunity.confidence, effort: opportunity.effort, risk: opportunity.risk, priorityScore: opportunity.priorityScore, status: opportunity.status, recommendedNextAction: opportunity.recommendedNextAction }); }} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg"><span className="sr-only">Edit</span><PencilIcon /></button>
                    <button type="button" aria-label={`Delete ${opportunity.title}`} onClick={() => setConfirmDeleteId(opportunity.id)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? `Edit opportunity` : "Record a new opportunity"}>
        <div className="space-y-4">
          <Input label="Title" {...form.register("title")} error={form.formState.errors.title?.message} />
          <Input label="Description" {...form.register("description")} />
          <Input label="Supporting evidence" placeholder="E.g. traffic data, survey results, docs" {...form.register("supportingEvidence")} />
          <Input label="Expected impact" {...form.register("expectedImpact")} />
          <Input label="Risk" {...form.register("risk")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input type="number" label="Confidence (0–100)" {...form.register("confidence", { valueAsNumber: true })} error={form.formState.errors.confidence?.message} />
            <Input type="number" label="Effort (1–10)" {...form.register("effort", { valueAsNumber: true })} error={form.formState.errors.effort?.message} />
            <Input type="number" label="Priority (0–100, optional)" {...form.register("priorityScore", { valueAsNumber: true, setValueAs: (value: unknown) => (value === "" ? null : value as number) })} />
          </div>
          <Select label="Status" value={form.watch("status") ?? "proposed"} onChange={(value) => form.setValue("status", value as (typeof OPPORTUNITY_STATUSES)[number])} options={OPPORTUNITY_STATUSES.map((status) => ({ value: status, label: OPPORTUNITY_STATUS_LABELS[status] ?? status }))} error={form.formState.errors.status?.message} />
          <Input label="Recommended next action" {...form.register("recommendedNextAction")} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={submittingNow}>Cancel</Button>
            <Button onClick={() => void form.handleSubmit((values) => void saveOpportunity(values as unknown as Record<string, unknown>))()} disabled={submittingNow}>
              {submittingNow ? "Saving…" : editing ? "Update opportunity" : "Record opportunity"}
            </Button>
          </div>
        </div>
      </Dialog>

      {detail && <Dialog open onClose={() => setDetail(null)} title={detail.opportunity.title}>
        <div className="space-y-4">
          <div className="space-y-1 text-sm">
            <p className="text-fg-muted">{detail.opportunity.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
              <span>Confidence {detail.opportunity.confidence}% · Effort {detail.opportunity.effort} · Priority {detail.opportunity.priorityScore ?? "—"}</span>
              <span>Recommended: {detail.opportunity.recommendedNextAction || "—"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Linked experiments</h4>
            {detail.experiments.length === 0 ? (
              <p className="text-sm text-fg-muted">No experiments yet.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Experiment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detail.experiments.map((experiment) => (
                    <TableRow key={experiment.id}>
                      <TableCell className="max-w-sm truncate font-medium text-fg">{experiment.hypothesis}</TableCell>
                      <TableCell><StatusBadge status={experiment.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Button variant="primary" onClick={() => void createExperimentFor(detail.opportunity.id)}>Create experiment</Button>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Status transition</h4>
            <div className="flex gap-2">
              <Select value={statusDraft} onChange={(value) => setStatusDraft(value as OpportunityStatus)} options={OPPORTUNITY_STATUSES.map((status) => ({ value: status, label: OPPORTUNITY_STATUS_LABELS[status] ?? status }))} />
              <Button disabled={updating} onClick={() => void updateStatus()}>Update status</Button>
            </div>
          </div>
          <EvidenceViewer evidence={(evidence.data ?? []).filter((item) => detail.evidenceIds.includes(item.id))} />
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
          </div>
        </div>
      </Dialog>}

      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete opportunity" description={`Delete ${opportunities?.find((o) => o.id === confirmDeleteId)?.title ?? "this opportunity"}? This cannot be undone.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={() => void deleteOpportunity(confirmDeleteId!)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}
