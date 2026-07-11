import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  Zap,
  TrendingUp,
  Shield,
  GitBranch,
  Download,
  ChevronRight,
  Search,
  BookOpen,
  Filter,
  FileText,
  Calendar,
  Lock,
  X,
  ArrowRight,
  Send,
  User,
  Settings as SettingsIcon,
  Bell,
  RefreshCw,
  Info,
  Clock,
  Sparkles,
  ArrowUpRight,
  Database,
  Terminal,
} from "lucide-react";

function TrustBadge({ level, label, size = "sm" }: { level: "high" | "medium" | "low"; label?: string; size?: "sm" | "md" }) {
  const styles = {
    high: "bg-[#a6e3a1]/10 text-[#a6e3a1] border-[#a6e3a1]/20 shadow-[0_0_15px_rgba(166,227,161,0.15)]",
    medium: "bg-[#f9cc24]/10 text-[#f9cc24] border-[#f9cc24]/20 shadow-[0_0_15px_rgba(249,204,36,0.15)]",
    low: "bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/20 shadow-[0_0_15px_rgba(255,107,107,0.15)]",
  };
  const text = label || (level === "high" ? "High Trust" : level === "medium" ? "Medium Trust" : "Low Trust");
  return (
    <span className={`inline-block border rounded-full font-semibold tracking-wider text-center uppercase ${size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-xs"} ${styles[level]}`}>
      {text}
    </span>
  );
}

export default function Home() {
  // Cinematic Startup Animation
  const [showStartup, setShowStartup] = useState(true);
  const [startupStep, setStartupStep] = useState(0);
  const [startupLogs, setStartupLogs] = useState<string[]>([]);

  // Top Nav Tab selections: "ingest" | "bicameral" | "mesh" | "audit"
  const [activeTab, setActiveTab] = useState<"ingest" | "bicameral" | "mesh" | "audit">("ingest");

  // Floating Chatbot (ECHO) State
  const [isEchoOpen, setIsEchoOpen] = useState(false);

  // Global Configuration State
  const [showSettings, setShowSettings] = useState(false);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);
  const [apiKey, setApiKey] = useState<string>("••••••••••••••••");
  const [orgDetails, setOrgDetails] = useState<string>("CONCORD Global Corp");

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "L4 Conflict detected between Password policies", time: "2 min ago", type: "warning" },
    { id: 2, text: "L7 Staleness check marked 4 policies deprecated", time: "1 hour ago", type: "info" },
    { id: 3, text: "L10 Health Report generated successfully", time: "3 hours ago", type: "success" },
  ]);

  // Employee View mode lookup
  const [employeePortalSearch, setEmployeePortalSearch] = useState("");
  const [employeePortalResult, setEmployeePortalResult] = useState<any>(null);

  // L0 Upload File list & states
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "completed">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([
    "Global-Password-Standard-v3.md",
    "PCI-DSS-Firewall-Blueprint.pdf"
  ]);
  const [isDragging, setIsDragging] = useState(false);

  // L1 Obligations Grid search & expand
  const [l1Search, setL1Search] = useState("");
  const [l1ExpandedId, setL1ExpandedId] = useState<string | null>(null);

  // L2 Clustering State
  const [activeCluster, setActiveCluster] = useState<string | null>("Password");

  // L3 Funnel Animation Trigger
  const [l3FilterProgress, setL3FilterProgress] = useState(0);
  const [isFilteringL3, setIsFilteringL3] = useState(false);

  // L4 Bicameral Bench State
  const [bicameralAgree, setBicameralAgree] = useState(true);

  // L7 Timeline Selection
  const [timelineYear, setTimelineYear] = useState<number>(2026);

  // L9 Keystone Info Selection
  const [selectedKeystoneNode, setSelectedKeystoneNode] = useState<string>("password");

  // Advanced features states
  const [selectedConflictId, setSelectedConflictId] = useState<string>("conflict-1");
  const [schedulerConfigured, setSchedulerConfigured] = useState(false);
  const [impactSelectedPolicy, setImpactSelectedPolicy] = useState<string>("Global-Password-Standard-v3.md");
  const [harmonizedStatus, setHarmonizedStatus] = useState<Record<string, boolean>>({});
  const [selectedDiffVersion, setSelectedDiffVersion] = useState<string>("v3.2_vs_v4.0");
  const [selectedGraphNode, setSelectedGraphNode] = useState<string>("Password");

  const [apiObligations, setApiObligations] = useState<any[]>([]);
  const [apiConflicts, setApiConflicts] = useState<any[]>([]);
  
  const fetchData = async () => {
    try {
      const obsRes = await fetch("/api/obligations?limit=100");
      const obsData = await obsRes.json();
      setApiObligations(obsData.data || []);

      const findsRes = await fetch("/api/findings?limit=100");
      const findsData = await findsRes.json();
      setApiConflicts(findsData.data || []);
    } catch(e) {
      console.error("Fetch error", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const mockConflictsList = apiConflicts.filter((f: any) => f.finding_type === "CONFLICT").map((f: any, idx: number) => ({
    id: f.id || `conflict-${idx}`,
    name: "Conflict: " + (f.topic || f.policy_a || "General"),
    policyA: f.policy_a,
    clauseA: `ID: ${f.obligation_id_1}`,
    policyB: f.policy_b,
    clauseB: `ID: ${f.obligation_id_2}`,
    scope: f.scope_overlap || "General",
    harmonizedSuggestion: f.voice_explanation || f.harmonization_recommendation || "Needs review."
  }));

  // L12 Recommendation State
  const [recsList, setRecsList] = useState([
    { id: "REC-1", conflict: "Password Policy 14 chars minimum vs Acceptable Use Policy 8 chars minimum.", suggestion: "Consolidate to 14 characters globally to maintain the highest compliance posture.", status: "pending", policyA: "Password Policy 3.1", policyB: "Acceptable Use Policy 5.2" },
    { id: "REC-2", conflict: "Remote Access firewall rules overlap with AWS Cloud Security ingress configuration.", suggestion: "Merge standard ingress rules and retire duplicate local policy clause.", status: "pending", policyA: "Remote Access Firewall", policyB: "AWS Cloud Security Ingress" }
  ]);

  // L14 ECHO Console State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "concord"; text: string; details?: string }>>([
    { sender: "concord", text: "Welcome to ECHO Assistant. Ask me anything about the parsed policy hierarchy." }
  ]);
  const [chatInput, setChatInput] = useState("");

  // Reports
  const [reportState, setReportState] = useState<"idle" | "generating" | "done">("idle");
  const [reportProgress, setReportProgress] = useState(0);

  // Running startup loader on initial render
  useEffect(() => {
    if (!showStartup) return;
    const steps = [
      "Initializing CONCORD Mesh Environment...",
      "L0: Ingesting raw document streams...",
      "L1: Extracting structured obligation definitions...",
      "L2: Generating SVD embeddings and semantic categories...",
      "L3: Evaluating candidate search space nodes...",
      "L4: Launching Bicameral Dual-Engine decision models...",
      "L6: Aligning precedence resolving graphs...",
      "L8/L9: Building central keystone mapping indexes...",
      "System fully synchronized. Initializing command panels."
    ];

    const interval = setInterval(() => {
      setStartupStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => setShowStartup(false), 800);
          return prev;
        }
        setStartupLogs((logs) => [...logs, steps[prev]]);
        return prev + 1;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [showStartup]);

  // Handle mock drag & drop upload L0
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const processUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadState("uploading");
    setUploadProgress(20);

    const formData = new FormData();
    files.forEach(f => formData.append("files", f));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        setUploadProgress(100);
        setUploadState("completed");
        setUploadedFiles(prev => [...prev, ...files.map(f => f.name)]);
        fetchData();
      } else {
        setUploadState("idle");
        console.error("Upload failed");
      }
    } catch(err) {
      console.error(err);
      setUploadState("idle");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processUpload(Array.from(e.dataTransfer.files));
  };

  const triggerMockUpload = () => {
    document.getElementById("file-upload")?.click();
  };

  // Trigger L3 candidate filtering animation
  const triggerL3Filter = () => {
    setIsFilteringL3(true);
    setL3FilterProgress(0);
    const interval = setInterval(() => {
      setL3FilterProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsFilteringL3(false);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  };

  // L14 Chat suggestion trigger
  const sendEchoQuestion = (question: string) => {
    setChatMessages((prev) => [...prev, { sender: "user", text: question }]);
    setTimeout(() => {
      let answer = "";
      let details = "";
      if (question.toLowerCase().includes("override")) {
        answer = "Cloud Security Policy overrides the general Password Policy.";
        details = "Reason: Under specificity guidelines, Cloud Security contains a structured scope restricted to 'cloud-hosted infrastructure' (lex specialis), which is a subset of the global Password Policy's scope. Precedence basis: Specificity.";
      } else if (question.toLowerCase().includes("stale")) {
        answer = "I found 4 stale policy documents in the active workspace.";
        details = "Stale documents: Dial In Access Policy, Disaster Recovery Plan, Database Credentials Policy, and Digital Signature Acceptance. These documents have exceeded the 5-year decay cutoff window.";
      } else if (question.toLowerCase().includes("encryption")) {
        answer = "I found 3 policy documents covering encryption standards:";
        details = "1. AWS Cloud Security Ingress Rules (Section 2.1) - Links to GDPR Art 32.\n2. PCI-DSS Credentials Standard (Section 5.2) - Links to NIST SP 800-53 IA-2.\n3. Access Control Specification (Section 1.1) - Links to ISO 27001 A.9.4.3.";
      } else if (question.toLowerCase().includes("gdpr")) {
        answer = "I found direct alignment mappings for GDPR Article 32 (Security of Processing) in 2 active policies:";
        details = "1. Financial Data Storage Policy (EU Scope) - Mandatory cold storage archiving rules.\n2. AWS Cloud Security Ingress Rules - Ingress port restriction controls.";
      } else {
        answer = "I processed your query. Resolving conflicts and redundancies...";
        details = "Query parameters evaluated against the active graph structure. No critical overlaps detected for current parameters.";
      }
      setChatMessages((prev) => [...prev, { sender: "concord", text: answer, details }]);
    }, 700);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendEchoQuestion(chatInput);
    setChatInput("");
  };

  // Mock Report generation
  const generateReport = () => {
    setReportState("generating");
    setReportProgress(0);
    const interval = setInterval(() => {
      setReportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setReportState("done");
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

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

  const filteredObligations = useMemo(() => {
    return mockObligations.filter((o) =>
      o.policy.toLowerCase().includes(l1Search.toLowerCase()) ||
      o.id.toLowerCase().includes(l1Search.toLowerCase()) ||
      o.text.toLowerCase().includes(l1Search.toLowerCase())
    );
  }, [l1Search, mockObligations]);

  const radarChartData = [
    { subject: "Rule Signal", value: 90 },
    { subject: "Embedding Similarity", value: 85 },
    { subject: "LLM Confidence", value: 92 },
    { subject: "Agreement Bonus", value: 95 },
  ];

  // Employee portal search lookup logic
  const handleEmployeeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = employeePortalSearch.toLowerCase();
    if (query.includes("pass") || query.includes("word")) {
      setEmployeePortalResult({
        status: "active",
        policy: "Password Policy (Active)",
        verdict: "🟢 Safe to follow the standard Password Policy.",
        reason: "There are no overriding security directives or active conflicts affecting generic user workstation logins."
      });
    } else if (query.includes("cloud") || query.includes("remote")) {
      setEmployeePortalResult({
        status: "warning",
        policy: "Cloud Security Policy vs VPN Access",
        verdict: "🔴 DO NOT follow standard VPN rules for cloud access. Use Cloud Policy instead.",
        reason: "Under specific scope guidelines, the Cloud Security Policy overrides general remote access regulations for all cloud-hosted applications."
      });
    } else {
      setEmployeePortalResult({
        status: "unknown",
        policy: "General Policy Directive",
        verdict: "🟡 Standard procedures are active.",
        reason: "No overriding conflicts or stale statuses detected for this specific lookup term."
      });
    }
  };

  return (
    <div className={`min-h-screen relative overflow-x-hidden font-sans pb-12 selection:bg-primary selection:text-primary-foreground transition-colors duration-300 ${
      themeMode === "light" ? "bg-slate-50 text-slate-900" : "bg-[#070712] text-foreground"
    }`}>
      
      {/* Background Neon Glow Light-Leaks */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] bg-pink-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Cinematic Startup Loader overlay */}
      {showStartup && (
        <div className="fixed inset-0 z-[100] bg-[#070712] flex flex-col items-center justify-center p-6">
          <div className="max-w-xl w-full text-left space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="font-display font-black text-3xl tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">CONCORD</h1>
                <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Resolution Platform Core</p>
              </div>
            </div>

            <div className="border border-white/10 bg-slate-900/50 backdrop-blur-xl rounded-xl p-5 font-mono text-[11px] text-slate-400 space-y-2 h-[220px] overflow-y-auto">
              <p className="text-cyan-400 animate-pulse">&gt; Loading system assemblies...</p>
              {startupLogs.map((log, idx) => (
                <p key={idx} className="fade-in">&gt; {log}</p>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Synchronizing neural nodes...</span>
                <span>{Math.round((startupStep / 9) * 100)}%</span>
              </div>
              <Progress value={(startupStep / 9) * 100} className="h-1 bg-slate-800" />
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Glowing Header */}
      <header className={`sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between transition-colors duration-300 backdrop-blur-xl ${
        themeMode === "light" ? "bg-white/90 border-slate-200 text-slate-900" : "bg-[#070712]/80 border-white/10 text-white"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`font-display font-black text-base tracking-wide ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>CONCORD</h1>
            <p className="text-[9px] text-cyan-500 tracking-widest font-mono uppercase">Precedence & Graph Intelligence</p>
          </div>
        </div>

        {/* Top Segmented Navigation Tabs */}
        <div className={`flex flex-wrap items-center justify-center p-1 border rounded-2xl md:rounded-full gap-1 max-w-full ${
          themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"
        }`}>
          {[
            { id: "ingest", label: "Ingest & Extract" },
            { id: "bicameral", label: "Bicameral Analytics" },
            { id: "mesh", label: "Precedence & Mesh" },
            { id: "audit", label: "Audit & Portals" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2 md:px-4 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-xl md:rounded-full transition-all duration-300 flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/10"
                  : themeMode === "light"
                    ? "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Top Right Buttons */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                themeMode === "light" ? "bg-slate-100 border border-slate-200 hover:bg-slate-200" : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
            >
              <Bell className={`w-4 h-4 ${themeMode === "light" ? "text-slate-800" : "text-white"}`} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#ff6b6b] border-2 border-slate-50 dark:border-[#070712]" />
            </button>

            {showNotifications && (
              <div className={`absolute right-0 mt-2.5 w-80 border rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-xl ${
                themeMode === "light" ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900/95 border-white/10 text-white"
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                  <span className="text-xs font-bold">System Notifications</span>
                  <button className="text-[10px] text-cyan-500 hover:underline cursor-pointer" onClick={() => setNotifications([])}>Clear</button>
                </div>
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className={`text-xs p-2.5 rounded-lg border flex gap-2 ${
                      themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.type === "warning" ? "bg-[#ff6b6b]" : n.type === "success" ? "bg-[#a6e3a1]" : "bg-cyan-400"}`} />
                      <div>
                        <p className="font-medium leading-tight">{n.text}</p>
                        <span className="text-[9px] text-slate-500 mt-1 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              themeMode === "light" ? "bg-slate-100 border border-slate-200 hover:bg-slate-200" : "bg-white/5 border border-white/10 hover:bg-white/10"
            }`}
          >
            <SettingsIcon className={`w-4 h-4 ${themeMode === "light" ? "text-slate-800" : "text-white"}`} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden text-center z-10">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className={`font-display text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight ${
            themeMode === "light" ? "text-slate-900" : "text-white"
          }`}>
            Your policies,
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-[#ff7979] bg-clip-text text-transparent">
              understood.
            </span>
          </h2>
          <p className={`text-sm md:text-base max-w-3xl mx-auto leading-relaxed ${
            themeMode === "light" ? "text-slate-600" : "text-slate-400"
          }`}>
            Trust-weighted conflict detection. Centrality-aware impact analysis. Precedence-resolved decisions. Explore active policy outputs below.
          </p>
        </div>
      </section>

      {/* Global Status Bar */}
      <section className="container max-w-6xl mx-auto mt-6 px-6">
        <div className={`border rounded-2xl p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-colors duration-300 ${
          themeMode === "light" ? "bg-white border-slate-200 text-slate-900" : "bg-white/5 border-white/10 text-white"
        }`}>
          <div className="flex items-center gap-4">
            {/* Round animated gauge */}
            <div className="relative w-16 h-16 rounded-full border-4 border-cyan-400/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.1)]">
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-400 animate-spin" />
              <span className={`font-display font-extrabold text-lg ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>92%</span>
            </div>
            <div>
              <h3 className={`font-semibold text-sm ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>Organization Health Score</h3>
              <p className={`text-xs mt-0.5 ${themeMode === "light" ? "text-slate-500" : "text-slate-400"}`}>Calculated based on active policy redundancies and conflicts</p>
            </div>
          </div>

          <div className="flex gap-4 lg:gap-8 text-xs font-mono">
            <div className={`px-3 py-1.5 rounded-lg border text-center min-w-[90px] ${
              themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
            }`}>
              <p className="text-slate-500 uppercase text-[9px]">Conflicts</p>
              <p className={`font-bold text-sm mt-0.5 ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>12</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border text-center min-w-[90px] ${
              themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
            }`}>
              <p className="text-slate-500 uppercase text-[9px]">Stale</p>
              <p className="text-[#f9cc24] font-bold text-sm mt-0.5">4</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border text-center min-w-[90px] ${
              themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
            }`}>
              <p className="text-slate-500 uppercase text-[9px]">Redundant</p>
              <p className="text-cyan-500 font-bold text-sm mt-0.5">9</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border text-center min-w-[90px] ${
              themeMode === "light" ? "bg-[#ff6b6b]/5 border-[#ff6b6b]/15 shadow-[0_0_15px_rgba(255,107,107,0.05)]" : "bg-[#ff6b6b]/10 border-[#ff6b6b]/20 shadow-[0_0_15px_rgba(255,107,107,0.1)]"
            }`}>
              <p className="text-[#ff6b6b] uppercase text-[9px]">Critical</p>
              <p className="text-[#ff6b6b] font-bold text-sm mt-0.5">3</p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Quick Stats */}
      <section className="container max-w-6xl mx-auto mt-6 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Policies", val: 32, icon: BookOpen },
            { label: "Obligations", val: 486, icon: Database },
            { label: "AI Findings", val: 74, icon: Shield },
            { label: "Keystones", val: 6, icon: Sparkles }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className={`border rounded-xl p-4 flex items-center justify-between backdrop-blur-xl group transition-all duration-300 ${
                themeMode === "light"
                  ? "bg-white border-slate-200 hover:border-cyan-500 shadow-sm shadow-slate-100"
                  : "bg-white/5 border-white/10 hover:border-cyan-400/30"
              }`}>
                <div>
                  <p className={`text-[10px] uppercase font-bold tracking-wider ${themeMode === "light" ? "text-slate-500" : "text-slate-400"}`}>{stat.label}</p>
                  <p className={`text-2xl font-black mt-1 font-mono tracking-tight ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>{stat.val}</p>
                </div>
                <Icon className="w-5 h-5 text-slate-500 group-hover:text-cyan-500 transition-colors" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Settings Sidebar Drawer */}
      {showSettings && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-300"
            onClick={() => setShowSettings(false)}
          />
          {/* Drawer container */}
          <Card className={`fixed top-0 right-0 h-full w-85 z-[100] shadow-2xl flex flex-col justify-between p-6 transition-all duration-300 border-l animate-in slide-in-from-right ${
            themeMode === "light"
              ? "bg-white border-slate-200 text-slate-900 animate-in duration-300"
              : "bg-slate-950 border-white/10 text-white animate-in duration-300"
          }`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className={`font-display font-bold text-base ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>Settings</h3>
                </div>
                <button className="text-slate-400 hover:text-slate-200 cursor-pointer" onClick={() => setShowSettings(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Slider for confidence */}
              <div className="space-y-2">
                <Label className={`text-xs ${themeMode === "light" ? "text-slate-700" : "text-slate-300"}`}>Minimum confidence threshold: {confidenceThreshold}%</Label>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={(val) => setConfidenceThreshold(val[0])}
                  max={100}
                  step={5}
                  className="py-2"
                />
              </div>

              {/* Input LLM token */}
              <div className="space-y-2">
                <Label className={`text-xs ${themeMode === "light" ? "text-slate-700" : "text-slate-300"}`} htmlFor="api-key">LLM Credentials Token</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={`h-9 text-xs ${themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"}`}
                />
              </div>

              {/* Input org identifier */}
              <div className="space-y-2">
                <Label className={`text-xs ${themeMode === "light" ? "text-slate-700" : "text-slate-300"}`} htmlFor="org-details">Organization Identifier</Label>
                <Input
                  id="org-details"
                  type="text"
                  value={orgDetails}
                  onChange={(e) => setOrgDetails(e.target.value)}
                  className={`h-9 text-xs ${themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"}`}
                />
              </div>

              {/* Theme Selector Toggle */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className={`text-xs ${themeMode === "light" ? "text-slate-700" : "text-slate-300"}`}>Active Theme Mode</Label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setThemeMode("dark")}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      themeMode === "dark"
                        ? "bg-cyan-600 border-cyan-400 text-white"
                        : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    Dark Theme
                  </button>
                  <button
                    onClick={() => setThemeMode("light")}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      themeMode === "light"
                        ? "bg-slate-100 border-slate-300 text-slate-800"
                        : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Light Theme
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Changes applied instantly to the interface state.
            </p>
          </Card>
        </>
      )}

      {/* Main Grid View Panels according to selected Nav tab */}
      <main className="container max-w-6xl mx-auto mt-8 px-6">
        
        {/* TAB 1: INGESTION & EXTRACTION */}
        {activeTab === "ingest" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Policy Ingest */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[400px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div>
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <Database className="w-5 h-5 text-cyan-400" /> Upload Policy Documents
                </h4>
                <p className={`text-xs md:text-sm leading-relaxed mb-6 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                  Parse unstructured documents to initialize conflict resolution trees. Supported extensions: .md, .txt, .pdf.
                </p>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerMockUpload}
                  className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging 
                      ? "border-cyan-400 bg-cyan-500/5 shadow-[0_0_25px_rgba(0,242,254,0.1)]" 
                      : themeMode === "light" 
                        ? "border-slate-300 hover:border-cyan-500 hover:bg-slate-50" 
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <input type="file" id="file-upload" multiple className="hidden" onChange={(e) => {
                    if (e.target.files) {
                      processUpload(Array.from(e.target.files));
                    }
                  }} />
                  <FileText className="w-10 h-10 text-slate-500 mb-2 animate-bounce" />
                  <span className="text-xs font-semibold text-white">Drop files here or click to browse</span>
                  <span className="text-[10px] text-slate-500 mt-1">Files automatically fly into active dashboard indexing</span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                {uploadState === "uploading" && (
                  <div className="space-y-2 animate-pulse">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Analyzing file buffers...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1 bg-slate-800" />
                  </div>
                )}

                {uploadState === "completed" && (
                  <div className="p-3 bg-[#a6e3a1]/10 border border-[#a6e3a1]/20 text-[#a6e3a1] rounded-xl text-xs flex items-center gap-2 animate-[pulse_2s_infinite]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Target files ingested. Obligations extracted successfully.
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Active policy inventory</span>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <span key={idx} className={`px-3 py-1.5 rounded-full border font-mono text-xs flex items-center gap-1.5 transition-all ${
                        themeMode === "light" ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white/5 border-white/5 text-white"
                      }`}>
                        <FileText className="w-3.5 h-3.5 text-cyan-400" /> {file}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Extracted Obligations */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[400px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <FileText className="w-5 h-5 text-cyan-400" /> Extracted obligations list
                </h4>
                <div className="relative w-40">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    placeholder="Search obligations..."
                    value={l1Search}
                    onChange={(e) => setL1Search(e.target.value)}
                    className={`pl-8 h-8 text-[11px] ${
                      themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                {filteredObligations.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => setL1ExpandedId(l1ExpandedId === o.id ? null : o.id)}
                    className={`p-4 rounded-xl transition-all border cursor-pointer space-y-2 ${
                      themeMode === "light" 
                        ? "bg-slate-50 border-slate-200 hover:border-cyan-500" 
                        : "bg-white/5 border-white/5 hover:border-cyan-450/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-cyan-400 font-bold">{o.id}</span>
                      <TrustBadge level="high" label={o.confidence} />
                    </div>
                    <p className={`text-xs md:text-sm font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>{o.policy} (Section {o.section})</p>
                    <p className={`text-xs leading-relaxed ${themeMode === "light" ? "text-slate-650" : "text-slate-400"}`}>"{o.text}"</p>

                    {l1ExpandedId === o.id && (
                      <div className="pt-2 border-t border-white/5 text-[10px] text-slate-400 space-y-1.5 animate-in fade-in duration-200">
                        <p><strong className="text-white">Action:</strong> {o.action} | <strong className="text-white">Strength:</strong> {o.strength}</p>
                        <p><strong className="text-white">Scope:</strong> {o.scope}</p>
                        <p><strong className="text-white">Topic:</strong> {o.topic}</p>
                        <p><strong className="text-white">Frequency:</strong> {o.freq}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Semantic Analysis clustering bubbles */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[400px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                <Shield className="w-5 h-5 text-cyan-400" /> Semantic clustering buckets
              </h4>

              <div className="flex flex-col md:flex-row gap-6">
                {/* SVG Isometric blocks grid */}
                <div className="flex-1 bg-black/30 border border-white/5 rounded-xl p-4 flex items-center justify-center min-h-[220px]">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "Password", glow: "shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
                      { name: "Encryption", glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)] text-purple-400 border-purple-500/30 bg-purple-500/10" },
                      { name: "Access Control", glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-400 border-blue-500/30 bg-blue-500/10" },
                      { name: "Logging", glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)] text-red-400 border-red-500/30 bg-red-500/10" }
                    ].map((cluster) => (
                      <button
                        key={cluster.name}
                        onClick={() => setActiveCluster(cluster.name)}
                        className={`px-4 py-4 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-105 ${cluster.glow} ${
                          activeCluster === cluster.name ? "ring-2 ring-cyan-500" : ""
                        }`}
                      >
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>{cluster.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details side cards */}
                <div className="w-full md:w-48 text-xs space-y-3">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-bold">Cluster detail index</span>
                  <Card className={`p-4 rounded-xl space-y-2 h-[180px] overflow-y-auto border ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-900 shadow-inner" : "bg-white/5 border-white/5 text-white"
                  }`}>
                    <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>{activeCluster} directives</p>
                    <div className="space-y-1.5 text-[10px]">
                      {activeCluster === "Password" && (
                        <>
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"}`}>Password Construction directive</div>
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"}`}>Global Workstation Credential rule</div>
                        </>
                      )}
                      {activeCluster === "Encryption" && (
                        <>
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"}`}>Standard Encrypted Database access</div>
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"}`}>Credentials configuration policy</div>
                        </>
                      )}
                      {activeCluster === "Access Control" && (
                        <>
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"}`}>VPN MFA Authentication rules</div>
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"}`}>Role-based Access Policy</div>
                        </>
                      )}
                      {activeCluster === "Logging" && (
                        <div className={`p-2 rounded ${themeMode === "light" ? "bg-slate-100 text-slate-800 border border-slate-200" : "bg-black/40 text-slate-400"}`}>Infrastructure Event logs guidelines</div>
                      )}
                    </div>
                  </Card>

                  {/* Level 2: Embeddings-based near-duplicate detection alerts */}
                  <div className="pt-2">
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-bold block mb-1">Near-Duplicate Alerts (Embeddings Match)</span>
                    <div className={`p-3 rounded-xl border flex flex-col gap-1 text-[10px] ${
                      themeMode === "light" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                    }`}>
                      <div className="flex justify-between items-center font-bold">
                        <span>Semantic Similarity Score</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">89.4% Match</span>
                      </div>
                      <p className="italic">"MFA must be mandatory for all remote authentication gates."</p>
                      <p className="opacity-75">Duplicate of: Access Control Standard Section 1.1</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Candidate Pair filter optimization */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[400px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div>
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <Filter className="w-5 h-5 text-cyan-400" /> Candidate pair funnel filter
                </h4>
                <p className={`text-xs md:text-sm leading-relaxed mb-6 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                  Removes redundant comparisons to optimize LLM analysis performance.
                </p>
              </div>

              {/* Visual pipeline */}
              <div className="space-y-4 max-w-sm mx-auto w-full text-xs md:text-sm">
                <div className={`flex items-center justify-between p-3.5 border rounded-xl ${
                  themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-850" : "bg-white/5 border-white/5 text-white"
                }`}>
                  <span className="text-slate-500 font-semibold">Total Obligations</span>
                  <span className="font-mono font-bold bg-slate-800 px-2 py-0.5 rounded">486</span>
                </div>
                <div className={`flex items-center justify-between p-3.5 border rounded-xl ${
                  themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-850" : "bg-white/5 border-white/5 text-white"
                }`}>
                  <span className="text-slate-500 font-semibold">Total Combinations (Cartesian)</span>
                  <span className="font-mono font-bold bg-slate-800 px-2 py-0.5 rounded">2,100 pairs</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Button size="sm" className="h-8 text-xs cursor-pointer" onClick={triggerL3Filter} disabled={isFilteringL3}>
                    {isFilteringL3 ? "Optimizing comparisons..." : "Filter pairs"}
                  </Button>
                  {isFilteringL3 && <Progress value={l3FilterProgress} className="h-1 bg-slate-800 flex-1" />}
                </div>

                <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.1)]">
                  <span className="text-cyan-400 font-bold">Optimized Candidate pairs</span>
                  <span className="font-mono text-white font-black bg-cyan-500 px-2.5 py-0.5 rounded">67 pairs</span>
                </div>
              </div>
            </Card>

          </div>
        )}

        {/* TAB 2: BICAMERAL ANALYTICS */}
        {activeTab === "bicameral" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
            
            {/* Bicameral Bench split */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] lg:col-span-2 transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-6">
                <div>
                  <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                    <Shield className="w-5 h-5 text-cyan-400" /> Bicameral dual-engine bench
                  </h4>
                  <p className={`text-xs md:text-sm mt-1.5 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>Compares rigid rule matching with LLM semantic models.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={themeMode === "light" ? "text-slate-500" : "text-slate-400"}>Simulate engine sync:</span>
                  <Switch
                    checked={bicameralAgree}
                    onCheckedChange={setBicameralAgree}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <Card className={`flex-1 border p-5 space-y-3 w-full text-center ${
                  themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                }`}>
                  <h5 className={`font-semibold text-xs ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>Deterministic Rule Bench</h5>
                  <div className="p-3 bg-black/40 rounded-lg font-mono text-[11px] text-cyan-400 font-bold border border-cyan-500/10">
                    Conflict Flagged (Confidence: 95%)
                  </div>
                </Card>

                {/* Central indicator orb */}
                <div className="flex flex-col items-center shrink-0">
                  {bicameralAgree ? (
                    <div className="w-14 h-14 rounded-full bg-[#a6e3a1]/10 border border-[#a6e3a1] shadow-[0_0_25px_rgba(166,227,161,0.3)] flex items-center justify-center text-[10px] font-black text-[#a6e3a1] animate-pulse">
                      SYNC
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#ff6b6b]/10 border border-[#ff6b6b] shadow-[0_0_25px_rgba(255,107,107,0.3)] flex items-center justify-center text-[10px] font-black text-[#ff6b6b] animate-pulse">
                      ESCALATE
                    </div>
                  )}
                  <span className="text-[9px] text-slate-500 font-mono mt-2">Bicameral Status</span>
                </div>

                <Card className={`flex-1 border p-5 space-y-3 w-full text-center ${
                  themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                }`}>
                  <h5 className={`font-semibold text-xs ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>Semantic LLM Bench</h5>
                  <div className="p-3 bg-black/40 rounded-lg font-mono text-[11px] text-purple-400 font-bold border border-purple-500/10">
                    {bicameralAgree ? "Conflict Flagged (Confidence: 92%)" : "No Conflict Resolved (Confidence: 88%)"}
                  </div>
                </Card>
              </div>

              {/* Level 2: Scope-Aware Conflict Resolution Indicators */}
              <div className={`mt-6 pt-4 border-t ${themeMode === "light" ? "border-slate-200" : "border-white/10"}`}>
                <span className="text-[11px] font-mono text-cyan-500 font-bold uppercase tracking-wider block mb-2">Scope-Aware Conflict Detection Parameters</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className={`p-3 rounded-lg border ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/5 text-slate-300"
                  }`}>
                    <strong>Department Scope:</strong> Finance vs Card Processing (Scope Overlap: Yes)
                  </div>
                  <div className={`p-3 rounded-lg border ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/5 text-slate-300"
                  }`}>
                    <strong>Target System Scope:</strong> AWS Production Systems (Restricted Scope)
                  </div>
                  <div className={`p-3 rounded-lg border ${
                    themeMode === "light" ? "bg-green-50 border-green-200 text-green-800" : "bg-green-500/10 border-green-500/20 text-green-400"
                  }`}>
                    <strong>Resolution Metric:</strong> Conflict applies only to specific systems. No general override required.
                  </div>
                </div>
              </div>
            </Card>

            {/* Trust reconciliation radar */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[350px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div>
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <Lock className="w-5 h-5 text-cyan-400" /> Trust reconciliation radar
                </h4>
                <p className={`text-xs md:text-sm leading-relaxed mb-6 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                  Reconstructs trust signals dynamically using a multi-parameter radar envelope.
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="none" tick={false} />
                      <Radar name="Trust" dataKey="value" stroke="#00f2fe" fill="#00f2fe" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-4 text-xs">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Consolidated trust index</p>
                    <p className="text-3xl font-black text-white font-mono mt-1">92%</p>
                    <div className="flex justify-center gap-1.5 mt-2">
                      <TrustBadge level="high" size="sm" />
                      <TrustBadge level="medium" size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Policy chronological timeline */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[350px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div>
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <Calendar className="w-5 h-5 text-cyan-400" /> Decay timeline
                </h4>
                <p className={`text-xs md:text-sm leading-relaxed mb-6 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                  Analyzes date parameters and flags stale procedural documents.
                </p>

                {/* Timeline slider buttons */}
                <div className={`flex items-center justify-between p-1 border rounded-xl max-w-xs mx-auto mb-6 ${
                  themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"
                }`}>
                  {[2019, 2021, 2023, 2026].map((year) => (
                    <button
                      key={year}
                      onClick={() => setTimelineYear(year)}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        timelineYear === year 
                          ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/10" 
                          : themeMode === "light" 
                            ? "text-slate-500 hover:text-slate-900" 
                            : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {timelineYear === 2019 && (
                  <div className={`p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                  }`}>
                    <div>
                      <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>SANS Dial-In access Guidelines</p>
                      <span className="text-[10px] text-slate-500">Last Reviewed: August 2019</span>
                    </div>
                    <TrustBadge level="low" label="Deprecated" />
                  </div>
                )}
                {timelineYear === 2021 && (
                  <div className={`p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                  }`}>
                    <div>
                      <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>Acceptable Use Policy v3.2</p>
                      <span className="text-[10px] text-slate-500">Last Reviewed: October 2021</span>
                    </div>
                    <TrustBadge level="medium" label="Stale / Decayed" />
                  </div>
                )}
                {timelineYear === 2023 && (
                  <div className={`p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                  }`}>
                    <div>
                      <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>Access Control Specification</p>
                      <span className="text-[10px] text-slate-500">Last Reviewed: June 2023</span>
                    </div>
                    <TrustBadge level="high" label="Active / Valid" />
                  </div>
                )}
                {timelineYear === 2026 && (
                  <div className={`p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                  }`}>
                    <div>
                      <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>AWS Cloud Security Ingress rules</p>
                      <span className="text-[10px] text-slate-500">Last Reviewed: January 2026</span>
                    </div>
                    <TrustBadge level="high" label="Active / Valid" />
                  </div>
                )}
              </div>

              {/* Level 1: Policy Review Scheduler Alert Setup */}
              <div className={`mt-6 pt-4 border-t text-xs ${themeMode === "light" ? "border-slate-200" : "border-white/10"}`}>
                <span className="text-[11px] font-mono text-cyan-500 font-bold uppercase tracking-wider block mb-2">Policy Review Scheduler</span>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>Auto-Generate Reminders based on Staleness</p>
                    <p className="text-[10px] text-slate-500">Pushes scheduled email/Slack notifications when document decay cutoff is crossed.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSchedulerConfigured(!schedulerConfigured);
                      setNotifications(prev => [
                        { id: Date.now(), text: "Stale policy review alerts scheduled successfully!", time: "Just now", type: "success" },
                        ...prev
                      ]);
                    }}
                    className={`h-9 cursor-pointer font-bold ${
                      schedulerConfigured 
                        ? "bg-green-600 hover:bg-green-500 text-white" 
                        : "bg-cyan-600 hover:bg-cyan-500 text-white"
                    }`}
                  >
                    {schedulerConfigured ? "✓ Review Alerts Scheduled" : "Schedule Review Alerts"}
                  </Button>
                </div>
              </div>
            </Card>

          </div>
        )}

        {/* TAB 3: PRECEDENCE RESOLUTION & POLICY MESH */}
        {activeTab === "mesh" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
            
            {/* Precedence resolving engine & Side-by-side conflict highlight */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] lg:col-span-2 space-y-6 transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                    <Lock className="w-5 h-5 text-cyan-400" /> Precedence arbitrator
                  </h4>
                  <p className={`text-xs md:text-sm mt-1.5 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                    Applies SPECIFICITY, RECENCY and AUTHORITY tiebreaker guidelines to resolve overlaps.
                  </p>
                </div>

                {/* Level 1: Conflict selector */}
                <select
                  value={selectedConflictId}
                  onChange={(e) => setSelectedConflictId(e.target.value)}
                  className={`p-2 rounded-xl text-xs border cursor-pointer ${
                    themeMode === "light" ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"
                  }`}
                >
                  <option value="conflict-1">Conflict #1: Password Rotation Cadence</option>
                  <option value="conflict-2">Conflict #2: Public Port Database Exposure</option>
                </select>
              </div>

              {/* Level 1: Side-by-Side conflict comparison with highlighted texts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {mockConflictsList.filter(c => c.id === selectedConflictId).map(conflict => (
                  <>
                    <Card key={`${conflict.id}-A`} className={`p-5 rounded-xl border flex flex-col justify-between ${
                      themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                    }`}>
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-500 font-bold">Policy A ({conflict.policyA})</span>
                        <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>{conflict.name}</p>
                        
                        {conflict.id === "conflict-1" ? (
                          <p className={`italic leading-relaxed ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                            "Users must rotate passwords every <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">90 days</span>."
                          </p>
                        ) : (
                          <p className={`italic leading-relaxed ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                            "No inbound public TCP ingress on ports <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">3306 or 5432</span>."
                          </p>
                        )}
                      </div>
                    </Card>

                    <Card key={`${conflict.id}-B`} className={`p-5 rounded-xl border flex flex-col justify-between ${
                      themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                    }`}>
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-500 font-bold">Policy B ({conflict.policyB})</span>
                        <p className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>{conflict.name}</p>
                        
                        {conflict.id === "conflict-1" ? (
                          <p className={`italic leading-relaxed ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                            "Cardholder data systems must rotate passwords every <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">30 days</span>."
                          </p>
                        ) : (
                          <p className={`italic leading-relaxed ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                            "Database listeners may bind to public addresses under <span className="bg-red-500/20 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold animate-pulse">secondary approval</span>."
                          </p>
                        )}
                      </div>
                    </Card>
                  </>
                ))}
              </div>

              {/* Resolution Verdict card */}
              {mockConflictsList.filter(c => c.id === selectedConflictId).map(conflict => (
                <div key={`${conflict.id}-verdict`} className={`p-5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  themeMode === "light" ? "bg-cyan-50/50 border-cyan-200" : "bg-cyan-500/10 border-cyan-500/20"
                }`}>
                  <div>
                    <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider block">Precedence Arbitrator Winner Decision</span>
                    <p className={`font-semibold text-sm mt-1.5 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>Winner: {conflict.policyB}</p>
                    <p className={`mt-1 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                      Reasoning Basis: Specificity overrides general datacenter access parameters. (Scope: {conflict.scope})
                    </p>
                  </div>
                  <div className="text-center font-mono pl-5 border-l border-border/40 shrink-0">
                    <span className="text-[10px] text-slate-500">Confidence</span>
                    <span className={`block font-black text-lg mt-0.5 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>96%</span>
                  </div>
                </div>
              ))}
            </Card>

            {/* Policy Mesh Network & Keystone analysis */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] lg:col-span-2 transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                <GitBranch className="w-5 h-5 text-cyan-400" /> Interactive mesh network graph
              </h4>
              <p className={`text-xs md:text-sm leading-relaxed mb-6 ${themeMode === "light" ? "text-slate-600" : "text-slate-400"}`}>
                Click on any node in the policy mesh to query its specific active obligations.
              </p>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* SVG node graph */}
                <div className={`flex-1 border rounded-xl p-4 flex items-center justify-center min-h-[250px] ${
                  themeMode === "light" ? "bg-slate-100/50 border-slate-200" : "bg-black/30 border-white/5"
                }`}>
                  <svg className="w-full max-w-lg h-60" viewBox="0 0 500 240">
                    <g stroke={themeMode === "light" ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.08)"}>
                      <line x1="100" y1="50" x2="250" y2="50" strokeWidth="4" />
                      <line x1="250" y1="50" x2="400" y2="50" strokeWidth="2" />
                      <line x1="100" y1="50" x2="250" y2="180" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="250" y1="180" x2="400" y2="50" strokeWidth="3" />
                    </g>
                    {/* regular nodes */}
                    <circle cx="100" cy="50" r="8" fill="#a6e3a1" className="cursor-pointer hover:scale-125 transition-transform" onClick={() => setSelectedGraphNode("Encryption")} />
                    <circle cx="400" cy="50" r="8" fill="#3b82f6" className="cursor-pointer hover:scale-125 transition-transform" onClick={() => setSelectedGraphNode("Cloud")} />
                    <circle cx="250" cy="180" r="10" fill="#f9cc24" className="cursor-pointer hover:scale-125 transition-transform" onClick={() => setSelectedGraphNode("Access Control")} />
                    {/* Glowing Purple Keystone Star */}
                    <g className="cursor-pointer" onClick={() => { setSelectedGraphNode("Password"); setSelectedKeystoneNode("password"); }}>
                      <circle cx="250" cy="50" r="14" fill="#a855f7" className="animate-pulse" />
                      <text x="244" y="54" fill="white" fontSize="12" fontWeight="bold">★</text>
                    </g>
                    {/* Node labels */}
                    <g fill={themeMode === "light" ? "rgba(15,23,42,0.8)" : "rgba(255,255,255,0.6)"} fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                      <text x="75" y="32" className="cursor-pointer" onClick={() => setSelectedGraphNode("Encryption")}>Encryption</text>
                      <text x="235" y="28" className="cursor-pointer" onClick={() => { setSelectedGraphNode("Password"); setSelectedKeystoneNode("password"); }}>⭐ Password</text>
                      <text x="385" y="32" className="cursor-pointer" onClick={() => setSelectedGraphNode("Cloud")}>Cloud</text>
                      <text x="225" y="206" className="cursor-pointer" onClick={() => setSelectedGraphNode("Access Control")}>Access Control</text>
                    </g>
                  </svg>
                </div>

                {/* Level 1: Click nodes to see obligations panel details */}
                <div className="w-full lg:w-80 space-y-4">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest font-bold">Policy Node Obligations</span>
                  <Card className={`border p-5 rounded-xl space-y-4 text-xs ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/5 border-white/5 text-slate-400"
                  }`}>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Selected Policy Node</span>
                      <p className={`font-semibold text-sm ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                        {selectedGraphNode} Policy
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Active Obligations List</span>
                      {selectedGraphNode === "Password" && (
                        <div className={`p-2.5 rounded border ${themeMode === "light" ? "bg-white border-slate-200" : "bg-black/30 border-white/5"} font-mono text-[10px]`}>
                          <p className="font-bold text-cyan-500">OBL-001</p>
                          <p className="mt-1">"All employees must utilize complex passwords of minimum 14 characters."</p>
                        </div>
                      )}
                      {selectedGraphNode === "Encryption" && (
                        <div className={`p-2.5 rounded border ${themeMode === "light" ? "bg-white border-slate-200" : "bg-black/30 border-white/5"} font-mono text-[10px]`}>
                          <p className="font-bold text-cyan-500">OBL-003</p>
                          <p className="mt-1">"Financial records may be archived for up to 7 years in secure cold storage."</p>
                        </div>
                      )}
                      {selectedGraphNode === "Cloud" && (
                        <div className={`p-2.5 rounded border ${themeMode === "light" ? "bg-white border-slate-200" : "bg-black/30 border-white/5"} font-mono text-[10px]`}>
                          <p className="font-bold text-cyan-500">OBL-002</p>
                          <p className="mt-1">"Do not expose database ports (3306, 5432) to public ingress networks."</p>
                        </div>
                      )}
                      {selectedGraphNode === "Access Control" && (
                        <div className={`p-2.5 rounded border ${themeMode === "light" ? "bg-white border-slate-200" : "bg-black/30 border-white/5"} font-mono text-[10px]`}>
                          <p className="font-bold text-cyan-500">OBL-004</p>
                          <p className="mt-1">"Enforce multi-factor authentication (MFA) for all VPN remote connections."</p>
                        </div>
                      )}
                    </div>

                    {/* Keystone Centrality check */}
                    {selectedGraphNode === "Password" && (
                      <div className={`pt-3.5 border-t ${themeMode === "light" ? "border-slate-200" : "border-white/10"}`}>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">Centrality Risk stats</span>
                        <div className="grid grid-cols-2 gap-2 text-center my-1.5">
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-white border border-slate-200" : "bg-black/40"}`}>
                            <span className="text-[9px] text-slate-500 block">Links</span>
                            <strong className={themeMode === "light" ? "text-slate-800 text-sm" : "text-white text-sm"}>8 active</strong>
                          </div>
                          <div className={`p-2 rounded ${themeMode === "light" ? "bg-white border border-slate-200" : "bg-black/40"}`}>
                            <span className="text-[9px] text-slate-500 block">Importance</span>
                            <strong className={themeMode === "light" ? "text-slate-800 text-sm" : "text-white text-sm"}>98%</strong>
                          </div>
                        </div>
                        <p className="font-bold text-[#ff6b6b] mt-1 animate-pulse">Very High Impact Keystone Node</p>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </Card>

            {/* Level 2: Policy changes impact analysis */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 transition-all duration-300 border lg:col-span-2 ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div className="space-y-2">
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <Zap className="w-5 h-5 text-cyan-400" /> Policy changes impact analysis
                </h4>
                <p className={`text-xs md:text-sm leading-relaxed ${themeMode === "light" ? "text-slate-650" : "text-slate-400"}`}>
                  Select a policy to simulate downstream affected dependencies before publishing updates.
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={impactSelectedPolicy}
                    onChange={(e) => setImpactSelectedPolicy(e.target.value)}
                    className={`flex-1 p-2.5 rounded-xl text-xs border cursor-pointer ${
                      themeMode === "light" ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"
                    }`}
                  >
                    <option value="Global-Password-Standard-v3.md">Global-Password-Standard-v3.md</option>
                    <option value="PCI-DSS-Firewall-Blueprint.pdf">PCI-DSS-Firewall-Blueprint.pdf</option>
                    <option value="Disaster-Recovery-Standard-v2.md">Disaster-Recovery-Standard-v2.md</option>
                  </select>
                  <Button size="sm" className="h-10 cursor-pointer px-4" onClick={() => {
                    setNotifications(prev => [
                      { id: Date.now(), text: `Impact analysis loaded for ${impactSelectedPolicy}`, time: "Just now", type: "info" },
                      ...prev
                    ]);
                  }}>Simulate Update Impact</Button>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-bold block">Downstream Affected Policies</span>
                  
                  {impactSelectedPolicy === "Global-Password-Standard-v3.md" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className={`p-3.5 rounded-lg border ${themeMode === "light" ? "bg-red-50/50 border-red-200 text-red-800" : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
                        <strong>Acceptable Use Policy v3.2:</strong> High Impact (Password Length overlap)
                      </div>
                      <div className={`p-3.5 rounded-lg border ${themeMode === "light" ? "bg-amber-50/50 border-amber-200 text-amber-800" : "bg-amber-500/5 border-amber-500/20 text-amber-400"}`}>
                        <strong>Access Control Specification:</strong> Medium Impact (MFA requirements correlation)
                      </div>
                    </div>
                  )}

                  {impactSelectedPolicy === "PCI-DSS-Firewall-Blueprint.pdf" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className={`p-3.5 rounded-lg border ${themeMode === "light" ? "bg-red-50/50 border-red-200 text-red-800" : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
                        <strong>AWS Cloud Security Ingress Rules:</strong> High Impact (Overlap in restricted DB ports)
                      </div>
                    </div>
                  )}

                  {impactSelectedPolicy === "Disaster-Recovery-Standard-v2.md" && (
                    <div className={`p-4 rounded-lg border text-xs text-center ${
                      themeMode === "light" ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-white/5 border-white/5 text-slate-400"
                    }`}>
                      No downstream policy dependencies identified for this document.
                    </div>
                  )}
                </div>
              </div>
            </Card>

          </div>
        )}

        {/* TAB 4: AUDIT, RECS & LIFE CYCLE LOOKUPS */}
        {activeTab === "audit" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
            
            {/* Score Gauges & health charts */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                <TrendingUp className="w-5 h-5 text-cyan-400" /> Health Dashboard
              </h4>
              
              <div className="space-y-4">
                {[
                  { name: "HR Policy directive", val: 95 },
                  { name: "Cloud Ingress specifications", val: 74 },
                  { name: "Legal compliance checklists", val: 91 }
                ].map((dept) => (
                  <div key={dept.name} className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>{dept.name}</span>
                      <span className="font-bold text-white">{dept.val}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${dept.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Regulatory compliance checklists */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[350px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div>
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <Lock className="w-5 h-5 text-cyan-400" /> Compliance mapping checklist
                </h4>
                <div className="grid grid-cols-1 gap-3 text-xs text-slate-400">
                  {[
                    { name: "ISO 27001 standard controls", status: "Compliant" },
                    { name: "NIST 800-53 Access mappings", status: "Compliant" },
                    { name: "EU-GDPR Privacy guidelines", status: "Partial Gaps Flagged" }
                  ].map((framework, idx) => (
                    <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{framework.name}</p>
                        <span className="text-[9px] text-slate-500">Mapping complete</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                        framework.status === "Compliant" ? "bg-[#a6e3a1]/10 text-[#a6e3a1]" : "bg-[#f9cc24]/10 text-[#f9cc24]"
                      }`}>{framework.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* AI Recommendations resolutions */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] lg:col-span-2 transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" /> Suggested patches & consolidation
              </h4>
              <div className="space-y-4">
                {recsList.map((rec) => (
                  <div key={rec.id} className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs text-slate-400 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-cyan-400">{rec.id}</span>
                      <span className="text-[10px] text-slate-500">{rec.policyA} vs {rec.policyB}</span>
                    </div>
                    <p className="text-white italic">"{rec.conflict}"</p>
                    <div className="p-3 bg-black/40 rounded border border-cyan-500/10 text-slate-200">
                      <strong className="text-cyan-400 block mb-1">Patch Proposal:</strong>
                      {rec.suggestion}
                    </div>
                    <div className="flex justify-end gap-2.5">
                      <Button size="sm" variant="outline" className="h-8 text-xs cursor-pointer" onClick={() => setRecsList(list => list.filter(l => l.id !== rec.id))}>Reject</Button>
                      <Button size="sm" className="h-8 text-xs cursor-pointer" onClick={() => setRecsList(list => list.filter(l => l.id !== rec.id))}>Approve & Merge</Button>
                    </div>
                  </div>
                ))}
                {recsList.length === 0 && (
                  <p className="text-center text-slate-500 py-6">All recommended policy resolutions merged.</p>
                )}
              </div>
            </Card>

            {/* ATLAS master Command dashboard cockpit */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] lg:col-span-2 transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                <Terminal className="w-5 h-5 text-cyan-400" /> ATLAS Master command deck cockpit
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Health metric</span>
                  <strong className="text-white text-2xl mt-1">92%</strong>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Central Keystone index</span>
                  <strong className="text-white text-2xl mt-1">0.98</strong>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Active policies</span>
                  <strong className="text-white text-2xl mt-1">32 documents</strong>
                </div>
              </div>
            </Card>

            {/* L14 chatbot card removed from here to reduce crowdedness and placed as a global floating widget */}

            {/* Employee View lifecycle checks */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[400px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div>
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <User className="w-5 h-5 text-cyan-400" /> Employee Lifecycle lookup portal
                </h4>
                <p className="text-xs text-slate-400 leading-normal mb-6">
                  Check if standard procedures are safe to follow or if they are overridden by compliance directives.
                </p>

                <form onSubmit={handleEmployeeSearch} className="flex gap-2 mb-4">
                  <Input
                    placeholder="Enter standard name (e.g. Password or Cloud)..."
                    value={employeePortalSearch}
                    onChange={(e) => setEmployeePortalSearch(e.target.value)}
                    className="text-xs bg-black/40 border-white/10"
                  />
                  <Button type="submit" size="sm" className="h-9 cursor-pointer">Lookup</Button>
                </form>
              </div>

              {employeePortalResult && (
                <Card className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3 animate-[zoom-in-95_0.2s_ease-out] text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Standard</span>
                    <p className="font-semibold text-white mt-0.5">{employeePortalResult.policy}</p>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded border border-white/5 font-bold text-slate-200">
                    {employeePortalResult.verdict}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Reason / directive</span>
                    <p className="text-slate-400 italic font-medium leading-relaxed">"{employeePortalResult.reason}"</p>
                  </div>
                </Card>
              )}
            </Card>

            {/* Version Diff Analysis */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] lg:col-span-2 transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                    <GitBranch className="w-5 h-5 text-cyan-400" /> Version diff analysis
                  </h4>
                  <p className={`text-xs md:text-sm mt-1.5 ${themeMode === "light" ? "text-slate-650" : "text-slate-400"}`}>
                    Compare policy drafts to detect introduced conflicts before commit.
                  </p>
                </div>
                <select
                  value={selectedDiffVersion}
                  onChange={(e) => setSelectedDiffVersion(e.target.value)}
                  className={`p-2 rounded-xl text-xs border cursor-pointer ${
                    themeMode === "light" ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"
                  }`}
                >
                  <option value="v3.2_vs_v4.0">Acceptable Use Policy (v3.2 vs v4.0 Draft)</option>
                  <option value="v1.0_vs_v2.0">Database Access Policy (v1.0 vs v2.0 Draft)</option>
                </select>
              </div>

              {selectedDiffVersion === "v3.2_vs_v4.0" ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl font-mono text-[10px] space-y-1.5 border ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-350"
                  }`}>
                    <p className="text-slate-500">// Acceptable Use Policy clause diff comparison</p>
                    <p className="text-red-400 bg-red-500/10 px-1.5 rounded">- Clause 3.4.1: Users must rotate passwords every 90 days.</p>
                    <p className="text-green-450 bg-green-500/10 px-1.5 rounded">+ Clause 3.4.1: Users must rotate complex passwords every 30 days to align with PCI-DSS.</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-xs ${
                    themeMode === "light" ? "bg-green-50 border-green-200 text-green-800" : "bg-green-500/10 border-green-500/20 text-green-400"
                  }`}>
                    <strong>Conflict Status Check:</strong> Redundancy Resolved. This revision harmonizes rotation guidelines and removes 1 active conflict!
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl font-mono text-[10px] space-y-1.5 border ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-350"
                  }`}>
                    <p className="text-slate-500">// Database Access Policy clause diff comparison</p>
                    <p className="text-red-400 bg-red-500/10 px-1.5 rounded">- Clause 1.2: Default database listener ports may bind under secondary sign-off.</p>
                    <p className="text-green-455 bg-green-500/10 px-1.5 rounded">+ Clause 1.2: Public bounds are permitted for staging cluster endpoints.</p>
                  </div>
                  <div className={`p-3 rounded-lg border text-xs ${
                    themeMode === "light" ? "bg-red-50 border-red-200 text-red-800" : "bg-red-500/10 border-red-500/20 text-red-450 animate-pulse"
                  }`}>
                    <strong>🔴 Warning:</strong> This draft introduces a new critical overlap with AWS Ingress rules restriction!
                  </div>
                </div>
              )}
            </Card>

            {/* Policy Coverage Grid */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 min-h-[350px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                <Shield className="w-5 h-5 text-cyan-400" /> Policy coverage analysis
              </h4>
              <p className={`text-xs md:text-sm leading-relaxed mb-6 ${themeMode === "light" ? "text-slate-650" : "text-slate-400"}`}>
                Tracks organizational compliance topics and highlights security control coverage gaps.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { topic: "Identity & Authentication", status: "Full Coverage", color: "bg-green-500/10 text-green-500 border-green-500/20" },
                  { topic: "Network Access Bounds", status: "Partial Coverage", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
                  { topic: "Cryptographic Keys", status: "No Coverage! 🔴", color: "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse font-bold" },
                  { topic: "Incident Response plan", status: "Full Coverage", color: "bg-green-500/10 text-green-500 border-green-500/20" },
                  { topic: "Workplace Safety & Ops", status: "No Coverage! 🔴", color: "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse font-bold" },
                  { topic: "Physical Facility Controls", status: "Full Coverage", color: "bg-green-500/10 text-green-500 border-green-500/20" },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border flex flex-col justify-between min-h-[75px] ${
                    themeMode === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5"
                  }`}>
                    <span className={`font-semibold ${themeMode === "light" ? "text-slate-800" : "text-white"}`}>{item.topic}</span>
                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded border self-start mt-2 ${item.color}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* System reports generation & export */}
            <Card className={`backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col justify-between min-h-[400px] transition-all duration-300 border ${
              themeMode === "light" ? "bg-white border-slate-200 text-slate-900 shadow-slate-200/40" : "bg-slate-900/60 border-white/10 text-white shadow-black/40"
            }`}>
              <div>
                <h4 className={`font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>
                  <Download className="w-5 h-5 text-cyan-400" /> System reports generation
                </h4>
                <p className={`text-xs md:text-sm leading-relaxed mb-6 ${themeMode === "light" ? "text-slate-655" : "text-slate-400"}`}>
                  Configure output templates and export policy debt findings.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 cursor-pointer border-slate-350 hover:bg-slate-100" 
                    onClick={() => {
                      generateReport();
                      const csvContent = "data:text/csv;charset=utf-8,ID,Conflict Name,Policy A,Policy B,Verdict,Confidence\nCONF-001,Password Rotation,Acceptable Use Policy,PCI-DSS Credentials standard,Policy B wins specificity,96%\nCONF-002,Database Ingress ports,AWS Cloud Ingress guidelines,Database Credentials rules,AWS rules win specificity,95%\n";
                      const link = document.createElement("a");
                      link.setAttribute("href", encodeURI(csvContent));
                      link.setAttribute("download", "concord_audit_findings.csv");
                      document.body.appendChild(link);
                      link.click();
                    }} 
                    disabled={reportState === "generating"}
                  >
                    Export Excel
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white" 
                    onClick={() => {
                      generateReport();
                      const pdfContent = "data:text/plain;charset=utf-8,CONCORD POLICY RESOLUTION AUDIT REPORT\nGenerated 2026-07-12\n\n1. ACTIVE CONFLICTS:\n- Password Rotation Conflict between Acceptable Use Policy v3.2 and PCI-DSS Credentials Standard\n- Cloud Port Exposure Conflict between AWS Cloud Security and Global Database Policy\n\n2. VERDICTS RESOLVED: 12 active conflicts resolved successfully.";
                      const link = document.createElement("a");
                      link.setAttribute("href", encodeURI(pdfContent));
                      link.setAttribute("download", "concord_audit_report.txt");
                      document.body.appendChild(link);
                      link.click();
                    }} 
                    disabled={reportState === "generating"}
                  >
                    Export PDF
                  </Button>
                </div>

                {reportState === "generating" && (
                  <div className="space-y-2 animate-pulse text-left text-[10px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Exporting document blocks...</span>
                      <span>{reportProgress}%</span>
                    </div>
                    <Progress value={reportProgress} className="h-1 bg-slate-800" />
                  </div>
                )}

                {reportState === "done" && (
                  <div className="p-3 bg-[#a6e3a1]/10 border border-[#a6e3a1]/20 text-[#a6e3a1] rounded-xl text-xs text-center animate-pulse">
                    ✓ Export complete. Attachment downloading in background...
                  </div>
                )}
              </div>
            </Card>

          </div>
        )}

      </main>

      {/* Floating ECHO Chatbot FAB */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <button
          onClick={() => setIsEchoOpen(!isEchoOpen)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer border border-cyan-400/30"
        >
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md group-hover:blur-lg transition-all" />
          {isEchoOpen ? <X className="w-6 h-6 relative z-10" /> : <Sparkles className="w-6 h-6 relative z-10 animate-pulse text-cyan-200" />}
        </button>
      </div>

      {/* Floating ECHO Chat Window */}
      {isEchoOpen && (
        <Card className={`fixed bottom-24 right-6 w-96 max-h-[500px] h-[450px] z-[60] backdrop-blur-2xl rounded-2xl p-5 flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom-5 duration-300 border ${
          themeMode === "light" 
            ? "bg-white border-slate-200 text-slate-900 shadow-[0_10px_40px_rgba(15,23,42,0.15)]" 
            : "bg-slate-950/95 border-white/10 text-white shadow-[0_10px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.15)]"
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className={`font-display font-bold text-sm ${themeMode === "light" ? "text-slate-900" : "text-white"}`}>ECHO Assistant</h4>
            </div>
            <button
              onClick={() => setIsEchoOpen(false)}
              className="text-slate-400 hover:text-slate-250 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[9px] py-2 border-b border-border/40 overflow-x-auto whitespace-nowrap scrollbar-none">
            <span className="text-slate-500 self-center">Suggestions:</span>
            <button className={`px-2 py-0.5 rounded-full border text-cyan-500 cursor-pointer hover:bg-cyan-500/5 ${
              themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
            }`} onClick={() => sendEchoQuestion("Which policy overrides Password Policy?")}>Which policy overrides Password Policy?</button>
            <button className={`px-2 py-0.5 rounded-full border text-cyan-500 cursor-pointer hover:bg-cyan-500/5 ${
              themeMode === "light" ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/5"
            }`} onClick={() => sendEchoQuestion("Show all stale policies")}>Show all stale policies</button>
          </div>

          <div className={`flex-1 my-3 border rounded-xl p-3 overflow-y-auto space-y-3 font-mono text-[10px] ${
            themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-black/40 border-white/10 text-slate-400"
          }`}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`p-2 rounded-lg border ${
                msg.sender === "concord" 
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-slate-200" 
                  : themeMode === "light"
                    ? "bg-slate-200 border-slate-300 ml-auto max-w-[85%]"
                    : "bg-slate-800/40 border-white/5 ml-auto max-w-[85%]"
              }`}>
                <p className="font-bold text-[8px] text-cyan-500 dark:text-cyan-400 uppercase mb-1">{msg.sender === "concord" ? "CONCORD" : "User"}</p>
                <p>{msg.text}</p>
                {msg.details && <p className="text-[9px] text-slate-550 mt-1 border-t border-border/40 pt-1">{msg.details}</p>}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-border/40">
            <Input
              placeholder="Ask ECHO a query..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className={`flex-1 text-[11px] h-8 focus-visible:ring-cyan-500 ${
                themeMode === "light" ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-black/40 border-white/10 text-white"
              }`}
            />
            <Button type="submit" size="sm" className="h-8 w-8 p-0 cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </Card>
      )}

      {/* Footer */}
      <footer className={`border-t py-8 text-center text-[10px] mt-12 relative z-30 transition-colors duration-300 ${
        themeMode === "light" ? "border-slate-200 bg-slate-100 text-slate-500" : "border-white/10 bg-black/40 text-slate-550"
      }`}>
        <div className="container">
          <p>© 2026 CONCORD — Precedence & Graph Intelligence Hub.</p>
        </div>
      </footer>
    </div>
  );
}
