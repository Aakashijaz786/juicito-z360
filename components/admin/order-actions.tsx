"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Order, OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "pending_payment",
  "new",
  "preparing",
  "dispatched",
  "cancelled",
];

export function OrderActions({
  order,
  onChanged,
}: {
  order: Order;
  onChanged: () => void;
}) {
  const [view, setView] = useState(false);
  const [edit, setEdit] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [address, setAddress] = useState(order.address);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Update failed");
      toast.success(`Order #${order.id} updated`);
      setEdit(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete order #${order.id}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Delete failed");
      toast.success(`Order #${order.id} deleted`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView(true)} title="View">
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          setStatus(order.status);
          setAddress(order.address);
          setEdit(true);
        }}
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:bg-destructive/10"
        onClick={remove}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* View dialog */}
      <Dialog open={view} onOpenChange={setView}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order #{order.id}
              <Badge variant="secondary">{order.status.replace("_", " ")}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Items</p>
              <ul className="space-y-0.5">
                {order.items.map((it, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {it.quantity}× {it.name}
                      {it.notes ? <em className="text-muted-foreground"> ({it.notes})</em> : null}
                    </span>
                    <span className="font-medium">Rs. {Math.round(it.line_total_cents / 100)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span className="text-primary">{order.total_formatted}</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Customer</p>
              <p>{order.customer_name || "—"}{order.customer_phone ? ` · ${order.customer_phone}` : ""}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Delivery</p>
              <p>{order.address}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Channel: {order.user_id}</p>
              <p>Placed: {new Date(order.created_at).toLocaleString()}</p>
              {order.paid_at && <p>Paid: {new Date(order.paid_at).toLocaleString()}</p>}
            </div>
            {order.payment_screenshot && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Payment proof
                </p>
                <a href={order.payment_screenshot} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.payment_screenshot}
                    alt="Payment proof"
                    className="max-h-52 rounded-lg border"
                  />
                </a>
              </div>
            )}
            {order.receipt_url && (
              <a
                href={order.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent"
              >
                <FileText className="h-4 w-4" /> Delivery Receipt (PDF)
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order #{order.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Delivery address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
