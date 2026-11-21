"""CSV parsing for experiment measurements.

No external dependency: the standard-library ``csv`` module is enough. Parsing
only produces a preview — nothing is persisted until the user explicitly
confirms the import. Numeric and date validation happens here and again in the
Pydantic import schema.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime

ALIASES = {
    "baseline": "baselineValue",
    "baseline_value": "baselineValue",
    "observed": "observedValue",
    "observed_value": "observedValue",
    "actual": "observedValue",
    "result": "observedValue",
    "target": "targetValue",
    "target_value": "targetValue",
    "direction": "direction",
    "start": "measurementStart",
    "measurement_start": "measurementStart",
    "end": "measurementEnd",
    "measurement_end": "measurementEnd",
    "source_name": "sourceName",
    "sourcename": "sourceName",
    "notes": "notes",
    "note": "notes",
}

REQUIRED = {"baselineValue", "observedValue", "targetValue"}
ROW_LIMIT = 500


def _normalise(name: str | None) -> str:
    return (name or "").strip().lower().replace(" ", "_").replace("-", "_")


def _number(value: str) -> float:
    cleaned = value.strip().replace(",", "")
    return float(cleaned)


def _date(value: str) -> str | None:
    text = value.strip()
    if not text:
        return None
    return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat()


def parse_measurement_csv(text: str) -> tuple[list[dict], list[str], list[str]]:
    """Return (rows, errors, canonical headers) from CSV text."""
    reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff")))
    raw_headers = [_normalise(header) for header in (reader.fieldnames or [])]
    headers = [ALIASES.get(header, header) for header in raw_headers]
    errors: list[str] = []

    missing = sorted(REQUIRED - set(headers))
    if missing:
        return [], [f"Missing required column(s): {', '.join(missing)}."], headers

    mapping = dict(zip(reader.fieldnames or [], headers))
    rows: list[dict] = []
    for index, raw in enumerate(reader, start=2):
        if index > ROW_LIMIT + 1:
            errors.append(f"Only the first {ROW_LIMIT} rows are previewed.")
            break
        item = {mapping.get(key, _normalise(key)): value for key, value in raw.items() if key is not None}
        row: dict = {"rowNumber": index, "direction": "increase", "sourceName": "", "notes": ""}
        try:
            for field in ("baselineValue", "observedValue", "targetValue"):
                value = (item.get(field) or "").strip()
                if not value:
                    raise ValueError(f"{field} is empty")
                row[field] = _number(value)
            direction = (item.get("direction") or "increase").strip().lower()
            if direction not in ("increase", "decrease"):
                raise ValueError("direction must be 'increase' or 'decrease'")
            row["direction"] = direction
            for field in ("measurementStart", "measurementEnd"):
                row[field] = _date(item.get(field) or "")
            row["sourceName"] = (item.get("sourceName") or "").strip()[:200]
            row["notes"] = (item.get("notes") or "").strip()[:2000]
        except (ValueError, TypeError) as exc:
            errors.append(f"Row {index}: {exc}.")
            continue
        rows.append(row)

    if not rows and not errors:
        errors.append("The CSV contains no data rows.")
    return rows, errors, headers
