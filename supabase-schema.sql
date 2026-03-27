-- Run this in your Supabase SQL editor to set up all tables

-- ── LEADS ────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  address         text not null,
  postal_code     text,
  area_type       text default 'willoughby',
  name            text,
  phone           text,
  email           text,
  sqft_range      text,
  stage           text default 'viewed',
  bca_assessed    integer,
  purchase_price  integer,
  purchase_date   text,
  years_owned     numeric,
  equity_gain     integer,
  equity_multiple numeric,
  narrative       text,
  reno_notes      text,
  utm_source      text,
  ip_address      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists leads_stage_idx on leads(stage);
create index if not exists leads_created_idx on leads(created_at desc);

-- ── BCA DATA ─────────────────────────────────────────────────────────────────
create table if not exists bca_data (
  id               uuid primary key default gen_random_uuid(),
  civic_address    text not null,
  postal_code      text,
  assessed_total   integer,
  purchase_price   integer,
  purchase_date    text,
  years_owned      numeric,
  equity_gain      integer,
  equity_multiple  numeric,
  bedrooms         text,
  stories          text,
  zone_code        text,
  actual_land_use  text,
  plan_number      text,
  priority_score   integer default 0,
  created_at       timestamptz default now()
);

create index if not exists bca_address_idx on bca_data(civic_address);
create index if not exists bca_postal_idx  on bca_data(postal_code);

-- ── BUYER REGISTRY ────────────────────────────────────────────────────────────
create table if not exists buyer_registry (
  id            uuid primary key default gen_random_uuid(),
  agent_name    text not null,
  brokerage     text,
  email         text not null,
  phone         text,
  budget_min    integer,
  budget_max    integer,
  bedrooms_min  integer default 3,
  area          text default 'Willoughby',
  timeline      text,
  notes         text,
  active        boolean default true,
  created_at    timestamptz default now()
);

-- ── CHAT LOGS ─────────────────────────────────────────────────────────────────
create table if not exists chat_logs (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references leads(id),
  question   text,
  answer     text,
  created_at timestamptz default now()
);

-- ── MARKET STATS ─────────────────────────────────────────────────────────────
create table if not exists market_stats (
  id                  uuid primary key default gen_random_uuid(),
  avg_price_per_sqft  numeric default 468,
  low_price_per_sqft  numeric default 451,
  high_price_per_sqft numeric default 481,
  avg_dom             integer default 28,
  fastest_dom         integer default 19,
  avg_above_bca       integer default 111500,
  sales_count         integer default 3,
  date_range          text default 'Sept–Oct 2025',
  updated_at          timestamptz default now()
);

-- Insert initial market stats
insert into market_stats (avg_price_per_sqft, low_price_per_sqft, high_price_per_sqft, avg_dom, fastest_dom, avg_above_bca, sales_count, date_range)
values (468, 451, 481, 28, 19, 111500, 3, 'Sept–Oct 2025')
on conflict do nothing;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- Leads: only service role can read/write (your dashboard uses service role)
alter table leads          enable row level security;
alter table bca_data       enable row level security;
alter table buyer_registry enable row level security;
alter table chat_logs      enable row level security;
alter table market_stats   enable row level security;

-- Public can read market_stats (for the landing page stats)
create policy "Public can read market stats"
  on market_stats for select using (true);

-- Public can read BCA data (needed for address lookup)
create policy "Public can read BCA data"
  on bca_data for select using (true);

-- Service role bypasses RLS automatically — all other access from API routes uses service role key
