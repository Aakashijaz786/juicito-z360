import { NextRequest, NextResponse } from "next/server";
import { listOrders } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/orders[?include_archived=true] — list orders (newest first)
export async function GET(req: NextRequest) {
  try {
    const includeArchived =
      req.nextUrl.searchParams.get("include_archived") === "true";
    const orders = await listOrders({ includeArchived });
    return NextResponse.json(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
