"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { companyProfileFormSchema, COMPANY_STAGES, REVENUE_MODELS } from "@/lib/validation";
import type { Company } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

const STAGE_OPTIONS = COMPANY_STAGES.map((stage) => ({ value: stage, label: stage.replace(/_/g, " ") }));
const REVENUE_OPTIONS = REVENUE_MODELS.map((model) => ({ value: model, label: model }));

export default function SettingsPage() {
  const companies = useApi<Company[]>(() => growthosApi.listCompanies(), "companies");
  const activeCompany = companies.data?.find((company) => company.isActive) ?? companies.data?.[0] ?? null;
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [health, setHealth] = useState<string | null>(null);
  const toast = useToast();

  const form = useForm({
    resolver: zodResolver(companyProfileFormSchema),
    mode: "onChange",
    defaultValues: { name: "", businessStage: "startup", revenueModel: "other", primaryMarket: "" },
  });

  useEffect(() => {
    if (!activeCompany) return;
    form.reset({
      name: activeCompany.name,
      businessStage: activeCompany.businessStage,
      revenueModel: activeCompany.revenueModel,
      primaryMarket: activeCompany.primaryMarket,
    });
    setActiveCompanyId(activeCompany.id);
  }, [activeCompany, form]);

  useEffect(() => {
    growthosApi.health().then((result) => setHealth(result.status)).catch(() => setHealth("unavailable"));
  }, []);

  async function saveSettings() {
    if (!activeCompany) return;
    try {
      if (activeCompanyId && activeCompanyId !== activeCompany.id) {
        await growthosApi.updateCompany(activeCompanyId, { isActive: true });
        for (const company of companies.data ?? []) {
          if (company.id !== activeCompanyId && company.isActive) {
            await growthosApi.updateCompany(company.id, { isActive: false });
          }
        }
      }
      const values = form.getValues();
      await growthosApi.updateCompany(activeCompany.id, {
        name: values.name,
        businessStage: values.businessStage,
        revenueModel: values.revenueModel,
        primaryMarket: values.primaryMarket,
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    }
  }

  async function deleteCompany(companyId: string) {
    setDeleting(true);
    try {
      await growthosApi.deleteCompany(companyId);
      toast.success("Company deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the company.");
    } finally {
      setDeleting(false);
    }
  }

  if (companies.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace, company and application settings." />

      <Card>
        <CardHeader><CardTitle>Company settings</CardTitle><CardDescription>The active company and company preferences.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="active-company" className="text-sm font-medium text-fg">Active company</label>
            <select
              id="active-company"
              aria-label="Active company"
              value={activeCompanyId ?? ""}
              onChange={(event) => setActiveCompanyId(event.target.value || null)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg"
            >
              <option value="">{companies.data && companies.data.length > 0 ? "Select a company" : "No companies"}</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          {activeCompany ? (
            <>
              <Input label="Company name" {...form.register("name")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Business stage" value={form.watch("businessStage")} onChange={(value) => form.setValue("businessStage", value as Company["businessStage"])} options={STAGE_OPTIONS} />
                <Select label="Revenue model" value={form.watch("revenueModel")} onChange={(value) => form.setValue("revenueModel", value as Company["revenueModel"])} options={REVENUE_OPTIONS} />
              </div>
              <Input label="Primary market" {...form.register("primaryMarket")} />
            </>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={() => void form.handleSubmit(() => void saveSettings())()} disabled={!activeCompany || companies.loading}>Save company settings</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-fg-muted">
            No AI provider is configured yet — AI-powered research, diagnosis and opportunity scoring are planned for a later phase. When a provider is added, its credentials stay server-side and are never exposed to the browser.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data management</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-fg-muted">
            Deleting a company removes its profile, growth objectives, opportunities, experiments, execution actions, integrations and activity history. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setConfirmDeleteId(activeCompany?.id ?? null)} disabled={!activeCompany}>Delete this company</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Application information</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-fg-muted">
          <p><span className="font-medium text-fg">Version:</span> 1.0.0</p>
          <p><span className="font-medium text-fg">Backend health:</span> {health === null ? "checking…" : health === "ok" ? "OK" : health}</p>
          <p><span className="font-medium text-fg">Environment:</span> Local single-user workspace</p>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete company"
        description={`Delete ${companies.data?.find((company) => company.id === confirmDeleteId)?.name ?? "this company"} and its data permanently? This cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={() => void deleteCompany(confirmDeleteId!)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
