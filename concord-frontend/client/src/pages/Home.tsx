import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Zap, Bell, Settings as SettingsIcon, X, Send, Sparkles, Database, Shield, BookOpen,
  CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";

import { IngestTab } from "../components/IngestTab";
import { BicameralTab } from "../components/BicameralTab";
import { MeshTab } from "../components/MeshTab";
import { AuditTab } from "../components/AuditTab";

// ─── Toast Notification System ──────────────────────────────────────────────
interface Toast {
  id: number;
  text: string;
  type: "success" | "warning" | "info";
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl text-xs font-medium max-w-sm animate-in slide-in-from-bottom-5 duration-300 ${
            t.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : t.type === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
            : "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
          }`}
        >
          {t.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {t.type === "warning" && <AlertCircle className="w-4 h-4 shrink-0" />}
          {t.type === "info" && <Sparkles className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{t.text}</span>
          <button className="cursor-pointer ml-1 opacity-60 hover:opacity-100" onClick={() => onDismiss(t.id)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Static constants outside component to prevent re-creation ────────────────
const STATS_DATA = [
  { label: "Policies", val: 30, icon: BookOpen },
  { label: "Obligations", val: 343, icon: Database },
  { label: "AI Findings", val: 851, icon: Shield },
  { label: "Keystones", val: 6, icon: Sparkles },
];

const STARTUP_STEPS = [
  "Initializing CONCORD Mesh Environment...",
  "L0: Ingesting raw document streams...",
  "L1: Extracting structured obligation definitions...",
  "L2: Generating SVD embeddings and semantic categories...",
  "L3: Evaluating candidate search space nodes...",
  "L4: Launching Bicameral Dual-Engine decision models...",
  "L6: Aligning precedence resolving graphs...",
  "L8/L9: Building central keystone mapping indexes...",
  "System fully synchronized. Initializing command panels.",
];

export default function Home() {
  // ── Startup ─────────────────────────────────────────────────────────────
  const [showStartup, setShowStartup] = useState(true);
  const [startupStep, setStartupStep] = useState(0);
  const [startupLogs, setStartupLogs] = useState<string[]>([]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"ingest" | "bicameral" | "mesh" | "audit">("ingest");
  const [tabAnimKey, setTabAnimKey] = useState(0);

  // ── UI State ─────────────────────────────────────────────────────────────
  const [isEchoOpen, setIsEchoOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // ── Settings ─────────────────────────────────────────────────────────────
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);
  const [apiKey, setApiKey] = useState<string>("••••••••••••••••");
  const [orgDetails, setOrgDetails] = useState<string>("CONCORD Global Corp");

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([
    { id: 1, text: "L4 Conflict detected between Password policies", time: "2 min ago", type: "warning" },
    { id: 2, text: "L7 Staleness check marked 4 policies deprecated", time: "1 hour ago", type: "info" },
    { id: 3, text: "L10 Health Report generated successfully", time: "3 hours ago", type: "success" },
  ]);

  // ── API Data ─────────────────────────────────────────────────────────────
  const [apiObligations, setApiObligations] = useState<any[]>([]);
  const [apiConflicts, setApiConflicts] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── ECHO Chat ─────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "concord"; text: string; details?: string }>>([
    { sender: "concord", text: "Welcome to ECHO Assistant. Ask me anything about the parsed policy hierarchy." }
  ]);
  const [chatInput, setChatInput] = useState("");

  // ─── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const html = document.documentElement;
    if (themeMode === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
    } else {
      html.classList.remove("light");
      html.classList.add("dark");
    }
  }, [themeMode]);

  // ─── Startup animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!showStartup) return;
    const interval = setInterval(() => {
      setStartupStep((prev) => {
        if (prev >= STARTUP_STEPS.length - 1) {
          clearInterval(interval);
          setTimeout(() => setShowStartup(false), 800);
          return prev;
        }
        setStartupLogs((logs) => [...logs, STARTUP_STEPS[prev]]);
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [showStartup]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K → open ECHO
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsEchoOpen(prev => !prev);
      }
      // Number keys 1-4 → switch tabs (only when not in input)
      if (!["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        if (e.key === "1") switchTab("ingest");
        if (e.key === "2") switchTab("bicameral");
        if (e.key === "3") switchTab("mesh");
        if (e.key === "4") switchTab("audit");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Toast system ─────────────────────────────────────────────────────────
  const addToast = useCallback((text: string, type: "success" | "warning" | "info" = "info") => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, text, type }]);
    // Add to notifications panel too
    setNotifications(prev => [{ id, text, time: "Just now", type }, ...prev]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [obsRes, findsRes, graphRes] = await Promise.all([
        fetch("/api/obligations?limit=2000"),
        fetch("/api/findings?limit=2000"),
        fetch("/api/graph"),
      ]);

      if (!obsRes.ok || !findsRes.ok) throw new Error("API responded with an error");

      const obsData = await obsRes.json();
      const findsData = await findsRes.json();
      setApiObligations(obsData.data || []);
      setApiConflicts(findsData.data || []);

      if (graphRes.ok) {
        const gData = await graphRes.json();
        if (gData?.nodes && gData?.edges) {
          setGraphData({
            nodes: gData.nodes,
            links: gData.edges.map((e: any) => ({ ...e, source: e.source, target: e.target }))
          });
        }
      }
    } catch (e) {
      setFetchError("Could not load data from the CONCORD API. Is the server running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Tab switching (with animation ─────────────────────────────────────────
  const switchTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setTabAnimKey(k => k + 1);
  };

  // ─── ECHO Chat ────────────────────────────────────────────────────────────
  const sendEchoQuestion = async (question: string) => {
    setChatMessages(prev => [...prev, { sender: "user", text: question }]);
    try {
      const res = await fetch("/api/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: "concord", text: data.answer, details: data.details }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: "concord", text: "Error connecting to ECHO backend.", details: "API endpoint unavailable." }]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendEchoQuestion(chatInput);
    setChatInput("");
  };

  const TABS = [
    { id: "ingest", label: "Ingest & Extract", shortcut: "1" },
    { id: "bicameral", label: "Bicameral Analytics", shortcut: "2" },
    { id: "mesh", label: "Precedence & Mesh", shortcut: "3" },
    { id: "audit", label: "Audit & Portals", shortcut: "4" },
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans pb-12 selection:bg-primary selection:text-primary-foreground transition-colors duration-300 bg-background text-foreground">

      {/* Background ambient glow (theme-aware) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] bg-pink-500/3 dark:bg-pink-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ─── Cinematic Startup ───────────────────────────────────────────────── */}
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
                <p key={idx} className="animate-in fade-in duration-300">&gt; {log}</p>
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

      {/* ─── Top Navigation ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between transition-colors duration-300 backdrop-blur-xl bg-background/80 border-border text-foreground">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-black text-base tracking-wide text-foreground">CONCORD</h1>
            <p className="text-[9px] text-cyan-500 tracking-widest font-mono uppercase">Precedence & Graph Intelligence</p>
          </div>
        </div>

        {/* Nav Tabs — desktop */}
        <div className="hidden md:flex items-center justify-center p-1 border rounded-full gap-1 bg-muted border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id as any)}
              title={`Press ${tab.shortcut}`}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-3">
          {/* Echo shortcut hint */}
          <span className="hidden md:inline-block text-[9px] text-muted-foreground font-mono border border-border rounded px-1.5 py-0.5">⌘K</span>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative bg-muted border border-border hover:bg-secondary"
            >
              <Bell className="w-4 h-4 text-foreground" />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background" />}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 border rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-xl bg-card border-border text-card-foreground">
                <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                  <span className="text-xs font-bold">System Notifications</span>
                  <button className="text-[10px] text-cyan-500 hover:underline cursor-pointer" onClick={() => setNotifications([])}>Clear All</button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>
                  ) : notifications.map((n) => (
                    <div key={n.id} className="text-xs p-2.5 rounded-lg border flex gap-2 bg-muted/50 border-border">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.type === "warning" ? "bg-red-500" : n.type === "success" ? "bg-emerald-500" : "bg-cyan-400"}`} />
                      <div>
                        <p className="font-medium leading-tight text-foreground">{n.text}</p>
                        <span className="text-[9px] text-muted-foreground mt-1 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer bg-muted border border-border hover:bg-secondary"
          >
            <SettingsIcon className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-xl border-border flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id as any)}
            className={`flex-1 py-3 text-[10px] font-semibold cursor-pointer transition-all ${activeTab === tab.id ? "text-cyan-500 border-t-2 border-cyan-500" : "text-muted-foreground"}`}
          >
            {tab.label.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* ─── Hero Section ─────────────────────────────────────────────────────── */}
      <section className="relative py-16 overflow-hidden text-center z-10">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className="font-display text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight text-foreground">
            Your policies,
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-pink-400 bg-clip-text text-transparent">understood.</span>
          </h2>
          <p className="text-sm md:text-base max-w-3xl mx-auto leading-relaxed text-muted-foreground">
            Trust-weighted conflict detection. Centrality-aware impact analysis. Precedence-resolved decisions.
          </p>
        </div>
      </section>

      {/* ─── Global Status Bar ────────────────────────────────────────────────── */}
      <section className="container max-w-6xl mx-auto mt-2 px-6">
        <div className="border rounded-2xl p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm transition-colors duration-300 bg-card border-border text-card-foreground">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full border-4 border-cyan-400/20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-cyan-400 animate-spin" />
              <span className="font-display font-extrabold text-lg text-foreground">92%</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Organization Health Score</h3>
              <p className="text-xs mt-0.5 text-muted-foreground">Based on active policy redundancies and conflicts</p>
            </div>
          </div>
          <div className="flex gap-4 lg:gap-8 text-xs font-mono">
            {[
              { label: "Conflicts", val: "12", color: "text-foreground" },
              { label: "Stale", val: "4", color: "text-amber-500" },
              { label: "Redundant", val: "9", color: "text-cyan-500" },
              { label: "Critical", val: "3", color: "text-red-500" },
            ].map(s => (
              <div key={s.label} className="px-3 py-1.5 rounded-lg border text-center min-w-[90px] bg-muted border-border">
                <p className="text-muted-foreground uppercase text-[9px]">{s.label}</p>
                <p className={`font-bold text-sm mt-0.5 ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quick Stats ──────────────────────────────────────────────────────── */}
      <section className="container max-w-6xl mx-auto mt-6 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS_DATA.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="border rounded-xl p-4 flex items-center justify-between backdrop-blur-xl group transition-all duration-300 bg-card border-border hover:border-cyan-400/60 shadow-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-black mt-1 font-mono tracking-tight text-foreground">{stat.val}</p>
                </div>
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Settings Drawer ──────────────────────────────────────────────────── */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <Card className="fixed top-0 right-0 h-full w-80 z-[100] shadow-2xl flex flex-col justify-between p-6 border-l animate-in slide-in-from-right duration-300 bg-card border-border text-card-foreground">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-base text-foreground">Settings</h3>
                </div>
                <button className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setShowSettings(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground/80">Confidence Threshold: {confidenceThreshold}%</Label>
                <Slider value={[confidenceThreshold]} onValueChange={(val) => setConfidenceThreshold(val[0])} max={100} step={5} className="py-2" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground/80" htmlFor="api-key">LLM Credentials Token</Label>
                <Input id="api-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="h-9 text-xs bg-input border-border text-foreground" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground/80" htmlFor="org-details">Organization Identifier</Label>
                <Input id="org-details" type="text" value={orgDetails} onChange={(e) => setOrgDetails(e.target.value)} className="h-9 text-xs bg-input border-border text-foreground" />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs text-foreground/80">Active Theme Mode</Label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setThemeMode("dark")}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${themeMode === "dark" ? "bg-cyan-600 border-cyan-400 text-white" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}
                  >🌙 Dark</button>
                  <button
                    onClick={() => setThemeMode("light")}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${themeMode === "light" ? "bg-slate-200 border-slate-400 text-slate-800" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}
                  >☀️ Light</button>
                </div>
                <p className="text-[9px] text-muted-foreground">Keyboard shortcuts: 1-4 = tabs, ⌘K = ECHO</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal">Changes applied instantly to the interface state.</p>
          </Card>
        </>
      )}

      {/* ─── Main Content Tabs ────────────────────────────────────────────────── */}
      <main className="container max-w-6xl mx-auto mt-8 px-6 mb-16 md:mb-0">
        {/* Tab fade-in animation */}
        <div key={tabAnimKey} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeTab === "ingest" && (
            <IngestTab
              apiObligations={apiObligations}
              isLoading={isLoading}
              fetchError={fetchError}
              onFetchRetry={fetchData}
              onUploadComplete={fetchData}
              addToast={addToast}
            />
          )}
          {activeTab === "bicameral" && (
            <BicameralTab
              isLoading={isLoading}
              fetchError={fetchError}
              onFetchRetry={fetchData}
              addToast={addToast}
            />
          )}
          {activeTab === "mesh" && (
            <MeshTab
              graphData={graphData}
              apiConflicts={apiConflicts}
              isLoading={isLoading}
              fetchError={fetchError}
              onFetchRetry={fetchData}
              addToast={addToast}
            />
          )}
          {activeTab === "audit" && (
            <AuditTab
              apiConflicts={apiConflicts}
              isLoading={isLoading}
              fetchError={fetchError}
              onFetchRetry={fetchData}
              addToast={addToast}
            />
          )}
        </div>
      </main>

      {/* ─── Floating ECHO FAB ────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[60] md:bottom-6">
        <button
          onClick={() => setIsEchoOpen(!isEchoOpen)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer border border-cyan-400/30"
          title="Open ECHO (⌘K)"
        >
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md group-hover:blur-lg transition-all" />
          {isEchoOpen ? <X className="w-6 h-6 relative z-10" /> : <Sparkles className="w-6 h-6 relative z-10 animate-pulse text-cyan-200" />}
        </button>
      </div>

      {/* ─── ECHO Chat Window ─────────────────────────────────────────────────── */}
      {isEchoOpen && (
        <Card className="fixed bottom-24 right-6 w-96 max-h-[500px] h-[450px] z-[60] backdrop-blur-2xl rounded-2xl p-5 flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom-5 duration-300 border bg-card border-border text-card-foreground shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="font-display font-bold text-sm text-foreground">ECHO Assistant</h4>
              <span className="text-[9px] text-muted-foreground font-mono border border-border rounded px-1.5 py-0.5">⌘K</span>
            </div>
            <button onClick={() => setIsEchoOpen(false)} className="text-muted-foreground hover:text-foreground transition cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[9px] py-2 border-b border-border/40 overflow-x-auto">
            <span className="text-muted-foreground self-center">Suggestions:</span>
            {[
              "Which policy overrides Password Policy?",
              "Show all stale policies",
              "Any active conflicts?",
              "Threat coverage gaps?"
            ].map(q => (
              <button key={q} onClick={() => sendEchoQuestion(q)} className="px-2 py-0.5 rounded-full border text-cyan-500 cursor-pointer hover:bg-cyan-500/5 bg-muted border-border whitespace-nowrap">{q}</button>
            ))}
          </div>

          <div className="flex-1 my-3 border rounded-xl p-3 overflow-y-auto space-y-3 font-sans text-[11.5px] leading-relaxed bg-muted/50 border-border text-foreground">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`p-2.5 rounded-lg border ${msg.sender === "concord" ? "bg-cyan-500/10 border-cyan-500/20 text-foreground" : "bg-secondary border-border ml-auto max-w-[85%]"}`}>
                <p className="font-bold text-[9px] tracking-wider text-cyan-500 dark:text-cyan-400 uppercase mb-1">{msg.sender === "concord" ? "CONCORD" : "You"}</p>
                <p>{msg.text}</p>
                {msg.details && <p className="text-[10px] text-muted-foreground mt-2 border-t border-border/40 pt-2 leading-relaxed">{msg.details}</p>}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-border/40">
            <Input
              placeholder="Ask ECHO a query..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 text-[11px] h-8 bg-input border-border text-foreground focus-visible:ring-cyan-500"
            />
            <Button type="submit" size="sm" className="h-8 w-8 p-0 cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </Card>
      )}

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t py-8 text-center text-[10px] mt-12 relative z-30 transition-colors duration-300 border-border bg-muted text-muted-foreground">
        <div className="container">
          <p>© 2026 CONCORD — Precedence & Graph Intelligence Hub. Press <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[9px]">⌘K</kbd> for ECHO.</p>
        </div>
      </footer>
    </div>
  );
}
