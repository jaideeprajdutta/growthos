"use client";

import { useState } from "react";
import { growthosApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/utils";
import type { CsvPreview, MeasurementRow } from "@/types";

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  experimentId: string;
  onImported: () => void;
}

export function CsvImportDialog({ open, onClose, companyId, experimentId, onImported }: CsvImportDialogProps) {
  const toast = useToast();
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [sourceName, setSourceName] = useState("CSV import");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function previewCsv() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      setPreview(await growthosApi.previewMeasurementCsv(companyId, experimentId, csv));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The CSV could not be validated.");
    } finally {
      setBusy(false);
    }
  }

  async function importRows() {
    if (!preview || preview.rows.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const rows: MeasurementRow[] = preview.rows.map((row) => ({
        baselineValue: row.baselineValue,
        observedValue: row.observedValue,
        targetValue: row.targetValue,
        direction: row.direction,
        measurementStart: row.measurementStart,
        measurementEnd: row.measurementEnd,
        sourceName: row.sourceName,
        notes: row.notes,
      }));
      const imported = await growthosApi.importMeasurements(companyId, experimentId, { rows, sourceName: sourceName || "CSV import" });
      toast.success(`Imported ${imported.length} measurement${imported.length === 1 ? "" : "s"}`);
      setCsv("");
      setPreview(null);
      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The CSV rows could not be imported.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Import measurements from CSV" description="Preview first, then import. Nothing is saved until you confirm the import." className="max-w-3xl">
      <div className="space-y-4">
        <Textarea
          id="measurement-csv"
          label="CSV data"
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          rows={7}
          placeholder="baseline,observed,target,direction,measurement_start,measurement_end,source_name,notes"
          hint="Required columns: baseline, observed, target. Optional: direction, measurement_start, measurement_end, source_name, notes."
        />
        <Button aria-label="Preview CSV" variant="secondary" disabled={busy || !csv.trim()} onClick={() => void previewCsv()}>
          {busy && !preview ? "Validating…" : "Preview CSV"}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {preview ? (
          <div className="space-y-3">
            {preview.errors.length > 0 ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-xs font-semibold text-destructive">Validation issues</p>
                <ul className="mt-1 list-inside list-disc text-xs text-fg-muted">
                  {preview.errors.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ) : null}
            {preview.rows.length > 0 ? (
              <>
                <p className="text-xs text-fg-muted">{preview.rows.length} valid row{preview.rows.length === 1 ? "" : "s"} ready to import.</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Baseline</TableHead>
                      <TableHead>Observed</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>{formatNumber(row.baselineValue)}</TableCell>
                        <TableCell>{formatNumber(row.observedValue)}</TableCell>
                        <TableCell>{formatNumber(row.targetValue)}</TableCell>
                        <TableCell>{row.direction}</TableCell>
                        <TableCell className="text-xs text-fg-muted">
                          {row.measurementStart ? new Date(row.measurementStart).toISOString().slice(0, 10) : "—"}
                          {" → "}
                          {row.measurementEnd ? new Date(row.measurementEnd).toISOString().slice(0, 10) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-fg-muted">{row.sourceName || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Input id="csv-source-name" label="Source label for imported rows" value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
              </>
            ) : (
              <p className="text-sm text-fg-muted">No valid rows to import. Fix the issues above and preview again.</p>
            )}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button aria-label={`Import ${preview?.rows.length ?? 0} rows`} disabled={busy || !preview || preview.rows.length === 0} onClick={() => void importRows()}>
            {busy ? "Importing…" : `Import ${preview?.rows.length ?? 0} row${preview?.rows.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
