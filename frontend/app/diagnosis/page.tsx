"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Sparkles } from "lucide-react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useApi } from "@/hooks/use-api";
import { growthosApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/layout/page-header";
import type { DiagnosticFinding, DiagnosticRun, GrowthObjective, IntelligenceReport } from "@/types";
import type { UseApiResult } from "@/hooks/use-api";

type DiagnosticPhase = "discovery" | "acquisition" | "activation" | "conversion" | "retention" | "expansion" | "referral";

const PHASES: { key: DiagnosticPhase; title: string; description: string; objectives: string[] }[] = [
  { key: "discovery", title: "Discovery", description: "Finding problems and opportunities worth diagnosing.", objectives: ["lead_generation"] },
  { key: "acquisition", title: "Acquisition", description: "Attracting and qualifying new prospects.", objectives: ["customer_acquisition"] },
  { key: "activation", title: "Activation", description: "Moving signups to their first moments of value.", objectives: [] },
  { key: "conversion", title: "Conversion", description: "Turning qualified leads into paying customers.", objectives: ["conversion"] },
  { key: "retention", title: "Retention", description: "Reducing churn and expanding usage.", objectives: ["retention"] },
  { key: "expansion", title: "Expansion", description: "Growing revenue from existing customers.", objectives: [] },
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

function PhaseFindings({ findings }: { findings: DiagnosticFinding[] }) {
  if (findings.length === 0) return null;
  return (
    <div className="space-y-1">
      {findings.map((finding) => (
        <div key={finding.id} className="rounded-lg border border-border p-2">
          <p className="text-xs font-medium text-fg">{finding.problemStatement || finding.description || finding.dimension}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-fg-muted">
            <span className="rounded-full bg-muted px-2 py-0.5">{finding.category}</span>
            <span className="rounded-full bg-muted px-2 py-0.5">severity {finding.severity ?? "—"}</span>
            <span className="rounded-full bg-muted px-2 py-0.5">confidence {finding.confidence != null ? Math.round(finding.confidence * 100) : 0}%</span>
            {finding.evidenceIds?.length ? <span>evidence: {finding.evidenceIds.length}</span> : null}
            {finding.rootCauseHypothesis && <span>{finding.rootCauseHypothesis}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DiagnosisPage() {
  const { company, loading, error } = useActiveCompany();
  const companyId = company?.id ?? "";
  const [refreshKey, setRefreshKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const objectives = useApi<GrowthObjective[]>(companyId ? () => growthosApi.listGrowthObjectives(companyId) : null, "company-objectives");
  const findings = useApi<DiagnosticFinding[]>(companyId ? () => growthosApi.listDiagnosticFindings(companyId) : null, `diagnosis-diagnostic-findings-${refreshKey}`);

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

  async function runDiagnostics() {
    if (!companyId || generating) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      await growthosApi.generateDiagnostics(companyId);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to run diagnostics.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Growth Diagnosis" }]} />
      <PageHeader
        title="Growth Diagnosis"
        description="Structure the diagnosis around the seven growth phases: discovery, acquisition, activation, conversion, retention, expansion and referral — built from real evidence recorded on the company."
        actions={
          <Button variant="primary" size="sm" onClick={() => void runDiagnostics()} disabled={generating || !companyId}>
            <Sparkles className="h-4 w-4" />
            {generating ? "Running…" : "Run diagnosis"}
          </Button>
        }
      />
      {generating ? null : generateError ? (
        <p className="text-sm text-destructive">Diagnostics could not be run: {generateError}</p>
      ) : null}
      <p className="max-w-2xl text-xs text-fg-muted">
        Diagnostics run uses AI analysis — nothing is shown as a diagnosis until an AI provider is configured.
      </p>
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
              The diagnosis is built from real evidence: growth objectives recorded on the company profile (see Companies → company profile), experiments and their outcomes (see Experiments), and findings recorded as opportunities (see Opportunities). This page maps each of the seven growth phases — discovery, acquisition, activation, conversion, retention, expansion, referral — to the evidence linked to it, plus any diagnostic findings for the phase. Findings are distinguished between confirmed issues, potential bottlenecks, unknown areas, and recommendations that need more evidence — nothing here is invented or assumed.
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
                  <PhaseFindings findings={findings.data?.filter((finding) => finding.dimension === phase.key) ?? []} />
                </CardContent>
              </Card>
            ))}
          </div>
          <DiagnosticsSection companyId={companyId} findings={findings} refreshKey={refreshKey} />
          <IntelligenceReportSection companyId={companyId} />
        </div>
      )}
    </>
  );
}

function DiagnosticsSection({ companyId, findings, refreshKey }: { companyId: string; findings: UseApiResult<DiagnosticFinding[]>; refreshKey: number }) {
  const runs = useApi<DiagnosticRun[]>(() => growthosApi.listDiagnosticRuns(companyId), `diagnosis-diagnostic-runs-${refreshKey}`);
  if (runs.loading) return <Skeleton className="h-24 w-full" />;
  const list = findings.data ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnostic findings</CardTitle>
        <CardDescription>Issues, bottlenecks and recommendations from the diagnostic engine — severity and confidence are recorded.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {runs.data && runs.data.length > 0 && <p className="text-xs text-fg-muted">Latest run: {runs.data[0].runAt.slice(0, 19).replace("T", " ")}</p>}
        {list.length === 0 ? (
          <EmptyState title="No diagnostic findings" description="Generate diagnostics with the Run diagnosis button above, or record evidence on the Opportunities page." />
        ) : (
          list.map((finding) => (
            <div key={finding.id} className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-sm font-medium text-fg">{finding.problemStatement || finding.description || finding.dimension}</p>
              <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
                <span className="rounded-full bg-muted px-2 py-0.5">{finding.category}</span>
                <span className="rounded-full bg-muted px-2 py-0.5">severity {finding.severity ?? "—"}</span>
                <span className="rounded-full bg-muted px-2 py-0.5">confidence {finding.confidence != null ? Math.round(finding.confidence * 100) : 0}%</span>
                {finding.evidenceIds.length > 0 && <span>evidence: {finding.evidenceIds.length}</span>}
              </div>
              {finding.rootCauseHypothesis && <p className="text-xs text-fg-muted">{finding.rootCauseHypothesis}</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function IntelligenceReportSection({ companyId }: { companyId: string }) {
  const reports = useApi<IntelligenceReport[]>(() => growthosApi.listIntelligenceReports(companyId), "diagnosis-intelligence-reports");
  if (reports.loading) return null;
  const report = reports.data?.[0];
  return (
    <Card>
      <CardHeader><CardTitle>Business intelligence report</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!report ? (
          <EmptyState title="No intelligence report yet" description="Generate a report on the Business Intelligence page." />
        ) : (
          <>
            {report.executiveSummary && <p className="text-sm text-fg">{report.executiveSummary}</p>}
            <div className="space-y-2">
              {report.findings.slice(0, 5).map((finding) => (
                <div key={finding.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-fg">[{finding.category}] {finding.title}</p>
                  {finding.description && <p className="text-sm text-fg-muted">{finding.description}</p>}
                </div>
              ))}
            </div>
            <p className="text-xs text-fg-muted">Version {report.version} · {report.findingsCount} findings</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
