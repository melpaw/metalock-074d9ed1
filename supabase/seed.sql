-- ============================================================
-- MetaLock — development seed data
-- Run with: supabase db reset   (or psql -f supabase/seed.sql)
-- Only intended for LOCAL / DEV databases. Never run in prod.
-- ============================================================

-- The application already ships baseline currency rows through
-- migration 20260705180148. This seed layers demo/reference data
-- on top for local testing. It is idempotent (safe to re-run).

-- ---- Currencies (upsert) ------------------------------------
insert into public.currencies (symbol, name, kind, decimals, coingecko_id, usd_price, active)
values
  ('BTC',  'Bitcoin',   'crypto', 8,  'bitcoin',      65000, true),
  ('ETH',  'Ethereum',  'crypto', 18, 'ethereum',      3500, true),
  ('USDT', 'Tether',    'crypto', 6,  'tether',           1, true),
  ('USDC', 'USD Coin',  'crypto', 6,  'usd-coin',         1, true),
  ('SOL',  'Solana',    'crypto', 9,  'solana',         160, true)
on conflict (symbol) do update
  set name = excluded.name,
      coingecko_id = excluded.coingecko_id,
      usd_price = excluded.usd_price,
      active = excluded.active;

-- ---- Investment plans (upsert) ------------------------------
insert into public.investment_plans (name, apy_bps, min_amount_usd, lock_days, active)
values
  ('Starter',   500,   100, 30,  true),
  ('Growth',   1200,  1000, 90,  true),
  ('Premium',  2000, 10000, 180, true)
on conflict (name) do update
  set apy_bps = excluded.apy_bps,
      min_amount_usd = excluded.min_amount_usd,
      lock_days = excluded.lock_days,
      active = excluded.active;

-- ---- Notes --------------------------------------------------
-- Users, wallets, transactions and tickets are created through
-- the normal signup / KYC / admin flows. This seed only feeds
-- reference tables so a fresh database is immediately usable.
