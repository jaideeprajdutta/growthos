"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { executionActionSchema, EXECUTION_ACTION_STATUSES } from "@/lib/validation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { formatTimestamp } from "@/lib/utils";
import type { ExecutionAction, ExecutionActionCreate, ExecutionActionUpdate } from "@/types";

const EXECUTION_ACTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  scheduled: "Scheduled",
  in_progress: "In progress",
  executed: "Executed",
  failed: "Failed",
  paused: "Paused",
  cancelled: "Cancelled",
};

const STATUS_OPTIONS = EXECUTION_ACTION_STATUSES.map((status) => ({ value: status, label: EXECUTION_ACTION_STATUS_LABELS[status] ?? status }));

const DEFAULT_DIALOG_VALUES = { title: "", description: "", status: "pending" as const };

function ExecutionSection({
  title,
  description,
  actions,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  actions: ExecutionAction[];
  onEdit: (action: ExecutionAction) => void;
  onDelete: (actionId: string) => void;
}) {
  return (
    <Card>
      <div className="border-b border-line px-6 py-4">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="text-xs text-fg-muted">{description}</p>
      </div>
      {actions.length === 0 ? (
        <div className="p-6"><EmptyState title={`No actions in ${title.toLowerCase()}`} description="No execution actions are recorded in this status yet." /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Executed at</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((action) => (
              <TableRow key={action.id}>
                <TableCell className="max-w-sm truncate font-medium text-fg">{action.title}</TableCell>
                <TableCell><StatusBadge status={action.status} /></TableCell>
                <TableCell className="text-xs text-fg-muted">{action.executedAt ? formatTimestamp(action.executedAt) : "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Edit ${action.title}`} onClick={() => onEdit(action)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg></button>
                    <button type="button" aria-label={`Delete ${action.title}`} onClick={() => onDelete(action.id)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export default function ExecutionPage() {
  const { company: activeCompany, loading: loadingCompany, error: companyError } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";
  const { data: actions, loading, error } = useApi<ExecutionAction[]>(companyId ? () => growthosApi.listExecutionActions(companyId) : null, "execution-actions");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExecutionAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const form = useForm({ resolver: zodResolver(executionActionSchema), mode: "onChange", defaultValues: DEFAULT_DIALOG_VALUES });

  async function saveAction(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      if (editing) {
        await growthosApi.updateExecutionAction(companyId, editing.id, values as unknown as ExecutionActionUpdate);
        toast.success("Action updated");
      } else {
        await growthosApi.createExecutionAction(companyId, values as unknown as ExecutionActionCreate);
        toast.success("Action recorded");
      }
      setDialogOpen(false);
      setEditing(null);
      form.reset(DEFAULT_DIALOG_VALUES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the action.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAction(actionId: string) {
    setDeleting(true);
    try {
      await growthosApi.deleteExecutionAction(companyId, actionId);
      toast.success("Action deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the action.");
    } finally {
      setDeleting(false);
    }
  }

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
    form.reset(DEFAULT_DIALOG_VALUES);
  };

  const openEdit = (action: ExecutionAction) => {
    setEditing(action);
    setDialogOpen(true);
    form.reset({ title: action.title, description: action.description, status: action.status });
  };

  const pending = (actions ?? []).filter((action) => action.status === "pending");
  const scheduled = (actions ?? []).filter((action) => action.status === "scheduled");
  const executed = (actions ?? []).filter((action) => action.status === "executed");
  const failed = (actions ?? []).filter((action) => action.status === "failed");
  const history = [...(actions ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Execution"
        description="Approved actions and their lifecycle. Integrations and external execution capabilities are not yet configured — approved actions are tracked here as recorded."
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Record action</Button>}
      />

      <Card className="border-dashed border-line bg-bg-muted p-4">
        <p className="text-sm text-fg-muted">
          Execution workspaces here show approved actions as they move through their lifecycle. Once integrations are configured and connected (see the Integrations page), approved actions can be executed on connected tools — the connection, status and results are tracked in this workspace.
        </p>
      </Card>

      {loadingCompany ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : companyError ? (
        <EmptyState title="Couldn't load the workspace" description={companyError} />
      ) : !activeCompany ? (
        <EmptyState title="No active company yet" description="Add a company first — execution actions are recorded per company." action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>} />
      ) : loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : error ? (
        <EmptyState title="Couldn't load execution actions" description={error} />
      ) : (
        <div className="space-y-6">
          <ExecutionSection title="Pending approvals" description="Actions awaiting approval." actions={pending} onEdit={openEdit} onDelete={(id) => setConfirmDeleteId(id)} />
          <ExecutionSection title="Scheduled actions" description="Actions scheduled to happen." actions={scheduled} onEdit={openEdit} onDelete={(id) => setConfirmDeleteId(id)} />
          <ExecutionSection title="Executed actions" description="Actions that have been executed." actions={executed} onEdit={openEdit} onDelete={(id) => setConfirmDeleteId(id)} />
          <ExecutionSection title="Failed actions" description="Actions that failed — see the recorded error." actions={failed} onEdit={openEdit} onDelete={(id) => setConfirmDeleteId(id)} />
          <ExecutionSection title="All actions (history)" description="Every execution action recorded for the company, newest first." actions={history} onEdit={openEdit} onDelete={(id) => setConfirmDeleteId(id)} />
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Edit action" : "Record an action"}>
        <div className="space-y-4">
          <Input label="Action" {...form.register("title")} error={form.formState.errors.title?.message} />
          <Input label="Description" {...form.register("description")} />
          <Select label="Status" value={form.watch("status") ?? "pending"} onChange={(value) => form.setValue("status", value as ExecutionAction["status"])} options={STATUS_OPTIONS} error={form.formState.errors.status?.message} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void form.handleSubmit((values) => void saveAction(values as Record<string, unknown>))()} disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update action" : "Record action"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete action" description={`Delete ${actions?.find((a) => a.id === confirmDeleteId)?.title ?? "this action"}? This cannot be undone.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={() => void deleteAction(confirmDeleteId!)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
