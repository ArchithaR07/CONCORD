import json
import time
from pathlib import Path
import numpy as np

from backend.engine.models import config
from backend.engine.models.l4_llm_bench import get_llm_client

def load_mitre_data():
    stix_path = config.ROOT_DIR / "data" / "enterprise-attack.json"
    if not stix_path.exists():
        print("MITRE ATT&CK STIX bundle not found. Skipping CRUCIBLE.")
        return None, None, None
    
    with open(stix_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    mitigations = {}
    techniques = {}
    mitigates_rels = []
    
    for obj in data.get("objects", []):
        if obj["type"] == "course-of-action":
            mitigations[obj["id"]] = obj
        elif obj["type"] == "attack-pattern":
            techniques[obj["id"]] = obj
        elif obj["type"] == "relationship" and obj["relationship_type"] == "mitigates":
            mitigates_rels.append(obj)
            
    return mitigations, techniques, mitigates_rels

def embed_mitigations(mitigations):
    # Try to import sentence_transformers safely
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("sentence-transformers not installed.")
        return {}

    model = SentenceTransformer("all-MiniLM-L6-v2")
    mitigation_ids = list(mitigations.keys())
    texts = [m.get("description", "") or m.get("name", "") for m in mitigation_ids for m in [mitigations[m]]]
    
    print(f"Embedding {len(texts)} MITRE mitigations...")
    embeddings = model.encode(texts, show_progress_bar=False)
    
    for i, mid in enumerate(mitigation_ids):
        mitigations[mid]["embedding"] = embeddings[i].tolist()
        
    return mitigation_ids, embeddings

def get_candidates(obligation_emb, mitigation_embeddings, mitigation_ids, top_k=3, threshold=0.35):
    if not obligation_emb or len(mitigation_embeddings) == 0:
        return []
    
    obl_emb = np.array(obligation_emb)
    mit_embs = np.array(mitigation_embeddings)
    
    obl_norm = obl_emb / (np.linalg.norm(obl_emb) or 1.0)
    mit_norms = np.linalg.norm(mit_embs, axis=1, keepdims=True)
    mit_norms[mit_norms == 0] = 1.0
    mit_embs = mit_embs / mit_norms
    
    sims = np.dot(mit_embs, obl_norm)
    
    top_indices = np.argsort(sims)[::-1][:top_k]
    candidates = []
    for idx in top_indices:
        if sims[idx] >= threshold:
            candidates.append((mitigation_ids[idx], float(sims[idx])))
            
    return candidates

def ask_llm_for_matches(obligation, candidates_info, llm_client):
    prompt = f"""You are mapping a resolved policy obligation to MITRE ATT&CK Mitigations.

Obligation: {json.dumps({
    'obligation': obligation.get('obligation'),
    'action': obligation.get('action'),
    'scope': obligation.get('scope'),
    'raw_text': obligation.get('raw_text')
})}
Candidate MITRE Mitigations (retrieved via embedding similarity): {json.dumps(candidates_info, indent=2)}

For each candidate, decide whether this obligation, if actually enforced,
would materially implement that mitigation's intent. Do not credit partial
or superficial keyword overlap — the obligation must actually satisfy the
mitigation's mechanism, not just mention a related term. If none of the
candidates are a genuine match, return an empty list — do not force a fit.

Return ONLY valid JSON:
{{
  "matches": [
    {{
      "mitigation_id": "string (the STIX id)",
      "mitigation_name": "string",
      "match_confidence": float,
      "justification": "string"
    }}
  ]
}}"""
    try:
        result = llm_client.complete_json(prompt)
        return result.get("matches", [])
    except Exception as e:
        print(f"LLM Error mapping mitigation: {e}")
        return []

def run():
    print("Running L15 CRUCIBLE...")
    mitigations, techniques, mitigates_rels = load_mitre_data()
    if not mitigations:
        return []
        
    mitigation_ids, mitigation_embeddings = embed_mitigations(mitigations)
    
    obligations_path = config.OUTPUTS_DIR / "obligations_embedded.json"
    if not obligations_path.exists():
        print("obligations_embedded.json not found.")
        return []
        
    obligations = json.loads(obligations_path.read_text(encoding="utf-8"))
    llm_client = get_llm_client()
    
    # We will limit to 50 obligations to avoid rate limits during dev
    test_obligations = obligations[:50]
    
    coverage_map = {} # technique STIX id -> list of matching obligation ids
    for t in techniques.values():
        coverage_map[t["id"]] = []
        
    print(f"Mapping {len(test_obligations)} obligations to MITRE...")
    for obl in test_obligations:
        cands = get_candidates(obl.get("embedding"), mitigation_embeddings, mitigation_ids)
        if not cands:
            continue
            
        cands_info = []
        for cid, sim in cands:
            mit = mitigations[cid]
            cands_info.append({
                "mitigation_id": cid,
                "mitigation_name": mit.get("name", ""),
                "description_snippet": (mit.get("description", "") or "")[:200]
            })
            
        matches = ask_llm_for_matches(obl, cands_info, llm_client)
        for match in matches:
            mid = match.get("mitigation_id")
            if mid:
                # Find which techniques this mitigates
                for rel in mitigates_rels:
                    if rel["source_ref"] == mid and rel["target_ref"] in coverage_map:
                        coverage_map[rel["target_ref"]].append(obl["id"])
                        
    # Find COVERAGE_GAP
    findings = []
    fid_counter = 1
    
    for tid, obl_ids in coverage_map.items():
        if len(obl_ids) == 0:
            tech = techniques[tid]
            # only flag if it's not deprecated/revoked
            if tech.get("revoked") or tech.get("x_mitre_deprecated"):
                continue
            
            # Find its tactics
            tactics = []
            for phase in tech.get("kill_chain_phases", []):
                if phase["kill_chain_name"] == "mitre-attack":
                    tactics.append(phase["phase_name"])
                    
            if not tactics:
                continue
                
            external_id = ""
            for ext in tech.get("external_references", []):
                if ext.get("source_name") == "mitre-attack":
                    external_id = ext.get("external_id", "")
                    
            findings.append({
                "finding_id": f"GAP-{fid_counter:05d}",
                "finding_type": "COVERAGE_GAP",
                "technique_id": external_id,
                "technique_name": tech.get("name", ""),
                "tactic": tactics[0],
                "severity": "HIGH",
                "gap_reason": "No operative obligation maps to any MITRE Mitigation associated with this technique.",
                "suggested_draft_clause": f"Implement controls to mitigate {tech.get('name', 'this technique')}."
            })
            fid_counter += 1
            
    # For now, limit findings to top 10 to avoid bloating
    findings = findings[:10]
    
    out_path = config.OUTPUTS_DIR / "crucible_findings.json"
    out_path.write_text(json.dumps(findings, indent=2), encoding="utf-8")
    print(f"[L15 CRUCIBLE] Found {len(findings)} coverage gaps (capped).")
    
    return findings

if __name__ == "__main__":
    run()
