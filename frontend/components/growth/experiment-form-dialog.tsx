"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { EXPERIMENT_STATUSES, experimentSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { DiagnosticFinding, Experiment, ExperimentCreate, ExperimentUpdate, Opportunity } from "@/types";

const DEFAULT_VALUES = {
  name: "",
  description: "",
  hypothesis: "",
  problem: "",
  action: "",
  targetAudience: "",
  successMetric: "",
  baseline: "",
  target: "",
  guardrailMetrics: [],
  startDate: "",
  endDate: "",
  owner: "",
  status: "proposed" as const,
  opportunityId: "",
  diagnosticFindingId: "",
};

interface ExperimentFormDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  experiment?: Experiment | null;
  onSaved: () => void;
}

export function ExperimentFormDialog({ open, onClose, companyId, experiment, onSaved }: ExperimentFormDialogProps) {
  const toast = useToast();
  const [guardrails, setGuardrails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const opportunities = useApi<Opportunity[]>(
    open && companyId ? () => growthosApi.listOpportunities(companyId) : null,
    `experiment-opportunities-${companyId}`
  );
  const findings = useApi<DiagnosticFinding[]>(
    open && companyId ? () => growthosApi.listDiagnosticFindings(companyId) : null,
    `experiment-findings-${companyId}`
  );

  const form = useForm({
    resolver: zodResolver(experimentSchema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    setGuardrails((experiment?.guardrailMetrics ?? []).join(", "));
    form.reset(
      experiment
        ? {
            name: experiment.name,
            description: experiment.description,
            hypothesis: experiment.hypothesis,
            problem: experiment.problem,
            action: experiment.action,
            targetAudience: experiment.targetAudience,
            successMetric: experiment.successMetric,
            baseline: experiment.baseline,
            target: experiment.target,
            guardrailMetrics: experiment.guardrailMetrics,
            startDate: experiment.startDate ? experiment.startDate.slice(0, 10) : "",
            endDate: experiment.endDate ? experiment.endDate.slice(0, 10) : "",
            owner: experiment.owner,
            status: experiment.status,
            opportunityId: experiment.opportunityId ?? "",
            diagnosticFindingId: experiment.diagnosticFindingId ?? "",
          }
        : DEFAULT_VALUES
    );
  }, [experiment, form, open]);

  async function save(values: Record<string, unknown>) {
    if (!companyId || submitting) return;
    setSubmitting(true);
    try {
      const opportunityId = String(values.opportunityId ?? "") || undefined;
      const diagnosticFindingId = String(values.diagnosticFindingId ?? "") || undefined;
      const payload = {
        name: (values.name as string) || undefined,
        description: (values.description as string) || undefined,
        hypothesis: values.hypothesis as string,
        problem: (values.problem as string) || undefined,
        action: (values.action as string) || undefined,
        targetAudience: (values.targetAudience as string) || undefined,
        successMetric: (values.successMetric as string) || undefined,
        baseline: (values.baseline as string) || undefined,
        target: (values.target as string) || undefined,
        guardrailMetrics: guardrails
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        startDate: (values.startDate as string) || undefined,
        endDate: (values.endDate as string) || undefined,
        owner: (values.owner as string) || undefined,
        opportunityId,
        diagnosticFindingId,
        // Lifecycle changes go through the dedicated, validated status endpoint.
        status: experiment ? undefined : ((values.status as ExperimentCreate["status"]) ?? "proposed"),
      } as ExperimentCreate & ExperimentUpdate;

      if (experiment) {
        await growthosApi.updateExperiment(companyId, experiment.id, payload as ExperimentUpdate);
        toast.success("Experiment updated");
      } else {
        await growthosApi.createExperiment(companyId, payload as ExperimentCreate);
        toast.success("Experiment created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the experiment.");
    } finally {
      setSubmitting(false);
    }
  }

  const opportunityOptions = [
    { value: "", label: "No linked opportunity" },
    ...(opportunities.data ?? []).map((item) => ({ value: item.id, label: item.title })),
  ];
  const findingOptions = [
    { value: "", label: "No linked diagnosis" },
    ...(findings.data ?? []).map((item) => ({
      value: item.id,
      label: `${item.dimension}: ${item.problemStatement || item.description || item.id}`,
    })),
  ];

  return (
    <Dialog open={open} onClose={onClose} title={experiment ? "Edit experiment" : "Add experiment"} className="max-w-3xl">
      <form className="space-y-4" onSubmit={(event) => void form.handleSubmit((values) => void save(values as Record<string, unknown>))(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Experiment name" placeholder="Short, descriptive name" {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="Owner" placeholder="Who is responsible?" {...form.register("owner")} error={form.formState.errors.owner?.message} />
        </div>
        <Textarea label="Description" placeholder="What are you testing and why?" {...form.register("description")} error={form.formState.errors.description?.message} />
        <Textarea label="Hypothesis" placeholder="If we do X, then Y will happen because…" {...form.register("hypothesis")} error={form.formState.errors.hypothesis?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Textarea label="Problem" {...form.register("problem")} error={form.formState.errors.problem?.message} />
          <Textarea label="Intervention" {...form.register("action")} error={form.formState.errors.action?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Target audience" {...form.register("targetAudience")} error={form.formState.errors.targetAudience?.message} />
          <Input label="Success metric" {...form.register("successMetric")} error={form.formState.errors.successMetric?.message} />
          <Input label="Baseline" {...form.register("baseline")} error={form.formState.errors.baseline?.message} />
          <Input label="Target" {...form.register("target")} error={form.formState.errors.target?.message} />
        </div>
        <Input
          id="experiment-guardrails"
          label="Guardrail metrics"
          placeholder="Support tickets, refund rate (comma separated)"
          value={guardrails}
          onChange={(event) => setGuardrails(event.target.value)}
          hint="Metrics that must not get worse. Entered as text, never inferred."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="experiment-start-date" label="Start date" type="date" {...form.register("startDate")} error={form.formState.errors.startDate?.message} />
          <Input id="experiment-end-date" label="End date" type="date" {...form.register("endDate")} error={form.formState.errors.endDate?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="experiment-opportunity" label="Linked opportunity" value={form.watch("opportunityId") ?? ""} onChange={(value) => form.setValue("opportunityId", value)} options={opportunityOptions} />
          <Select id="experiment-diagnosis" label="Linked diagnosis" value={form.watch("diagnosticFindingId") ?? ""} onChange={(value) => form.setValue("diagnosticFindingId", value)} options={findingOptions} />
        </div>
        {!experiment ? (
          <Select
            id="experiment-status"
            label="Initial status"
            value={form.watch("status") ?? "proposed"}
            onChange={(value) => form.setValue("status", value as (typeof EXPERIMENT_STATUSES)[number])}
            options={EXPERIMENT_STATUSES.filter((status) => status === "proposed" || status === "approved").map((status) => ({ value: status, label: status }))}
          />
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : experiment ? "Update experiment" : "Add experiment"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
