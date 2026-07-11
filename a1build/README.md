# CONCORD — Person A1 Track: MODELS & SIGNALS

This is your slice of CONCORD: **L0 Ingest → L1 Extract → L2 Lens → L4 LLM
Bench → L5 Trust Reconcile** — everything that calls or trains a model,
per the work-split doc. L5 is the one place in the whole 16-layer system
with an actual *trained* model (a logistic regression, fitted against
`findings_labels.csv`), and it's your headline differentiator to defend
in the viva.

Everything below is written so you can build this **standalone**, before
A2 or B have written a line of code — the pipeline includes lightweight
stand-ins for A2's Rule Bench and L3 filter so you're never blocked
waiting on someone else.

---

## 1. File structure

```
concord-a1/
├── README.md                  ← you are here
├── requirements.txt
├── .env.example                ← copy to .env, fill in if using a real LLM
├── run_a1_pipeline.py          ← runs everything, in order, one command
│
├── shared/schemas/              ← the 3 frozen JSON contracts (§ "Before you start")
│   ├── obligation.schema.json
│   ├── verdict.schema.json
│   └── trust_score.schema.json
│
├── data/                        ← PUT YOUR SAMPLE DATA HERE
│   ├── policies/                 ← 30 policy_XX.md files go here
│   ├── policy_metadata.csv
│   ├── obligation_extracts_labels.csv   (used for reference only — see § below)
│   └── findings_labels.csv               ← L5 trains against this
│
├── backend/engine/models/       ← all the actual code
│   ├── config.py                  paths, thresholds, LLM provider switch
│   ├── l0_ingest.py                L0 — parse markdown into clauses
│   ├── l1_extract.py               L1 — dual-pass obligation extraction
│   ├── l2_lens.py                  L2 — TF-IDF topics + embeddings
│   ├── l4_llm_bench.py             L4 (LLM half) + shared LLM client
│   ├── l5_trust_reconcile.py       L5 — THE trained model
│   ├── l3_candidates_stub.py       [STUB for A2's real L3 — see § 5]
│   └── rule_bench_stub.py          [STUB for A2's real Rule Bench — see § 5]
│
└── outputs/                     ← generated when you run the pipeline
    ├── clauses.json                  (L0)
    ├── obligations.json              (L1)
    ├── obligations_embedded.json     (L2)
    ├── candidate_pairs.json          (L3 stub)
    ├── rule_verdicts.json            (Rule Bench stub)
    ├── llm_verdicts.json             (L4)
    ├── trust_scores.json             (L5 — your final deliverable)
    └── l5_model/
        ├── trust_score_model.joblib    (fitted sklearn model, if enough data)
        ├── calibration_report.json     (precision/recall, coefficients, caveats)
        └── thresholds.json             (HIGH/MEDIUM tier cutoffs)
```

---

## 2. Step-by-step setup

### Step 1 — Get the code onto disk
Save every file from this response into the structure above (or unzip if
you were given a zip). From your terminal:

```bash
cd concord-a1
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2 — Drop in your sample data
You said you'll place these directly — put them exactly here:

```
data/policies/policy_01.md ... policy_30.md
data/policy_metadata.csv
data/obligation_extracts_labels.csv
data/findings_labels.csv
```

(These are the exact files from `sample_data/problem_11/` in your
`GRC-Hackathon-main` upload — just copy the `policies/` folder and the
three CSVs in as-is, no renaming needed.)

### Step 3 — Run the whole pipeline
```bash
python run_a1_pipeline.py
```

That's it. On the real 30-policy sample corpus this takes well under a
minute and produces every file listed in `outputs/` above. You'll see a
console log like:

```
--- L0 INGEST ---
[L0 INGEST] 30 policies, 343 clauses -> outputs/clauses.json
--- L1 EXTRACT ---
[L1 EXTRACT] 343 obligations (template=343, fallback=0, llm_gap_fill=0) -> outputs/obligations.json
--- L2 LENS ---
[L2 LENS] sentence-transformers unavailable; falling back to TF-IDF/SVD embeddings.
[L2 LENS] 343 obligations embedded (backend=tfidf+svd, dim=46) -> outputs/obligations_embedded.json
--- L3 FILTER (stub) --- ... --- RULE BENCH (stub) --- ... --- L4 LLM BENCH ---
--- L5 TRUST RECONCILE ---
[L5 TRUST RECONCILE] 6214 pairs scored (logistic_regression_fitted) -> outputs/trust_scores.json
```

### Step 4 — Read the calibration report
```bash
cat outputs/l5_model/calibration_report.json
```
This is your answer to "why these weights?" in the viva — see § 6.

---

## 3. What each layer actually does (so you can defend it live)

### L0 — INGEST (`l0_ingest.py`)
Parses each `policy_XX.md` into a `{title, author, department, version,
last_reviewed, status, clauses[]}` object. It reads `**Field:** value`
metadata lines from the doc body first, and falls back to
`policy_metadata.csv` for anything missing — real policies from six
different authors over five years won't format their headers identically,
so this tolerance matters more than it looks like it should.

### L1 — EXTRACT (`l1_extract.py`)
**Dual pass, exactly as CONCORD §5.1 specifies:**
1. **Rule pass (always runs, free, instant):** two regex templates match
   this corpus's two clause shapes (`"X must Y as per company standards"`
   and `"Y is prohibited for X"`), plus a generic keyword fallback
   (`must/shall/required/prohibited/may not`) for anything that doesn't
   fit either template — so it degrades gracefully on policy text that
   isn't as tidy as the sample corpus.
2. **LLM gap-fill pass (optional, only for clauses the rule pass rejected):**
   sends the exact §5.1 prompt to whichever provider you've configured.
   With `LLM_PROVIDER=mock` (the default) this pass is a safe no-op — the
   mock client always returns "no obligation found" rather than
   fabricating one with no ground truth to check it against.
3. **spaCy cross-check (fully optional, advisory only):** if
   `spacy` + `en_core_web_sm` happen to be installed, a noun-chunk topic
   guess is attached as `topic_crosscheck_mismatch` when it disagrees with
   the rule pass — logged, never overrides. Skip installing this; it adds
   nothing on this templated corpus and isn't worth the download.

Every obligation gets **structured scope** (§4.6: `department`,
`geography`, `system_type`, `raw_scope_text`) instead of a free-text
string, and an `external_mandate` / `deprecated_reference` field parsed
from any `(Reference: ...)` annotation — this is what makes A2's L6
precedence check a set operation later instead of another LLM call.

### L2 — LENS (`l2_lens.py`)
Two signals added per obligation:
- **TF-IDF top keywords** — a cheap, explainable "why was this tagged
  'password'?" artifact for B's dashboard.
- **Embedding vector** — tries `sentence-transformers/all-MiniLM-L6-v2`
  first (per CONCORD §8's stack choice); if that's not installed or the
  model can't be downloaded (no internet, locked-down network), it
  **transparently falls back to a TF-IDF + TruncatedSVD embedding**
  instead, L2-normalized so cosine similarity behaves identically either
  way. Nothing downstream needs to know which backend produced the
  vector — it's just a fixed-length float array either way. This is the
  right default for a hackathon: it means your pipeline never breaks
  because a laptop lost wifi five minutes before demo.

### L4 — LLM BENCH (`l4_llm_bench.py`)
Classifies escalated obligation pairs using the exact §5.2 arbitration
prompt (`CONFLICT` / `REDUNDANT` / `COMPLEMENTARY` / `UNRELATED` +
self-reported confidence). Also hosts the **one shared LLM client** used
by both this module and L1's gap-fill pass — three interchangeable
backends behind one `complete_json(prompt) -> dict` interface:

| Provider | When | Needs |
|---|---|---|
| `mock` (default) | Always works, offline, zero cost | nothing |
| `gemini` | Real calls | `GEMINI_API_KEY` in `.env` |
| `groq` | Fallback if Gemini 429s | `GROQ_API_KEY` in `.env` |

Switching providers is a one-line `.env` edit — no code changes.

### L5 — TRUST RECONCILE (`l5_trust_reconcile.py`) — your headline layer
This is the part of CONCORD with an actual fitted model behind a number,
not four hand-picked weights. Full mechanics in § 6 below — read that
section before your viva, not just this summary.

---

## 4. Before you touch code: the 3 frozen schemas

Per the work-split doc, agree these with A2 and B **before** anyone
writes real (non-stub) code — they're already drafted for you in
`shared/schemas/`:

1. `obligation.schema.json` — what you (A1) hand to A2 and B.
2. `verdict.schema.json` — the shape **both** Rule Bench (A2) and LLM
   Bench (you) must emit, since your L5 consumes both.
3. `trust_score.schema.json` — what you hand to A2's L6.

If anyone changes a field name, it's a 2-minute heads-up to the other two
people, not a silent edit — that's the whole point of freezing them.

---

## 5. Integrating with A2's real code (replacing the stubs)

Two files in this repo are explicitly **stand-ins**, not your real
deliverable — they exist so you can build and test L4/L5 without waiting
on A2:

- `l3_candidates_stub.py` — same-topic-or-similarity candidate pair
  generation. A2 owns the real L3.
- `rule_bench_stub.py` — deterministic verb/param comparison. A2 owns
  the real Rule Bench (the other half of L4).

**When A2's code is ready:** delete the two stub calls from
`run_a1_pipeline.py` (marked with `# STUB` comments) and just make sure
A2's code writes `outputs/candidate_pairs.json` and
`outputs/rule_verdicts.json` in the schemas above before you run
`l4_llm_bench.py` and `l5_trust_reconcile.py`. Nothing else changes —
that's the entire value of freezing the schema early.

---

## 6. L5 deep dive — what to say when a judge asks "why these weights?"

**The real answer:** *"They're fit with logistic regression against the
findings_labels.csv ground truth you provided, with a documented fallback
if there aren't enough labeled pairs to fit reliably."* Here's what that
means concretely in this code:

### 6.1 Turning findings_labels.csv into training examples
`findings_labels.csv` gives you **policy-pair-level** rows (e.g. "conflict
between policy_05.md and policy_26.md on vendor"), not obligation-ID-level
rows. `load_ground_truth_labels()` parses `description`/`explanation`
text to recover the topic, then matches each candidate obligation pair to
a label by `(policy_a, policy_b, topic)`.

**The one non-obvious design decision here, and it matters:** the label
set includes a `FALSE_POSITIVE_PRONE` subtype under `finding_type=CONFLICT`
— rows like *"Apparent conflict between policy_22.md and policy_16.md, but
different scopes"*. These look like conflicts on the surface but are
**explicit hard negatives** — the dataset's own built-in test of whether
your system over-flags. This code treats them as `is_finding=0`, which is
exactly the signal that keeps false-positive rate down (the brief's own
success metric: FPR < 20%). If you ever explain one thing about L5 in the
viva, explain this — it's the difference between a system that trusts
labels naively and one that reads what they're actually testing.

### 6.2 A real, honest data-quality finding — expect this on your own data too
Run the calibration and check `outputs/l5_model/calibration_report.json`
→ `label_coverage`. On the provided sample corpus, only a fraction of the
45 positively-labeled findings actually have a matching extractable
obligation in **both** named policies — because `findings_labels.csv` was
generated independently from the policy markdown text, some labeled
pairs reference topics that simply aren't present as clauses in one (or
both) of the two policies. This isn't a bug in the matching code (it's
been verified against the raw policy text); it's a property of this
specific sample dataset. **Say this explicitly in your pitch** — it's a
sharper, more credible answer than pretending the numbers are cleaner
than they are, and it's exactly the kind of caveat CONCORD's own
architecture doc argues for.

### 6.3 What the code does about small-sample calibration
`fit_trust_model()` scales its method to how much labeled signal survived
matching:

| Positively-labeled pairs after matching | Method |
|---|---|
| < 3 | **Fallback prior** — documented default weights (rule_signal weighted highest, since it's the only fully deterministic signal), explicitly flagged `fallback_prior_weights` in the report. |
| 3–7 | **Leave-one-out cross-validation** — every example is both trained-on and held-out once; pooled out-of-fold predictions give the most stable estimate this sample size supports. A single random train/test split with this few positives is dangerously noisy (one unlucky split can swing precision from 0.7 to 0.0) — LOOCV is the standard fix. |
| 8–19 | Stratified 3-fold CV |
| 20+ | Stratified 5-fold CV |

In every case the **final model is fit on all labeled data** (small-sample
best practice — you don't throw away your few positives on a permanent
holdout), while the **reported metrics come from cross-validation**, never
from scoring the model on the same data it was trained on.

### 6.4 Tier thresholds, also derived, not asserted
`HIGH`/`MEDIUM`/`LOW` cutoffs come from `precision_recall_curve()` run on
the pooled cross-validated probabilities: HIGH = the lowest score that
still clears the brief's own precision ≥ 70% target; MEDIUM = the
threshold maximizing recall while precision stays ≥ 50%. If your matched
label count is too small for these to mean much yet, that's visible in
the report's `caveat` field — read it before quoting numbers on stage.

---

## 7. Handing off to Person B (CRUCIBLE / SYNOD) and A2

Your two deliverables other tracks depend on:
- `outputs/obligations_embedded.json` → A2's L3, B's L11/L12/L15
- `outputs/trust_scores.json` → A2's L6 (precedence) and L8 (graph edge weights)

Both are already in the frozen schema shape — nobody downstream needs
adapter code if the schemas didn't drift.

---

## 8. Troubleshooting

**"No policy_*.md files found"** — you haven't copied `data/policies/`
in yet (Step 2).

**"sentence-transformers unavailable... falling back to TF-IDF/SVD"** —
expected and harmless if you didn't install/aren't online; the pipeline
is designed to keep working either way. Install
`sentence-transformers` and run once with internet access if you want
real semantic embeddings for the demo.

**L5 runtime feels slow** — leave-one-out CV fits one logistic regression
per data point; with ~6,000 candidate pairs this is a few dozen seconds,
not minutes. If it's dragging, you likely have far more candidate pairs
than expected — check `outputs/candidate_pairs.json`'s length and
consider raising `EMBEDDING_CANDIDATE_THRESHOLD` in `config.py`.

**Calibration report shows very low CV precision** — check
`label_coverage` first (§ 6.2). This is very likely a label-matching
coverage issue, not a broken classifier; it's the single most important
number to understand before your viva, not something to hide.

**Want real Gemini/Groq calls instead of mock** — copy `.env.example` to
`.env`, set `LLM_PROVIDER=gemini` (or `groq`) and the matching API key.
No code changes needed anywhere.

---

## 9. What to put on your PPT slides (per the work-split doc, § "PPT Split")

You own **2 slides**: *"Trust-Weighted Reconciliation (the trained model,
§4.1) + Structured Scope."* Suggested content:
1. The four-signal formula (`rule_signal`, `embedding_similarity`,
   `llm_confidence`, `agreement_bonus`) → calibrated `trust_score`, with
   your actual fitted coefficients from `calibration_report.json`.
2. The `FALSE_POSITIVE_PRONE` hard-negative insight (§ 6.1) — this is
   your best "we thought about this harder than a keyword match" moment.
3. One honest line on label coverage (§ 6.2) — judges trust teams more,
   not less, when they show they checked their own numbers.
