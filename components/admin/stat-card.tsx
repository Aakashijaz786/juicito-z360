import { cn } from "@/lib/utils";

const ACCENTS: Record<string, string> = {
  orange: "from-orange-500/15 to-orange-500/5 text-orange-600",
  green: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
  blue: "from-blue-500/15 to-blue-500/5 text-blue-600",
  purple: "from-violet-500/15 to-violet-500/5 text-violet-600",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-600",
  slate: "from-slate-500/15 to-slate-500/5 text-slate-600",
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "orange",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: keyof typeof ACCENTS | string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br",
              ACCENTS[accent] ?? ACCENTS.orange
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
