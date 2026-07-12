import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Lock, Zap, RefreshCw, AlertCircle, Download } from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";

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

// ─── Filter types ────────────────────────────────────────────────────────────
type GraphFilter = "ALL" | "REDUNDANT" | "KEYSTONE" | "TOPIC";

interface MeshTabProps {
  graphData: { nodes: any[]; links: any[] };
  apiConflicts: any[];
  isLoading?: boolean;
  fetchError?: string | null;
  onFetchRetry?: () => void;
  addToast: (msg: string, type?: "success" | "warning" | "info") => void;
}

export function MeshTab({ graphData, apiConflicts, isLoading, fetchError, onFetchRetry, addToast }: MeshTabProps) {
  const fgRef = useRef<any>(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<string>("");
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [graphFilter, setGraphFilter] = useState<GraphFilter>("ALL");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [selectedConflictId, setSelectedConflictId] = useState<string>("conflict-1");
  const [impactSelectedPolicy, setImpactSelectedPolicy] = useState<string>("Global-Password-Standard-v3.md");
  const [graphReady, setGraphReady] = useState(false);

  // Extract unique topics from graph data
  const allTopics = useMemo(() => {
    if (!graphData.nodes.length) return [];
    return [...new Set(graphData.nodes.map(n => n.topic).filter(Boolean))] as string[];
  }, [graphData.nodes]);

  // Compute counts for filter badges
  const filterCounts = useMemo(() => {
    const nodes = graphData.nodes;
    const links = graphData.links;
    const findingTypes = new Set(links.map((l: any) => l.finding_type));
    return {
      ALL: nodes.length,
      REDUNDANT: findingTypes.has("REDUNDANT") ? links.filter((l: any) => l.finding_type === "REDUNDANT").length : 0,
      KEYSTONE: nodes.filter(n => n.is_keystone).length,
      TOPIC: nodes.length,
    };
  }, [graphData]);

  // Process graph data: build neighbor lists, apply active filter
  const processedGraphData = useMemo(() => {
    if (!graphData.nodes.length) return { nodes: [], links: [] };

    // Deep clone
    let nodes = graphData.nodes.map(n => ({ ...n, neighbors: [] as any[], nodeLinks: [] as any[] }));
    let links = graphData.links.map(l => ({ ...l }));

    // Build adjacency
    links.forEach(link => {
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      const tgtId = typeof link.target === "object" ? link.target.id : link.target;
      const a = nodes.find(n => n.id === srcId);
      const b = nodes.find(n => n.id === tgtId);
      if (a && b) {
        a.neighbors.push(b);
        b.neighbors.push(a);
        a.nodeLinks.push(link);
        b.nodeLinks.push(link);
      }
    });

    // Apply filter
    if (graphFilter === "REDUNDANT") {
      const redundantLinks = links.filter((l: any) => l.finding_type === "REDUNDANT");
      const linkedIds = new Set(redundantLinks.flatMap((l: any) => [
        typeof l.source === "object" ? l.source.id : l.source,
        typeof l.target === "object" ? l.target.id : l.target,
      ]));
      nodes = nodes.filter(n => linkedIds.has(n.id));
      links = redundantLinks;
    } else if (graphFilter === "KEYSTONE") {
      // Show keystones and their immediate neighbors
      const keystoneIds = new Set(nodes.filter(n => n.is_keystone).map(n => n.id));
      const neighborIds = new Set<string>();
      links.forEach((l: any) => {
        const srcId = typeof l.source === "object" ? l.source.id : l.source;
        const tgtId = typeof l.target === "object" ? l.target.id : l.target;
        if (keystoneIds.has(srcId)) neighborIds.add(tgtId);
        if (keystoneIds.has(tgtId)) neighborIds.add(srcId);
      });
      const visibleIds = new Set([...keystoneIds, ...neighborIds]);
      nodes = nodes.filter(n => visibleIds.has(n.id));
      links = links.filter((l: any) => {
        const srcId = typeof l.source === "object" ? l.source.id : l.source;
        const tgtId = typeof l.target === "object" ? l.target.id : l.target;
        return visibleIds.has(srcId) && visibleIds.has(tgtId);
      });
    } else if (graphFilter === "TOPIC" && topicFilter !== "all") {
      const topicNodeIds = new Set(nodes.filter(n => n.topic === topicFilter).map(n => n.id));
      nodes = nodes.filter(n => topicNodeIds.has(n.id));
      links = links.filter((l: any) => {
        const srcId = typeof l.source === "object" ? l.source.id : l.source;
        const tgtId = typeof l.target === "object" ? l.target.id : l.target;
        return topicNodeIds.has(srcId) && topicNodeIds.has(tgtId);
      });
    }

    return { nodes, links };
  }, [graphData, graphFilter, topicFilter]);

  // Auto zoom-to-fit after data or filter changes
  useEffect(() => {
    if (processedGraphData.nodes.length > 0 && fgRef.current) {
      const timer = setTimeout(() => {
        fgRef.current?.zoomToFit(400, 30);
        setGraphReady(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [processedGraphData]);

  const handleZoomToFit = useCallback(() => {
    fgRef.current?.zoomToFit(400, 30);
    addToast("⊡ Graph zoomed to fit", "info");
  }, [addToast]);

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) {
      const a = document.createElement("a");
      a.download = "concord_policy_mesh.png";
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast("📥 Graph exported as PNG", "success");
    } else {
      addToast("⚠ No graph canvas found to export", "warning");
    }
  }, [addToast]);

  // Color palette for topics
  const topicColors: Record<string, string> = {
    password: "#f97316", encryption: "#a855f7", access: "#3b82f6",
    network: "#ef4444", api: "#06b6d4", cloud: "#6366f1",
    backup: "#22c55e", provisioning: "#14b8a6", endpoint: "#f59e0b",
    logging: "#ec4899", physical: "#8b5cf6", privacy: "#10b981",
    vendor: "#f43f5e", hr: "#0ea5e9", patch: "#84cc16",
    mobile: "#e879f9", monitoring: "#facc15", "data retention": "#38bdf8",
    "third-party": "#fb923c", change: "#a3e635", asset: "#c084fc",
  };

  const getNodeColor = (node: any, isDimmed: boolean) => {
    if (isDimmed) return "#1e293b";
    if (node.is_keystone) return "#a855f7";
    return topicColors[node.topic] || "#a6e3a1";
  };

  // Map conflicts for precedence arbitrator
  const mockConflictsList = apiConflicts
    .filter((f: any) => f.finding_type === "CONFLICT")
    .map((f: any, idx: number) => ({
      id: f.id || `conflict-${idx}`,
      name: "Conflict: " + (f.topic || f.policy_a || "General"),
      policyA: f.policy_a,
      policyB: f.policy_b,
      scope: f.scope_overlap || "General",
    }));

  const cardClass = "backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] p-8 md:p-10 transition-all duration-300 border bg-card border-border text-card-foreground";

  // Filter definitions with live counts
  const GRAPH_FILTERS: { label: string; value: GraphFilter; count: number; color: string }[] = [
    { label: "All", value: "ALL", count: filterCounts.ALL, color: "bg-muted border-border text-foreground" },
    { label: "Redundant", value: "REDUNDANT", count: filterCounts.REDUNDANT, color: "bg-amber-500/10 border-amber-500/30 text-amber-500" },
    { label: "Keystones", value: "KEYSTONE", count: filterCounts.KEYSTONE, color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
    { label: "By Topic", value: "TOPIC", count: allTopics.length, color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-500" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">

      {/* Precedence Arbitrator */}
      <Card className={`${cardClass} lg:col-span-2 space-y-6`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
              <Lock className="w-5 h-5 text-cyan-400" /> Precedence arbitrator
            </h4>
            <p className="text-xs md:text-sm mt-1.5 text-muted-foreground">Applies SPECIFICITY, RECENCY and AUTHORITY tiebreaker guidelines.</p>
          </div>
          <select
            value={selectedConflictId}
            onChange={(e) => setSelectedConflictId(e.target.value)}
            className="p-2 rounded-xl text-xs border cursor-pointer bg-muted border-border text-foreground"
          >
            <option value="conflict-1">Conflict #1: Password Rotation Cadence</option>
            <option value="conflict-2">Conflict #2: Public Port Database Exposure</option>
          </select>
        </div>

        {fetchError ? <ErrorCard message={fetchError} onRetry={onFetchRetry} /> : (
          <>
            {(mockConflictsList.length > 0 ? mockConflictsList.filter(c => c.id === selectedConflictId) : [
              {
                id: selectedConflictId,
                policyA: selectedConflictId === "conflict-1" ? "Acceptable Use Policy v3.2" : "AWS Cloud Security Ingress",
                policyB: selectedConflictId === "conflict-1" ? "PCI-DSS Credential Standard" : "Global Database Policy",
                name: selectedConflictId === "conflict-1" ? "Conflict: Password Rotation" : "Conflict: Port Exposure",
                scope: selectedConflictId === "conflict-1" ? "Card Processing" : "Cloud Infrastructure"
              }
            ]).map(conflict => (
              <div key={conflict.id} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <Card className="p-5 rounded-xl border flex flex-col justify-between bg-muted/40 border-border">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-500 font-bold">Policy A ({conflict.policyA})</span>
                    <p className="font-semibold text-foreground mt-1">{conflict.name}</p>
                    <p className="italic leading-relaxed text-muted-foreground mt-2">
                      {selectedConflictId === "conflict-1"
                        ? <>"Users must rotate passwords every <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">90 days</span>."</>
                        : <>"No inbound public TCP ingress on ports <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">3306 or 5432</span>."</>}
                    </p>
                  </Card>
                  <Card className="p-5 rounded-xl border flex flex-col justify-between bg-muted/40 border-border">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-500 font-bold">Policy B ({conflict.policyB})</span>
                    <p className="font-semibold text-foreground mt-1">{conflict.name}</p>
                    <p className="italic leading-relaxed text-muted-foreground mt-2">
                      {selectedConflictId === "conflict-1"
                        ? <>"Cardholder data systems must rotate passwords every <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">30 days</span>."</>
                        : <>"Database listeners may bind to public addresses under <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">secondary approval</span>."</>}
                    </p>
                  </Card>
                </div>
                <div className="p-5 rounded-xl border flex items-center justify-between text-xs bg-primary/5 border-primary/20">
                  <div>
                    <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider block">Precedence Arbitrator Winner</span>
                    <p className="font-semibold text-sm mt-1.5 text-foreground">Winner: {conflict.policyB}</p>
                    <p className="mt-1 text-muted-foreground">Reasoning: Specificity overrides. (Scope: {conflict.scope})</p>
                  </div>
                  <div className="text-center font-mono pl-5 border-l border-border/40 shrink-0">
                    <span className="text-[10px] text-muted-foreground">Confidence</span>
                    <span className="block font-black text-lg mt-0.5 text-foreground">96%</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </Card>

      {/* ─── Interactive Policy Mesh Network ──────────────────────────────── */}
      <Card className={`${cardClass} lg:col-span-2`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
              <GitBranch className="w-5 h-5 text-cyan-400" /> Interactive policy mesh network
            </h4>
            <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">
              {processedGraphData.nodes.length} nodes · {processedGraphData.links.length} edges
              {graphFilter !== "ALL" && ` (filtered from ${graphData.nodes.length} nodes)`}
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {GRAPH_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => {
                  setGraphFilter(f.value);
                  if (f.value !== "TOPIC") setTopicFilter("all");
                  setSelectedNodeDetails(null);
                  setHoverNode(null);
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  graphFilter === f.value
                    ? f.color + " ring-1 ring-offset-1 ring-offset-background ring-current"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="text-[8px] opacity-70">({f.count})</span>
              </button>
            ))}

            <span className="text-border mx-1">|</span>

            <button
              onClick={handleZoomToFit}
              className="px-3 py-1 rounded-full text-[10px] font-semibold border bg-muted border-border text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              title="Zoom to fit all nodes"
            >
              ⊡ Fit
            </button>
            <button
              onClick={handleExportPNG}
              className="px-3 py-1 rounded-full text-[10px] font-semibold border bg-muted border-border text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center gap-1"
              title="Export graph as PNG"
            >
              <Download className="w-3 h-3" /> PNG
            </button>
          </div>
        </div>

        {/* Topic dropdown (visible only when "By Topic" is active) */}
        {graphFilter === "TOPIC" && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Filter by topic:</span>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="p-1.5 rounded-lg text-xs border cursor-pointer bg-muted border-border text-foreground"
            >
              <option value="all">All Topics</option>
              {allTopics.sort().map(t => (
                <option key={t} value={t}>{t} ({graphData.nodes.filter(n => n.topic === t).length})</option>
              ))}
            </select>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[10px] mb-3">
          {[
            { color: "#a855f7", label: "Keystone" },
            { color: "#a6e3a1", label: "Normal" },
            ...(Object.entries(topicColors).slice(0, 6).map(([topic, color]) => ({
              color,
              label: topic.charAt(0).toUpperCase() + topic.slice(1),
            }))),
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
              <span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
          <span className="text-muted-foreground/50 italic">+ more…</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Graph Canvas */}
          <div className="flex-1 border rounded-xl flex items-center justify-center min-h-[380px] relative overflow-hidden bg-muted/20 border-border">
            {processedGraphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                width={650}
                height={380}
                graphData={processedGraphData}
                nodeLabel={(node: any) => `${node.id} (${node.topic || "—"})`}
                nodeRelSize={5}
                linkColor={(link: any) => {
                  const activeNode = hoverNode || selectedNodeDetails;
                  if (activeNode) {
                    const srcId = typeof link.source === "object" ? link.source.id : link.source;
                    const tgtId = typeof link.target === "object" ? link.target.id : link.target;
                    const isActive = srcId === activeNode.id || tgtId === activeNode.id;
                    if (!isActive) return "transparent";
                  }
                  if (link.finding_type === "CONFLICT") return "rgba(255, 107, 107, 0.7)";
                  if (link.finding_type === "REDUNDANT") return "rgba(249, 204, 36, 0.35)";
                  return "#8b949e33";
                }}
                linkWidth={(link: any) => {
                  const activeNode = hoverNode || selectedNodeDetails;
                  if (activeNode) {
                    const srcId = typeof link.source === "object" ? link.source.id : link.source;
                    const tgtId = typeof link.target === "object" ? link.target.id : link.target;
                    return (srcId === activeNode.id || tgtId === activeNode.id) ? 2.5 : 0.3;
                  }
                  return 0.6;
                }}
                linkDirectionalArrowLength={0}
                onNodeHover={(node: any) => setHoverNode(node)}
                onNodeClick={(node: any) => {
                  setSelectedGraphNode(node.id);
                  setSelectedNodeDetails(node);
                }}
                onBackgroundClick={() => {
                  setSelectedGraphNode("");
                  setSelectedNodeDetails(null);
                }}
                d3VelocityDecay={0.15}
                cooldownTicks={80}
                warmupTicks={30}
                onEngineStop={() => fgRef.current?.zoomToFit(400, 30)}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const activeNode = hoverNode || selectedNodeDetails;
                  const isThisActive = activeNode && node.id === activeNode.id;
                  const isNeighborActive = activeNode && activeNode.neighbors && activeNode.neighbors.some((n: any) => n.id === node.id);
                  const isActive = isThisActive || isNeighborActive;
                  const isDimmed = activeNode && !isActive;

                  const radius = node.is_keystone ? 6 : 3.5;
                  const color = getNodeColor(node, isDimmed);

                  // Draw node
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = color;
                  ctx.globalAlpha = isDimmed ? 0.15 : 1;
                  ctx.fill();
                  ctx.globalAlpha = 1;

                  // Keystone halo
                  if (node.is_keystone && !isDimmed) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 9, 0, 2 * Math.PI, false);
                    ctx.strokeStyle = "#a855f750";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                  }

                  // Label (show on hover/select, or when zoomed in)
                  if (isActive || (!activeNode && globalScale > 2.5)) {
                    const fontSize = Math.min(12 / globalScale, 4);
                    ctx.font = `bold ${fontSize}px Sans-Serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = isDimmed ? "transparent" : "#cbd5e1";
                    ctx.fillText(node.id, node.x, node.y + radius + fontSize + 1);
                  }
                }}
                backgroundColor="transparent"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <p className="text-xs">No nodes match this filter.</p>
                <button
                  onClick={() => { setGraphFilter("ALL"); setTopicFilter("all"); }}
                  className="mt-2 text-[10px] text-cyan-500 hover:underline cursor-pointer"
                >
                  Reset to All
                </button>
              </div>
            )}
          </div>

          {/* Node Detail Panel */}
          <div className="w-full lg:w-80 space-y-4">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest font-bold">Policy Node Inspector</span>
            <Card className="border p-5 rounded-xl space-y-4 text-xs bg-muted/40 border-border text-muted-foreground">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Selected Node</span>
                <p className="font-semibold text-sm text-foreground">
                  {selectedNodeDetails ? selectedGraphNode : "Click a node on the graph"}
                </p>
              </div>
              {selectedNodeDetails ? (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="p-3 rounded-lg border bg-card border-border font-mono text-[10px] space-y-1.5">
                    <p className="font-bold text-cyan-500">Topic: {selectedNodeDetails.topic || "General"}</p>
                    <p className="text-foreground">Degree: {selectedNodeDetails.degree} connections</p>
                    <p className="text-foreground">Section: {selectedNodeDetails.section || "—"}</p>
                    {selectedNodeDetails.is_keystone && (
                      <p className="text-purple-400 font-bold tracking-wider uppercase text-[9px] animate-pulse mt-1">★ Keystone Node</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-lg border bg-card border-border">
                      <span className="text-[9px] text-muted-foreground block">Connections</span>
                      <strong className="text-foreground text-base">{selectedNodeDetails.degree}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card border-border">
                      <span className="text-[9px] text-muted-foreground block">Keystone Score</span>
                      <strong className="text-foreground text-base">{((selectedNodeDetails.keystone_score || 0) * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card border-border text-center">
                    <span className="text-[9px] text-muted-foreground block">Betweenness Centrality</span>
                    <strong className="text-foreground text-base">{(selectedNodeDetails.betweenness || 0).toFixed(5)}</strong>
                  </div>
                  {selectedNodeDetails.is_keystone && (
                    <p className="font-bold text-red-400 text-[10px] uppercase tracking-wider text-center bg-red-500/10 rounded-lg py-1.5 border border-red-500/20">
                      ⚠ High Impact — Changes propagate widely
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-[10px] text-center py-6 leading-relaxed">
                  Click any node in the graph to see its topic, degree, keystone score, and centrality metrics.
                </p>
              )}
            </Card>
          </div>
        </div>
      </Card>

      {/* Impact Analysis */}
      <Card className={`${cardClass} lg:col-span-2`}>
        <div className="space-y-2">
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
            <Zap className="w-5 h-5 text-cyan-400" /> Policy changes impact analysis
          </h4>
          <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">Select a policy to simulate downstream affected dependencies before publishing updates.</p>
        </div>
        <div className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={impactSelectedPolicy} onChange={(e) => setImpactSelectedPolicy(e.target.value)} className="flex-1 p-2.5 rounded-xl text-xs border cursor-pointer bg-muted border-border text-foreground">
              <option value="Global-Password-Standard-v3.md">Global-Password-Standard-v3.md</option>
              <option value="PCI-DSS-Firewall-Blueprint.pdf">PCI-DSS-Firewall-Blueprint.pdf</option>
              <option value="Disaster-Recovery-Standard-v2.md">Disaster-Recovery-Standard-v2.md</option>
            </select>
            <Button size="sm" className="h-10 cursor-pointer px-4" onClick={() => addToast(`📊 Impact analysis loaded for ${impactSelectedPolicy}`, "info")}>Simulate Update Impact</Button>
          </div>
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-bold block">Downstream Affected Policies</span>
            {impactSelectedPolicy === "Global-Password-Standard-v3.md" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400"><strong>Acceptable Use Policy v3.2:</strong> High Impact (Password Length overlap)</div>
                <div className="p-3.5 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-400"><strong>Access Control Specification:</strong> Medium Impact (MFA requirements)</div>
              </div>
            )}
            {impactSelectedPolicy === "PCI-DSS-Firewall-Blueprint.pdf" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400"><strong>AWS Cloud Security Ingress Rules:</strong> High Impact (Overlap in restricted DB ports)</div>
              </div>
            )}
            {impactSelectedPolicy === "Disaster-Recovery-Standard-v2.md" && (
              <div className="p-4 rounded-lg border text-xs text-center bg-muted border-border text-muted-foreground">No downstream policy dependencies identified for this document.</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
