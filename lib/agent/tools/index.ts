// Tool registry: OpenAI-format schemas (for LLM binding) + a dispatch function
// that executes a tool call against the working session state.
import type { CartDetails, MenuItem, ToolResult } from "@/lib/types";
import type { WorkingState } from "./shared";
import { addToCart } from "./add-to-cart";
import { removeFromCart } from "./remove-from-cart";
import { getCartDetails } from "./get-cart-details";
import { setShippingAddress } from "./set-shipping-address";
import { setCustomerDetails } from "./set-customer-details";
import { setPaymentMethod } from "./set-payment-method";
import { finalizeOrder } from "./finalize-order";

export {
  addToCart,
  removeFromCart,
  getCartDetails,
  setShippingAddress,
  setCustomerDetails,
  setPaymentMethod,
  finalizeOrder,
};
export type { WorkingState } from "./shared";

/** OpenAI-format tool definitions — bound to the model in the agent node. */
export const TOOL_SPECS = [
  {
    type: "function" as const,
    function: {
      name: "add_to_cart",
      description: "Adds a specific item to the user's current session cart.",
      parameters: {
        type: "object",
        properties: {
          item_name: {
            type: "string",
            description:
              "Exact item name or item id from the AVAILABLE MENU JSON (do not invent).",
          },
          quantity: { type: "number", description: "Quantity to add (whole number)." },
          notes: {
            type: "string",
            description:
              "Optional notes/customizations (e.g., 'extra spicy'). Use empty string if none.",
          },
        },
        required: ["item_name", "quantity", "notes"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_from_cart",
      description: "Removes an item from the cart.",
      parameters: {
        type: "object",
        properties: {
          item_name: {
            type: "string",
            description: "Exact item name or item id from the AVAILABLE MENU JSON.",
          },
        },
        required: ["item_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_cart_details",
      description: "Returns a summary of items in the cart and the total price.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_shipping_address",
      description: "Saves or updates the user's shipping address in the session.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Full shipping address as free-form text.",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_customer_details",
      description:
        "Saves the customer's name and phone number for the order (required before finalizing).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Customer's full name." },
          phone: {
            type: "string",
            description: "Customer's phone/contact number.",
          },
        },
        required: ["name", "phone"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_payment_method",
      description:
        "Saves the customer's chosen payment method. Call this as soon as the user specifies 'online' or 'cash'.",
      parameters: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["online", "cash"],
            description: "'online' for EasyPaisa/JazzCash; 'cash' for cash on delivery.",
          },
        },
        required: ["method"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finalize_order",
      description:
        "Gatekeeper that validates cart/address/confirmation, saves the order, and clears the session on success.",
      parameters: {
        type: "object",
        properties: {
          confirmation: {
            type: "boolean",
            description:
              "Set true ONLY after the user explicitly confirms the final summary; false otherwise.",
          },
        },
        required: ["confirmation"],
      },
    },
  },
];

/** Execute a single tool call by name against the working state. */
export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { menu: MenuItem[]; state: WorkingState; userId: string }
): Promise<ToolResult | CartDetails> {
  const { menu, state, userId } = ctx;
  switch (name) {
    case "add_to_cart":
      return addToCart(
        menu,
        state,
        String(args.item_name ?? ""),
        args.quantity ?? 1,
        args.notes ?? ""
      );
    case "remove_from_cart":
      return removeFromCart(menu, state, String(args.item_name ?? ""));
    case "get_cart_details":
      return getCartDetails(menu, state);
    case "set_shipping_address":
      return setShippingAddress(state, args.address ?? "");
    case "set_customer_details":
      return setCustomerDetails(state, args.name ?? "", args.phone ?? "");
    case "set_payment_method":
      return setPaymentMethod(state, (args.method as "online" | "cash") ?? "online");
    case "finalize_order":
      return finalizeOrder(
        menu,
        state,
        userId,
        Boolean(args.confirmation),
        state.payment_method ?? "online"
      );
    default:
      return { success: false, message: `Unknown tool: ${name}` };
  }
}
