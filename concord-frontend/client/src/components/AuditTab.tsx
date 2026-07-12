import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Lock, Sparkles, Terminal, User, GitBranch, Shield, Download, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import ThreatCoverageMap from "./ThreatCoverageMap";
import CompiledDocumentView from "./CompiledDocumentView";

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="rounded-xl bg-muted/60 border border-border p-4 space-y-2">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-2 bg-muted/80 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-5 rounded-xl border bg-destructive/10 border-destructive/30 text-destructive flex items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10">
          <RefreshCw className="w-3 h-3 mr-1" /> Retry
        </Button>
      )}
    </div>
  );
}

interface AuditTabProps {
  apiConflicts: any[];
  isLoading?: boolean;
  fetchError?: string | null;
  onFetchRetry?: () => void;
  addToast: (msg: string, type?: "success" | "warning" | "info") => void;
}

export function AuditTab({ apiConflicts, isLoading, fetchError, onFetchRetry, addToast }: AuditTabProps) {
  const [employeePortalSearch, setEmployeePortalSearch] = useState("");
  const [employeePortalResult, setEmployeePortalResult] = useState<any>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [selectedDiffVersion, setSelectedDiffVersion] = useState<string>("v3.2_vs_v4.0");
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [reportState, setReportState] = useState<"idle" | "generating" | "done">("idle");
  const [reportProgress, setReportProgress] = useState(0);
  const [recsList, setRecsList] = useState([
    { id: "REC-1", conflict: "Password Policy 14 chars minimum vs Acceptable Use Policy 8 chars minimum.", suggestion: "Consolidate to 14 characters globally to maintain the highest compliance posture.", policyA: "Password Policy 3.1", policyB: "Acceptable Use Policy 5.2" },
    { id: "REC-2", conflict: "Remote Access firewall rules overlap with AWS Cloud Security ingress configuration.", suggestion: "Merge standard ingress rules and retire duplicate local policy clause.", policyA: "Remote Access Firewall", policyB: "AWS Cloud Security Ingress" }
  ]);
  const [findingsSearch, setFindingsSearch] = useState("");
  const [findingsTypeFilter, setFindingsTypeFilter] = useState<"ALL" | "CONFLICT" | "REDUNDANT" | "STALE">("ALL");

  const filteredFindings = apiConflicts.filter(f => {
    const matchesType = findingsTypeFilter === "ALL" || f.finding_type === findingsTypeFilter;
    const matchesSearch = !findingsSearch || JSON.stringify(f).toLowerCase().includes(findingsSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleEmployeeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = employeePortalSearch.trim();
    if (!query) return;
    setEmployeeLoading(true);
    setEmployeePortalResult(null);
    try {
      const res = await fetch(`/api/obligations?query=${encodeURIComponent(query)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const obl = data.data[0];
          setEmployeePortalResult({
            status: "active",
            policy: obl.policy_name || obl.policy || "Policy Directive",
            verdict: "🟢 Found relevant security standard.",
            reason: obl.raw_text || "Standard procedures apply."
          });
        } else {
          setEmployeePortalResult({ status: "unknown", policy: "No exact match", verdict: "🟡 General standards apply.", reason: "No overriding conflicts or specific directives detected for this lookup term." });
        }
      }
    } catch (err) {
      setEmployeePortalResult({ status: "error", policy: "Error", verdict: "⚠ Lookup failed.", reason: "Could not reach the API endpoint." });
    }
    setEmployeeLoading(false);
  };

  const generateReport = () => {
    setReportState("generating");
    setReportProgress(0);
    const interval = setInterval(() => {
      setReportProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); setReportState("done"); return 100; }
        return prev + 10;
      });
    }, 100);
  };

  const cardClass = "backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] p-8 md:p-10 transition-all duration-300 border bg-card border-border text-card-foreground";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">

      {/* Threat & SYNOD */}
      <ThreatCoverageMap />
      <CompiledDocumentView />

      {/* Findings Table with expandable rows */}
      <Card className={`${cardClass} lg:col-span-2`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-cyan-400" /> Policy conflict findings
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "CONFLICT", "REDUNDANT", "STALE"] as const).map(f => (
              <button key={f} onClick={() => setFindingsTypeFilter(f)} className={`px-3 py-1 rounded-full text-[10px] font-semibold border cursor-pointer transition-all ${findingsTypeFilter === f ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-500" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
            <div className="relative">
              <Input
                placeholder="Search findings..."
                value={findingsSearch}
                onChange={e => setFindingsSearch(e.target.value)}
                className="h-7 text-[11px] w-36 bg-input border-border text-foreground pl-3"
              />
            </div>
          </div>
        </div>

        {isLoading ? <SkeletonCard lines={4} /> : fetchError ? <ErrorCard message={fetchError} onRetry={onFetchRetry} /> : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredFindings.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-8">No findings match your filters.</p>
            ) : filteredFindings.slice(0, 50).map((f: any, i: number) => {
              const isExpanded = expandedFindingId === (f.finding_id || `f-${i}`);
              return (
                <div
                  key={f.finding_id || i}
                  className="border rounded-xl overflow-hidden transition-all bg-muted/30 border-border"
                >
                  <button
                    className="w-full p-3.5 flex items-center justify-between text-xs text-left cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => setExpandedFindingId(isExpanded ? null : (f.finding_id || `f-${i}`))}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${f.finding_type === "CONFLICT" ? "bg-red-500/10 border-red-500/30 text-red-400" : f.finding_type === "REDUNDANT" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-purple-500/10 border-purple-500/30 text-purple-400"}`}>
                        {f.finding_type}
                      </span>
                      <span className="text-foreground font-semibold truncate max-w-[300px]">
                        {f.policy_a && f.policy_b ? `${f.policy_a} ↔ ${f.policy_b}` : f.finding_id || `Finding #${i + 1}`}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border/40 p-4 space-y-3 text-xs animate-in fade-in duration-200">
                      {f.description && <p className="text-muted-foreground italic">"{f.description}"</p>}
                      {f.voice_explanation && (
                        <div className="p-3 bg-muted rounded-lg border border-border">
                          <strong className="text-cyan-500 block mb-1 text-[10px] uppercase tracking-wider">L12 Reasoning</strong>
                          <p className="text-foreground">{f.voice_explanation}</p>
                        </div>
                      )}
                      {f.precedence_resolution && (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <strong className="text-cyan-500 block mb-1 text-[10px] uppercase tracking-wider">Precedence Basis</strong>
                          <p className="text-foreground">{f.precedence_resolution.precedence_basis} → {f.precedence_resolution.governing_policy}</p>
                          {f.precedence_resolution.reasoning && <p className="text-muted-foreground mt-1">{f.precedence_resolution.reasoning}</p>}
                        </div>
                      )}
                      {f.obligation_id_a && f.obligation_id_b && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-muted border border-border"><span className="text-[9px] text-muted-foreground block">Obligation A</span><span className="font-mono text-foreground">{f.obligation_id_a}</span></div>
                          <div className="p-2 rounded bg-muted border border-border"><span className="text-[9px] text-muted-foreground block">Obligation B</span><span className="font-mono text-foreground">{f.obligation_id_b}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Health Dashboard */}
      <Card className={cardClass}>
        <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 text-foreground">
          <TrendingUp className="w-5 h-5 text-cyan-400" /> Health Dashboard
        </h4>
        <div className="space-y-4">
          {[
            { name: "HR Policy directive", val: 95 },
            { name: "Cloud Ingress specifications", val: 74 },
            { name: "Legal compliance checklists", val: 91 }
          ].map((dept) => (
            <div key={dept.name} className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground">{dept.name}</span>
                <span className="font-bold text-foreground">{dept.val}%</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all" style={{ width: `${dept.val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Compliance Checklist */}
      <Card className={cardClass}>
        <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 text-foreground">
          <Lock className="w-5 h-5 text-cyan-400" /> Compliance mapping checklist
        </h4>
        <div className="grid grid-cols-1 gap-3 text-xs">
          {[
            { name: "ISO 27001 standard controls", status: "Compliant" },
            { name: "NIST 800-53 Access mappings", status: "Compliant" },
            { name: "EU-GDPR Privacy guidelines", status: "Partial Gaps Flagged" }
          ].map((framework, idx) => (
            <div key={idx} className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{framework.name}</p>
                <span className="text-[9px] text-muted-foreground">Mapping complete</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${framework.status === "Compliant" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                {framework.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Patch Recommendations */}
      <Card className={`${cardClass} lg:col-span-2`}>
        <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 text-foreground">
          <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" /> Suggested patches & consolidation
        </h4>
        <div className="space-y-4">
          {recsList.map((rec) => (
            <div key={rec.id} className="p-4 bg-muted/40 border border-border rounded-xl text-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{rec.id}</span>
                <span className="text-[10px] text-muted-foreground">{rec.policyA} vs {rec.policyB}</span>
              </div>
              <p className="text-foreground italic">"{rec.conflict}"</p>
              <div className="p-3 bg-muted border border-cyan-500/20 rounded text-foreground">
                <strong className="text-cyan-400 block mb-1">Patch Proposal:</strong>
                {rec.suggestion}
              </div>
              <div className="flex justify-end gap-2.5">
                <Button size="sm" variant="outline" className="h-8 text-xs cursor-pointer" onClick={() => { setRecsList(list => list.filter(l => l.id !== rec.id)); addToast(`❌ Rejected ${rec.id}`, "warning"); }}>Reject</Button>
                <Button size="sm" className="h-8 text-xs cursor-pointer" onClick={() => { setRecsList(list => list.filter(l => l.id !== rec.id)); addToast(`✅ ${rec.id} approved and merged`, "success"); }}>Approve & Merge</Button>
              </div>
            </div>
          ))}
          {recsList.length === 0 && <p className="text-center text-muted-foreground py-6 text-xs">All recommended policy resolutions merged.</p>}
        </div>
      </Card>

      {/* ATLAS Cockpit */}
      <Card className={`${cardClass} lg:col-span-2`}>
        <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 text-foreground">
          <Terminal className="w-5 h-5 text-cyan-400" /> ATLAS Master command deck cockpit
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
          {[
            { label: "Health Metric", value: "92%" },
            { label: "Central Keystone Index", value: "0.98" },
            { label: "Active Policies", value: "30 documents" },
          ].map(m => (
            <div key={m.label} className="p-5 bg-muted/40 border border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-cyan-500/40 transition-colors">
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{m.label}</span>
              <strong className="text-foreground text-3xl font-black font-mono">{m.value}</strong>
            </div>
          ))}
        </div>
      </Card>

      {/* Employee Lookup */}
      <Card className={`${cardClass} flex flex-col justify-between min-h-[400px]`}>
        <div>
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 text-foreground">
            <User className="w-5 h-5 text-cyan-400" /> Employee Lifecycle lookup portal
          </h4>
          <p className="text-xs text-muted-foreground leading-normal mb-6">Check if standard procedures are safe to follow or if they are overridden by compliance directives.</p>
          <form onSubmit={handleEmployeeSearch} className="flex gap-2 mb-4">
            <Input
              placeholder="Enter standard name (e.g. Password or Cloud)..."
              value={employeePortalSearch}
              onChange={(e) => setEmployeePortalSearch(e.target.value)}
              className="text-xs bg-muted border-border text-foreground"
            />
            <Button type="submit" size="sm" className="h-9 cursor-pointer" disabled={employeeLoading}>
              {employeeLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Lookup"}
            </Button>
          </form>
        </div>
        {employeePortalResult && (
          <Card className="bg-muted/40 border border-border p-4 rounded-xl space-y-3 animate-in zoom-in-95 duration-200 text-xs">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Standard</span>
              <p className="font-semibold text-foreground mt-0.5">{employeePortalResult.policy}</p>
            </div>
            <div className="p-2.5 bg-muted rounded border border-border font-bold text-foreground">{employeePortalResult.verdict}</div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Reason / directive</span>
              <p className="text-muted-foreground italic font-medium leading-relaxed">"{employeePortalResult.reason}"</p>
            </div>
          </Card>
        )}
      </Card>

      {/* Version Diff */}
      <Card className={`${cardClass} lg:col-span-1`}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
              <GitBranch className="w-5 h-5 text-cyan-400" /> Version diff analysis
            </h4>
            <p className="text-xs md:text-sm mt-1.5 text-muted-foreground">Compare policy drafts to detect conflicts before commit.</p>
          </div>
          <select value={selectedDiffVersion} onChange={(e) => setSelectedDiffVersion(e.target.value)} className="p-2 rounded-xl text-xs border cursor-pointer bg-muted border-border text-foreground">
            <option value="v3.2_vs_v4.0">Acceptable Use Policy (v3.2 vs v4.0 Draft)</option>
            <option value="v1.0_vs_v2.0">Database Access Policy (v1.0 vs v2.0 Draft)</option>
          </select>
        </div>
        {selectedDiffVersion === "v3.2_vs_v4.0" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl font-mono text-[10px] space-y-1.5 border bg-muted/40 border-border text-foreground">
              <p className="text-muted-foreground">// Acceptable Use Policy clause diff</p>
              <p className="text-red-400 bg-red-500/10 px-1.5 rounded">- Clause 3.4.1: Users must rotate passwords every 90 days.</p>
              <p className="text-emerald-400 bg-emerald-500/10 px-1.5 rounded">+ Clause 3.4.1: Users must rotate complex passwords every 30 days (PCI-DSS).</p>
            </div>
            <div className="p-3 rounded-lg border text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
              <strong>Conflict Status Check:</strong> Redundancy Resolved. Removes 1 active conflict.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl font-mono text-[10px] space-y-1.5 border bg-muted/40 border-border text-foreground">
              <p className="text-muted-foreground">// Database Access Policy clause diff</p>
              <p className="text-red-400 bg-red-500/10 px-1.5 rounded">- Clause 1.2: Default database listener ports may bind under secondary sign-off.</p>
              <p className="text-emerald-400 bg-emerald-500/10 px-1.5 rounded">+ Clause 1.2: Public bounds are permitted for staging cluster endpoints.</p>
            </div>
            <div className="p-3 rounded-lg border text-xs bg-red-500/10 border-red-500/20 text-red-400 animate-pulse">
              <strong>🔴 Warning:</strong> This draft introduces a new critical overlap with AWS Ingress rules restriction!
            </div>
          </div>
        )}
      </Card>

      {/* Reports */}
      <Card className={`${cardClass} flex flex-col justify-between min-h-[400px] lg:col-span-1`}>
        <div>
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 text-foreground">
            <Download className="w-5 h-5 text-cyan-400" /> System reports generation
          </h4>
          <p className="text-xs md:text-sm leading-relaxed mb-6 text-muted-foreground">Configure output templates and export policy debt findings.</p>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 cursor-pointer border-border" disabled={reportState === "generating"} onClick={() => {
              generateReport();
              const csv = "data:text/csv;charset=utf-8,ID,Policy A,Policy B,Verdict,Confidence\nCONF-001,Password Policy,PCI-DSS Standard,Policy B wins,96%\n";
              const a = document.createElement("a"); a.href = encodeURI(csv); a.download = "concord_audit.csv"; a.click();
              addToast("📥 CSV export downloaded", "info");
            }}>Export CSV</Button>
            <Button size="sm" className="flex-1 cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white" disabled={reportState === "generating"} onClick={() => {
              generateReport();
              setTimeout(() => {
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text("CONCORD Policy Resolution Audit Report", 14, 22);
                doc.setFontSize(11);
                doc.setTextColor(100);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
                
                doc.setTextColor(0);
                doc.setFontSize(14);
                doc.text("Executive Summary", 14, 45);
                
                doc.setFontSize(10);
                doc.text(`Total Findings Analyzed: ${apiConflicts.length}`, 14, 55);
                const conflicts = apiConflicts.filter(f => f.finding_type === "CONFLICT").length;
                const redundancies = apiConflicts.filter(f => f.finding_type === "REDUNDANT").length;
                doc.text(`Conflicts: ${conflicts}  |  Redundancies: ${redundancies}`, 14, 62);

                autoTable(doc, {
                  startY: 75,
                  head: [['ID', 'Policy A', 'Policy B', 'Type', 'Confidence']],
                  body: apiConflicts.slice(0, 100).map(f => [
                    f.finding_id || 'N/A',
                    f.policy_a || 'Unknown',
                    f.policy_b || 'Unknown',
                    f.finding_type || 'Unknown',
                    f.confidence_score ? `${(f.confidence_score * 100).toFixed(1)}%` : 'N/A'
                  ]),
                  theme: 'striped',
                  headStyles: { fillColor: [6, 182, 212] },
                  styles: { fontSize: 8, cellPadding: 2 },
                });
                
                doc.save("concord_audit_report.pdf");
                addToast("📥 PDF report downloaded", "success");
              }, 1200);
            }}>Export PDF</Button>
          </div>
          {reportState === "generating" && (
            <div className="space-y-2 animate-pulse text-left text-[10px]">
              <div className="flex justify-between text-muted-foreground"><span>Exporting document blocks...</span><span>{reportProgress}%</span></div>
              <Progress value={reportProgress} className="h-1 bg-muted" />
            </div>
          )}
          {reportState === "done" && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs text-center">
              ✓ Export complete. Downloading in background...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
