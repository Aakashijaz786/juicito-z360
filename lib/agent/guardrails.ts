// Anti-hallucination guardrails — ported from purewaterbot/llm.py.
// Detect when the LLM *claims* in text that it set the address / placed the order
// without actually calling the tool, so we can force the real action.

const ADDRESS_SET_RE =
  /(?:address|delivery address|shipping address)\s+(?:updated?|set|saved|changed|recorded|noted)\s+(?:to|as|:)/i;

const ORDER_PLACED_RE =
  /(?:order\s+(?:confirm|place|placed|confirmed)|order\s+#\s*\w+|order\s+number\s+is|payment\s+screenshots?|send\s+(?:us\s+)?(?:your\s+)?payment\s+screenshot)/i;

export function mentionsAddressSet(text: string): boolean {
  return !!text && ADDRESS_SET_RE.test(text);
}

export function mentionsOrderPlaced(text: string): boolean {
  return !!text && ORDER_PLACED_RE.test(text);
}

/**
 * Best-effort extraction of an address from the user's raw message.
 * Handles "house 27B", "delivery address is house 27b", "address: house 27B", etc.
 * Falls back to the whole message if it's short enough to plausibly be an address.
 */
export function extractAddressFromText(userText: string): string | null {
  if (!userText) return null;
  const text = userText.trim();

  const prefix = /(?:delivery\s+)?(?:my\s+)?address\s*(?:is)?\s*[:=-]?\s*/i;
  const m = prefix.exec(text);
  if (m) {
    let addr = text.slice(m.index + m[0].length).trim();
    addr = addr.replace(/\s+(?:please|thanks?|thank\s+you)\.?$/i, "").trim();
    if (addr) return addr;
  }

  if (text.length <= 100) return text;
  return null;
}

/** Replace the first fake order-id reference in the text with the real one. */
export function injectOrderId(text: string, orderId: string): string {
  return text.replace(
    /(?:order\s*(?:number|#|no\.?)\s*(?:is)?\s*:?\s*)\w+/i,
    `Order #${orderId}`
  );
}
