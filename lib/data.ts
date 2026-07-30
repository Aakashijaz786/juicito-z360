// Supabase data-access helpers (menu / sessions / orders / messages).
import { getSupabaseAdmin } from "./supabase/server";
import type { CartItem, MenuItem, Order } from "./types";

const CURRENCY = "PKR";

export function getCurrency() {
  return CURRENCY;
}

// ─── Menu ───────────────────────────────────────────────
export async function loadMenu(): Promise<MenuItem[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("menu").select("*").order("category");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    price: Number(row.price),
    category: String(row.category ?? "General"),
    available: Boolean(row.available ?? true),
    description: String(row.description ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
  }));
}

// ─── Sessions ───────────────────────────────────────────
export interface SessionState {
  cart: CartItem[];
  address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
}

export async function loadSession(userId: string): Promise<SessionState> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("sessions")
    .select("cart, address, customer_name, customer_phone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { cart: [], address: null, customer_name: null, customer_phone: null };
  return {
    cart: Array.isArray(data.cart) ? (data.cart as CartItem[]) : [],
    address: (data.address as string | null) ?? null,
    customer_name: (data.customer_name as string | null) ?? null,
    customer_phone: (data.customer_phone as string | null) ?? null,
  };
}

export async function saveSession(
  userId: string,
  state: SessionState
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("sessions").upsert(
    {
      user_id: userId,
      cart: state.cart,
      address: state.address,
      customer_name: state.customer_name,
      customer_phone: state.customer_phone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// ─── Messages (chat history) ────────────────────────────
export interface StoredMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function loadRecentMessages(
  userId: string,
  limit = 30
): Promise<StoredMessage[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({
    role: r.role as StoredMessage["role"],
    content: String(r.content),
  }));
  return rows.reverse(); // oldest first
}

export async function appendMessage(
  userId: string,
  role: StoredMessage["role"],
  content: string
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("messages")
    .insert({ user_id: userId, role, content });
  if (error) throw error;
}

// ─── Orders ─────────────────────────────────────────────
export async function insertOrder(order: Order): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("orders").insert(order);
  if (error) throw error;
}

export async function listOrders(
  opts: { includeArchived?: boolean } = {}
): Promise<Order[]> {
  const sb = getSupabaseAdmin();
  let query = sb.from("orders").select("*").order("created_at", { ascending: false });
  if (!opts.includeArchived) query = query.neq("archived", true);
  const { data, error } = await query;
  if (error) {
    // `archived` column not migrated yet — fall back to an unfiltered list.
    if (/archived/i.test(error.message)) {
      const res = await sb
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as Order[];
    }
    throw error;
  }
  return (data ?? []) as Order[];
}

/** Archive all orders currently in the given statuses (drops them from the queue). */
export async function archiveOrdersByStatus(statuses: string[]): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .update({ archived: true })
    .in("status", statuses)
    .eq("archived", false)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<Order | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

/** Update arbitrary editable fields on an order (status, address). */
export async function updateOrder(
  orderId: string,
  patch: Record<string, unknown>
): Promise<Order | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

/** Delete an order permanently. Returns true if a row was removed. */
export async function deleteOrder(orderId: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .delete()
    .eq("id", orderId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Most recent order for a user in a given status (default: pending_payment). */
export async function findLatestOrderByStatus(
  userId: string,
  status = "pending_payment"
): Promise<Order | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

/** Most recent order for a user, any status. */
export async function getLatestOrder(userId: string): Promise<Order | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

/** Attach a payment screenshot URL and move the order to `new` (awaiting admin). */
export async function attachPaymentScreenshot(
  orderId: string,
  url: string
): Promise<Order | null> {
  const sb = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // Prefer to stamp paid_at; gracefully fall back if the column isn't present.
  let res = await sb
    .from("orders")
    .update({ payment_screenshot: url, status: "new", paid_at: nowIso })
    .eq("id", orderId)
    .select("*")
    .maybeSingle();

  if (res.error && /paid_at/i.test(res.error.message)) {
    res = await sb
      .from("orders")
      .update({ payment_screenshot: url, status: "new" })
      .eq("id", orderId)
      .select("*")
      .maybeSingle();
  }

  if (res.error) throw res.error;
  return (res.data as Order) ?? null;
}
