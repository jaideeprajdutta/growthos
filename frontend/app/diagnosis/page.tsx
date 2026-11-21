"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/page-header";
import type { GrowthObjective } from "@/types";

const PHASES: { key: string; title: string; description: string; objectives: string[] }[] = [
  { key: "acquisition", title: "Acquisition", description: "Attracting and qualifying new prospects.", objectives: ["customer_acquisition", "lead_generation"] },
  { key: "activation", title: "Activation", description: "Moving signups to their first moments of value.", objectives: [] },
  { key: "conversion", title: "Conversion", description: "Turning qualified leads into paying customers.", objectives: ["conversion"] },
  { key: "retention", title: "Retention", description: "Reducing churn and expanding usage.", objectives: ["retention"] },
  { key: "revenue", title: "Revenue", description: "Growing recurring revenue and margins.", objectives: ["revenue"] },
  { key: "referral", title: "Referral", description: "Generating word-of-mouth and partner growth.", objectives: [] },
];

function DiagnosisSection({ label, message, count }: { label: string; message: string; count?: number }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</h4>
      <p className="text-sm text-fg-muted">{count ? `${count} growth objective${count === 1 ? "" : "s"} recorded for this phase.` : message}</p>
    </div>
  );
}

export default function DiagnosisPage() {
  const { company, loading, error } = useActiveCompany();
  const companyId = company?.id ?? "";
  const objectives = useApi<GrowthObjective[]>(companyId ? () => growthosApi.listGrowthObjectives(companyId) : null, "company-objectives");

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const objective of objectives.data ?? []) {
      for (const phase of PHASES) {
        if (phase.objectives.includes(objective.objectiveType)) {
          result[phase.key] = (result[phase.key] ?? 0) + 1;
        }
      }
    }
    return result;
  }, [objectives.data]);

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Growth Diagnosis" }]} />
      <PageHeader
        title="Growth Diagnosis"
        description="Structure the diagnosis around the six growth phases, built from real evidence recorded on the company."
      />
      {loading ? (
        <Card className="p-5"><Skeleton className="h-8 w-40" /><Skeleton className="mt-3 h-8 w-64" /></Card>
      ) : error ? (
        <EmptyState title="Couldn't load the company" description={error} />
      ) : !company ? (
        <EmptyState
          title="No active company yet"
          description="Add a company to build a growth diagnosis for it."
          action={<Link href="/companies/onboarding"><Building2 className="h-4 w-4" /> Add a company</Link>}
        />
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-fg">How this workspace works</h2>
            <p className="mt-2 text-sm text-fg-muted">
              The diagnosis is built from real evidence: growth objectives recorded on the company profile (see Companies → company profile), experiments and their outcomes (see Experiments), and findings recorded as opportunities (see Opportunities). This page presents the six growth phases with the evidence linked to each. Findings are distinguished between confirmed issues, potential bottlenecks, unknown areas, and recommendations that need more evidence — nothing here is invented or assumed.
            </p>
          </Card>
          <div className="grid gap-3">
            {PHASES.map((phase) => (
              <Card key={phase.key}>
                <CardHeader>
                  <CardTitle>{phase.title}</CardTitle>
                  <CardDescription>{phase.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DiagnosisSection label="Confirmed issues" message="No confirmed issues recorded yet." />
                  <DiagnosisSection label="Potential bottlenecks" message="No bottlenecks identified yet." />
                  <DiagnosisSection label="Recommendations requiring more evidence" message="No recommendations yet — record opportunities with evidence on the Opportunities page." />
                  <DiagnosisSection
                    label="Unknown areas"
                    count={counts[phase.key] ?? 0}
                    message="Unknown areas require research — connect data sources (Integrations) or run experiments (Experiments) to record evidence."
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
