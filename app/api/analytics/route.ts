import { NextResponse } from "next/server";
import { listOrders } from "@/lib/data";
import { computeAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/analytics — dashboard KPIs, sales series, top items, status breakdown
export async function GET() {
  try {
    const orders = await listOrders();
    const analytics = computeAnalytics(orders, new Date());
    return NextResponse.json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
