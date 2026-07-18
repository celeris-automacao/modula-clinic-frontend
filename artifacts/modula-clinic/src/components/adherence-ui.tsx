import { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp, Minus, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// BR-061: faixas oficiais do Radar
// 🟢 70–100 Boa adesão | 🟡 40–69 Atenção | 🔴 0–39 Alto risco

export function RiskBadge({ level }: { level: string }) {
  const prevLevel = useRef(level);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (prevLevel.current !== level) {
      prevLevel.current = level;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [level]);

  const pulseClass = pulse ? "motion-safe:animate-risk-pulse" : "";

  // BR-061: labels oficiais DOC-003
  if (level === "high")
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_4px_14px_0_rgba(225,29,72,0.35)]", pulseClass)}>
        <AlertTriangle className="w-3.5 h-3.5" /> Alto Risco
      </span>
    );
  if (level === "medium")
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-[0_4px_14px_0_rgba(251,191,36,0.35)]", pulseClass)}>
        <AlertCircle className="w-3.5 h-3.5" /> Atenção
      </span>
    );
  if (level === "low")
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-[0_4px_14px_0_rgba(52,211,153,0.35)]", pulseClass)}>
        <CheckCircle2 className="w-3.5 h-3.5" /> Boa Adesão
      </span>
    );
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] uppercase tracking-wider font-bold border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500">
      Sem Risco
    </span>
  );
}

export function TrendIcon({ trend, className }: { trend: string, className?: string }) {
  if (trend === "improving") return <TrendingUp className={cn("text-emerald-500 drop-shadow-sm", className)} />;
  if (trend === "declining") return <TrendingDown className={cn("text-rose-500 drop-shadow-sm", className)} />;
  if (trend === "stable") return <Minus className={cn("text-sky-500", className)} />;
  return <Minus className={cn("text-muted-foreground", className)} />;
}

export function RadarScore({ score, size = "md" }: { score: number, size?: "sm" | "md" | "lg" | "xl" }) {
  // BR-061: ≥70 boa adesão (verde), 40–69 atenção (âmbar), <40 alto risco (vermelho)
  const isGood    = score >= 70;
  const isWarning = score >= 40 && score < 70;
  const isDanger  = score < 40;

  return (
    <div className={cn(
      "font-extrabold tabular-nums tracking-tighter",
      isGood    && "bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400",
      isWarning && "bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-400",
      isDanger  && "bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-red-500",
      size === "sm" && "text-lg",
      size === "md" && "text-2xl",
      size === "lg" && "text-4xl",
      size === "xl" && "text-5xl",
    )}>
      {score.toFixed(0)}
      <span className={cn(
        "text-slate-400 font-bold ml-0.5 tracking-normal",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-xl",
        size === "xl" && "text-2xl",
      )}>
        %
      </span>
    </div>
  );
}
