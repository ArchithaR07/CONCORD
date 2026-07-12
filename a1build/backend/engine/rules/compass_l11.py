def apply_compass_mapping(resolved_findings):
    """
    L11 COMPASS - Maps resolved findings to standard compliance frameworks (ISO/NIST/GDPR/COBIT)
    using a static topic-based heuristic to avoid LLM overhead.
    """
    # Static mapping based on common topics in the policy dataset
    topic_mapping = {
        "password": ["ISO 27001 A.9.4.3", "NIST 800-53 IA-5", "PCI-DSS Req 8"],
        "access_control": ["ISO 27001 A.9", "NIST 800-53 AC-2", "GDPR Art 32"],
        "encryption": ["ISO 27001 A.10", "NIST 800-53 SC-13", "GDPR Art 32"],
        "logging": ["ISO 27001 A.12.4", "NIST 800-53 AU-2"],
        "data_retention": ["ISO 27001 A.8.1.4", "GDPR Art 5", "GDPR Art 17"],
        "network": ["ISO 27001 A.13.1", "NIST 800-53 SC-7"],
        "mfa": ["ISO 27001 A.9.4.2", "NIST 800-53 IA-2"]
    }
    
    mapped_findings = []
    for finding in resolved_findings:
        # Determine likely topic based on description or policy names
        found_topic = "other"
        search_text = (finding.get("description", "") + " " + finding.get("policy_a", "") + " " + finding.get("policy_b", "")).lower()
        
        for topic in topic_mapping.keys():
            if topic in search_text:
                found_topic = topic
                break
                
        # If no explicit topic matched, fallback to a general one
        if found_topic == "other" and "security" in search_text:
            compliance_impact = ["ISO 27001", "NIST 800-53"]
        else:
            compliance_impact = topic_mapping.get(found_topic, [])
            
        # Update the finding
        finding["compliance_impact"] = compliance_impact
        mapped_findings.append(finding)
        
    return mapped_findings
