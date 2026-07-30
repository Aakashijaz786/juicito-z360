import type { MenuItem, Order, ToolResult } from "@/lib/types";
import { getCurrency, insertOrder } from "@/lib/data";
import { getCartDetails } from "./get-cart-details";
import type { WorkingState } from "./shared";

function newOrderId(): string {
  // 10-char uppercase hex, matching uuid4().hex[:10].upper() in Python.
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

/**
 * Strict gatekeeper (ported from actions.finalize_order):
 *  - cart must not be empty
 *  - address must be present
 *  - confirmation must be true to place the order
 *
 * On success: insert order into Supabase (status "new" for the Z360 demo —
 * payment screenshot step is skipped) and clear the session cart + address.
 */
export async function finalizeOrder(
  menu: MenuItem[],
  state: WorkingState,
  userId: string,
  confirmation: boolean,
  paymentMethod: "online" | "cash" = "online"
): Promise<ToolResult> {
  if (state.cart.length === 0) {
    return {
      success: false,
      message: "ERROR: Cart is empty. Ask user to add items.",
    };
  }

  const addr = (state.address || "").trim();
  if (!addr) {
    return {
      success: false,
      message: "ERROR: Address is missing. Ask user for address.",
    };
  }

  const name = (state.customer_name || "").trim();
  const phone = (state.customer_phone || "").trim();
  if (!name || !phone) {
    return {
      success: false,
      message:
        "ERROR: Customer name and phone number are missing. Ask the user for their name and phone number, then call set_customer_details.",
    };
  }

  if (!confirmation) {
    return { success: true, status: "pending", message: "Order cancelled/pending." };
  }

  const cart = getCartDetails(menu, state);
  const orderId = newOrderId();

  // Cash orders go directly to `new` (no screenshot needed); online waits for payment proof.
  const orderStatus = paymentMethod === "cash" ? "new" : "pending_payment";

  const order: Order = {
    id: orderId,
    user_id: userId,
    created_at: new Date().toISOString(),
    currency: cart.currency || getCurrency(),
    address: addr,
    customer_name: name,
    customer_phone: phone,
    items: cart.items,
    total_cents: cart.total_cents,
    total_formatted: cart.total_formatted,
    status: orderStatus,
    payment_method: paymentMethod,
    payment_screenshot: null,
  };

  await insertOrder(order);

  // Clear session for the next order.
  state.cart = [];
  state.address = null;
  state.customer_name = null;
  state.customer_phone = null;
  state.order_id = orderId;
  state.payment_method = paymentMethod;

  return {
    success: true,
    status: "placed",
    order_id: orderId,
    payment_method: paymentMethod,
    total_formatted: cart.total_formatted,
    message: `SUCCESS: Order #${orderId} placed. Total: ${cart.total_formatted}. Payment: ${paymentMethod}.`,
  };
}
