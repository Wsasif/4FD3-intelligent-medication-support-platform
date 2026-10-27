-- =====================================================================
-- 001_core_tables.sql  —  Intelligent Medication Support Platform
-- Core user tables. DDInter tables (drugs, drug_interactions) come in 002.
-- =====================================================================

-- ---------- PROFILES (one per user; login is handled by Supabase Auth) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Automatically create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- PHARMACIES the user has saved ----------
create table public.pharmacies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  address     text,
  phone       text,
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz not null default now()
);

-- ---------- MEDICATIONS ----------
create table public.medications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  dosage               text not null,                            -- e.g. '500 mg'
  units_per_dose       numeric(6,2) not null default 1
                         check (units_per_dose > 0),             -- e.g. 2 tablets per dose
  condition            text,                                     -- what it treats
  quantity_remaining   numeric(8,2) not null default 0
                         check (quantity_remaining >= 0),        -- tablets/units on hand
  refill_alert_days    integer not null default 7
                         check (refill_alert_days between 1 and 60),
  is_as_needed         boolean not null default false,           -- no fixed schedule
  low_quantity_alert   numeric(8,2) not null default 5,          -- used only for as-needed meds
  pharmacy_id          uuid references public.pharmacies(id) on delete set null,
  start_date           date,
  end_date             date,
  is_active            boolean not null default true,
  notes                text,
  created_at           timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- ---------- INTAKE TIMES (doses_per_day = number of rows per medication) ----------
create table public.medication_schedules (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  medication_id  uuid not null references public.medications(id) on delete cascade,
  intake_time    time not null,                                  -- e.g. '08:00'
  created_at     timestamptz not null default now(),
  unique (medication_id, intake_time)
);

-- ---------- DOSE HISTORY ----------
create table public.dose_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  medication_id  uuid not null references public.medications(id) on delete cascade,
  scheduled_for  timestamptz not null,
  taken_at       timestamptz,
  status         text not null check (status in ('taken', 'skipped', 'missed')),
  created_at     timestamptz not null default now()
);

-- ---------- INDEXES (fast lookups per user) ----------
create index on public.pharmacies (user_id);
create index on public.medications (user_id);
create index on public.medication_schedules (user_id);
create index on public.medication_schedules (medication_id);
create index on public.dose_logs (user_id, scheduled_for);

-- ---------- ROW-LEVEL SECURITY: users only see their own rows ----------
alter table public.profiles             enable row level security;
alter table public.pharmacies           enable row level security;
alter table public.medications          enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.dose_logs            enable row level security;

create policy "own profile"     on public.profiles
  for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own pharmacies"  on public.pharmacies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own medications" on public.medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own schedules"   on public.medication_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own dose logs"   on public.dose_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);