import type { CartDetails, MenuItem } from "@/lib/types";
import { getCurrency } from "@/lib/data";
import { formatTotal, itemPriceCents } from "@/lib/format";
import { findMenuItem, type WorkingState } from "./shared";

export function getCartDetails(
  menu: MenuItem[],
  state: WorkingState
): CartDetails {
  const currency = getCurrency();
  const items = [];
  let totalCents = 0;

  for (const ci of state.cart) {
    const it = findMenuItem(menu, ci.menu_item_id);
    if (!it) continue;
    const unit = itemPriceCents(it);
    const lineTotal = unit * ci.quantity;
    totalCents += lineTotal;
    items.push({
      id: it.id,
      name: it.name,
      quantity: ci.quantity,
      notes: ci.notes,
      unit_price_cents: unit,
      line_total_cents: lineTotal,
    });
  }

  return {
    success: true,
    currency,
    address: state.address,
    customer_name: state.customer_name,
    customer_phone: state.customer_phone,
    items,
    total_cents: totalCents,
    total_formatted: formatTotal(totalCents, currency),
  };
}
