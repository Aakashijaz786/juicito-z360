import type { ToolResult } from "@/lib/types";
import type { WorkingState } from "./shared";

export function setCustomerDetails(
  state: WorkingState,
  name: unknown,
  phone: unknown
): ToolResult {
  const cleanName = String(name ?? "").trim();
  const cleanPhone = String(phone ?? "").trim();

  if (!cleanName) return { success: false, message: "Customer name cannot be empty." };
  if (!cleanPhone) return { success: false, message: "Phone number cannot be empty." };

  state.customer_name = cleanName;
  state.customer_phone = cleanPhone;
  return {
    success: true,
    message: `Success: Saved customer ${cleanName} (${cleanPhone}).`,
  };
}
