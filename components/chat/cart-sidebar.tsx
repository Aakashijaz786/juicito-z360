"use client";

import { useState } from "react";
import { ShoppingCart, MapPin, CheckCircle2, Banknote, CreditCard, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CartDetails } from "@/lib/types";

function rs(cents: number) {
  return "Rs. " + Math.round(cents / 100).toLocaleString("en-US");
}

const PHASE_LABEL: Record<string, string> = {
  greeting: "Greeting",
  ordering: "Taking order",
  address: "Awaiting address",
  summary: "Reviewing order",
  complete: "Order placed",
};

export function CartSidebar({
  cart,
  phase,
  orderId,
  paymentMethod,
}: {
  cart: CartDetails | null;
  phase: string;
  orderId: string | null;
  paymentMethod?: "online" | "cash" | null;
}) {
  const [delivered, setDelivered] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const items = cart?.items ?? [];
  const address = cart?.address ?? null;

  async function handleOrderReceived() {
    if (!orderId || confirming || delivered) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/delivered`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to confirm delivery");
      setDelivered(true);
      toast.success("Thanks for confirming! Enjoy your meal 🍔");
    } catch {
      toast.error("Could not confirm delivery — try again.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <aside className="flex w-full flex-col gap-4 md:w-80">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Live Cart
          </div>
          <Badge variant="secondary">{PHASE_LABEL[phase] ?? phase}</Badge>
        </div>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Cart is empty. Start ordering in the chat →
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {it.quantity} × {it.name}
                  </p>
                  {it.notes ? (
                    <p className="truncate text-xs italic text-muted-foreground">
                      {it.notes}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {rs(it.line_total_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-base font-bold text-primary">
              {cart?.total_formatted}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          Delivery Details
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Name</dt>
            <dd>{cart?.customer_name || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Phone</dt>
            <dd>{cart?.customer_phone || <span className="text-muted-foreground">—</span>}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Address</dt>
            <dd>{address && address.trim() ? address : <span className="text-muted-foreground">Not set yet</span>}</dd>
          </div>
          {paymentMethod && (
            <div className="flex gap-2 pt-1">
              <dt className="w-16 shrink-0 text-muted-foreground">Payment</dt>
              <dd>
                {paymentMethod === "cash" ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Banknote className="h-3 w-3" /> Cash on delivery
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CreditCard className="h-3 w-3" /> Online
                  </Badge>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {orderId && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide">Order placed</p>
              <p className="font-bold">#{orderId}</p>
            </div>
          </div>

          {paymentMethod === "cash" && !delivered && (
            <Button
              size="sm"
              variant="outline"
              className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              onClick={handleOrderReceived}
              disabled={confirming}
            >
              <PackageCheck className="h-4 w-4" />
              {confirming ? "Confirming…" : "I received my order"}
            </Button>
          )}

          {delivered && (
            <p className="flex items-center gap-1 text-xs font-medium">
              <PackageCheck className="h-4 w-4" /> Delivery confirmed — enjoy your meal!
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
