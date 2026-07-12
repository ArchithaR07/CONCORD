def apply_voice_explanations(mapped_findings):
    
    for finding in mapped_findings:
        finding_type = finding.get("finding_type", "UNKNOWN")
        policy_a = finding.get("policy_a", "Policy A")
        policy_b = finding.get("policy_b", "Policy B")
        
        
        if finding_type == "CONFLICT":
            explanation = f"There is a direct contradiction between {policy_a} and {policy_b} regarding their required actions. The precedence rules indicate that one policy must override the other in overlapping scopes."
            recommendation = f"Update the broader policy to explicitly carve out an exception for the scope governed by the narrower policy."
        elif finding_type == "REDUNDANT":
            explanation = f"Both {policy_a} and {policy_b} impose identical or highly similar requirements on the same scope. This creates unnecessary compliance overhead and risks divergence in future updates."
            recommendation = f"Deprecate the duplicate clause in the older document and add a cross-reference to the primary governing policy."
        else:
            explanation = f"An ambiguity exists between {policy_a} and {policy_b} that requires manual review. The specific interaction could not be automatically resolved as a strict conflict or redundancy."
            recommendation = "Review the clauses manually to determine if a harmonization update is required."
            
        
        finding["voice_explanation"] = explanation
        finding["voice_recommendation"] = recommendation
        finding["draft_status"] = "pending_approval" 
        
    return mapped_findings
