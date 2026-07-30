-- Juicito Z360 — initial schema
-- Run this in the Supabase SQL editor (or via the CLI) before seeding.

-- ─── Menu ───────────────────────────────────────────────
create table if not exists menu (
  id          text primary key,
  name        text not null,
  price       numeric not null,            -- rupees (e.g. 240), not cents
  category    text not null,
  available   boolean not null default true,
  description text,
  tags        text[] default '{}',
  created_at  timestamptz not null default now()
);

-- ─── Orders ─────────────────────────────────────────────
create table if not exists orders (
  id                 text primary key,
  user_id            text not null,
  created_at         timestamptz not null default now(),
  currency           text not null default 'PKR',
  address            text not null,
  items              jsonb not null,        -- [{id,name,quantity,notes,unit_price_cents,line_total_cents}]
  total_cents        integer not null,
  total_formatted    text not null,
  status             text not null default 'new',
  payment_screenshot text
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_user_idx on orders (user_id);

-- ─── Sessions (per-user cart + address; replaces in-memory dict) ──
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    text unique not null,
  cart       jsonb not null default '[]',   -- [{menu_item_id,quantity,notes}]
  address    text,
  updated_at timestamptz not null default now()
);

-- ─── Messages (chat history per user) ───────────────────
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  role       text not null,                 -- 'user' | 'assistant' | 'system'
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_user_idx on messages (user_id, created_at);

-- Row Level Security is intentionally left disabled: all access is via the
-- server-side service-role key inside Next.js API routes. Enable + add policies
-- before exposing the anon key to untrusted clients.
