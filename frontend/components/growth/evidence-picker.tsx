"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { Evidence } from "@/types";

interface EvidencePickerProps {
  evidence: Evidence[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

/** Attaches existing, company-scoped evidence to a note, measurement or review. */
export function EvidencePicker({ evidence, selected, onChange }: EvidencePickerProps) {
  if (evidence.length === 0) {
    return <p className="text-xs text-fg-muted">No research evidence recorded for this company yet.</p>;
  }

  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-line p-3">
      {evidence.map((item) => {
        const checked = selected.includes(item.id);
        return (
          <Checkbox
            key={item.id}
            id={`evidence-${item.id}`}
            label={`${item.sourceTitle || item.sourceUrl}${item.extractedStatement ? ` — ${item.extractedStatement.slice(0, 90)}` : ""}`}
            checked={checked}
            onChange={(next) =>
              onChange(next ? [...selected, item.id] : selected.filter((id) => id !== item.id))
            }
          />
        );
      })}
    </div>
  );
}
