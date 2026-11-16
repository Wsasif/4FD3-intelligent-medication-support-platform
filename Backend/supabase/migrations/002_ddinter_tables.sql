-- =====================================================================
-- 002_ddinter_tables.sql  —  DDInter 2.0 drug + interaction data
-- =====================================================================


create extension if not exists pg_trgm;

-- ---------- DRUGS ----------
create table public.drugs (
  id          integer primary key,       
  ddinter_id  text not null unique,       
  name        text not null               
);
create index drugs_name_trgm_idx on public.drugs using gin (name gin_trgm_ops);

-- ---------- DRUG INTERACTIONS ----------
create table public.drug_interactions (
  drug_a_id  integer not null references public.drugs(id) on delete cascade,
  drug_b_id  integer not null references public.drugs(id) on delete cascade,
  severity   text not null check (severity in ('major', 'moderate', 'minor', 'unknown')),
  primary key (drug_a_id, drug_b_id),
  check (drug_a_id < drug_b_id)
);
create index on public.drug_interactions (drug_b_id);

alter table public.medications
  add column drug_id integer references public.drugs(id) on delete set null;
create index on public.medications (drug_id);

alter table public.drugs             enable row level security;
alter table public.drug_interactions enable row level security;

create policy "logged-in users can read drugs" on public.drugs
  for select to authenticated using (true);
create policy "logged-in users can read interactions" on public.drug_interactions
  for select to authenticated using (true);