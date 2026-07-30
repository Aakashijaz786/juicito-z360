import { NextRequest, NextResponse } from "next/server";
import { archiveOrdersByStatus } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLEARABLE = ["dispatched", "cancelled"];

// POST /api/orders/clear  body: { statuses?: string[] }
// Archives completed orders so the queue stays clean (kept in Order History).
export async function POST(req: NextRequest) {
  try {
    let statuses = CLEARABLE;
    try {
      const body = await req.json();
      if (Array.isArray(body?.statuses) && body.statuses.length) {
        statuses = body.statuses.filter((s: string) => CLEARABLE.includes(s));
      }
    } catch {
      /* no body → default to clearing dispatched + cancelled */
    }

    if (statuses.length === 0) {
      return NextResponse.json(
        { success: false, message: "Only dispatched/cancelled orders can be cleared." },
        { status: 400 }
      );
    }

    const count = await archiveOrdersByStatus(statuses);
    return NextResponse.json({ success: true, archived: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
