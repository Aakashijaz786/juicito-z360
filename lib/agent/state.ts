import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import type { CartItem, MenuItem } from "@/lib/types";

const lastWins = <T>() => ({ reducer: (_x: T, y: T) => y });

/**
 * Explicit LangGraph state for the ordering agent.
 * cart/address are loaded from Supabase before the run and persisted after.
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  user_id: Annotation<string>({ ...lastWins<string>(), default: () => "" }),
  menu: Annotation<MenuItem[]>({ ...lastWins<MenuItem[]>(), default: () => [] }),
  cart: Annotation<CartItem[]>({ ...lastWins<CartItem[]>(), default: () => [] }),
  address: Annotation<string | null>({
    ...lastWins<string | null>(),
    default: () => null,
  }),
  customer_name: Annotation<string | null>({
    ...lastWins<string | null>(),
    default: () => null,
  }),
  customer_phone: Annotation<string | null>({
    ...lastWins<string | null>(),
    default: () => null,
  }),
  phase: Annotation<string>({ ...lastWins<string>(), default: () => "greeting" }),
  order_id: Annotation<string | null>({
    ...lastWins<string | null>(),
    default: () => null,
  }),
  // Which real tools fired this turn (drives the guardrail node).
  address_tool_called: Annotation<boolean>({
    ...lastWins<boolean>(),
    default: () => false,
  }),
  finalize_tool_called: Annotation<boolean>({
    ...lastWins<boolean>(),
    default: () => false,
  }),
});

export type AgentStateType = typeof AgentState.State;

export function derivePhase(
  cart: CartItem[],
  address: string | null,
  orderId: string | null
): string {
  if (orderId) return "complete";
  if (!cart.length) return "ordering";
  if (!address || !address.trim()) return "address";
  return "summary";
}
