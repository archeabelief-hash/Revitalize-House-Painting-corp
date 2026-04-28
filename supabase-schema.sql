-- Revitalize House Painting backend schema
-- Run this in Supabase SQL Editor

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text unique not null,
  phone text,
  role text not null default 'customer',
  referral_code text,
  status text default 'active'
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  account_email text,
  name text,
  phone text,
  address text,
  customer_type text,
  main_services text,
  specific_items text,
  rough_estimate text,
  project_value numeric default 0,
  adjusted_project_value numeric default 0,
  collected_amount numeric default 0,
  commission_paid numeric default 0,
  deposit_status text default 'Not requested',
  status text default 'New Request',
  scheduled_date date,
  started_at timestamptz,
  completed_at timestamptz,
  referral_code text,
  notes text
);

create table if not exists project_progress (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  tasks jsonb default '[]'::jsonb,
  notes text
);

create table if not exists sales_agents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text unique,
  phone text,
  referral_code text unique,
  status text default 'active'
);

create table if not exists paystubs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  agent_code text,
  pay_period text,
  gross_commission numeric default 0,
  paid_out numeric default 0,
  balance numeric default 0,
  file_name text,
  file_url text
);

alter table accounts enable row level security;
alter table projects enable row level security;
alter table project_progress enable row level security;
alter table sales_agents enable row level security;
alter table paystubs enable row level security;

-- Public insert policies for simple static-site intake.
-- Tighten these later when Google/Supabase Auth is fully active.
create policy if not exists "public account insert" on accounts for insert with check (true);
create policy if not exists "public project insert" on projects for insert with check (true);
create policy if not exists "public agent insert" on sales_agents for insert with check (true);

-- Temporary read/update policies for prototype mode.
-- Production should replace these with auth.uid/email role checks.
create policy if not exists "prototype read accounts" on accounts for select using (true);
create policy if not exists "prototype read projects" on projects for select using (true);
create policy if not exists "prototype update projects" on projects for update using (true);
create policy if not exists "prototype progress read" on project_progress for select using (true);
create policy if not exists "prototype progress insert" on project_progress for insert with check (true);
create policy if not exists "prototype progress update" on project_progress for update using (true);
create policy if not exists "prototype agents read" on sales_agents for select using (true);
create policy if not exists "prototype paystubs read" on paystubs for select using (true);
create policy if not exists "prototype paystubs insert" on paystubs for insert with check (true);
