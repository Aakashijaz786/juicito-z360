import { NextRequest, NextResponse } from "next/server";
import { markOrderDelivered } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/orders/:id/delivered — customer confirms they received the order
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await markOrderDelivered(params.id);
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, order });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
