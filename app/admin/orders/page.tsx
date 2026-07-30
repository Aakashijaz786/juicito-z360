"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  ChefHat,
  Truck,
  X,
  Package,
  CheckCircle2,
  CreditCard,
  FileText,
  Eraser,
  Banknote,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Order, OrderStatus } from "@/lib/types";

const TABS: { value: OrderStatus; label: string }[] = [
  { value: "pending_payment", label: "Pending" },
  { value: "new", label: "New" },
  { value: "preparing", label: "Preparing" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
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

function fullTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<OrderStatus>("new");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders");
      setOrders(data);
      setLoaded(true);
    } catch (e) {
      if (!loaded) toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  }, [loaded]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(order: Order, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(`Order #${order.id} → ${status.replace("_", " ")}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
      load();
    }
  }

  async function collectCash(order: Order) {
    try {
      const res = await fetch(`/api/orders/${order.id}/cash-collected`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(`Cash collected for order #${order.id}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function clearCompleted() {
    if (
      !confirm(
        "Clear all dispatched and cancelled orders from the queue?\nThey stay in Order History for your records."
      )
    )
      return;
    try {
      const res = await fetch("/api/orders/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statuses: ["dispatched", "cancelled"] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clear failed");
      toast.success(`Cleared ${data.archived} order(s) from the queue`);
      setTab("new");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    }
  }

  const counts = Object.fromEntries(
    TABS.map((t) => [t.value, orders.filter((o) => o.status === t.value).length])
  ) as Record<string, number>;

  const visible = orders.filter((o) => o.status === tab);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order Queue</h1>
          <p className="text-sm text-muted-foreground">
            Live from the chat agent · auto-refreshing every 3s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearCompleted}>
          <Eraser className="h-4 w-4" /> Clear dispatched &amp; cancelled
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus)}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <Badge variant="secondary" className="ml-1">
                {counts[t.value] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-muted-foreground">
                <Package className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">No {t.label.toLowerCase()} orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-primary">#{order.id}</span>
                        <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                          {order.status.replace("_", " ")}
                        </Badge>
                        {order.payment_method === "cash" ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Banknote className="h-3 w-3" /> Cash
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <CreditCard className="h-3 w-3" /> Online
                          </Badge>
                        )}
                      </div>
                      <span
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                        title={fullTime(order.created_at)}
                      >
                        <Clock className="h-3 w-3" />
                        {timeAgo(order.created_at)}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      {order.items.map((it, i) => (
                        <span key={i} className="rounded-md bg-muted px-2 py-1 text-xs">
                          <strong>{it.quantity}×</strong> {it.name}
                          {it.notes ? (
                            <em className="text-muted-foreground"> ({it.notes})</em>
                          ) : null}
                        </span>
                      ))}
                    </div>

                    {(order.customer_name || order.customer_phone) && (
                      <div className="mb-1 text-sm">
                        <span className="font-medium">{order.customer_name || "Customer"}</span>
                        {order.customer_phone && (
                          <span className="text-muted-foreground"> · {order.customer_phone}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {order.address}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {order.total_formatted}
                      </span>
                    </div>

                    {/* Timeline */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Placed: {fullTime(order.created_at)}</span>
                      {order.paid_at && <span>Paid: {fullTime(order.paid_at)}</span>}
                    </div>

                    {/* Payment proof — online orders only */}
                    {order.payment_method !== "cash" && order.payment_screenshot ? (
                      <div className="mt-3 flex items-center gap-3 rounded-lg border bg-emerald-500/10 p-2">
                        <a
                          href={order.payment_screenshot}
                          target="_blank"
                          rel="noreferrer"
                          title="Open full payment screenshot"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={order.payment_screenshot}
                            alt="Payment proof"
                            className="h-16 w-16 rounded-md border object-cover transition-transform hover:scale-105"
                          />
                        </a>
                        <div className="text-xs">
                          <p className="flex items-center gap-1 font-medium text-emerald-700">
                            <CreditCard className="h-3.5 w-3.5" /> Payment proof received
                          </p>
                          <a
                            href={order.payment_screenshot}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            View full image
                          </a>
                        </div>
                      </div>
                    ) : order.payment_method !== "cash" && order.status === "pending_payment" ? (
                      <p className="mt-3 rounded-lg border border-dashed bg-muted/40 p-2 text-xs text-muted-foreground">
                        Awaiting payment screenshot from customer…
                      </p>
                    ) : null}

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                      {order.status === "pending_payment" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setStatus(order, "cancelled")}
                        >
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      )}
                      {order.status === "new" && (
                        <>
                          <Button size="sm" onClick={() => setStatus(order, "preparing")}>
                            <ChefHat className="h-4 w-4" />
                            {order.payment_method === "cash" ? "Start Preparing" : "Confirm Payment & Start Preparing"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setStatus(order, "cancelled")}
                          >
                            <X className="h-4 w-4" /> Cancel
                          </Button>
                        </>
                      )}
                      {order.status === "preparing" && (
                        <>
                          <Button size="sm" onClick={() => setStatus(order, "dispatched")}>
                            <Truck className="h-4 w-4" /> Mark Dispatched
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setStatus(order, "cancelled")}
                          >
                            <X className="h-4 w-4" /> Cancel
                          </Button>
                        </>
                      )}
                      {order.status === "dispatched" && (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 text-sm text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Out for delivery
                          </span>
                          {order.payment_method === "cash" && (
                            <Button size="sm" onClick={() => collectCash(order)}>
                              <Banknote className="h-4 w-4" /> Mark Cash Collected
                            </Button>
                          )}
                          {order.receipt_url && (
                            <a
                              href={order.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-accent"
                            >
                              <FileText className="h-3.5 w-3.5" /> Delivery Receipt (PDF)
                            </a>
                          )}
                        </div>
                      )}
                      {order.status === "delivered" && (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 text-sm text-emerald-600">
                            <PackageCheck className="h-4 w-4" />
                            {order.cash_collected_at ? "Cash collected · Delivered" : "Delivered"}
                          </span>
                          {order.receipt_url && (
                            <a
                              href={order.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-accent"
                            >
                              <FileText className="h-3.5 w-3.5" /> Delivery Receipt (PDF)
                            </a>
                          )}
                        </div>
                      )}
                      {order.status === "cancelled" && (
                        <span className="text-sm text-muted-foreground">Cancelled</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
