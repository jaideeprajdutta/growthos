"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { TASK_TRANSITIONS, taskNoteSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { EvidencePicker } from "@/components/growth/evidence-picker";
import type { Evidence, ExperimentTask, ExperimentTaskStatus } from "@/types";

interface TaskActionsProps {
  companyId: string;
  experimentId: string;
  task: ExperimentTask;
  onChange: () => void;
}

function statusLabel(target: ExperimentTaskStatus, current: ExperimentTaskStatus): string {
  if (target === "in_progress") return "Start task";
  if (target === "completed") return "Complete task";
  if (target === "blocked") return "Block task";
  return current === "blocked" ? "Unblock task" : "Reset task";
}

export function TaskActions({ companyId, experimentId, task, onChange }: TaskActionsProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [noteError, setNoteError] = useState<string | null>(null);
  const evidence = useApi<Evidence[]>(
    noteOpen && companyId ? () => growthosApi.listEvidence(companyId) : null,
    `task-evidence-${companyId}`
  );

  async function run(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The task could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    const parsed = taskNoteSchema.safeParse({ note, evidenceIds });
    if (!parsed.success) {
      setNoteError(parsed.error.issues[0]?.message ?? "Add a valid note.");
      return;
    }
    setNoteError(null);
    await run(
      () => growthosApi.addTaskNote(companyId, experimentId, task.id, parsed.data),
      "Note added"
    );
    setNote("");
    setEvidenceIds([]);
    setNoteOpen(false);
  }

  const canApprove =
    task.requiresApproval && task.approvalStatus !== "approved" && task.status !== "completed";
  const transitions = TASK_TRANSITIONS[task.status] ?? [];

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {canApprove ? (
          <>
            <Button
              size="sm"
              aria-label="Approve task"
              disabled={busy}
              onClick={() => void run(() => growthosApi.approveTask(companyId, experimentId, task.id), "Task approved")}
            >
              Approve task
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Reject task"
              disabled={busy}
              onClick={() => void run(() => growthosApi.rejectTask(companyId, experimentId, task.id), "Approval rejected")}
            >
              Reject
            </Button>
          </>
        ) : null}
        {transitions.map((target) => {
          const next = target as ExperimentTaskStatus;
          return (
            <Button
              key={next}
              size="sm"
              variant={next === "completed" ? "primary" : "ghost"}
              aria-label={statusLabel(next, task.status)}
              disabled={busy}
              onClick={() => void run(() => growthosApi.changeTaskStatus(companyId, experimentId, task.id, { status: next }), `${statusLabel(next, task.status)} — saved`)}
            >
              {statusLabel(next, task.status)}
            </Button>
          );
        })}
        <Button size="sm" variant="ghost" aria-label="Add task note" disabled={busy} onClick={() => setNoteOpen(true)}>
          Note
        </Button>
      </div>

      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} title="Add a task note" description="Record what happened and attach existing research evidence if it supports the note.">
        <div className="space-y-4">
          <Textarea
            id="task-note"
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={noteError ?? undefined}
            placeholder="What changed, what was observed, what is blocked?"
          />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Evidence</p>
            <EvidencePicker evidence={evidence.data ?? []} selected={evidenceIds} onChange={setEvidenceIds} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button aria-label="Save task note" disabled={busy} onClick={() => void saveNote()}>{busy ? "Saving…" : "Save note"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
