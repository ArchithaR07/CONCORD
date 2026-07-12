import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, Lock, Calendar, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrustBadge } from "./TrustBadge";
import { useState } from "react";

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

const radarChartData = [
  { subject: "Rule Signal", value: 90 },
  { subject: "Embedding Sim", value: 85 },
  { subject: "LLM Confidence", value: 92 },
  { subject: "Agreement Bonus", value: 95 },
];

interface BicameralTabProps {
  isLoading?: boolean;
  fetchError?: string | null;
  onFetchRetry?: () => void;
  addToast: (msg: string, type?: "success" | "warning" | "info") => void;
}

export function BicameralTab({ isLoading, fetchError, onFetchRetry, addToast }: BicameralTabProps) {
  const [bicameralAgree, setBicameralAgree] = useState(true);
  const [timelineYear, setTimelineYear] = useState<number>(2026);
  const [schedulerConfigured, setSchedulerConfigured] = useState(false);

  const cardClass = "backdrop-blur-xl rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] p-8 md:p-10 flex flex-col justify-between min-h-[350px] transition-all duration-300 border bg-card border-border text-card-foreground";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">

      {/* Bicameral Bench */}
      <Card className={`${cardClass} lg:col-span-2 min-h-0`}>
        <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-6">
          <div>
            <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5 text-cyan-400" /> Bicameral dual-engine bench
            </h4>
            <p className="text-xs md:text-sm mt-1.5 text-muted-foreground">Compares rigid rule matching with LLM semantic models.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Simulate engine sync:</span>
            <Switch checked={bicameralAgree} onCheckedChange={setBicameralAgree} />
          </div>
        </div>

        {isLoading ? <SkeletonCard lines={2} /> : fetchError ? <ErrorCard message={fetchError} onRetry={onFetchRetry} /> : (
          <>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <Card className="flex-1 border p-5 space-y-3 w-full text-center bg-muted/40 border-border">
                <h5 className="font-semibold text-xs text-foreground">Deterministic Rule Bench</h5>
                <div className="p-3 bg-muted border border-cyan-500/20 rounded-lg font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-bold">
                  Conflict Flagged (Confidence: 95%)
                </div>
              </Card>
              <div className="flex flex-col items-center shrink-0">
                {bicameralAgree ? (
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500 shadow-[0_0_25px_rgba(166,227,161,0.3)] flex items-center justify-center text-[10px] font-black text-emerald-500 animate-pulse">SYNC</div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500 shadow-[0_0_25px_rgba(255,107,107,0.3)] flex items-center justify-center text-[10px] font-black text-red-400 animate-pulse">ESCALATE</div>
                )}
                <span className="text-[9px] text-muted-foreground font-mono mt-2">Bicameral Status</span>
              </div>
              <Card className="flex-1 border p-5 space-y-3 w-full text-center bg-muted/40 border-border">
                <h5 className="font-semibold text-xs text-foreground">Semantic LLM Bench</h5>
                <div className="p-3 bg-muted border border-purple-500/20 rounded-lg font-mono text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                  {bicameralAgree ? "Conflict Flagged (Confidence: 92%)" : "No Conflict Resolved (Confidence: 88%)"}
                </div>
              </Card>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <span className="text-[11px] font-mono text-cyan-500 font-bold uppercase tracking-wider block mb-2">Scope-Aware Conflict Detection Parameters</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg border bg-muted/40 border-border text-foreground"><strong>Department Scope:</strong> Finance vs Card Processing (Overlap: Yes)</div>
                <div className="p-3 rounded-lg border bg-muted/40 border-border text-foreground"><strong>Target System:</strong> AWS Production (Restricted)</div>
                <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"><strong>Resolution:</strong> Conflict applies to specific systems only.</div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Trust Radar */}
      <Card className={cardClass}>
        <div>
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-4 text-foreground">
            <Lock className="w-5 h-5 text-cyan-400" /> Trust reconciliation radar
          </h4>
          <p className="text-xs md:text-sm leading-relaxed mb-6 text-muted-foreground">Reconstructs trust signals using a multi-parameter radar envelope.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                <PolarGrid stroke="currentColor" strokeOpacity={0.12} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", fontSize: 9, opacity: 0.65 }} stroke="transparent" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="none" tick={false} />
                <Radar name="Trust" dataKey="value" stroke="#00f2fe" fill="#00f2fe" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-4 text-xs">
            <div className="p-3 bg-muted border border-border rounded-xl text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Consolidated trust index</p>
              <p className="text-3xl font-black text-foreground font-mono mt-1">92%</p>
              <div className="flex justify-center gap-1.5 mt-2">
                <TrustBadge level="high" size="sm" />
                <TrustBadge level="medium" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Decay Timeline */}
      <Card className={cardClass}>
        <div>
          <h4 className="font-display font-bold text-base md:text-lg flex items-center gap-2 mb-2 text-foreground">
            <Calendar className="w-5 h-5 text-cyan-400" /> Decay timeline
          </h4>
          <p className="text-xs md:text-sm leading-relaxed mb-6 text-muted-foreground">Analyzes date parameters and flags stale procedural documents.</p>
          <div className="flex items-center justify-between p-1 border rounded-xl max-w-xs mx-auto mb-6 bg-muted border-border">
            {[2019, 2021, 2023, 2026].map((year) => (
              <button key={year} onClick={() => setTimelineYear(year)} className={`flex-1 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${timelineYear === year ? "bg-cyan-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {timelineYear === 2019 && (<div className="p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 bg-muted/40 border-border"><div><p className="font-semibold text-foreground">SANS Dial-In Access Guidelines</p><span className="text-[10px] text-muted-foreground">Last Reviewed: August 2019</span></div><TrustBadge level="low" label="Deprecated" /></div>)}
          {timelineYear === 2021 && (<div className="p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 bg-muted/40 border-border"><div><p className="font-semibold text-foreground">Acceptable Use Policy v3.2</p><span className="text-[10px] text-muted-foreground">Last Reviewed: October 2021</span></div><TrustBadge level="medium" label="Stale / Decayed" /></div>)}
          {timelineYear === 2023 && (<div className="p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 bg-muted/40 border-border"><div><p className="font-semibold text-foreground">Access Control Specification</p><span className="text-[10px] text-muted-foreground">Last Reviewed: June 2023</span></div><TrustBadge level="high" label="Active / Valid" /></div>)}
          {timelineYear === 2026 && (<div className="p-3 border rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 bg-muted/40 border-border"><div><p className="font-semibold text-foreground">AWS Cloud Security Ingress rules</p><span className="text-[10px] text-muted-foreground">Last Reviewed: January 2026</span></div><TrustBadge level="high" label="Active / Valid" /></div>)}
        </div>

        <div className="mt-6 pt-4 border-t border-border text-xs">
          <span className="text-[11px] font-mono text-cyan-500 font-bold uppercase tracking-wider block mb-2">Policy Review Scheduler</span>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Auto-Generate Reminders based on Staleness</p>
              <p className="text-[10px] text-muted-foreground">Pushes scheduled notifications when document decay cutoff is crossed.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSchedulerConfigured(!schedulerConfigured);
                addToast("✅ Stale policy review alerts scheduled!", "success");
              }}
              className={`h-9 cursor-pointer font-bold ${schedulerConfigured ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"}`}
            >
              {schedulerConfigured ? "✓ Review Alerts Scheduled" : "Schedule Review Alerts"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
