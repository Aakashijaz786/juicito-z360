-- Store payment_method in session so it survives across turns (multi-turn confirmation flow).
alter table sessions add column if not exists payment_method text;
