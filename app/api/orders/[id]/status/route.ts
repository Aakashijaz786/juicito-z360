import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/data";
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

// PUT /api/orders/:id/status — body: { status }
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const status = String(body.status ?? "") as OrderStatus;
    if (!ALLOWED.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    let order = await updateOrderStatus(params.id, status);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }
    // Generate the delivery receipt PDF when the order is dispatched.
    order = await ensureDispatchReceipt(order);
    return NextResponse.json({ success: true, order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
