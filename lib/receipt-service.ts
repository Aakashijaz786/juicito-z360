// Generates and stores a delivery receipt PDF when an order is dispatched.
import type { Order } from "./types";
import { buildReceiptPdf } from "./receipt";
import { uploadReceipt } from "./storage";
import { updateOrder } from "./data";

/**
 * If the order is dispatched and has no receipt yet, build the PDF, upload it to
 * Storage, and persist the URL on the order. Returns the (possibly updated) order.
 * Never throws — receipt generation must not block the status change.
 */
export async function ensureDispatchReceipt(order: Order | null): Promise<Order | null> {
  if (!order || order.status !== "dispatched" || order.receipt_url) return order;

  let url: string;
  try {
    const pdf = await buildReceiptPdf(order);
    url = await uploadReceipt(order.id, Buffer.from(pdf));
  } catch (err) {
    console.error("[receipt] generation/upload failed:", err);
    return order; // status change already succeeded; receipt is best-effort
  }

  // Persist the URL; if the column isn't migrated yet, still return it for display.
  try {
    const updated = await updateOrder(order.id, { receipt_url: url });
    return updated ?? { ...order, receipt_url: url };
  } catch (err) {
    console.error("[receipt] could not persist receipt_url (run migration 002):", err);
    return { ...order, receipt_url: url };
  }
}
