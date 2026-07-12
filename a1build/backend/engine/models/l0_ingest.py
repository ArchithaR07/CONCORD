
import json
import re
from pathlib import Path
from typing import Optional

import pandas as pd

from . import config

METADATA_LINE_RE = re.compile(
    r"\*\*(Author|Department|Version|Last Reviewed|Status)\*\*:?\s*(.+)",
    re.IGNORECASE,
)
BULLET_RE = re.compile(r"^\s*[-*]\s+(.*\S)\s*$")


def _load_metadata_lookup() -> dict:
    
    if not config.POLICY_METADATA_CSV.exists():
        return {}
    df = pd.read_csv(config.POLICY_METADATA_CSV)
    return {row["file"]: row.to_dict() for _, row in df.iterrows()}


def _parse_single_policy(path: Path, meta_lookup: dict) -> dict:
    text = path.read_text(encoding="utf-8")
    lines = [l.rstrip() for l in text.splitlines()]

    title = None
    fields = {"author": None, "department": None, "version": None,
              "last_reviewed": None, "status": None}
    clauses = []
    section_counter = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith("# ") and title is None:
            title = stripped[2:].strip()
            continue

        m = METADATA_LINE_RE.match(stripped)
        if m:
            key = m.group(1).lower().replace(" ", "_")
            fields[key] = m.group(2).strip()
            continue

        b = BULLET_RE.match(line)
        if b:
            section_counter += 1
            clauses.append({
                "section_id": f"{section_counter}",
                "clause_text": b.group(1).strip(),
            })

    meta_row = meta_lookup.get(path.name, {})
    title = title or meta_row.get("title") or path.stem
    author = fields["author"] or meta_row.get("author")
    department = fields["department"] or meta_row.get("department")
    version = fields["version"] or meta_row.get("version")
    last_reviewed = fields["last_reviewed"] or meta_row.get("last_reviewed")
    status = fields["status"] or meta_row.get("status", "active")

    return {
        "policy_file": path.name,
        "policy_name": title,
        "author": author,
        "department": department,
        "version": version,
        "last_reviewed": last_reviewed,
        "status": status,
        "clauses": clauses,
    }


def ingest_all(policies_dir: Optional[Path] = None) -> list:
    policies_dir = policies_dir or config.POLICIES_DIR
    meta_lookup = _load_metadata_lookup()

    md_files = sorted(policies_dir.glob("*.md"))
    txt_files = sorted(policies_dir.glob("*.txt"))
    all_files = md_files + txt_files
    if not all_files:
        raise FileNotFoundError(
            f"No policy_*.md or .txt files found in {policies_dir}. "
            f"Drop the 30 sample policies there first."
        )

    parsed = [_parse_single_policy(p, meta_lookup) for p in all_files]
    return parsed


def run(save: bool = True) -> list:
    parsed = ingest_all()
    if save:
        out_path = config.OUTPUTS_DIR / "clauses.json"
        out_path.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
        print(f"[L0 INGEST] {len(parsed)} policies, "
              f"{sum(len(p['clauses']) for p in parsed)} clauses -> {out_path}")
    return parsed


if __name__ == "__main__":
    run()
