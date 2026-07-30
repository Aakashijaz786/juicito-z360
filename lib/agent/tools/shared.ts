// Shared helpers for the agent tools — ported from purewaterbot/actions.py.
import type { CartItem, MenuItem } from "@/lib/types";
import { norm } from "@/lib/format";

/** Mutable working copy of the session that tools operate on during one run. */
export interface WorkingState {
  cart: CartItem[];
  address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  order_id: string | null;
}

export function findMenuItem(
  menu: MenuItem[],
  itemName: string
): MenuItem | null {
  if (!itemName) return null;

  // Exact id match (case-sensitive), then case-insensitive id.
  const byId = menu.find((m) => m.id === itemName);
  if (byId) return byId;
  const lowered = itemName.trim().toLowerCase();
  const byIdLower = menu.find((m) => m.id.toLowerCase() === lowered);
  if (byIdLower) return byIdLower;

  // Normalized, case-insensitive name match.
  const target = norm(itemName);
  const byName = menu.find((m) => norm(m.name) === target);
  return byName ?? null;
}
