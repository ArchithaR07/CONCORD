from pathlib import Path

ROOT = Path(r"c:\Users\UMA MAHESWARI S\OneDrive\Desktop\REARCH\CONCORD")
a2root = ROOT / "concord-a2 (1)" / "concord-a2"
a1root = ROOT / "a1build"

checks = {
    "rules":   (a2root / "backend/engine/rules",  a1root / "backend/engine/rules"),
    "stubs":   (a2root / "backend/engine/stubs",  a1root / "backend/engine/stubs"),
    "schemas": (a2root / "shared/schemas",         a1root / "shared/schemas"),
    "scripts": (a2root / "scripts",               a1root / "scripts"),
}

all_ok = True
for section, (a2p, a1p) in checks.items():
    a2files = {f.name for f in a2p.glob("*") if f.is_file()}
    a1files = {f.name for f in a1p.glob("*") if f.is_file()}
    missing = a2files - a1files
    extra   = a1files - a2files
    status  = "OK  " if not missing else "MISS"
    print(status, "[" + section + "]", "A2=" + str(len(a2files)), "A1=" + str(len(a1files)),
          "missing=" + str(missing if missing else "none"),
          "extra_in_a1=" + str(extra if extra else "none"))
    if missing:
        all_ok = False

print()
if all_ok:
    print("RESULT: COMPLETE SUPERSET - safe to delete concord-a2")
else:
    print("RESULT: GAPS REMAIN")
