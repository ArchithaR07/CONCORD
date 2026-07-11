import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export type ConfidenceLevel = "high" | "medium" | "low";

interface TrustBadgeProps {
  level: ConfidenceLevel;
  label?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const confidenceConfig = {
  high: {
    bg: "bg-confidence-high/20",
    border: "border-confidence-high/50",
    text: "text-confidence-high",
    glow: "shadow-lg shadow-confidence-high/30",
    icon: CheckCircle2,
    label: "HIGH",
    description: "High confidence - rule and LLM agree",
  },
  medium: {
    bg: "bg-confidence-medium/20",
    border: "border-confidence-medium/50",
    text: "text-confidence-medium",
    glow: "shadow-lg shadow-confidence-medium/30",
    icon: AlertCircle,
    label: "MEDIUM",
    description: "Medium confidence - review recommended",
  },
  low: {
    bg: "bg-confidence-low/20",
    border: "border-confidence-low/50",
    text: "text-confidence-low",
    glow: "shadow-lg shadow-confidence-low/30",
    icon: XCircle,
    label: "LOW",
    description: "Low confidence - manual review needed",
  },
};

const sizeConfig = {
  sm: "px-3 py-1 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

export function TrustBadge({
  level,
  label,
  size = "md",
  showIcon = true,
  className,
}: TrustBadgeProps) {
  const config = confidenceConfig[level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold border",
        config.bg,
        config.border,
        config.text,
        config.glow,
        sizeConfig[size],
        className
      )}
      title={config.description}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      <span>{label || config.label}</span>
    </div>
  );
}

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  score?: number;
  className?: string;
}

export function ConfidenceIndicator({
  level,
  score,
  className,
}: ConfidenceIndicatorProps) {
  const config = confidenceConfig[level];
  const scorePercent = score ? Math.round(score * 100) : null;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg",
          config.bg,
          config.border,
          config.text,
          config.glow,
          "border-2 relative"
        )}
      >
        {scorePercent && <span>{scorePercent}%</span>}
      </div>
      <div className="text-center">
        <p className={cn("text-sm font-semibold", config.text)}>
          {config.label}
        </p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
    </div>
  );
}
