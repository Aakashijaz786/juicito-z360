// Explicit LangGraph state machine for the Juicito ordering agent.
//
//   START → agent ─(tool_calls?)─┬─ yes → tools ─┐
//                                │               └→ (loop back to agent)
//                                └─ no  → guardrails → END
//
import { StateGraph, START, END } from "@langchain/langgraph";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import { AgentState, type AgentStateType, derivePhase } from "./state";
import { buildSystemPrompt, buildSnapshot } from "./prompt";
import { TOOL_SPECS, dispatchTool, getCartDetails, setShippingAddress, finalizeOrder, type WorkingState } from "./tools";
import {
  mentionsAddressSet,
  mentionsOrderPlaced,
  extractAddressFromText,
  injectOrderId,
} from "./guardrails";

function messageText(msg: BaseMessage): string {
  const c = msg.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((part) => (typeof part === "string" ? part : (part as any).text ?? ""))
      .join("");
  }
  return "";
}

function lastHumanText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m instanceof HumanMessage || m.getType?.() === "human") {
      return messageText(m);
    }
  }
  return "";
}

// ─── Node: agent (LLM call) ─────────────────────────────
async function agentNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const working: WorkingState = {
    cart: state.cart,
    address: state.address,
    customer_name: state.customer_name,
    customer_phone: state.customer_phone,
    order_id: state.order_id,
    payment_method: state.payment_method,
  };
  const snapshot = buildSnapshot(getCartDetails(state.menu, working), state.payment_method);
  const system = new SystemMessage(buildSystemPrompt(state.menu) + snapshot);

  const model = new ChatOpenAI({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 600,
  }).bindTools(TOOL_SPECS);

  const response = await model.invoke([system, ...state.messages]);
  return { messages: [response] };
}

// ─── Conditional edge after agent ───────────────────────
function routeAfterAgent(state: AgentStateType): "tools" | "guardrails" {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = last?.tool_calls ?? [];
  return toolCalls.length > 0 ? "tools" : "guardrails";
}

// ─── Node: tools (execute the LLM's tool calls) ─────────
async function toolsNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = last.tool_calls ?? [];

  const working: WorkingState = {
    cart: state.cart.map((c) => ({ ...c })),
    address: state.address,
    customer_name: state.customer_name,
    customer_phone: state.customer_phone,
    order_id: state.order_id,
    payment_method: state.payment_method,
  };

  const toolMessages: ToolMessage[] = [];
  let addressCalled = state.address_tool_called;
  let finalizeCalled = state.finalize_tool_called;

  for (const tc of toolCalls) {
    if (tc.name === "set_shipping_address") addressCalled = true;
    if (tc.name === "finalize_order") finalizeCalled = true;

    const result = await dispatchTool(
      tc.name,
      (tc.args ?? {}) as Record<string, unknown>,
      { menu: state.menu, state: working, userId: state.user_id }
    );

    toolMessages.push(
      new ToolMessage({
        content: JSON.stringify(result),
        tool_call_id: tc.id ?? tc.name,
        name: tc.name,
      })
    );
  }

  return {
    messages: toolMessages,
    cart: working.cart,
    address: working.address,
    customer_name: working.customer_name,
    customer_phone: working.customer_phone,
    order_id: working.order_id,
    payment_method: working.payment_method,
    phase: derivePhase(working.cart, working.address, working.order_id),
    address_tool_called: addressCalled,
    finalize_tool_called: finalizeCalled,
  };
}

// ─── Node: guardrails (anti-hallucination) ──────────────
async function guardrailsNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  let finalText = messageText(last);

  const working: WorkingState = {
    cart: state.cart.map((c) => ({ ...c })),
    address: state.address,
    customer_name: state.customer_name,
    customer_phone: state.customer_phone,
    order_id: state.order_id,
    payment_method: state.payment_method,
  };

  // Guardrail 1: LLM claimed the address was set but never called the tool.
  if (!state.address_tool_called && mentionsAddressSet(finalText)) {
    if (!(working.address || "").trim()) {
      const addr = extractAddressFromText(lastHumanText(state.messages));
      if (addr) {
        setShippingAddress(working, addr);
      }
    }
  }

  // Guardrail 2: LLM claimed the order was placed but never called finalize_order.
  if (!state.finalize_tool_called && mentionsOrderPlaced(finalText)) {
    if (
      working.cart.length > 0 &&
      (working.address || "").trim() &&
      (working.customer_name || "").trim() &&
      (working.customer_phone || "").trim()
    ) {
      const result = await finalizeOrder(
        state.menu,
        working,
        state.user_id,
        true
      );
      if (result.success && result.order_id) {
        finalText = injectOrderId(finalText, result.order_id);
      }
    }
  }

  const patched = new AIMessage({ id: last.id, content: finalText });
  return {
    messages: [patched],
    cart: working.cart,
    address: working.address,
    customer_name: working.customer_name,
    customer_phone: working.customer_phone,
    order_id: working.order_id,
    payment_method: working.payment_method,
    phase: derivePhase(working.cart, working.address, working.order_id),
  };
}

// ─── Assemble the graph ─────────────────────────────────
const workflow = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addNode("guardrails", guardrailsNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", routeAfterAgent, {
    tools: "tools",
    guardrails: "guardrails",
  })
  .addEdge("tools", "agent")
  .addEdge("guardrails", END);

export const agentGraph = workflow.compile();

export { messageText };
