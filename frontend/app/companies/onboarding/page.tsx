"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import {
  BUSINESS_MODELS,
  COMPANY_STAGES,
  GROWTH_OBJECTIVE_TYPES,
  REVENUE_MODELS,
  companyFormSchema,
  growthObjectiveSchema,
  growthObjectivesSchema,
} from "@/lib/validation";
import type { CompanyBusinessModel, CompanyStage, RevenueModel } from "@/types";
import { growthosApi } from "@/lib/api";
import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type CompanyOnboardingValues = z.infer<typeof companyFormSchema>;
type GrowthObjectiveDraft = z.infer<typeof growthObjectiveSchema>;

const STEPS = [
  { key: "basics", title: "Company basics", description: "Tell us the name, website and industry of your company." },
  { key: "business", title: "Product and audience", description: "Describe what you sell, your target customers and value proposition." },
  { key: "context", title: "Business context", description: "Share your stage, revenue model and primary market." },
  { key: "objectives", title: "Growth objectives", description: "Choose your primary growth objective and any secondary goals." },
  { key: "review", title: "Review", description: "Check everything you entered before creating your company." },
];

const BUSINESS_MODEL_LABELS: Record<CompanyBusinessModel, string> = {
  saas: "SaaS",
  ecommerce: "E-commerce",
  agency: "Digital agency",
  services: "Online services",
  other: "Other",
};

const COMPANY_STAGE_LABELS: Record<CompanyStage, string> = {
  startup: "Startup",
  growth: "Growth",
  scale: "Scale",
  enterprise: "Enterprise",
};

const REVENUE_MODEL_LABELS: Record<RevenueModel, string> = {
  subscription: "Subscription",
  transactional: "Transactional",
  freemium: "Freemium",
  sales_led: "Sales-led",
  other: "Other",
};

const OBJECTIVE_LABELS: Record<string, string> = {
  revenue: "Revenue growth",
  customer_acquisition: "Customer acquisition",
  conversion: "Conversion improvement",
  retention: "Retention",
  lead_generation: "Lead generation",
  other: "Other",
};

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right font-medium text-fg">{value || "—"}</dd>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [objectives, setObjectives] = useState<GrowthObjectiveDraft[]>([{ objectiveType: "revenue", isPrimary: true }]);

  const form = useForm<CompanyOnboardingValues>({
    resolver: zodResolver(companyFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      website: "",
      businessModel: "other",
      industry: "",
      companyDescription: "",
      targetAudience: "",
      mainProductOrService: "",
      businessStage: "startup",
      revenueModel: "other",
      primaryMarket: "",
    },
  });

  const isLastStep = step === STEPS.length - 1;

  async function next() {
    const valid = await form.trigger();
    if (valid && step < STEPS.length - 1) {
      setStep((current) => current + 1);
    }
  }

  async function confirm() {
    const valid = await form.trigger();
    if (!valid) return;
    const objectivesResult = growthObjectivesSchema.safeParse(objectives);
    if (!objectivesResult.success) {
      toast.error(objectivesResult.error.issues[0]?.message ?? "Add a valid primary growth objective.");
      return;
    }
    setSubmitting(true);
    try {
      const values = form.getValues();
      const company = await growthosApi.createCompany({
        name: values.name,
        website: values.website || undefined,
        businessModel: values.businessModel,
        industry: values.industry,
        businessStage: values.businessStage,
        revenueModel: values.revenueModel,
        companyDescription: values.companyDescription,
        targetAudience: values.targetAudience,
        mainProductOrService: values.mainProductOrService,
        primaryMarket: values.primaryMarket,
        isActive: true,
      });
      for (const objective of objectivesResult.data) {
        await growthosApi.createGrowthObjective(company.id, {
          objectiveType: objective.objectiveType,
          customObjective: objective.customObjective || undefined,
          isPrimary: objective.isPrimary,
        });
      }
      toast.success("Company created", `${company.name} is ready.`);
      router.push(`/companies/${company.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create the company.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Onboarding" }]} />
      <PageHeader title="Add a company" description={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].description}`} />
      <Card className="mb-6 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((item, index) => (
            <span
              key={item.key}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                index <= step ? "border-line bg-muted text-fg" : "border-line text-fg-muted"
              )}
            >
              {index + 1}. {item.title}
            </span>
          ))}
        </div>
      </Card>

      <Card className="mb-6 space-y-4 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Input label="Company name" {...form.register("name")} error={form.formState.errors.name?.message} />
            <Input label="Website" placeholder="https://example.com" {...form.register("website")} error={form.formState.errors.website?.message} />
            <Select
              label="Business model"
              value={form.watch("businessModel")}
              onChange={(value) => form.setValue("businessModel", value as CompanyBusinessModel)}
              options={BUSINESS_MODELS.map((model) => ({ value: model, label: BUSINESS_MODEL_LABELS[model] }))}
              error={form.formState.errors.businessModel?.message}
            />
            <Input label="Industry" {...form.register("industry")} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Input label="What the company sells" placeholder="e.g. Cloud accounting software for agencies" {...form.register("mainProductOrService")} />
            <Input label="Target customers" placeholder="e.g. SMBs with 10–50 employees" {...form.register("targetAudience")} />
            <Input label="Company description" {...form.register("companyDescription")} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Select
              label="Business stage"
              value={form.watch("businessStage")}
              onChange={(value) => form.setValue("businessStage", value as CompanyStage)}
              options={COMPANY_STAGES.map((stage) => ({ value: stage, label: COMPANY_STAGE_LABELS[stage] }))}
            />
            <Select
              label="Revenue model"
              value={form.watch("revenueModel")}
              onChange={(value) => form.setValue("revenueModel", value as RevenueModel)}
              options={REVENUE_MODELS.map((model) => ({ value: model, label: REVENUE_MODEL_LABELS[model] }))}
            />
            <Input label="Primary market" {...form.register("primaryMarket")} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {objectives.map((objective, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-line p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Objective"
                    value={objective.objectiveType}
                    onChange={(value) =>
                      setObjectives(
                        (list) => list.map((item, i) => (i === index ? { ...item, objectiveType: value as GrowthObjectiveDraft["objectiveType"] } : item))
                      )
                    }
                    options={GROWTH_OBJECTIVE_TYPES.map((type) => ({ value: type, label: OBJECTIVE_LABELS[type] }))}
                  />
                  {objective.objectiveType === "other" ? (
                    <Input
                      label="Custom objective"
                      value={objective.customObjective ?? ""}
                      onChange={(event) =>
                        setObjectives((list) => list.map((item, i) => (i === index ? { ...item, customObjective: event.target.value } : item)))
                      }
                      placeholder="e.g. Enter more enterprise customers"
                    />
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={objective.isPrimary}
                    onChange={(event) =>
                      setObjectives((list) => list.map((item, i) => (i === index ? { ...item, isPrimary: event.target.checked } : item)))
                    }
                    className="accent-accent"
                  />
                  Primary growth objective
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setObjectives((list) => (list.length > 1 ? list.filter((_, i) => i !== index) : list))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setObjectives((list) => [...list, { objectiveType: "revenue", isPrimary: false }])}>
              Add another objective
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <dl className="space-y-2 text-sm">
              <SummaryRow label="Company name" value={form.watch("name")} />
              <SummaryRow label="Website" value={form.watch("website")} />
              <SummaryRow label="Business model" value={BUSINESS_MODEL_LABELS[form.watch("businessModel")]} />
              <SummaryRow label="Industry" value={form.watch("industry")} />
              <SummaryRow label="What you sell" value={form.watch("mainProductOrService")} />
              <SummaryRow label="Target customers" value={form.watch("targetAudience")} />
              <SummaryRow label="Company description" value={form.watch("companyDescription")} />
              <SummaryRow label="Business stage" value={COMPANY_STAGE_LABELS[form.watch("businessStage")]} />
              <SummaryRow label="Revenue model" value={REVENUE_MODEL_LABELS[form.watch("revenueModel")]} />
              <SummaryRow label="Primary market" value={form.watch("primaryMarket")} />
            </dl>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Growth objectives</h4>
            <ul className="space-y-1">
              {objectives.map((objective) => (
                <li key={`${objective.objectiveType}-${objective.customObjective ?? ""}`} className="text-fg-muted">
                  {OBJECTIVE_LABELS[objective.objectiveType]}
                  {objective.customObjective ? ` — ${objective.customObjective}` : ""}
                  {objective.isPrimary ? " (primary)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {isLastStep ? (
          <Button onClick={() => void confirm()} disabled={submitting}>
            {submitting ? "Creating…" : "Confirm and create company"}
          </Button>
        ) : (
          <Button onClick={() => void next()} disabled={submitting}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
