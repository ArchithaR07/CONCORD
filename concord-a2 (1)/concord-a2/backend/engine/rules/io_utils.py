"""Small shared IO helpers. Every layer reads/writes JSON files under outputs/
so A1 and B never need to import A2's Python code directly -- the JSON files
ARE the interface, per the work-split doc's "everyone builds to/from JSON
files, not to each other's code."
"""
import json
from datetime import datetime, timezone
from pathlib import Path


def load_json(path):
    path = Path(path)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(obj, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False, default=_json_default)
    return path


def _json_default(o):
    if isinstance(o, (set, frozenset)):
        return sorted(o)
    raise TypeError(f"Object of type {type(o)} is not JSON serializable")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def index_by_id(records, key="id"):
    return {r[key]: r for r in records}
