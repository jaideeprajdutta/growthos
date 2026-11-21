"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Evidence } from "@/types";

function classificationLabel(classification: string): string {
  switch (classification) {
    case "observed": return "Observed";
    case "company_provided": return "Company-provided";
    case "third_party": return "Third-party reported";
    case "inferred": return "Inferred";
    case "unverified": return "Unverified";
    case "contradictory": return "Contradictory";
    default: return classification || "Unknown";
  }
}

/** Traceable evidence records — source, excerpt, dimension, classification and date. */
export function EvidenceViewer({ evidence, title = "Supporting evidence" }: { evidence: Evidence[]; title?: string }) {
  if (evidence.length === 0) return null;
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {evidence.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="max-w-full truncate text-sm font-medium text-fg hover:underline">
                {item.sourceTitle || item.sourceUrl}
              </a>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-fg-muted">{item.dimension}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
              <span>{classificationLabel(item.classification)}</span>
              <span>{item.observationDate || item.collectedAt.slice(0, 10)}</span>
              <span>{item.verificationStatus.replace(/_/g, " ")}</span>
            </div>
            {item.extractedStatement && <p className="text-sm text-fg">{item.extractedStatement}</p>}
            {item.supportingExcerpt && (
              <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs text-fg-muted">{item.supportingExcerpt}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
