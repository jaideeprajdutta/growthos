"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { companyProfileFormSchema, growthObjectiveSchema } from "@/lib/validation";
import { BUSINESS_MODELS, COMPANY_STAGES, GROWTH_OBJECTIVE_TYPES, REVENUE_MODELS } from "@/lib/validation";
import type { Company, CompanyBusinessModel, CompanyProfile, CompanyStage, GrowthObjective, RevenueModel } from "@/types";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

type CompanyProfileFormValues = z.infer<typeof companyProfileFormSchema>;

type ObjectiveDraft = { objectiveType: string; customObjective: string; isPrimary: boolean };

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

const DEFAULT_FORM_VALUES: CompanyProfileFormValues = {
  name: "",
  website: "",
  businessModel: "other",
  industry: "",
  businessStage: "startup",
  revenueModel: "other",
  primaryMarket: "",
  companyDescription: "",
  targetAudience: "",
  mainProductOrService: "",
  positioningStatement: "",
  competitiveLandscape: "",
  marketContext: "",
  productDescription: "",
};

export default function CompanyProfilePage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;
  const company = useApi<Company>(() => growthosApi.getCompany(companyId), `company:${companyId}`);
  const profile = useApi<CompanyProfile | null>(() => growthosApi.getCompanyProfile(companyId), `company-profile:${companyId}`);
  const [refreshKey, setRefreshKey] = useState(0);
  const objectives = useApi<GrowthObjective[]>(
    () => growthosApi.listGrowthObjectives(companyId),
    `company-objectives:${companyId}:${refreshKey}`
  );
  const toast = useToast();

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileFormSchema),
    mode: "onChange",
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    if (!company.data) return;
    form.reset({
      name: company.data.name,
      website: company.data.website,
      businessModel: company.data.businessModel,
      industry: company.data.industry,
      businessStage: company.data.businessStage,
      revenueModel: company.data.revenueModel,
      primaryMarket: company.data.primaryMarket,
      companyDescription: company.data.companyDescription,
      targetAudience: company.data.targetAudience,
      mainProductOrService: company.data.mainProductOrService,
      positioningStatement: profile.data?.positioningStatement ?? "",
      competitiveLandscape: profile.data?.competitiveLandscape ?? "",
      marketContext: profile.data?.marketContext ?? "",
      productDescription: profile.data?.productDescription ?? "",
    });
  }, [company.data, profile.data, form]);

  const [saving, setSaving] = useState(false);
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [objectiveDraft, setObjectiveDraft] = useState<ObjectiveDraft>({ objectiveType: "revenue", customObjective: "", isPrimary: true });
  const [savingObjective, setSavingObjective] = useState(false);
  const [deletingObjectiveId, setDeletingObjectiveId] = useState<string | null>(null);

  async function onSave(values: CompanyProfileFormValues) {
    setSaving(true);
    try {
      await growthosApi.updateCompany(companyId, {
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
      });
      await growthosApi.upsertCompanyProfile(companyId, {
        positioningStatement: values.positioningStatement ?? "",
        competitiveLandscape: values.competitiveLandscape ?? "",
        marketContext: values.marketContext ?? "",
        productDescription: values.productDescription ?? "",
      });
      toast.success("Company saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the company.");
    } finally {
      setSaving(false);
    }
  }

  async function saveObjective() {
    setSavingObjective(true);
    try {
      const parsed = growthObjectiveSchema.safeParse({
        objectiveType: objectiveDraft.objectiveType,
        customObjective: objectiveDraft.customObjective.trim() || undefined,
        isPrimary: objectiveDraft.isPrimary,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid objective.");
        return;
      }
      await growthosApi.createGrowthObjective(companyId, parsed.data);
      toast.success("Growth objective added");
      setObjectiveDialogOpen(false);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add the objective.");
    } finally {
      setSavingObjective(false);
    }
  }

  async function deleteObjective(objectiveId: string) {
    setDeletingObjectiveId(objectiveId);
    try {
      await growthosApi.deleteGrowthObjective(companyId, objectiveId);
      toast.success("Growth objective deleted");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the objective.");
    } finally {
      setDeletingObjectiveId(null);
    }
  }

  const companyName = company.data?.name ?? "Company";

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: companyName }]} />
      <PageHeader title={companyName} description="Company profile, business context and growth objectives." />

      {company.loading ? (
        <Card className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-56" />
          </div>
          <Skeleton className="h-9 w-full" />
        </Card>
      ) : company.error ? (
        <EmptyState title="Couldn't load the company" description={company.error} />
      ) : company.data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company basics</CardTitle>
              <CardDescription>Name, website, business model and industry.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Company name" {...form.register("name")} error={form.formState.errors.name?.message} />
                <Input label="Website" {...form.register("website")} error={form.formState.errors.website?.message} />
              </div>
              <Select
                label="Business model"
                value={form.watch("businessModel")}
                onChange={(value) => form.setValue("businessModel", value as CompanyBusinessModel)}
                options={BUSINESS_MODELS.map((model) => ({ value: model, label: BUSINESS_MODEL_LABELS[model] }))}
                error={form.formState.errors.businessModel?.message}
              />
              <Input label="Industry" {...form.register("industry")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business overview</CardTitle>
              <CardDescription>Describe what the company does and who it serves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Company description" {...form.register("companyDescription")} />
              <Input label="Target audience" {...form.register("targetAudience")} />
              <Input label="Main product or service" {...form.register("mainProductOrService")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business context</CardTitle>
              <CardDescription>Stage, revenue model and primary market.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business intelligence</CardTitle>
              <CardDescription>Positioning, market context and competitor landscape.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Positioning statement" {...form.register("positioningStatement")} />
              <Input label="Market context" {...form.register("marketContext")} />
              <Input label="Competitive landscape" {...form.register("competitiveLandscape")} />
              <Input label="Product description" {...form.register("productDescription")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Growth objectives</CardTitle>
                  <CardDescription>Primary and secondary growth goals for this company.</CardDescription>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setObjectiveDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add objective
                </Button>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Custom objective</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {objectives.data?.map((objective) => (
                  <TableRow key={objective.id}>
                    <TableCell>{OBJECTIVE_LABELS[objective.objectiveType] ?? objective.objectiveType}</TableCell>
                    <TableCell>{objective.isPrimary ? "Yes" : "No"}</TableCell>
                    <TableCell className="max-w-sm truncate">{objective.customObjective}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        aria-label={`Delete objective ${OBJECTIVE_LABELS[objective.objectiveType]}`}
                        onClick={() => void deleteObjective(objective.id)}
                        disabled={deletingObjectiveId === objective.id}
                        className="text-fg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => void form.handleSubmit(onSave)()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={objectiveDialogOpen} onClose={() => setObjectiveDialogOpen(false)} title="Add growth objective">
        <div className="space-y-4">
          <Select
            label="Objective"
            value={objectiveDraft.objectiveType}
            onChange={(value) => setObjectiveDraft((draft) => ({ ...draft, objectiveType: value }))}
            options={GROWTH_OBJECTIVE_TYPES.map((type) => ({ value: type, label: OBJECTIVE_LABELS[type] }))}
          />
          {objectiveDraft.objectiveType === "other" ? (
            <Input
              label="Custom objective"
              value={objectiveDraft.customObjective}
              onChange={(event) => setObjectiveDraft((draft) => ({ ...draft, customObjective: event.target.value }))}
              placeholder="e.g. Improve retention among free users"
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setObjectiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveObjective()} disabled={savingObjective}>
              {savingObjective ? "Adding…" : "Add objective"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
