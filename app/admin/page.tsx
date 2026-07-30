"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Boxes,
  TrendingUp,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { SalesChart } from "@/components/admin/sales-chart";
import { OrderActions } from "@/components/admin/order-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/format";
import { analyzePeriod, availableYears } from "@/lib/analytics";
import type { Order } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "secondary" | "destructive"> =
  {
    pending_payment: "secondary",
    new: "warning",
    preparing: "info",
    dispatched: "success",
    cancelled: "destructive",
  };

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(now.getMonth()); // null = whole year

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?include_archived=true");
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const period = useMemo(() => analyzePeriod(orders, year, month), [orders, year, month]);
  const years = useMemo(() => availableYears(orders, now.getFullYear()), [orders, now]);

  const pendingNow = orders.filter((o) => o.status === "pending_payment").length;
  const allTimeRevenue = orders
    .filter((o) => ["new", "preparing", "dispatched"].includes(o.status))
    .reduce((s, o) => s + o.total_cents, 0);
  const recent = orders.slice(0, 7);

  const periodLabel = month === null ? `${year}` : `${MONTHS[month]} ${year}`;
  const isDefault = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{periodLabel}</span> · live
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={month === null ? "all" : month}
            onChange={(e) => setMonth(e.target.value === "all" ? null : Number(e.target.value))}
          >
            <option value="all">All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth());
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Period KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={`Revenue · ${periodLabel}`}
          value={rupees(period.revenue_cents)}
          sub="Paid orders"
          accent="orange"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Orders"
          value={String(period.orders_count)}
          sub="In this period"
          accent="green"
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatCard
          label="Avg Order Value"
          value={rupees(period.avg_cents)}
          sub="Per paid order"
          accent="blue"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Items Sold"
          value={String(period.items_sold)}
          sub="Units in period"
          accent="purple"
          icon={<Boxes className="h-4 w-4" />}
        />
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Pending Payment"
          value={String(pendingNow)}
          sub="Awaiting proof (now)"
          accent="amber"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Total Revenue"
          value={rupees(allTimeRevenue)}
          sub="All time (paid)"
          accent="green"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Total Orders"
          value={String(orders.length)}
          sub="All statuses"
          accent="slate"
          icon={<ShoppingBag className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart data={period.series} title={`Revenue — ${periodLabel}`} />
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Top Items · {periodLabel}</h3>
          </div>
          {period.top_items.length > 0 ? (
            <ul className="space-y-3">
              {period.top_items.map((it, i) => (
                <li key={it.name} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                      i === 0
                        ? "bg-amber-100 text-amber-700"
                        : i === 1
                        ? "bg-slate-100 text-slate-600"
                        : i === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.quantity} sold</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {rupees(it.revenue_cents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No sales in this period
            </p>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Recent Orders</h3>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-medium text-primary">#{o.id}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {o.customer_name || "—"}
                    </td>
                    <td className="py-2.5 font-semibold">{o.total_formatted}</td>
                    <td className="py-2.5">
                      <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>
                        {o.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end">
                        <OrderActions order={o} onChanged={load} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
