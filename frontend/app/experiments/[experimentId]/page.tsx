"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { EXPERIMENT_TRANSITIONS } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Breadcrumbs } from "@/components/layout/page-header";
import { CsvImportDialog } from "@/components/growth/csv-import-dialog";
import { ExperimentFormDialog } from "@/components/growth/experiment-form-dialog";
import { LearningFormDialog } from "@/components/growth/learning-form-dialog";
import { MeasurementFormDialog } from "@/components/growth/measurement-form-dialog";
import { TaskActions } from "@/components/growth/task-actions";
import { TaskFormDialog } from "@/components/growth/task-form-dialog";
import { formatDate, formatNumber, formatPercent, formatTimestamp, humanLabel } from "@/lib/utils";
import type {
  DiagnosticFinding,
  ExperimentResult,
  ExperimentStatus,
  ExperimentTask,
  Opportunity,
} from "@/types";

const STATUS_ACTION_LABELS: Record<string, string> = {
  approved: "Approve",
  running: "Start",
  paused: "Pause",
  completed: "Complete",
  cancelled: "Cancel",
};

const STATUS_PAST_LABELS: Record<string, string> = {
  approved: "approved",
  running: "started",
  paused: "paused",
  completed: "completed",
  cancelled: "cancelled",
};

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="text-sm text-fg">{value === null || value === undefined || value === "" ? "—" : value}</p>
    </div>
  );
}

export default function ExperimentDetailPage({ params }: { params: Promise<{ experimentId: string }> }) {
  return (
    <Suspense
      fallback={
        <Card className="p-6">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </Card>
      }
    >
      <ExperimentDetailWorkspace params={params} />
    </Suspense>
  );
}

function ExperimentDetailWorkspace({ params }: { params: Promise<{ experimentId: string }> }) {
  const { experimentId } = use(params);
  const toast = useToast();
  const { company: activeCompany, loading: loadingCompany, error: companyError } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";
  const [refreshKey, setRefreshKey] = useState(0);
  const detail = useApi(
    companyId ? () => growthosApi.getExperimentDetail(companyId, experimentId) : null,
    `experiment-detail-${companyId}-${experimentId}-${refreshKey}`
  );
  const opportunities = useApi<Opportunity[]>(
    companyId ? () => growthosApi.listOpportunities(companyId) : null,
    `detail-opportunities-${companyId}`
  );
  const findings = useApi<DiagnosticFinding[]>(
    companyId ? () => growthosApi.listDiagnosticFindings(companyId) : null,
    `detail-findings-${companyId}`
  );

  const [statusTarget, setStatusTarget] = useState<ExperimentStatus | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ExperimentTask | null>(null);
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ExperimentResult | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);
  const [deletingResult, setDeletingResult] = useState(false);

  const refresh = () => setRefreshKey((key) => key + 1);
  const experiment = detail.data?.experiment;
  const tasks = detail.data?.tasks ?? [];
  const results = detail.data?.results ?? [];
  const learning = detail.data?.learning ?? null;
  const latestResult = results[0] ?? null;
  const opportunityTitle = opportunities.data?.find((item) => item.id === experiment?.opportunityId)?.title;
  const findingTitle = findings.data?.find((item) => item.id === experiment?.diagnosticFindingId)?.problemStatement;

  async function changeStatus() {
    if (!companyId || !statusTarget || statusBusy) return;
    setStatusBusy(true);
    try {
      await growthosApi.changeExperimentStatus(companyId, experimentId, { status: statusTarget, note: statusNote || undefined });
      toast.success(`Experiment ${STATUS_PAST_LABELS[statusTarget] ?? statusTarget}`);
      setStatusTarget(null);
      setStatusNote("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The status could not be changed.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function deleteMeasurement() {
    if (!companyId || !deletingResultId) return;
    setDeletingResult(true);
    try {
      await growthosApi.deleteMeasurement(companyId, experimentId, deletingResultId);
      toast.success("Measurement deleted");
      setDeletingResultId(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the measurement.");
    } finally {
      setDeletingResult(false);
    }
  }

  if (loadingCompany) {
    return <Card className="p-6"><Skeleton className="h-6 w-48" /><Skeleton className="mt-3 h-4 w-full" /></Card>;
  }
  if (companyError) {
    return <EmptyState title="Couldn't load the workspace" description={companyError} />;
  }
  if (!activeCompany) {
    return <EmptyState title="No active company yet" description="Add a company before opening an experiment." action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>} />;
  }
  if (detail.loading) {
    return <Card className="p-6"><Skeleton className="h-6 w-64" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-2 h-4 w-3/4" /></Card>;
  }
  if (detail.error || !experiment) {
    return (
      <div className="space-y-4">
        <Link href="/experiments" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Back to experiments</Link>
        <EmptyState title="Experiment unavailable" description={detail.error ?? "This experiment does not exist for the active company."} />
      </div>
    );
  }

  const transitions = EXPERIMENT_TRANSITIONS[experiment.status] ?? [];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Experiments", href: "/experiments" }, { label: experiment.name }]} />
      <PageHeader
        title={experiment.name}
        description={experiment.hypothesis}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={experiment.status} />
            {transitions.map((target) => {
              const next = target as ExperimentStatus;
              return (
                <Button
                  key={next}
                  size="sm"
                  variant={next === "cancelled" ? "ghost" : next === "approved" || next === "running" ? "primary" : "secondary"}
                  aria-label={`${STATUS_ACTION_LABELS[next] ?? humanLabel(next)} experiment`}
                  onClick={() => { setStatusTarget(next); setStatusNote(""); }}
                >
                  {STATUS_ACTION_LABELS[next] ?? humanLabel(next)}
                </Button>
              );
            })}
            <Button size="sm" variant="secondary" aria-label="Edit experiment details" onClick={() => setEditOpen(true)}>Edit</Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Experiment brief</CardTitle>
          <CardDescription>All fields below were entered by a user — nothing is inferred by AI.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Owner" value={experiment.owner} />
          <DetailRow label="Target audience" value={experiment.targetAudience} />
          <DetailRow label="Success metric" value={experiment.successMetric} />
          <DetailRow label="Baseline" value={experiment.baseline} />
          <DetailRow label="Target" value={experiment.target} />
          <DetailRow label="Period" value={`${formatDate(experiment.startDate)} → ${formatDate(experiment.endDate)}`} />
          <DetailRow label="Linked opportunity" value={opportunityTitle ?? (experiment.opportunityId ? "Linked opportunity" : "—")} />
          <DetailRow label="Linked diagnosis" value={findingTitle ?? (experiment.diagnosticFindingId ? "Linked finding" : "—")} />
          <DetailRow label="Approved by" value={experiment.approvedBy ? `${experiment.approvedBy} · ${formatTimestamp(experiment.approvedAt!)}` : "—"} />
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailRow label="Problem" value={experiment.problem} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailRow label="Intervention" value={experiment.action} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailRow label="Description" value={experiment.description} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Guardrail metrics</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {experiment.guardrailMetrics.length === 0 ? <span className="text-sm text-fg">—</span> : experiment.guardrailMetrics.map((item) => <Badge key={item}>{item}</Badge>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Execution plan</CardTitle>
            <CardDescription>Manual tasks only. Approvals and completions are recorded with actor and time; no external tool is contacted.</CardDescription>
          </div>
          <Button size="sm" aria-label="Add task" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add task
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {tasks.length === 0 ? (
            <EmptyState title="No execution tasks yet" description="Break the experiment into owned tasks. Tasks requiring approval cannot start until explicitly approved." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-xs">
                      <p className="font-medium text-fg">{task.title}</p>
                      {task.description ? <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{task.description}</p> : null}
                      <p className="mt-1 text-xs text-fg-muted">
                        {task.notes.length} note{task.notes.length === 1 ? "" : "s"} · {task.evidenceIds.length} evidence link{task.evidenceIds.length === 1 ? "" : "s"}
                      </p>
                      {task.executedBy ? <p className="mt-1 text-xs text-fg-muted">Completed by {task.executedBy} · {formatTimestamp(task.executedAt!)}</p> : null}
                    </TableCell>
                    <TableCell className="text-fg-muted">{task.owner || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-fg-muted">{formatDate(task.dueDate)}</TableCell>
                    <TableCell><StatusBadge status={task.status} /></TableCell>
                    <TableCell>
                      {task.requiresApproval ? <Badge color={task.approvalStatus === "approved" ? "green" : task.approvalStatus === "rejected" ? "red" : "amber"}>{humanLabel(task.approvalStatus)}</Badge> : <Badge>Not required</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <TaskActions companyId={companyId} experimentId={experimentId} task={task} onChange={refresh} />
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" aria-label={`Edit task ${task.title}`} onClick={() => { setEditingTask(task); setTaskDialogOpen(true); }}>Edit</Button>
                          <Button size="sm" variant="ghost" aria-label={`Delete task ${task.title}`} onClick={() => void growthosApi.deleteTask(companyId, experimentId, task.id).then(refresh).catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to delete the task."))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Measurements</CardTitle>
            <CardDescription>Change and attainment are calculated from recorded numbers. Sources are always labelled.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" aria-label="Import measurements from CSV" onClick={() => setCsvOpen(true)}>Import CSV</Button>
            <Button size="sm" aria-label="Add measurement" onClick={() => { setEditingResult(null); setMeasurementOpen(true); }}><Plus className="h-4 w-4" /> Add measurement</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {results.length === 0 ? (
            <EmptyState title="No measurements recorded" description="Enter a result or import a previewed CSV. Estimates, user-entered values and imports are shown separately." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Values</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Attainment</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="whitespace-nowrap text-xs text-fg-muted">{formatTimestamp(result.recordedAt)}<br />{result.recordedBy}</TableCell>
                    <TableCell>
                      <p className="text-sm text-fg">
                        {formatNumber(result.baselineValue)} → {formatNumber(result.observedValue)} <span className="text-fg-muted">/ target {formatNumber(result.targetValue)}</span>
                      </p>
                      {result.outcome ? <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{result.outcome}</p> : null}
                      {result.interpretation ? <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{result.interpretation}</p> : null}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-fg">{result.absoluteChange === null ? "—" : `${result.absoluteChange > 0 ? "+" : ""}${formatNumber(result.absoluteChange)}`}</p>
                      <p className="text-xs text-fg-muted">{formatPercent(result.percentChange)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-fg">{formatPercent(result.targetAttainmentPct)}</p>
                      <p className="text-xs text-fg-muted">{result.metTarget === null ? "Not calculable" : result.metTarget ? "Target met" : "Below target"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge color={result.dataSource === "imported" ? "blue" : result.dataSource === "estimate" ? "amber" : "default"}>{humanLabel(result.dataSource)}</Badge>
                      {result.sourceName ? <p className="mt-1 max-w-[10rem] truncate text-xs text-fg-muted">{result.sourceName}</p> : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" aria-label={`Edit measurement ${result.id}`} onClick={() => { setEditingResult(result); setMeasurementOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="ghost" aria-label={`Delete measurement ${result.id}`} onClick={() => setDeletingResultId(result.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Outcome review</CardTitle>
            <CardDescription>Recorded by you after the experiment is complete; feeds the linked opportunity and intelligence profile.</CardDescription>
          </div>
          {experiment.status === "completed" ? (
            <Button size="sm" aria-label={learning ? "Edit outcome review" : "Record outcome review"} onClick={() => setLearningOpen(true)}>
              {learning ? "Edit review" : "Record review"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {experiment.status !== "completed" ? (
            <EmptyState title="Available after completion" description="Complete the experiment before recording what you learned." />
          ) : learning ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Outcome" value={humanLabel(learning.outcome)} />
              <DetailRow label="Target met" value={learning.metTarget === null ? "—" : learning.metTarget ? "Yes" : "No"} />
              <DetailRow label="Recorded by" value={`${learning.recordedBy} · ${formatTimestamp(learning.createdAt)}`} />
              <div className="sm:col-span-3"><DetailRow label="What changed" value={learning.whatChanged} /></div>
              <div className="sm:col-span-3"><DetailRow label="What worked" value={learning.whatWorked} /></div>
              <div className="sm:col-span-3"><DetailRow label="What did not work" value={learning.whatFailed} /></div>
              <div className="sm:col-span-3"><DetailRow label="Next step" value={learning.nextSteps} /></div>
            </div>
          ) : (
            <EmptyState title="No review recorded" description="Capture what changed, what worked, what failed and the next step." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decision history</CardTitle>
          <CardDescription>Every lifecycle change with actor, timestamp and optional note.</CardDescription>
        </CardHeader>
        <CardContent>
          {experiment.decisionHistory.length === 0 ? (
            <EmptyState title="No decisions recorded" description="Lifecycle changes appear here." />
          ) : (
            <ul className="space-y-3">
              {experiment.decisionHistory.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {entry.from ? `${humanLabel(entry.from)} → ${humanLabel(entry.to)}` : `Created as ${humanLabel(entry.to)}`}
                    </p>
                    <p className="text-xs text-fg-muted">{entry.note || "No note recorded."}</p>
                  </div>
                  <p className="text-xs text-fg-muted">{entry.actor} · {formatTimestamp(entry.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} title={`${STATUS_ACTION_LABELS[statusTarget ?? ""] ?? "Change"} experiment`} description="This transition is validated and added to the decision history.">
        <div className="space-y-4">
          <Textarea id="status-note" label="Note (optional)" value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Why are you making this change?" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStatusTarget(null)} disabled={statusBusy}>Cancel</Button>
            <Button aria-label={`Confirm ${STATUS_ACTION_LABELS[statusTarget ?? ""] ?? "status change"}`} disabled={statusBusy} onClick={() => void changeStatus()}>{statusBusy ? "Saving…" : "Confirm"}</Button>
          </div>
        </div>
      </Dialog>

      {editOpen ? <ExperimentFormDialog key={experiment.id} open onClose={() => setEditOpen(false)} companyId={companyId} experiment={experiment} onSaved={refresh} /> : null}
      {taskDialogOpen ? <TaskFormDialog key={editingTask?.id ?? "new"} open onClose={() => setTaskDialogOpen(false)} companyId={companyId} experimentId={experimentId} task={editingTask} onSaved={refresh} /> : null}
      {measurementOpen ? <MeasurementFormDialog key={editingResult?.id ?? "new"} open onClose={() => setMeasurementOpen(false)} companyId={companyId} experimentId={experimentId} result={editingResult} onSaved={refresh} /> : null}
      {csvOpen ? <CsvImportDialog open onClose={() => setCsvOpen(false)} companyId={companyId} experimentId={experimentId} onImported={refresh} /> : null}
      {learningOpen ? <LearningFormDialog key={learning?.id ?? "new"} open onClose={() => setLearningOpen(false)} companyId={companyId} experimentId={experimentId} learning={learning} latestResult={latestResult} onSaved={refresh} /> : null}
      <Dialog open={Boolean(deletingResultId)} onClose={() => setDeletingResultId(null)} title="Delete measurement" description="Remove this recorded measurement from the experiment?">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeletingResultId(null)} disabled={deletingResult}>Cancel</Button>
          <Button variant="destructive" disabled={deletingResult} onClick={() => void deleteMeasurement()}>{deletingResult ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
