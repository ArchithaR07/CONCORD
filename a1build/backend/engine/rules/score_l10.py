
from collections import defaultdict

from backend.engine.models import config


class _UnionFind:
    def __init__(self):
        self.parent = {}

    def find(self, x):
        self.parent.setdefault(x, x)
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[ra] = rb


def _redundancy_clusters(resolved_findings):
    
    uf = _UnionFind()
    for f in resolved_findings:
        if f["finding_type"] == "REDUNDANT":
            uf.union(f["obligation_id_a"], f["obligation_id_b"])
    return {obl_id: uf.find(obl_id) for obl_id in uf.parent}


def _keystone_multiplier(keystone_score, alpha):
    return 1 + alpha * (keystone_score or 0.0)


def _conflict_penalty(finding):
    base = config.FINDING_PENALTY.get(("CONFLICT", finding["severity"]), 0)
    if finding.get("stale_flag"):
        base += config.STALE_PENALTY
    return base


def compute_per_policy_scores(resolved_findings, obligation_staleness, obligations_by_id,
                               keystone_scores, alpha=None):
    alpha = alpha if alpha is not None else config.DEFAULT_ALPHA
    stale_by_obl = {s["obligation_id"]: s for s in obligation_staleness}
    clusters = _redundancy_clusters(resolved_findings)

    weighted_penalty_by_policy = defaultdict(float)
    obligations_in_findings = set()

    for f in resolved_findings:
        if f["finding_type"] != "CONFLICT":
            continue
        base = _conflict_penalty(f)
        for obl_id in (f["obligation_id_a"], f["obligation_id_b"]):
            obl = obligations_by_id.get(obl_id)
            if not obl:
                continue
            obligations_in_findings.add(obl_id)
            ks = keystone_scores.get(obl_id, 0.0)
            weighted_penalty_by_policy[obl["policy_name"]] += base * _keystone_multiplier(ks, alpha)

    obligations_in_findings.update(clusters.keys())
    policy_cluster_best_ks = defaultdict(dict)
    for obl_id, cluster_id in clusters.items():
        obl = obligations_by_id.get(obl_id)
        if not obl:
            continue
        ks = keystone_scores.get(obl_id, 0.0)
        cur = policy_cluster_best_ks[obl["policy_name"]].get(cluster_id, 0.0)
        policy_cluster_best_ks[obl["policy_name"]][cluster_id] = max(cur, ks)

    redundant_base = config.FINDING_PENALTY.get(("REDUNDANT", None), 0)
    for policy, cluster_ks in policy_cluster_best_ks.items():
        for cluster_id, best_ks in cluster_ks.items():
            weighted_penalty_by_policy[policy] += redundant_base * _keystone_multiplier(best_ks, alpha)

    standalone_stale_by_policy = defaultdict(int)
    for obl_id, s in stale_by_obl.items():
        if not s.get("stale") or obl_id in obligations_in_findings:
            continue
        obl = obligations_by_id.get(obl_id)
        if obl:
            standalone_stale_by_policy[obl["policy_name"]] += 1

    obligation_count_by_policy = defaultdict(int)
    for o in obligations_by_id.values():
        obligation_count_by_policy[o["policy_name"]] += 1

    all_policies = set(obligation_count_by_policy) | set(weighted_penalty_by_policy) | set(standalone_stale_by_policy)

    per_policy = []
    for policy in sorted(all_policies):
        findings_penalty = round(weighted_penalty_by_policy.get(policy, 0.0), 2)
        standalone_penalty = standalone_stale_by_policy.get(policy, 0) * config.STALE_PENALTY
        raw_score = 100 - findings_penalty - standalone_penalty
        per_policy.append({
            "policy": policy,
            "obligation_count": obligation_count_by_policy.get(policy, 0),
            "redundancy_clusters_involved": len(policy_cluster_best_ks.get(policy, {})),
            "findings_penalty": findings_penalty,
            "standalone_stale_penalty": standalone_penalty,
            "score": round(max(0.0, min(100.0, raw_score)), 2),
        })
    return per_policy


def compute_org_wide_score(per_policy_scores):
    total_obl = sum(p["obligation_count"] for p in per_policy_scores)
    if total_obl == 0:
        return 0.0
    weighted = sum(p["score"] * p["obligation_count"] for p in per_policy_scores)
    return round(weighted / total_obl, 2)


def compute_policy_debt_by_department(resolved_findings, obligation_staleness, obligations_by_id,
                                       keystone_scores, alpha=None):
    alpha = alpha if alpha is not None else config.DEFAULT_ALPHA
    clusters = _redundancy_clusters(resolved_findings)

    def _departments_of(obl):
        depts = [d for d in obl["scope"]["department"] if d != "all"]
        return depts or ["org_wide"]

    debt_by_dept = defaultdict(float)
    obl_count_by_dept = defaultdict(int)
    for o in obligations_by_id.values():
        for d in _departments_of(o):
            obl_count_by_dept[d] += 1

    obligations_in_findings = set(clusters.keys())

    for f in resolved_findings:
        if f["finding_type"] != "CONFLICT":
            continue
        base = _conflict_penalty(f)
        for obl_id in (f["obligation_id_a"], f["obligation_id_b"]):
            obl = obligations_by_id.get(obl_id)
            if not obl:
                continue
            obligations_in_findings.add(obl_id)
            ks = keystone_scores.get(obl_id, 0.0)
            weighted = base * _keystone_multiplier(ks, alpha)
            for d in _departments_of(obl):
                debt_by_dept[d] += weighted

    dept_cluster_best_ks = defaultdict(dict)
    for obl_id, cluster_id in clusters.items():
        obl = obligations_by_id.get(obl_id)
        if not obl:
            continue
        ks = keystone_scores.get(obl_id, 0.0)
        for d in _departments_of(obl):
            cur = dept_cluster_best_ks[d].get(cluster_id, 0.0)
            dept_cluster_best_ks[d][cluster_id] = max(cur, ks)

    redundant_base = config.FINDING_PENALTY.get(("REDUNDANT", None), 0)
    for dept, cluster_ks in dept_cluster_best_ks.items():
        for cluster_id, best_ks in cluster_ks.items():
            debt_by_dept[dept] += redundant_base * _keystone_multiplier(best_ks, alpha)

    for s in obligation_staleness:
        if not s.get("stale") or s["obligation_id"] in obligations_in_findings:
            continue
        obl = obligations_by_id.get(s["obligation_id"])
        if not obl:
            continue
        for d in _departments_of(obl):
            debt_by_dept[d] += config.STALE_PENALTY

    rows = []
    for dept in sorted(set(list(debt_by_dept.keys()) + list(obl_count_by_dept.keys()))):
        count = obl_count_by_dept.get(dept, 0)
        debt = round(debt_by_dept.get(dept, 0.0), 2)
        rows.append({
            "department": dept,
            "obligation_count": count,
            "policy_debt_raw": debt,
            "policy_debt_per_obligation": round(debt / count, 3) if count else 0.0,
        })
    rows.sort(key=lambda r: r["policy_debt_raw"], reverse=True)
    return rows


def sensitivity_check(resolved_findings, obligation_staleness, obligations_by_id,
                       keystone_scores, alphas=None, top_n=10):
    alphas = alphas or config.SENSITIVITY_ALPHAS

    per_alpha_ranking = {}
    for alpha in alphas:
        scored = []
        for f in resolved_findings:
            if f["finding_type"] == "CONFLICT":
                base = _conflict_penalty(f)
            elif f["finding_type"] == "REDUNDANT":
                base = config.FINDING_PENALTY.get(("REDUNDANT", None), 0)
            else:
                continue
            ks_a = keystone_scores.get(f["obligation_id_a"], 0.0)
            ks_b = keystone_scores.get(f["obligation_id_b"], 0.0)
            impact = base * _keystone_multiplier(max(ks_a, ks_b), alpha)
            scored.append((f["finding_id"], round(impact, 3)))
        scored.sort(key=lambda x: x[1], reverse=True)
        per_alpha_ranking[alpha] = scored[:top_n]

    overlaps = []
    alpha_list = sorted(alphas)
    for i in range(len(alpha_list) - 1):
        set_a = {fid for fid, _ in per_alpha_ranking[alpha_list[i]]}
        set_b = {fid for fid, _ in per_alpha_ranking[alpha_list[i + 1]]}
        union = set_a | set_b
        overlap = len(set_a & set_b) / len(union) if union else 1.0
        overlaps.append({"alpha_pair": [alpha_list[i], alpha_list[i + 1]], "top_n_jaccard_overlap": round(overlap, 3)})

    return {
        "top_n": top_n,
        "rankings_by_alpha": {str(a): per_alpha_ranking[a] for a in per_alpha_ranking},
        "stability": overlaps,
        "claim": "Ranking is considered stable if consecutive-alpha Jaccard overlap stays >= 0.8.",
    }
