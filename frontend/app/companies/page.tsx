"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Pencil, Search, Trash2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/toast";
import type { Company, CompanyBusinessModel } from "@/types";

const BUSINESS_MODEL_LABELS: Record<CompanyBusinessModel, string> = {
  saas: "SaaS",
  ecommerce: "E-commerce",
  agency: "Digital agency",
  services: "Online services",
  other: "Other",
};

const BUSINESS_MODEL_COLORS: Record<CompanyBusinessModel, BadgeColor> = {
  saas: "blue",
  ecommerce: "amber",
  agency: "green",
  services: "default",
  other: "default",
};

export default function CompaniesPage() {
  const { data: companies, loading, error } = useApi<Company[]>(() => growthosApi.listCompanies(), "companies");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const filtered = (companies ?? []).filter(
    (company) =>
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      (company.website || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectActive = async (company: Company) => {
    const previous = selectedId ?? companies?.find((item) => item.isActive)?.id ?? null;
    setSelectedId(company.id);
    try {
      await growthosApi.updateCompany(company.id, { isActive: true });
      if (previous && previous !== company.id) {
        await growthosApi.updateCompany(previous, { isActive: false });
      }
      toast.success("Active company", `${company.name} is now the active company.`);
    } catch (err) {
      setSelectedId(null);
      toast.error(err instanceof Error ? err.message : "Failed to select the active company.");
    }
  };

  const deleteCompany = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await growthosApi.deleteCompany(deleteTargetId);
      toast.success("Company deleted", "Removed from the workspace.");
      setDeleteTargetId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the company.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Companies"
        description="The companies that make up your GrowthOS workspace."
        actions={
          <Link href="/companies/onboarding">
            <Button>Add a company</Button>
          </Link>
        }
      />
      <div className="mb-6">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search companies"
          aria-label="Search companies"
          className="max-w-sm"
          startIcon={<Search className="h-4 w-4 text-fg-muted" />}
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card key={index} className="flex items-start gap-3 p-4">
              <Skeleton className="h-10 w-10 shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load companies" description={error} />
      ) : search && filtered.length === 0 ? (
        <EmptyState title="No companies match your search" description={`No companies named or linked to "${search}" in this workspace.`} />
      ) : companies?.length === 0 ? (
        <EmptyState
          title="No companies yet"
          description="Add a company to start the GrowthOS workflow: Research → Diagnose → Prioritise → Experiment → Execute → Measure → Learn."
          action={
            <Link href="/companies/onboarding">
              <Button>Add a company</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              isSelected={selectedId ? selectedId === company.id : company.isActive}
              onSelect={() => void selectActive(company)}
              onDelete={() => setDeleteTargetId(company.id)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        title="Delete company"
        description={`Delete ${companies?.find((company) => company.id === deleteTargetId)?.name ?? "this company"} and its profile, objectives and history? This cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTargetId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void deleteCompany()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function CompanyCard({
  company,
  isSelected,
  onSelect,
  onDelete,
}: {
  company: Company;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-start justify-between gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Building2 className="mt-1 h-5 w-5 shrink-0 text-fg-muted" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{company.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge color={BUSINESS_MODEL_COLORS[company.businessModel]}>{BUSINESS_MODEL_LABELS[company.businessModel]}</Badge>
            <Badge color={isSelected ? "blue" : "default"}>{isSelected ? "Active" : "Not active"}</Badge>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="max-w-full truncate text-xs text-fg-muted hover:text-fg hover:underline"
              >
                {company.website}
              </a>
            ) : null}
          </div>
          {company.industry ? <p className="mt-1 text-xs text-fg-muted">{company.industry}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <input
          type="radio"
          aria-label={`Select ${company.name} as the active company`}
          checked={isSelected}
          onChange={onSelect}
          className="h-4 w-4 accent-accent"
        />
        <Link href={`/companies/${company.id}`} aria-label={`Open ${company.name}`} className="text-fg-muted hover:text-fg">
          <Pencil className="h-4 w-4" />
        </Link>
        <button type="button" aria-label={`Delete ${company.name}`} onClick={onDelete} className="text-fg-muted hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
