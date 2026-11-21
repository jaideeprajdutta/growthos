"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { EXECUTION_ACTION_STATUSES, executionActionSchema } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { TaskActions } from "@/components/growth/task-actions";
import { TaskFormDialog } from "@/components/growth/task-form-dialog";
import { formatDate, formatTimestamp, humanLabel } from "@/lib/utils";
import type {
  ExecutionAction,
  ExecutionActionCreate,
  ExecutionActionStatus,
  ExecutionActionUpdate,
  ExperimentDetail,
  ExperimentTask,
  ExperimentTaskStatus,
} from "@/types";

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
const BOARD_COLUMNS: { status: ExperimentTaskStatus; title: string; description: string }[] = [
  { status: "pending", title: "Pending", description: "Ready to start once approval is satisfied" },
  { status: "in_progress", title: "In progress", description: "Work currently underway" },
  { status: "blocked", title: "Blocked", description: "Waiting for a resolved dependency" },
  { status: "completed", title: "Completed", description: "Manually marked as done" },
];

const ACTION_DEFAULTS = { title: "", description: "", status: "pending" as const };

function TaskCard({
  task,
  experiment,
  companyId,
  experimentId,
  onChange,
}: {
  task: ExperimentTask;
  experiment: { id: string; name: string };
  companyId: string;
  experimentId: string;
  onChange: () => void;
}) {
  return (
    <Card className="p-4">
      <Link href={`/experiments/${experimentId}`} className="text-xs font-medium text-accent hover:underline">{experiment.name}</Link>
      <p className="mt-1 text-sm font-semibold text-fg">{task.title}</p>
      {task.description ? <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{task.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge color={task.requiresApproval && task.approvalStatus !== "approved" ? "amber" : "default"}>
          {task.requiresApproval ? humanLabel(task.approvalStatus) : "No approval needed"}
        </Badge>
        {task.owner ? <span className="text-xs text-fg-muted">{task.owner}</span> : null}
        {task.dueDate ? <span className="text-xs text-fg-muted">Due {formatDate(task.dueDate)}</span> : null}
      </div>
      {task.notes.length > 0 ? <p className="mt-2 text-xs text-fg-muted">{task.notes.length} note{task.notes.length === 1 ? "" : "s"} recorded</p> : null}
      <div className="mt-3 border-t border-line pt-3">
        <TaskActions companyId={companyId} experimentId={experimentId} task={task} onChange={onChange} />
      </div>
    </Card>
  );
}

function ActionSection({
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
        <div className="overflow-x-auto">
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
        </div>
      )}
    </Card>
  );
}

export default function ExecutionPage() {
  const toast = useToast();
  const { company: activeCompany, loading: loadingCompany, error: companyError } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";
  const [refreshKey, setRefreshKey] = useState(0);
  const details = useApi<ExperimentDetail[]>(
    companyId
      ? async () => {
          const experiments = await growthosApi.listExperiments(companyId);
          return Promise.all(experiments.map((item) => growthosApi.getExperimentDetail(companyId, item.id)));
        }
      : null,
    `execution-details-${companyId}-${refreshKey}`
  );
  const { data: actions, loading, error } = useApi<ExecutionAction[]>(
    companyId ? () => growthosApi.listExecutionActions(companyId) : null,
    `execution-actions-${companyId}-${refreshKey}`
  );

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedExperimentId, setSelectedExperimentId] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ExecutionAction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const actionForm = useForm({ resolver: zodResolver(executionActionSchema), mode: "onChange", defaultValues: ACTION_DEFAULTS });

  const refresh = () => setRefreshKey((key) => key + 1);
  const allTasks = (details.data ?? []).flatMap((detail) =>
    detail.tasks.map((task) => ({ task, experiment: detail.experiment }))
  );
  const experiments = (details.data ?? []).map((detail) => detail.experiment);

  async function saveAction(values: Record<string, unknown>) {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingAction) {
        await growthosApi.updateExecutionAction(companyId, editingAction.id, values as unknown as ExecutionActionUpdate);
        toast.success("Action updated");
      } else {
        await growthosApi.createExecutionAction(companyId, values as unknown as ExecutionActionCreate);
        toast.success("Action recorded");
      }
      setActionDialogOpen(false);
      setEditingAction(null);
      actionForm.reset(ACTION_DEFAULTS);
      refresh();
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
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the action.");
    } finally {
      setDeleting(false);
    }
  }

  const pending = (actions ?? []).filter((action) => action.status === "pending");
  const scheduled = (actions ?? []).filter((action) => action.status === "scheduled");
  const executed = (actions ?? []).filter((action) => action.status === "executed");
  const failed = (actions ?? []).filter((action) => action.status === "failed");
  const history = [...(actions ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Execution"
        description="The manual, approval-gated work that carries approved experiments into the real world."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" aria-label="Add task" disabled={!selectedExperimentId && experiments.length === 0} onClick={() => { setSelectedExperimentId(experiments[0]?.id ?? ""); setTaskDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Add task
            </Button>
            <Button aria-label="Record action" onClick={() => { setEditingAction(null); actionForm.reset(ACTION_DEFAULTS); setActionDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Record action
            </Button>
          </div>
        }
      />

      <Card className="border-dashed border-line bg-bg-muted p-4">
        <p className="text-sm text-fg-muted">
          Execution here is manual. Approving a task records who approved it; completing it records who marked it done. GrowthOS does not contact external systems on your behalf.
        </p>
      </Card>

      {loadingCompany ? (
        <Skeleton className="h-40 w-full" />
      ) : companyError ? (
        <EmptyState title="Couldn't load the workspace" description={companyError} />
      ) : !activeCompany ? (
        <EmptyState title="No active company yet" description="Add a company first — execution tasks are recorded per company." action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>} />
      ) : details.loading || loading ? (
        <Skeleton className="h-40 w-full" />
      ) : details.error ? (
        <EmptyState title="Couldn't load execution tasks" description={details.error} />
      ) : error ? (
        <EmptyState title="Couldn't load execution actions" description={error} />
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-fg">Experiment task board</h2>
                <p className="text-sm text-fg-muted">Real tasks from every experiment, grouped by status.</p>
              </div>
              {experiments.length > 0 ? (
                <Select
                  id="task-experiment"
                  label="Experiment for new task"
                  value={selectedExperimentId}
                  onChange={setSelectedExperimentId}
                  options={experiments.map((item) => ({ value: item.id, label: item.name }))}
                  className="w-full sm:w-72"
                />
              ) : null}
            </div>
            {experiments.length === 0 ? (
              <EmptyState title="No experiments to execute" description="Create an experiment first, then add execution tasks to its plan." action={<Link href="/experiments"><Button>Go to experiments</Button></Link>} />
            ) : allTasks.length === 0 ? (
              <EmptyState title="No tasks yet" description="Add a task to an experiment to start its execution plan." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {BOARD_COLUMNS.map((column) => (
                  <Card key={column.status}>
                    <CardHeader>
                      <CardTitle className="text-sm">{column.title}</CardTitle>
                      <CardDescription>{column.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {allTasks.filter((item) => item.task.status === column.status).length === 0 ? (
                        <p className="rounded-lg border border-dashed border-line p-4 text-xs text-fg-muted">No tasks here.</p>
                      ) : (
                        allTasks
                          .filter((item) => item.task.status === column.status)
                          .map(({ task, experiment }) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              experiment={experiment}
                              companyId={companyId}
                              experimentId={experiment.id}
                              onChange={refresh}
                            />
                          ))
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-fg">Manual action history</h2>
              <p className="text-sm text-fg-muted">Legacy action records kept for a complete audit trail. These are user-recorded, not executed by an integration.</p>
            </div>
            <ActionSection title="Pending approvals" description="Actions awaiting approval." actions={pending} onEdit={(action) => { setEditingAction(action); actionForm.reset({ title: action.title, description: action.description, status: action.status }); setActionDialogOpen(true); }} onDelete={setConfirmDeleteId} />
            <ActionSection title="Scheduled actions" description="Actions scheduled to happen." actions={scheduled} onEdit={(action) => { setEditingAction(action); actionForm.reset({ title: action.title, description: action.description, status: action.status }); setActionDialogOpen(true); }} onDelete={setConfirmDeleteId} />
            <ActionSection title="Executed actions" description="Actions manually marked as executed." actions={executed} onEdit={(action) => { setEditingAction(action); actionForm.reset({ title: action.title, description: action.description, status: action.status }); setActionDialogOpen(true); }} onDelete={setConfirmDeleteId} />
            <ActionSection title="Failed actions" description="Actions that failed — see the recorded error." actions={failed} onEdit={(action) => { setEditingAction(action); actionForm.reset({ title: action.title, description: action.description, status: action.status }); setActionDialogOpen(true); }} onDelete={setConfirmDeleteId} />
            <ActionSection title="All actions (history)" description="Every execution action recorded for the company, newest first." actions={history} onEdit={(action) => { setEditingAction(action); actionForm.reset({ title: action.title, description: action.description, status: action.status }); setActionDialogOpen(true); }} onDelete={setConfirmDeleteId} />
          </section>
        </div>
      )}

      {selectedExperimentId ? (
        <TaskFormDialog
          open={taskDialogOpen}
          onClose={() => setTaskDialogOpen(false)}
          companyId={companyId}
          experimentId={selectedExperimentId}
          onSaved={refresh}
        />
      ) : null}

      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} title={editingAction ? "Edit action" : "Record an action"}>
        <form className="space-y-4" onSubmit={(event) => void actionForm.handleSubmit((values) => void saveAction(values as Record<string, unknown>))(event)}>
          <Input label="Action" {...actionForm.register("title")} error={actionForm.formState.errors.title?.message} />
          <Input label="Description" {...actionForm.register("description")} />
          <Select label="Status" value={actionForm.watch("status") ?? "pending"} onChange={(value) => actionForm.setValue("status", value as ExecutionActionStatus)} options={STATUS_OPTIONS} error={actionForm.formState.errors.status?.message} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActionDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : editingAction ? "Update action" : "Record action"}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete action" description={`Delete ${actions?.find((item) => item.id === confirmDeleteId)?.title ?? "this action"}? This cannot be undone.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" disabled={deleting} onClick={() => void deleteAction(confirmDeleteId!)}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
