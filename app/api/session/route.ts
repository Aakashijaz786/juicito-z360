import { NextRequest, NextResponse } from "next/server";
import { getCartDetails } from "@/lib/agent/tools";
import { derivePhase } from "@/lib/agent/state";
import {
  loadMenu,
  loadSession,
  loadRecentMessages,
  getLatestOrder,
} from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/session?user_id=... — restore chat history + cart for a returning user
export async function GET(req: NextRequest) {
  const userId = (req.nextUrl.searchParams.get("user_id") || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  try {
    const [menu, session, messages, lastOrder] = await Promise.all([
      loadMenu(),
      loadSession(userId),
      loadRecentMessages(userId, 50),
      getLatestOrder(userId),
    ]);

    const cart = getCartDetails(menu, {
      cart: session.cart,
      address: session.address,
      customer_name: session.customer_name,
      customer_phone: session.customer_phone,
      order_id: null,
    });

    const phase = derivePhase(
      session.cart,
      session.address,
      lastOrder && session.cart.length === 0 ? lastOrder.id : null
    );

    return NextResponse.json({
      messages,
      cart,
      address: session.address,
      phase,
      last_order: lastOrder
        ? {
            id: lastOrder.id,
            status: lastOrder.status,
            payment_screenshot: lastOrder.payment_screenshot,
          }
        : null,
    });
  } catch (err) {
    console.error("[/api/session] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
