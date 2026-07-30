# Juicito Order Agent

AI-powered restaurant ordering agent built for the **Z360 Take-Home Challenge**.
A customer places a food order in natural language via a web chat; a LangGraph
agent validates it against a live menu, collects a delivery address, and creates a
kitchen-ready order. Restaurant staff manage the menu and fulfil orders from an
admin dashboard.

> Converted from the original **Juicito** WhatsApp bot (Python / Flask / MongoDB /
> Twilio). All business logic is preserved; the stack is rebuilt to Next.js +
> Supabase + LangGraph.

## Problem

Small restaurants lose orders in chaotic WhatsApp threads. Juicito Order Agent
takes natural-language orders, enforces stock and menu rules, collects delivery
details, and drops a structured, kitchen-ready order into an ops queue.

## Stack

- **Next.js 14 (App Router) + Tailwind + shadcn-style UI** — deployed on Vercel
- **Supabase (PostgreSQL)** — menu, orders, sessions, messages
- **LangGraph + OpenAI `gpt-4o-mini`** — explicit ordering state machine
- **5 custom tools** with real business-rule gatekeepers

## Architecture

```
Browser ─▶ /chat ───▶ POST /api/chat ─▶ LangGraph agent ─▶ Supabase
             │                              │  (agent → tools → guardrails)
        /admin/menu   ─▶ /api/menu ─────────┘
        /admin/orders ─▶ /api/orders ─▶ Supabase (menu / orders / sessions / messages)
```

### Agent design (`lib/agent/`)

Explicit LangGraph `StateGraph`, not a raw OpenAI loop:

```
START → agent ─(has tool calls?)─┬─ yes → tools ──┐
                                 │                └→ (loop back to agent)
                                 └─ no  → guardrails → END
```

- **State**: `messages, user_id, menu, cart, address, phase, order_id`
- **agent** node — calls the LLM with the ported system prompt + a live cart snapshot
- **tools** node — executes the 5 tools against the session working-state
- **guardrails** node — anti-hallucination: if the model *claims* it set the
  address / placed the order without calling the tool, it force-calls the real tool

**5 tools** (`lib/agent/tools/`, ported 1:1 from the Python `actions.py`):
`add_to_cart`, `remove_from_cart`, `get_cart_details`, `set_shipping_address`,
`finalize_order`. Item lookup by id or normalized name, stock check, cart merge by
item + notes, and a strict `finalize_order` gatekeeper (non-empty cart + address +
`confirmation=true`).

## Setup

1. **Create a Supabase project.** In the SQL editor run, in order:
   - `supabase/migrations/001_initial.sql` (schema)
   - `supabase/seed.sql` (37 menu items — regenerate with `node scripts/gen-seed.mjs`)
2. **Env:** copy `.env.local.example` → `.env.local` and fill in Supabase URL,
   anon key, service-role key, and your `OPENAI_API_KEY`.
3. **Install & run:**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000 → redirects to `/chat`.

## How to Test (2 minutes)

1. Open `/chat`
2. Say: **"Hi, I want a chicken shawarma and a mango lassi"**
3. Say: **"That's it"**
4. Give an address: **"House 27B, Islamabad"**
5. Say: **"Yes, confirm"** → the bot returns an order ID
6. Open `/admin/orders` → your order is in **New** → move it to Preparing → Dispatched

Also try: an out-of-stock item (bot refuses + suggests an alternative), a misspelled
item (bot shows closest matches), and "show me the menu" (bot sends the menu image).

## Data model (Supabase)

| Table      | Purpose                                            |
| ---------- | -------------------------------------------------- |
| `menu`     | 37 products; `price` in rupees                     |
| `orders`   | placed orders + status lifecycle + `items` (jsonb) |
| `sessions` | per-user cart + address (replaces in-memory dict)  |
| `messages` | chat history per user                              |

## Tradeoffs & simplifications

- **Web chat instead of WhatsApp/Twilio** — zero setup for evaluators.
- **Payment simplified** — `finalize_order` saves the order directly as `new`
  (kitchen-ready); the payment-screenshot step from the original is dropped.
- **Sessions persisted in Supabase** — an improvement over the original in-memory
  design; survives restarts.

## What I'd add next

- WhatsApp channel via Twilio (reuse the same agent + tools)
- Payment screenshot upload + OCR verification (`pending_payment` → `new`)
- Supabase Realtime for live admin updates instead of polling
- Auth on the admin routes
```
