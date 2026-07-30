import type { MenuItem, ToolResult } from "@/lib/types";
import { findMenuItem, type WorkingState } from "./shared";

export function addToCart(
  menu: MenuItem[],
  state: WorkingState,
  itemName: string,
  quantity: unknown,
  notes: unknown
): ToolResult {
  const item = findMenuItem(menu, itemName);
  if (!item) {
    return { success: false, message: `Item not found on menu: ${itemName}` };
  }

  let qty = quantity;
  if (typeof qty !== "number" || !Number.isInteger(qty)) {
    const parsed = parseInt(String(qty), 10);
    if (Number.isNaN(parsed)) {
      return { success: false, message: "Quantity must be a whole number." };
    }
    qty = parsed;
  }
  if ((qty as number) <= 0) {
    return { success: false, message: "Quantity must be >= 1." };
  }

  const cleanNotes = String(notes ?? "").trim();

  if (!item.available) {
    return {
      success: false,
      message: `Item '${item.name}' is currently out of stock.`,
    };
  }

  // Merge by (menu_item_id + notes) so customizations don't collide.
  const existing = state.cart.find(
    (ci) => ci.menu_item_id === item.id && (ci.notes || "") === cleanNotes
  );
  if (existing) {
    existing.quantity += qty as number;
    return {
      success: true,
      message: `Success: Added ${qty} × ${item.name}. Now ${existing.quantity} in cart.`,
    };
  }

  state.cart.push({
    menu_item_id: item.id,
    quantity: qty as number,
    notes: cleanNotes,
  });
  return {
    success: true,
    message: `Success: Added ${qty} × ${item.name} to cart.`,
  };
}
