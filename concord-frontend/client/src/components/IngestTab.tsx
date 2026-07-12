import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, FileText, Database, Filter, Shield, Sparkles, Search, X, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { TrustBadge } from "./TrustBadge";

// Skeleton loader for loading states
function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="rounded-xl bg-muted/60 border border-border p-4 space-y-2">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-2 bg-muted/80 rounded w-3/4" />
          <div className="h-2 bg-muted/60 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// Error card with retry
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

// Pipeline stage status indicator
interface PipelineStage {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
}

function PipelineStatus({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-3">Pipeline Progress</span>
      <div className="flex flex-wrap gap-2">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border transition-all ${
              stage.status === "done" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : stage.status === "running" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse"
              : stage.status === "error" ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-muted border-border text-muted-foreground"
            }`}>
              {stage.status === "done" && <CheckCircle2 className="w-3 h-3" />}
              {stage.status === "running" && <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />}
              {stage.status === "error" && <X className="w-3 h-3" />}
              {stage.status === "pending" && <div className="w-2 h-2 rounded-full bg-current opacity-40" />}
              {stage.label}
            </div>
            {i < stages.length - 1 && <span className="text-border">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

interface IngestTabProps {
  apiObligations: any[];
  isLoading: boolean;
  fetchError: string | null;
  onFetchRetry: () => void;
  onUploadComplete: () => void;
  addToast: (msg: string, type?: "success" | "warning" | "info") => void;
}

const PIPELINE_STAGES_DEFAULT: PipelineStage[] = [
  { id: "l0", label: "L0 Ingest", status: "pending" },
  { id: "l1", label: "L1 Extract", status: "pending" },
  { id: "l2", label: "L2 Embed", status: "pending" },
  { id: "l3", label: "L3 Filter", status: "pending" },
  { id: "l4", label: "L4 Bench", status: "pending" },
  { id: "l5", label: "L5 Trust", status: "pending" },
  { id: "l16", label: "L16 SYNOD", status: "pending" },
];

export function IngestTab({ apiObligations, isLoading, fetchError, onFetchRetry, onUploadComplete, addToast }: IngestTabProps) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "completed" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setUploadedFiles(data.files || []);
      }
    } catch (e) {
      console.error("Failed to fetch inventory", e);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);
  const [isDragging, setIsDragging] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(PIPELINE_STAGES_DEFAULT);
  const [l1Search, setL1Search] = useState("");
  const [l1ExpandedId, setL1ExpandedId] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<string | null>("Password");
  const [l3FilterProgress, setL3FilterProgress] = useState(0);
  const [isFilteringL3, setIsFilteringL3] = useState(false);

  const mockObligations = apiObligations.map((o: any, idx: number) => ({
    id: o.id || `OBL-${idx}`,
    policy: o.policy_name || o.doc_id || "Unknown Policy",
    section: "Section " + (o.section_id || "1.0"),
    action: o.intent_action || "Require",
    strength: o.intent_strength || "Mandatory",
    confidence: "95%",
    text: o.text || o.raw_text || "",
    scope: o.scope || "Global",
    freq: "Continuous",
    topic: o.topic || "General"
  }));

  const filteredObligations = mockObligations.filter((o) =>
    o.policy.toLowerCase().includes(l1Search.toLowerCase()) ||
    o.id.toLowerCase().includes(l1Search.toLowerCase()) ||
    o.text.toLowerCase().includes(l1Search.toLowerCase())
  );

  const animatePipeline = useCallback(() => {
    const stages = [...PIPELINE_STAGES_DEFAULT];
    const stageIds = stages.map(s => s.id);
    let current = 0;
    const interval = setInterval(() => {
      if (current >= stageIds.length) {
        clearInterval(interval);
        setPipelineStages(prev => prev.map(s => ({ ...s, status: "done" as const })));
        return;
      }
      setPipelineStages(prev => prev.map((s, i) => ({
        ...s,
        status: i < current ? "done" : i === current ? "running" : "pending"
      })));
      current++;
    }, 2500);
  }, []);

  const processUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadState("uploading");
    setUploadProgress(10);
    animatePipeline();

    const formData = new FormData();
    files.forEach(f => formData.append("files", f));

    // Fake progress while pipeline runs
    const progressInterval = setInterval(() => {
      setUploadProgress(p => p < 90 ? p + 5 : p);
    }, 2000);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      clearInterval(progressInterval);
      if (res.ok) {
        setUploadProgress(100);
        setUploadState("completed");
        setPipelineStages(PIPELINE_STAGES_DEFAULT.map(s => ({ ...s, status: "done" as const })));
        addToast(`✅ Pipeline complete — ${files.length} file(s) processed successfully`, "success");
        await fetchInventory();
        onUploadComplete();
      } else {
        setUploadState("error");
        addToast("⚠ Upload failed. Check server logs.", "warning");
        setPipelineStages(PIPELINE_STAGES_DEFAULT);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setUploadState("error");
      addToast("⚠ Network error during upload.", "warning");
      setPipelineStages(PIPELINE_STAGES_DEFAULT);
    }
  };

  const triggerL3Filter = () => {
    setIsFilteringL3(true);
    setL3FilterProgress(0);
    const interval = setInterval(() => {
      setL3FilterProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); setIsFilteringL3(false); return 100; }
        return prev + 10;
      });
    }, 80);
  };

  const cardClass = "backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] p-8 md:p-10 flex flex-col justify-between min-h-[400px] transition-all duration-300 border bg-card border-border text-card-foreground";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* Upload Card */}
      <Card className={cardClass}>
        <div>
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 text-foreground">
            <Database className="w-5 h-5 text-cyan-400" /> Upload Policy Documents
          </h4>
          <p className="text-xs md:text-sm leading-relaxed mb-4 text-muted-foreground">
            Parse unstructured documents to initialize conflict resolution trees. Supports .md, .txt, .pdf.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); processUpload(Array.from(e.dataTransfer.files)); }}
            onClick={() => document.getElementById("file-upload-ingest")?.click()}
            className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging ? "border-cyan-400 bg-cyan-500/5 shadow-[0_0_25px_rgba(0,242,254,0.1)]" : "border-border hover:border-primary/60 hover:bg-muted/30"
            }`}
          >
            <input type="file" id="file-upload-ingest" multiple className="hidden" onChange={(e) => { if (e.target.files) processUpload(Array.from(e.target.files)); }} />
            <FileText className="w-10 h-10 text-slate-500 mb-2 animate-bounce" />
            <span className="text-xs font-semibold text-foreground">Drop files here or click to browse</span>
            <span className="text-[10px] text-muted-foreground mt-1">Files automatically fly into active dashboard indexing</span>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          {/* Real pipeline status */}
          {uploadState === "uploading" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Running CONCORD pipeline...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5 bg-muted" />
              </div>
              <PipelineStatus stages={pipelineStages} />
            </div>
          )}
          {uploadState === "completed" && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Target files ingested. Obligations extracted successfully.
              </div>
              <PipelineStatus stages={pipelineStages} />
            </div>
          )}
          {uploadState === "error" && (
            <ErrorCard message="Pipeline execution failed. Check server logs." onRetry={() => setUploadState("idle")} />
          )}

          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Active policy inventory</span>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-full border font-mono text-xs flex items-center gap-1.5 transition-all bg-muted border-border text-foreground">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" /> {file}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Obligations List */}
      <Card className={cardClass.replace("justify-between", "justify-start gap-4")}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-cyan-400" /> Extracted obligations list
          </h4>
          <div className="relative w-40">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search obligations..."
              value={l1Search}
              onChange={(e) => setL1Search(e.target.value)}
              className="pl-8 h-8 text-[11px] bg-input border-border text-foreground"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
          {isLoading ? (
            <SkeletonCard lines={4} />
          ) : fetchError ? (
            <ErrorCard message={fetchError} onRetry={onFetchRetry} />
          ) : filteredObligations.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-8">No obligations found. Upload a policy document to get started.</div>
          ) : (
            filteredObligations.map((o) => (
              <div
                key={o.id}
                onClick={() => setL1ExpandedId(l1ExpandedId === o.id ? null : o.id)}
                className="p-4 rounded-xl transition-all border cursor-pointer space-y-2 bg-muted/50 border-border hover:border-primary/60 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-400 font-bold">{o.id}</span>
                  <TrustBadge level="high" label={o.confidence} />
                </div>
                <p className="text-xs md:text-sm font-semibold text-foreground">{o.policy} ({o.section})</p>
                <p className="text-xs leading-relaxed text-muted-foreground">"{o.text}"</p>
                {l1ExpandedId === o.id && (
                  <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground space-y-1.5 animate-in fade-in duration-200">
                    <p><strong className="text-foreground">Action:</strong> {o.action} | <strong className="text-foreground">Strength:</strong> {o.strength}</p>
                    <p><strong className="text-foreground">Scope:</strong> {o.scope}</p>
                    <p><strong className="text-foreground">Topic:</strong> {o.topic}</p>
                    <p><strong className="text-foreground">Frequency:</strong> {o.freq}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Semantic Clustering */}
      <Card className={`${cardClass} lg:col-span-1`}>
        <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 text-foreground">
          <Shield className="w-5 h-5 text-cyan-400" /> Semantic clustering buckets
        </h4>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-muted/40 border border-border rounded-xl p-4 flex items-center justify-center min-h-[220px]">
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Password", glow: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]" },
                { name: "Encryption", glow: "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]" },
                { name: "Access Control", glow: "text-blue-400 border-blue-500/30 bg-blue-500/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]" },
                { name: "Logging", glow: "text-red-400 border-red-500/30 bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" }
              ].map((cluster) => (
                <button
                  key={cluster.name}
                  onClick={() => setActiveCluster(cluster.name)}
                  className={`px-4 py-4 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-105 ${cluster.glow} ${activeCluster === cluster.name ? "ring-2 ring-cyan-500 scale-105" : ""}`}
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>{cluster.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="w-full md:w-48 text-xs space-y-3">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-bold">Cluster detail index</span>
            <Card className="p-4 rounded-xl space-y-2 h-[180px] overflow-y-auto border bg-muted/40 border-border text-foreground">
              <p className="font-semibold text-foreground">{activeCluster} directives</p>
              <div className="space-y-1.5 text-[10px]">
                {activeCluster === "Password" && (<><div className="p-2 rounded bg-background text-foreground border border-border">Password Construction directive</div><div className="p-2 rounded bg-background text-foreground border border-border">Global Workstation Credential rule</div></>)}
                {activeCluster === "Encryption" && (<><div className="p-2 rounded bg-background text-foreground border border-border">Standard Encrypted Database access</div><div className="p-2 rounded bg-background text-foreground border border-border">Credentials configuration policy</div></>)}
                {activeCluster === "Access Control" && (<><div className="p-2 rounded bg-background text-foreground border border-border">VPN MFA Authentication rules</div><div className="p-2 rounded bg-background text-foreground border border-border">Role-based Access Policy</div></>)}
                {activeCluster === "Logging" && (<div className="p-2 rounded bg-background text-foreground border border-border">Infrastructure Event logs guidelines</div>)}
              </div>
            </Card>
            <div className="p-3 rounded-xl border flex flex-col gap-1 text-[10px] bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-300">
              <div className="flex justify-between items-center font-bold">
                <span>Semantic Match</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">89.4%</span>
              </div>
              <p className="italic">"MFA must be mandatory for all remote authentication gates."</p>
              <p className="opacity-75">Duplicate of: Access Control §1.1</p>
            </div>
          </div>
        </div>
      </Card>

      {/* L3 Funnel */}
      <Card className={cardClass}>
        <div>
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 text-foreground">
            <Filter className="w-5 h-5 text-cyan-400" /> Candidate pair funnel filter
          </h4>
          <p className="text-xs md:text-sm leading-relaxed mb-6 text-muted-foreground">
            Removes redundant comparisons to optimize LLM analysis performance.
          </p>
        </div>
        <div className="space-y-4 max-w-sm mx-auto w-full text-xs md:text-sm">
          <div className="flex items-center justify-between p-3.5 border rounded-xl bg-muted/40 border-border text-foreground">
            <span className="text-muted-foreground font-semibold">Total Obligations</span>
            <span className="font-mono font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">343</span>
          </div>
          <div className="flex items-center justify-between p-3.5 border rounded-xl bg-muted/40 border-border text-foreground">
            <span className="text-muted-foreground font-semibold">Topic-Bucket Combinations</span>
            <span className="font-mono font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">2,747 pairs</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Button size="sm" className="h-8 text-xs cursor-pointer" onClick={triggerL3Filter} disabled={isFilteringL3}>
              {isFilteringL3 ? "Optimizing..." : "Filter pairs"}
            </Button>
            {isFilteringL3 && <Progress value={l3FilterProgress} className="h-1 bg-muted flex-1" />}
          </div>
          <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.08)]">
            <span className="text-cyan-400 font-bold">Optimized pairs</span>
            <span className="font-mono text-white font-black bg-cyan-500 px-2.5 py-0.5 rounded">851 pairs</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
