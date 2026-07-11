import { cn } from "@/lib/utils";
import { TrustBadge, type ConfidenceLevel } from "./TrustBadge";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface ReasoningStep {
  title: string;
  description: string;
  verdict?: string;
  confidence?: ConfidenceLevel;
}

interface ReasoningChainProps {
  steps: ReasoningStep[];
  finalDecision: string;
  finalConfidence: ConfidenceLevel;
  className?: string;
}

export function ReasoningChain({
  steps,
  finalDecision,
  finalConfidence,
  className,
}: ReasoningChainProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/50 flex items-center justify-center text-xs font-bold text-accent">
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="w-0.5 h-12 bg-gradient-to-b from-accent/50 to-transparent mt-2" />
            )}
          </div>

          <div className="flex-1 glass-card p-4 rounded-lg">
            <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
            <p className="text-sm text-muted-foreground mb-2">
              {step.description}
            </p>
            {step.verdict && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono bg-background/50 px-2 py-1 rounded text-accent">
                  {step.verdict}
                </span>
                {step.confidence && (
                  <TrustBadge level={step.confidence} size="sm" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center gap-3">
          {finalConfidence === "high" ? (
            <CheckCircle2 className="w-6 h-6 text-confidence-high" />
          ) : (
            <AlertCircle className="w-6 h-6 text-confidence-medium" />
          )}
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">
              Operative Policy Decision
            </p>
            <p className="font-semibold text-foreground">{finalDecision}</p>
          </div>
          <TrustBadge level={finalConfidence} />
        </div>
      </div>
    </div>
  );
}
