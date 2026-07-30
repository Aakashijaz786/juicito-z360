import { NextRequest, NextResponse } from "next/server";
import { updateOrder, deleteOrder } from "@/lib/data";
import { ensureDispatchReceipt } from "@/lib/receipt-service";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: OrderStatus[] = [
  "pending_payment",
  "new",
  "preparing",
  "dispatched",
  "cancelled",
];

// PUT /api/orders/:id — edit order (status and/or address)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!ALLOWED.includes(body.status)) {
        return NextResponse.json(
          { success: false, message: `Invalid status: ${body.status}` },
          { status: 400 }
        );
      }
      patch.status = body.status;
    }
    if (body.address !== undefined) {
      const addr = String(body.address).trim();
      if (!addr) {
        return NextResponse.json(
          { success: false, message: "Address cannot be empty." },
          { status: 400 }
        );
      }
      patch.address = addr;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, message: "Nothing to update." },
        { status: 400 }
      );
    }

    let order = await updateOrder(params.id, patch);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }
    // Generate the delivery receipt PDF if this edit dispatched the order.
    order = await ensureDispatchReceipt(order);
    return NextResponse.json({ success: true, order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/orders/:id — remove an order
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = await deleteOrder(params.id);
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
