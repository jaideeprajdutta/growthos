"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { growthosApi } from "@/lib/api";
import { experimentTaskSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { toDateInputValue } from "@/lib/utils";
import type { ExperimentTask, ExperimentTaskCreate } from "@/types";

const DEFAULT_VALUES = { title: "", description: "", owner: "", dueDate: "", requiresApproval: true };

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  experimentId: string;
  task?: ExperimentTask | null;
  onSaved: () => void;
}

export function TaskFormDialog({ open, onClose, companyId, experimentId, task, onSaved }: TaskFormDialogProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    resolver: zodResolver(experimentTaskSchema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      task
        ? {
            title: task.title,
            description: task.description,
            owner: task.owner,
            dueDate: toDateInputValue(task.dueDate),
            requiresApproval: task.requiresApproval,
          }
        : DEFAULT_VALUES
    );
  }, [form, open, task]);

  async function save(values: Record<string, unknown>) {
    if (!companyId || !experimentId || submitting) return;
    setSubmitting(true);
    try {
      const payload: ExperimentTaskCreate = {
        title: String(values.title),
        description: String(values.description ?? "") || undefined,
        owner: String(values.owner ?? "") || undefined,
        dueDate: String(values.dueDate ?? "") || undefined,
        requiresApproval: Boolean(values.requiresApproval),
      };
      if (task) {
        await growthosApi.updateTask(companyId, experimentId, task.id, payload);
        toast.success("Task updated");
      } else {
        await growthosApi.createTask(companyId, experimentId, payload);
        toast.success("Task added to the execution plan");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={task ? "Edit task" : "Add execution task"} className="max-w-xl">
      <form className="space-y-4" onSubmit={(event) => void form.handleSubmit((values) => void save(values as Record<string, unknown>))(event)}>
        <Input label="Task" placeholder="Describe the work to be done" {...form.register("title")} error={form.formState.errors.title?.message} />
        <Textarea label="Notes" placeholder="Context, links or hand-off details" {...form.register("description")} error={form.formState.errors.description?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Owner" {...form.register("owner")} error={form.formState.errors.owner?.message} />
          <Input label="Due date" type="date" {...form.register("dueDate")} error={form.formState.errors.dueDate?.message} />
        </div>
        <div className="rounded-lg border border-line bg-bg-muted p-3">
          <Checkbox
            id="task-requires-approval"
            label="Require explicit approval before work starts"
            checked={Boolean(form.watch("requiresApproval"))}
            onChange={(checked) => form.setValue("requiresApproval", checked, { shouldValidate: true })}
          />
          <p className="mt-2 text-xs text-fg-muted">Approval and completion are recorded with actor and timestamp. No external system is contacted.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : task ? "Update task" : "Add task"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
