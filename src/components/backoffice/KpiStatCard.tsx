import React from "react";

interface KpiStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: {
    label: string;
    variant?: "success" | "warning" | "neutral" | "danger" | "accent";
  };
}

const badgeVariants = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  neutral: "bg-muted/10 text-muted border-border/50",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  accent: "bg-accent/10 text-accent border-accent/20",
};

export function KpiStatCard({ title, value, subtitle, icon, badge }: KpiStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{value}</span>
            {badge && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  badgeVariants[badge.variant ?? "neutral"]
                }`}
              >
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-muted/80">{subtitle}</p>}
        </div>

        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/15">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
