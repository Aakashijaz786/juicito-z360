"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Search, Receipt, ExternalLink, CalendarDays, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderActions } from "@/components/admin/order-actions";
import type { Order } from "@/lib/types";

const STATUSES = [
  "all",
  "pending_payment",
  "new",
  "preparing",
  "dispatched",
  "delivered",
  "cancelled",
];

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "secondary" | "destructive"> =
  {
    pending_payment: "secondary",
    new: "warning",
    preparing: "info",
    dispatched: "success",
    delivered: "success",
    cancelled: "destructive",
  };

function toLocalDateValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/orders?include_archived=true")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setOrders(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (dateFilter && toLocalDateValue(o.created_at) !== dateFilter) return false;
      if (!query) return true;
      return (
        o.id.toLowerCase().includes(query) ||
        (o.address || "").toLowerCase().includes(query) ||
        (o.customer_name || "").toLowerCase().includes(query) ||
        (o.customer_phone || "").toLowerCase().includes(query) ||
        o.items.some((it) => it.name.toLowerCase().includes(query))
      );
    });
  }, [orders, q, status, dateFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {orders.length} orders · click a row for details
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by order id, name, phone, item, or address…"
              className="pl-9"
            />
          </div>
          {/* Day picker */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <CalendarDays className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              />
            </div>
            {dateFilter && (
              <Button variant="ghost" size="icon" onClick={() => setDateFilter("")} title="Clear date filter">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
                status === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:border-primary"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Placed</th>
              <th className="px-4 py-3 font-medium">Proof</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No matching orders
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <Fragment key={o.id}>
                  <tr
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setOpen(open === o.id ? null : o.id)}
                  >
                    <td className="px-4 py-3 font-medium text-primary">#{o.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{o.customer_name || "—"}</p>
                      {o.customer_phone && (
                        <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.items.reduce((s, it) => s + it.quantity, 0)} items
                    </td>
                    <td className="px-4 py-3 font-semibold">{o.total_formatted}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>
                        {o.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {o.payment_screenshot ? (
                        <a
                          href={o.payment_screenshot}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-primary underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <OrderActions order={o} onChanged={load} />
                      </div>
                    </td>
                  </tr>
                  {open === o.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Items</p>
                            <ul className="space-y-0.5 text-sm">
                              {o.items.map((it, i) => (
                                <li key={i} className="flex justify-between">
                                  <span>
                                    {it.quantity}× {it.name}
                                    {it.notes ? (
                                      <em className="text-muted-foreground"> ({it.notes})</em>
                                    ) : null}
                                  </span>
                                  <span className="font-medium">
                                    Rs. {Math.round(it.line_total_cents / 100)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="text-sm space-y-1">
                            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Delivery</p>
                            <p>{o.address}</p>
                            <p className="text-xs text-muted-foreground">
                              Customer: <span className="font-medium text-foreground">{o.customer_name || "—"}</span>
                              {o.customer_phone && <span> · {o.customer_phone}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Payment: <span className="font-medium text-foreground capitalize">{o.payment_method || "online"}</span>
                            </p>
                            {o.paid_at && (
                              <p className="text-xs text-muted-foreground">
                                Paid: {new Date(o.paid_at).toLocaleString()}
                              </p>
                            )}
                            {o.cash_collected_at && (
                              <p className="text-xs text-muted-foreground">
                                Cash collected: {new Date(o.cash_collected_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border bg-card py-10 text-center text-muted-foreground shadow-sm">
            <Receipt className="h-8 w-8 opacity-40" />
            No matching orders
          </div>
        ) : (
          filtered.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border bg-card shadow-sm"
              onClick={() => setOpen(open === o.id ? null : o.id)}
            >
              <div className="flex cursor-pointer items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-primary">#{o.id}</span>
                    <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"} className="text-xs">
                      {o.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{o.customer_name || "—"}</p>
                  {o.customer_phone && (
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{o.items.reduce((s, it) => s + it.quantity, 0)} items</span>
                    <span className="font-semibold text-foreground">{o.total_formatted}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {o.payment_screenshot && (
                    <a
                      href={o.payment_screenshot}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-primary underline"
                    >
                      Proof <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div onClick={(e) => e.stopPropagation()}>
                    <OrderActions order={o} onChanged={load} />
                  </div>
                </div>
              </div>
              {open === o.id && (
                <div className="border-t bg-muted/30 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Items</p>
                  <ul className="mb-3 space-y-0.5 text-sm">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.quantity}× {it.name}</span>
                        <span className="font-medium">Rs. {Math.round(it.line_total_cents / 100)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Delivery</p>
                  <p className="text-sm">{o.address}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Payment: {o.payment_method || "online"}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
