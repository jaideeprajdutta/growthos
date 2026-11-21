"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { integrationSchema, INTEGRATION_PROVIDERS } from "@/lib/validation";
import { formatTimestamp } from "@/lib/utils";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import type { Integration } from "@/types";
import type { z } from "zod";

const KNOWN_INTEGRATIONS = [
  { provider: "google_analytics", label: "Google Analytics" },
  { provider: "google_search_console", label: "Google Search Console" },
  { provider: "hubspot", label: "HubSpot" },
  { provider: "shopify", label: "Shopify" },
  { provider: "stripe", label: "Stripe" },
  { provider: "meta_ads", label: "Meta Ads" },
  { provider: "google_ads", label: "Google Ads" },
  { provider: "crm", label: "CRM (Salesforce, HubSpot, …)" },
  { provider: "other", label: "Other" },
];

const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(KNOWN_INTEGRATIONS.map((item) => [item.provider, item.label]));

const STATUS_LABELS: Record<string, string> = {
  configured: "Configured",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

const ADD_STATUS_OPTIONS = ["configured", "disconnected", "error"].map((status) => ({ value: status, label: STATUS_LABELS[status] ?? status }));

type IntegrationFormValues = z.infer<typeof integrationSchema>;

const EMPTY_FORM_VALUES: IntegrationFormValues = { provider: "other", status: "configured", settings: "" };

export default function IntegrationsPage() {
  const { company: activeCompany, loading, error } = useActiveCompany();
  const companyId = activeCompany?.id ?? "";
  const { data: integrations, loading: loadingIntegrations } = useApi<Integration[]>(companyId ? () => growthosApi.listIntegrations(companyId) : null, "integrations");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationSchema),
    mode: "onChange",
    defaultValues: EMPTY_FORM_VALUES,
  });

  async function saveIntegration(values: IntegrationFormValues) {
    setSubmitting(true);
    try {
      const settingsText = values.settings?.trim() ?? "";
      let settings: Record<string, unknown> | undefined;
      if (settingsText) {
        try {
          settings = JSON.parse(settingsText) as Record<string, unknown>;
        } catch {
          toast.error("Settings are not valid JSON.");
          return;
        }
      }
      if (editing) {
        await growthosApi.updateIntegration(companyId, editing.id, { provider: values.provider, status: values.status, settings });
        toast.success("Integration updated");
      } else {
        await growthosApi.createIntegration(companyId, { provider: values.provider, status: values.status, settings });
        toast.success("Integration recorded");
      }
      setDialogOpen(false);
      setEditing(null);
      form.reset(EMPTY_FORM_VALUES);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the integration.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteIntegration(integrationId: string) {
    setDeleting(true);
    try {
      await growthosApi.deleteIntegration(companyId, integrationId);
      toast.success("Integration removed");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the integration.");
    } finally {
      setDeleting(false);
    }
  }

  const catalog = integrations ?? [];
  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
    form.reset(EMPTY_FORM_VALUES);
  };
  const openEdit = (integration: Integration) => {
    setEditing(integration);
    setDialogOpen(true);
    form.reset({
      provider: integration.provider,
      status: integration.status,
      settings: integration.settings ? JSON.stringify(integration.settings, null, 2) : "",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="GrowthOS integrations — connection status, configuration and disconnect for the active company."
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Record integration</Button>}
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="p-4"><div className="h-4 w-36 rounded bg-muted" /><div className="mt-2 h-3 w-48 rounded bg-muted" /></Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load the workspace" description={error} />
      ) : !activeCompany ? (
        <EmptyState title="No active company yet" description="Add a company first — integrations are recorded per company." action={<Link href="/companies/onboarding"><Button>Add a company</Button></Link>} />
      ) : loadingIntegrations ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="p-4"><div className="h-4 w-36 rounded bg-muted" /><div className="mt-2 h-3 w-48 rounded bg-muted" /></Card>
          ))}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Available for future implementation</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {KNOWN_INTEGRATIONS.map((integration) => (
                  <div key={integration.provider} className="flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2.5">
                    <span className="text-sm font-medium text-fg">{integration.label}</span>
                    <Badge color="blue">Available</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Configured integrations</CardTitle><CardDescription>Integrations recorded for this company.</CardDescription></CardHeader>
            {catalog.length === 0 ? (
              <div className="p-6"><EmptyState title="No integrations configured" description="Record an integration to start configuring or connecting third-party tools for this company." /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Provider</TableHead><TableHead>Status</TableHead><TableHead>Connected at</TableHead><TableHead /></TableRow>
                </TableHeader>
                <TableBody>
                  {catalog.map((integration) => (
                    <TableRow key={integration.id}>
                      <TableCell className="text-fg">{PROVIDER_LABELS[integration.provider] ?? integration.provider}</TableCell>
                      <TableCell><StatusBadge status={integration.status} /></TableCell>
                      <TableCell className="text-xs text-fg-muted">{integration.connectedAt ? formatTimestamp(integration.connectedAt) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`Edit ${PROVIDER_LABELS[integration.provider] ?? integration.provider}`} onClick={() => openEdit(integration)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-fg"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg></button>
                          <button type="button" aria-label={`Delete ${PROVIDER_LABELS[integration.provider] ?? integration.provider}`} onClick={() => setConfirmDeleteId(integration.id)} className="rounded-lg p-1.5 text-fg-muted hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Edit integration" : "Record an integration"} className="max-w-2xl">
        <div className="space-y-4">
          <Select label="Provider" value={form.watch("provider") ?? "other"} onChange={(value) => form.setValue("provider", value as IntegrationFormValues["provider"])} options={INTEGRATION_PROVIDERS.map((provider) => ({ value: provider, label: PROVIDER_LABELS[provider] ?? provider }))} error={form.formState.errors.provider?.message} />
          <Select label="Status" value={form.watch("status") ?? "configured"} onChange={(value) => form.setValue("status", value as IntegrationFormValues["status"])} options={ADD_STATUS_OPTIONS} error={form.formState.errors.status?.message} />
          <Input label="Settings (JSON)" placeholder="E.g. { projectId: 'my-project' }" {...form.register("settings")} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => void form.handleSubmit((values) => void saveIntegration(values))()} disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update integration" : "Record integration"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete integration" description={`Delete ${catalog.find((item) => item.id === confirmDeleteId)?.provider ?? "this integration"}? This cannot be undone.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={() => void deleteIntegration(confirmDeleteId!)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
