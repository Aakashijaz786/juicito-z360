import type { ToolResult } from "@/lib/types";
import type { WorkingState } from "./shared";

export function setPaymentMethod(
  state: WorkingState,
  method: "online" | "cash"
): ToolResult {
  if (method !== "online" && method !== "cash") {
    return { success: false, message: "Invalid payment method. Use 'online' or 'cash'." };
  }
  state.payment_method = method;
  return {
    success: true,
    message: `Payment method set to ${method === "cash" ? "Cash on delivery" : "Online (EasyPaisa/JazzCash)"}.`,
  };
}
