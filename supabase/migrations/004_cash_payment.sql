-- Cash payment support: payment method, delivery confirmation, cash collection timestamps.
alter table orders add column if not exists payment_method text not null default 'online';
alter table orders add column if not exists delivered_at   timestamptz;
alter table orders add column if not exists cash_collected_at timestamptz;
