import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";

import { agentGraph, messageText } from "@/lib/agent/graph";
import { getCartDetails } from "@/lib/agent/tools";
import { isImageMessage, MENU_IMAGE_MARKER } from "@/lib/format";
import {
  loadMenu,
  loadSession,
  saveSession,
  loadRecentMessages,
  appendMessage,
} from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENU_IMAGE_TOKEN = "[SEND_MENU_IMAGE]";

export async function POST(req: NextRequest) {
  let body: { user_id?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = (body.user_id || "").trim();
  const text = (body.message || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  try {
    const [menu, session, history] = await Promise.all([
      loadMenu(),
      loadSession(userId),
      loadRecentMessages(userId, 30),
    ]);

    const historyMessages: BaseMessage[] = history.map((m) => {
      // Image messages (payment screenshots / menu) become plain notes for the LLM.
      const content = isImageMessage(m.content)
        ? "[Sent a payment screenshot]"
        : m.content.startsWith(MENU_IMAGE_MARKER)
        ? m.content.slice(MENU_IMAGE_MARKER.length) || "Here's our menu!"
        : m.content;
      return m.role === "assistant"
        ? new AIMessage(content)
        : new HumanMessage(content);
    });

    const result = await agentGraph.invoke({
      messages: [...historyMessages, new HumanMessage(text)],
      user_id: userId,
      menu,
      cart: session.cart,
      address: session.address,
      customer_name: session.customer_name,
      customer_phone: session.customer_phone,
      payment_method: session.payment_method,
      order_id: session.order_id,
    });

    // Final assistant text = last AI message content.
    let reply = "";
    for (let i = result.messages.length - 1; i >= 0; i--) {
      const m = result.messages[i];
      if (m instanceof AIMessage || m.getType?.() === "ai") {
        reply = messageText(m);
        break;
      }
    }

    const showMenuImage = reply.includes(MENU_IMAGE_TOKEN);
    if (showMenuImage) {
      reply = reply.split(MENU_IMAGE_TOKEN).join("").trim();
      if (!reply) reply = "Here's our menu!";
    }

    // Persist conversation + session.
    // Menu image replies are stored with a marker so they re-render on session restore.
    await appendMessage(userId, "user", text);
    await appendMessage(userId, "assistant", showMenuImage ? `${MENU_IMAGE_MARKER}${reply}` : reply);
    await saveSession(userId, {
      cart: result.cart,
      address: result.address,
      customer_name: result.customer_name,
      customer_phone: result.customer_phone,
      payment_method: result.payment_method ?? null,
      order_id: result.order_id ?? null,
    });

    const cartDetails = getCartDetails(menu, {
      cart: result.cart,
      address: result.address,
      customer_name: result.customer_name,
      customer_phone: result.customer_phone,
      order_id: result.order_id ?? null,
      payment_method: result.payment_method ?? null,
    });

    return NextResponse.json({
      reply,
      menu_image: showMenuImage,
      cart: cartDetails,
      address: result.address,
      order_id: result.order_id ?? null,
      payment_method: result.payment_method ?? null,
      phase: result.phase,
    });
  } catch (err) {
    console.error("[/api/chat] error:", err);
    const message =
      err instanceof Error
        ? err.message
        : (err as any)?.message ?? JSON.stringify(err) ?? "Unknown error";
    return NextResponse.json(
      { error: `Agent error: ${message}` },
      { status: 500 }
    );
  }
}
