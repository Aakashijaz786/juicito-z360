// Pure analytics aggregation over the orders list. No IO — easy to test.
import type { Order } from "./types";

// Orders that represent real (paid) revenue.
const PAID: string[] = ["new", "preparing", "dispatched", "delivered"];

export interface SalesPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Jul 30"
  revenue_cents: number;
  orders: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue_cents: number;
}

export interface Analytics {
  revenue_today_cents: number;
  revenue_week_cents: number;
  revenue_month_cents: number;
  revenue_year_cents: number;
  revenue_total_cents: number;
  orders_total: number;
  orders_paid: number;
  orders_pending: number;
  orders_cancelled: number;
  avg_order_cents: number;
  status_counts: Record<string, number>;
  sales_series: SalesPoint[]; // last 14 days
  top_items: TopItem[];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface PeriodStats {
  revenue_cents: number;
  orders_count: number;
  avg_cents: number;
  items_sold: number;
  series: SalesPoint[];
  top_items: TopItem[];
}

/** Distinct years present in the orders (plus the current year), descending. */
export function availableYears(orders: Order[], currentYear: number): number[] {
  const set = new Set<number>([currentYear]);
  for (const o of orders) set.add(new Date(o.created_at).getFullYear());
  return [...set].sort((a, b) => b - a);
}

/**
 * Aggregate PAID orders for a chosen period.
 * month = null → whole year (series is 12 months); otherwise a single month (series is days).
 */
export function analyzePeriod(
  orders: Order[],
  year: number,
  month: number | null
): PeriodStats {
  const inPeriod = orders.filter((o) => {
    if (!PAID.includes(o.status)) return false;
    const d = new Date(o.created_at);
    if (d.getFullYear() !== year) return false;
    if (month !== null && d.getMonth() !== month) return false;
    return true;
  });

  const revenue_cents = inPeriod.reduce((s, o) => s + (o.total_cents || 0), 0);
  const items_sold = inPeriod.reduce(
    (s, o) => s + o.items.reduce((a, it) => a + it.quantity, 0),
    0
  );

  // Series
  const series: SalesPoint[] = [];
  if (month === null) {
    for (let m = 0; m < 12; m++) {
      series.push({ date: `${year}-${m}`, label: MONTHS[m], revenue_cents: 0, orders: 0 });
    }
    for (const o of inPeriod) {
      const m = new Date(o.created_at).getMonth();
      series[m].revenue_cents += o.total_cents || 0;
      series[m].orders += 1;
    }
  } else {
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      series.push({
        date: `${year}-${month}-${d}`,
        label: `${MONTHS[month]} ${d}`,
        revenue_cents: 0,
        orders: 0,
      });
    }
    for (const o of inPeriod) {
      const d = new Date(o.created_at).getDate();
      series[d - 1].revenue_cents += o.total_cents || 0;
      series[d - 1].orders += 1;
    }
  }

  // Top items
  const itemMap = new Map<string, TopItem>();
  for (const o of inPeriod) {
    for (const it of o.items || []) {
      const cur = itemMap.get(it.name) || { name: it.name, quantity: 0, revenue_cents: 0 };
      cur.quantity += it.quantity;
      cur.revenue_cents += it.line_total_cents;
      itemMap.set(it.name, cur);
    }
  }
  const top_items = [...itemMap.values()]
    .sort((a, b) => b.revenue_cents - a.revenue_cents)
    .slice(0, 6);

  return {
    revenue_cents,
    orders_count: inPeriod.length,
    avg_cents: inPeriod.length ? Math.round(revenue_cents / inPeriod.length) : 0,
    items_sold,
    series,
    top_items,
  };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function computeAnalytics(orders: Order[], now: Date): Analytics {
  const paid = orders.filter((o) => PAID.includes(o.status));

  const today0 = startOfDay(now);
  const week0 = new Date(today0);
  week0.setDate(week0.getDate() - 6); // last 7 days incl today
  const month0 = new Date(now.getFullYear(), now.getMonth(), 1);
  const year0 = new Date(now.getFullYear(), 0, 1);

  const sumFrom = (from: Date) =>
    paid
      .filter((o) => new Date(o.created_at) >= from)
      .reduce((s, o) => s + (o.total_cents || 0), 0);

  const status_counts: Record<string, number> = {};
  for (const o of orders) status_counts[o.status] = (status_counts[o.status] || 0) + 1;

  // 14-day sales series
  const buckets = new Map<string, SalesPoint>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today0);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue_cents: 0,
      orders: 0,
    });
  }
  for (const o of paid) {
    const key = ymd(new Date(o.created_at));
    const b = buckets.get(key);
    if (b) {
      b.revenue_cents += o.total_cents || 0;
      b.orders += 1;
    }
  }

  // Top items across paid orders
  const itemMap = new Map<string, TopItem>();
  for (const o of paid) {
    for (const it of o.items || []) {
      const cur = itemMap.get(it.name) || {
        name: it.name,
        quantity: 0,
        revenue_cents: 0,
      };
      cur.quantity += it.quantity;
      cur.revenue_cents += it.line_total_cents;
      itemMap.set(it.name, cur);
    }
  }
  const top_items = [...itemMap.values()]
    .sort((a, b) => b.revenue_cents - a.revenue_cents)
    .slice(0, 6);

  const revenue_total_cents = paid.reduce((s, o) => s + (o.total_cents || 0), 0);

  return {
    revenue_today_cents: sumFrom(today0),
    revenue_week_cents: sumFrom(week0),
    revenue_month_cents: sumFrom(month0),
    revenue_year_cents: sumFrom(year0),
    revenue_total_cents,
    orders_total: orders.length,
    orders_paid: paid.length,
    orders_pending: status_counts["pending_payment"] || 0,
    orders_cancelled: status_counts["cancelled"] || 0,
    avg_order_cents: paid.length ? Math.round(revenue_total_cents / paid.length) : 0,
    status_counts,
    sales_series: [...buckets.values()],
    top_items,
  };
}
