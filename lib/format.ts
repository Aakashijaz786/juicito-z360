// Pricing / formatting helpers. Prices live in the DB as rupees; internally we
// convert to integer cents to avoid float bugs — identical to the Python menu.py.

import type { MenuItem } from "./types";

export function priceToCents(price: number): number {
  return Math.round(price * 100);
}

export function itemPriceCents(item: MenuItem): number {
  return priceToCents(item.price);
}

/** Mirror of actions.get_cart_details total_formatted logic. */
export function formatTotal(totalCents: number, currency: string): string {
  const amount = (totalCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency.toUpperCase() === "USD") return `$${amount}`;
  return `${amount} ${currency}`;
}

/** normalize a string for fuzzy name matching (Python _norm). */
export function norm(s: string): string {
  return (s || "").trim().toLowerCase().split(/\s+/).join(" ");
}

// ─── Chat image messages ────────────────────────────────
// Payment screenshots are stored in the chat history as a marker + URL so they
// can be re-rendered as images when the conversation is restored.
export const IMAGE_MARKER = "[[img]]";
export const MENU_IMAGE_MARKER = "[[menu]]";

export function imageMessage(url: string): string {
  return `${IMAGE_MARKER}${url}`;
}

export function isImageMessage(content: string): boolean {
  return typeof content === "string" && content.startsWith(IMAGE_MARKER);
}

export function imageUrlFromMessage(content: string): string {
  return content.slice(IMAGE_MARKER.length);
}

// ─── Client-side currency (cents → "Rs. 1,234") ─────────
export function rupees(cents: number): string {
  return "Rs. " + Math.round((cents || 0) / 100).toLocaleString("en-US");
}
