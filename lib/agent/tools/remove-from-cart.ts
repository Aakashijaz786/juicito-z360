import type { MenuItem, ToolResult } from "@/lib/types";
import { findMenuItem, type WorkingState } from "./shared";

export function removeFromCart(
  menu: MenuItem[],
  state: WorkingState,
  itemName: string
): ToolResult {
  const item = findMenuItem(menu, itemName);
  if (!item) {
    return { success: false, message: `Item not found on menu: ${itemName}` };
  }

  const before = state.cart.length;
  state.cart = state.cart.filter((ci) => ci.menu_item_id !== item.id);
  const removed = before - state.cart.length;

  if (removed <= 0) {
    return { success: false, message: `${item.name} is not in the cart.` };
  }
  return { success: true, message: `Success: Removed ${item.name} from cart.` };
}
