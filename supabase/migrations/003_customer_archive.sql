-- Juicito Z360 — customer details + queue archiving

-- Customer name & phone, collected in chat and printed on the receipt.
alter table orders   add column if not exists customer_name  text;
alter table orders   add column if not exists customer_phone text;
alter table sessions add column if not exists customer_name  text;
alter table sessions add column if not exists customer_phone text;

-- Lets the admin "clear" the queue: archived orders drop out of the Order Queue
-- but remain in Order History for records.
alter table orders add column if not exists archived boolean not null default false;
create index if not exists orders_archived_idx on orders (archived);
