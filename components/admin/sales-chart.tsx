"use client";

import { rupees } from "@/lib/format";
import type { SalesPoint } from "@/lib/analytics";

export function SalesChart({
  data,
  title = "Revenue",
}: {
  data: SalesPoint[];
  title?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenue_cents));
  const total = data.reduce((s, d) => s + d.revenue_cents, 0);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">Total {rupees(total)}</span>
      </div>

      <div className="mt-4 flex h-48 items-end gap-1.5">
        {data.map((d) => {
          const pct = d.revenue_cents > 0 ? Math.max((d.revenue_cents / max) * 100, 3) : 0;
          return (
            <div
              key={d.date}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              {/* bar area takes all remaining column height so % resolves correctly */}
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-primary/70 to-primary transition-all group-hover:from-primary group-hover:to-orange-400"
                  style={{ height: `${pct}%` }}
                  title={`${d.label}: ${rupees(d.revenue_cents)} (${d.orders} orders)`}
                />
              </div>
              <span className="whitespace-nowrap text-[9px] text-muted-foreground">
                {d.label.includes(" ") ? d.label.split(" ")[1] : d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
