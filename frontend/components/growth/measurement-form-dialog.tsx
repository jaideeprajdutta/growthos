"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { measurementSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { EvidencePicker } from "@/components/growth/evidence-picker";
import { toDateInputValue } from "@/lib/utils";
import type { Evidence, ExperimentResult, MeasurementDataSource, MeasurementDirection } from "@/types";

interface FormState {
  outcome: string;
  baseline: string;
  observed: string;
  target: string;
  direction: MeasurementDirection;
  measurementStart: string;
  measurementEnd: string;
  dataSource: MeasurementDataSource;
  sourceName: string;
  notes: string;
  interpretation: string;
}

const EMPTY: FormState = {
  outcome: "",
  baseline: "",
  observed: "",
  target: "",
  direction: "increase",
  measurementStart: "",
  measurementEnd: "",
  dataSource: "user_entered",
  sourceName: "",
  notes: "",
  interpretation: "",
};

interface MeasurementFormDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  experimentId: string;
  result?: ExperimentResult | null;
  onSaved: () => void;
}

function initialForm(result: ExperimentResult | null | undefined): FormState {
  if (!result) return EMPTY;
  return {
    outcome: result.outcome,
    baseline: result.baselineValue === null ? "" : String(result.baselineValue),
    observed: result.observedValue === null ? "" : String(result.observedValue),
    target: result.targetValue === null ? "" : String(result.targetValue),
    direction: result.direction,
    measurementStart: toDateInputValue(result.measurementStart),
    measurementEnd: toDateInputValue(result.measurementEnd),
    dataSource: result.dataSource === "imported" || result.dataSource === "connected_source" ? "user_entered" : result.dataSource,
    sourceName: result.sourceName,
    notes: result.notes,
    interpretation: result.interpretation,
  };
}

export function MeasurementFormDialog({ open, onClose, companyId, experimentId, result, onSaved }: MeasurementFormDialogProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => initialForm(result));
  const [evidenceIds, setEvidenceIds] = useState<string[]>(result?.evidenceIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const evidence = useApi<Evidence[]>(
    open && companyId ? () => growthosApi.listEvidence(companyId) : null,
    `measurement-evidence-${companyId}`
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (submitting) return;
    const parsed = measurementSchema.safeParse({
      outcome: form.outcome || undefined,
      baselineValue: form.baseline,
      observedValue: form.observed,
      targetValue: form.target,
      direction: form.direction,
      measurementStart: form.measurementStart || undefined,
      measurementEnd: form.measurementEnd || undefined,
      dataSource: form.dataSource,
      sourceName: form.sourceName,
      evidenceIds,
      notes: form.notes,
      interpretation: form.interpretation,
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
      const payload = parsed.data;
      if (result) {
        await growthosApi.updateMeasurement(companyId, experimentId, result.id, payload);
        toast.success("Measurement updated");
      } else {
        await growthosApi.createMeasurement(companyId, experimentId, payload);
        toast.success("Measurement recorded");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the measurement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={result ? "Edit measurement" : "Record a measurement"} className="max-w-2xl">
      <div className="space-y-4">
        <p className="text-xs text-fg-muted">
          Enter values you actually observed. Change, percentage and target attainment are calculated from these numbers only.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input id="measurement-baseline" label="Baseline value" inputMode="decimal" value={form.baseline} onChange={(event) => update("baseline", event.target.value)} error={errors.baselineValue} />
          <Input id="measurement-observed" label="Observed value" inputMode="decimal" value={form.observed} onChange={(event) => update("observed", event.target.value)} error={errors.observedValue} />
          <Input id="measurement-target" label="Target value" inputMode="decimal" value={form.target} onChange={(event) => update("target", event.target.value)} error={errors.targetValue} />
        </div>
        <Textarea id="measurement-outcome" label="Outcome description" value={form.outcome} onChange={(event) => update("outcome", event.target.value)} error={errors.outcome} placeholder="A short factual description of the result." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="measurement-direction" label="Improvement direction" value={form.direction} onChange={(value) => update("direction", value as MeasurementDirection)} options={[{ value: "increase", label: "Higher is better" }, { value: "decrease", label: "Lower is better" }]} />
          <Select id="measurement-source" label="Data source" value={form.dataSource} onChange={(value) => update("dataSource", value as MeasurementDataSource)} options={[{ value: "user_entered", label: "User entered" }, { value: "estimate", label: "Estimate" }]} hint="Imported and connected sources are labelled by the system, not chosen here." />
          <Input id="measurement-start" label="Measurement start" type="date" value={form.measurementStart} onChange={(event) => update("measurementStart", event.target.value)} error={errors.measurementStart} />
          <Input id="measurement-end" label="Measurement end" type="date" value={form.measurementEnd} onChange={(event) => update("measurementEnd", event.target.value)} error={errors.measurementEnd} />
        </div>
        <Input id="measurement-source-name" label="Source name" value={form.sourceName} onChange={(event) => update("sourceName", event.target.value)} error={errors.sourceName} placeholder="E.g. weekly activation report" />
        <Textarea id="measurement-notes" label="Measurement notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} error={errors.notes} />
        <Textarea id="measurement-interpretation" label="Interpretation" value={form.interpretation} onChange={(event) => update("interpretation", event.target.value)} error={errors.interpretation} hint="Your reading of the result — not an AI conclusion." />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Supporting evidence</p>
          <EvidencePicker evidence={evidence.data ?? []} selected={evidenceIds} onChange={setEvidenceIds} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button aria-label="Save measurement" disabled={submitting} onClick={() => void save()}>{submitting ? "Saving…" : "Save measurement"}</Button>
        </div>
      </div>
    </Dialog>
  );
}
