import { ReasoningChain } from "./ReasoningChain";
import { Card } from "./ui/card";
import { type ConfidenceLevel } from "./TrustBadge";

interface PrecedenceCardProps {
  policyA: string;
  policyB: string;
  resolution: string;
  reasoningChain: string[];
  precedenceBasis: string;
  confidence: ConfidenceLevel;
}

export function PrecedenceCard({
  policyA,
  policyB,
  resolution,
  reasoningChain,
  precedenceBasis,
  confidence,
}: PrecedenceCardProps) {
  const steps = reasoningChain.map((step, idx) => ({
    title: `Step ${idx + 1}`,
    description: step,
  }));

  return (
    <Card className="p-6 bg-slate-900/60 border-white/10 text-white shadow-black/40 backdrop-blur-xl">
      <div className="mb-4">
        <h4 className="font-display font-bold text-lg mb-1">Precedence Resolution</h4>
        <p className="text-sm text-slate-400">
          Conflict between <strong>{policyA}</strong> and <strong>{policyB}</strong>
        </p>
        <p className="text-xs text-cyan-400 mt-1 uppercase tracking-wider font-semibold">
          Basis: {precedenceBasis}
        </p>
      </div>

      <ReasoningChain
        steps={steps}
        finalDecision={resolution}
        finalConfidence={confidence}
      />
    </Card>
  );
}
