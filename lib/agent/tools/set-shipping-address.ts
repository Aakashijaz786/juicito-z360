import type { ToolResult } from "@/lib/types";
import type { WorkingState } from "./shared";

export function setShippingAddress(
  state: WorkingState,
  address: unknown
): ToolResult {
  const addr = String(address ?? "").trim();
  if (!addr) {
    return { success: false, message: "Address cannot be empty." };
  }
  state.address = addr;
  return {
    success: true,
    message: `Success: Shipping address set to: ${addr}`,
  };
}
