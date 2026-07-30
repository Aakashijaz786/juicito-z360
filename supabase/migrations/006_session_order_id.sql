-- Persist order_id in session so the agent knows an order is already placed across turns.
alter table sessions add column if not exists order_id text;
