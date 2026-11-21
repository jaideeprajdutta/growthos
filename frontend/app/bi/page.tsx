"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { companyProfileFormSchema, BUSINESS_MODELS, COMPANY_STAGES, REVENUE_MODELS } from "@/lib/validation";
import type { Company, CompanyProfile, IntelligenceProfile } from "@/types";
import Link from "next/link";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Breadcrumbs, PageHeader } from "@/components/layout/page-header";
import { ResearchPanel } from "@/components/shared/research-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type CompanyProfileFormValues = z.infer<typeof companyProfileFormSchema>;

const DEFAULT_VALUES: CompanyProfileFormValues = {
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

const BUSINESS_MODEL_LABELS: Record<Company["businessModel"], string> = {
  saas: "SaaS",
  ecommerce: "E-commerce",
  agency: "Digital agency",
  services: "Online services",
  other: "Other",
};

const COMPANY_STAGE_LABELS: Record<Company["businessStage"], string> = {
  startup: "Startup",
  growth: "Growth",
  scale: "Scale",
  enterprise: "Enterprise",
};

const REVENUE_MODEL_LABELS: Record<Company["revenueModel"], string> = {
  subscription: "Subscription",
  transactional: "Transactional",
  freemium: "Freemium",
  sales_led: "Sales-led",
  other: "Other",
};

export default function BusinessIntelligencePage() {
  const { company, loading, error } = useActiveCompany();
  const companyId = company?.id ?? "";
  const profile = useApi<CompanyProfile | null>(companyId ? () => growthosApi.getCompanyProfile(companyId) : null, "company-profile");
  const form = useForm<CompanyProfileFormValues>({ resolver: zodResolver(companyProfileFormSchema), mode: "onChange", defaultValues: DEFAULT_VALUES });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!company) return;
    form.reset({
      name: company.name,
      website: company.website,
      businessModel: company.businessModel,
      industry: company.industry,
      businessStage: company.businessStage,
      revenueModel: company.revenueModel,
      primaryMarket: company.primaryMarket,
      companyDescription: company.companyDescription,
      targetAudience: company.targetAudience,
      mainProductOrService: company.mainProductOrService,
      positioningStatement: profile.data?.positioningStatement ?? "",
      competitiveLandscape: profile.data?.competitiveLandscape ?? "",
      marketContext: profile.data?.marketContext ?? "",
      productDescription: profile.data?.productDescription ?? "",
    });
  }, [company, profile.data, form]);

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
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Business Intelligence" }]} />
      <PageHeader
        title="Business Intelligence"
        description="Structured information about the company: overview, product, audience, market, competitors and positioning."
      />
      {loading ? (
        <Card className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2"><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-56" /></div>
          <Skeleton className="h-9 w-full" />
        </Card>
      ) : error ? (
        <EmptyState title="Couldn't load the company" description={error} />
      ) : !company ? (
        <EmptyState
          title="No active company yet"
          description="Add a company to record business intelligence for it."
          action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>}
        />
      ) : (
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Company overview</CardTitle><CardDescription>Name, website, business model and industry.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Company name" {...form.register("name")} error={form.formState.errors.name?.message} />
                <Input label="Website" {...form.register("website")} error={form.formState.errors.website?.message} />
              </div>
              <Select label="Business model" value={form.watch("businessModel")} onChange={(value) => form.setValue("businessModel", value as Company["businessModel"])} options={BUSINESS_MODELS.map((model) => ({ value: model, label: BUSINESS_MODEL_LABELS[model] }))} error={form.formState.errors.businessModel?.message} />
              <Input label="Industry" {...form.register("industry")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Product and service</CardTitle><CardDescription>What the company sells and describes.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Main product or service" {...form.register("mainProductOrService")} />
              <Input label="Company description" {...form.register("companyDescription")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Target audience</CardTitle><CardDescription>Who the company serves.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Target audience" {...form.register("targetAudience")} />
              <Input label="Primary market" {...form.register("primaryMarket")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Market context</CardTitle><CardDescription>How the market is structured.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <Input label="Market context" {...form.register("marketContext")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Competitor research</CardTitle><CardDescription>Landscape of relevant competitors.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <Input label="Competitive landscape" {...form.register("competitiveLandscape")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Positioning</CardTitle><CardDescription>The business position in the market.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              <Input label="Positioning statement" {...form.register("positioningStatement")} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Business model</CardTitle><CardDescription>How the company makes money.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Select label="Business model" value={form.watch("businessModel")} onChange={(value) => form.setValue("businessModel", value as Company["businessModel"])} options={BUSINESS_MODELS.map((model) => ({ value: model, label: BUSINESS_MODEL_LABELS[model] }))} />
              <Select label="Business stage" value={form.watch("businessStage")} onChange={(value) => form.setValue("businessStage", value as Company["businessStage"])} options={COMPANY_STAGES.map((stage) => ({ value: stage, label: COMPANY_STAGE_LABELS[stage] }))} />
              <Select label="Revenue model" value={form.watch("revenueModel")} onChange={(value) => form.setValue("revenueModel", value as Company["revenueModel"])} options={REVENUE_MODELS.map((model) => ({ value: model, label: REVENUE_MODEL_LABELS[model] }))} />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      )}
      {company && <ResearchPanel company={company} />}
      {company && <IntelligenceOverview companyId={company.id} />}
    </>
  );
}

function IntelligenceOverview({ companyId }: { companyId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const profile = useApi<IntelligenceProfile | null>(() => growthosApi.getIntelligenceProfile(companyId), `bi-intelligence-${refreshKey}`);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();

  async function generateReport() {
    setGenerating(true);
    try {
      const report = await growthosApi.generateIntelligenceReport(companyId, true);
      toast.success(`Report v${report.version} generated with ${report.findingsCount} findings.`);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate the report.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Business intelligence profile</h3>
        <Button variant="secondary" size="sm" disabled={generating} onClick={() => void generateReport()}>
          {generating ? "Generating…" : profile.data ? "Regenerate report" : "Generate report"}
        </Button>
      </div>
      {profile.loading ? (
        <Skeleton className="h-4 w-48" />
      ) : profile.error ? (
        <p className="text-sm text-destructive">{profile.error}</p>
      ) : !profile.data ? (
        <p className="text-sm text-fg-muted">
          No intelligence profile yet. Generate a report to create one from research evidence.
        </p>
      ) : (
        <div className="space-y-2">
          {[
            ["Value proposition", profile.data.valueProposition],
            ["Target audience", profile.data.targetAudience],
            ["Customer pain points", profile.data.customerPainPoints],
            ["Pricing model", profile.data.pricingModel],
            ["Key differentiators", profile.data.keyDifferentiators],
          ].map(([label, value]) => (
            <div key={label}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</h4>
              <p className="mt-0.5 max-h-24 overflow-y-auto text-sm text-fg">{value || "Not available."}</p>
            </div>
          ))}
          <p className="text-xs text-fg-muted">
            Version {profile.data.version} — {profile.data.refreshedAt ? new Date(profile.data.refreshedAt).toLocaleString() : "not yet"}
          </p>
        </div>
      )}
    </Card>
  );
}
