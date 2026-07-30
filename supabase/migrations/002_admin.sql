-- Juicito Z360 — admin/analytics additions
-- Records when a payment screenshot was received (for the order timeline).
alter table orders add column if not exists paid_at timestamptz;

-- Stores the generated delivery-receipt PDF URL (set when an order is dispatched).
alter table orders add column if not exists receipt_url text;

-- Helpful indexes for the admin dashboard aggregations.
create index if not exists orders_created_idx on orders (created_at desc);
