"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { LEARNING_OUTCOMES, learningSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { EvidencePicker } from "@/components/growth/evidence-picker";
import type { Evidence, ExperimentLearning, ExperimentResult, LearningOutcome } from "@/types";

interface LearningFormDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  experimentId: string;
  learning: ExperimentLearning | null;
  latestResult: ExperimentResult | null | undefined;
  onSaved: () => void;
}

interface LearningState {
  outcome: LearningOutcome;
  metTarget: string;
  whatChanged: string;
  whatWorked: string;
  whatFailed: string;
  nextSteps: string;
}

const EMPTY: LearningState = {
  outcome: "successful",
  metTarget: "",
  whatChanged: "",
  whatWorked: "",
  whatFailed: "",
  nextSteps: "",
};

function initialState(
  learning: ExperimentLearning | null,
  latestResult: ExperimentResult | null | undefined
): { form: LearningState; evidenceIds: string[] } {
  const defaultMet = learning?.metTarget ?? latestResult?.metTarget;
  const metTarget = defaultMet === null || defaultMet === undefined ? "" : String(defaultMet);
  return {
    form: learning
      ? {
          outcome: learning.outcome,
          metTarget,
          whatChanged: learning.whatChanged,
          whatWorked: learning.whatWorked,
          whatFailed: learning.whatFailed,
          nextSteps: learning.nextSteps,
        }
      : { ...EMPTY, metTarget },
    evidenceIds: learning?.evidenceIds ?? [],
  };
}

export function LearningFormDialog({ open, onClose, companyId, experimentId, learning, latestResult, onSaved }: LearningFormDialogProps) {
  const toast = useToast();
  const initial = initialState(learning, latestResult);
  const [form, setForm] = useState<LearningState>(initial.form);
  const [evidenceIds, setEvidenceIds] = useState<string[]>(initial.evidenceIds);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const evidence = useApi<Evidence[]>(
    open && companyId ? () => growthosApi.listEvidence(companyId) : null,
    `learning-evidence-${companyId}`
  );

  function update<K extends keyof LearningState>(key: K, value: LearningState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (submitting) return;
    const parsed = learningSchema.safeParse({
      outcome: form.outcome,
      metTarget: form.metTarget === "" ? null : form.metTarget === "true",
      whatChanged: form.whatChanged,
      evidenceIds,
      whatWorked: form.whatWorked,
      whatFailed: form.whatFailed,
      nextSteps: form.nextSteps,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      if (learning) {
        await growthosApi.updateLearning(companyId, experimentId, parsed.data);
        toast.success("Outcome review updated");
      } else {
        await growthosApi.createLearning(companyId, experimentId, parsed.data);
        toast.success("Outcome review recorded");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record the outcome review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={learning ? "Edit outcome review" : "Record outcome review"} className="max-w-2xl">
      <div className="space-y-4">
        <p className="text-xs text-fg-muted">
          Everything here is written by you. The review is saved on the experiment and fed back to the linked opportunity and intelligence profile.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="learning-outcome"
            label="Outcome"
            value={form.outcome}
            onChange={(value) => update("outcome", value as LearningOutcome)}
            options={LEARNING_OUTCOMES.map((outcome) => ({ value: outcome, label: outcome }))}
            error={errors.outcome}
          />
          <Select
            id="learning-met-target"
            label="Target met"
            value={form.metTarget}
            onChange={(value) => update("metTarget", value)}
            options={[{ value: "", label: "Not recorded" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]}
          />
        </div>
        <Textarea id="learning-changed" label="What changed?" value={form.whatChanged} onChange={(event) => update("whatChanged", event.target.value)} error={errors.whatChanged} placeholder="State the observed change in plain language." />
        <Textarea id="learning-worked" label="What worked?" value={form.whatWorked} onChange={(event) => update("whatWorked", event.target.value)} error={errors.whatWorked} />
        <Textarea id="learning-failed" label="What did not work?" value={form.whatFailed} onChange={(event) => update("whatFailed", event.target.value)} error={errors.whatFailed} />
        <Textarea id="learning-next" label="Next step" value={form.nextSteps} onChange={(event) => update("nextSteps", event.target.value)} error={errors.nextSteps} />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Supporting evidence</p>
          <EvidencePicker evidence={evidence.data ?? []} selected={evidenceIds} onChange={setEvidenceIds} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button aria-label="Save outcome review" disabled={submitting} onClick={() => void save()}>{submitting ? "Saving…" : "Save review"}</Button>
        </div>
      </div>
    </Dialog>
  );
}
