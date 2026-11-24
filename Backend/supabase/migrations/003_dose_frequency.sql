-- =====================================================================
-- 003_dose_frequency.sql  —  How often a medication is taken
-- Before this, every scheduled medication was taken every day.
-- Existing rows become "daily, every 1 day", so nothing changes for them.
--
--   frequency     repeat_every   days_of_week   meaning
--   'daily'       1              {}             every day
--   'daily'       2              {}             every other day (counted from start_date)
--   'weekly'      1              {1,3,5}        every Mon, Wed, Fri
--   'weekly'      2              {1}            every 2nd Monday (counted from start_date's week)
--   'monthly'     1              {}             once a month, on start_date's day of the month
--
-- days_of_week uses ISO numbers: 1 = Monday ... 7 = Sunday.
-- start_date is needed whenever repeat_every > 1 or frequency = 'monthly'
-- (the API checks this; it tells us which days, weeks or months count).
-- =====================================================================

alter table public.medications
  add column frequency    text     not null default 'daily'
    check (frequency in ('daily', 'weekly', 'monthly')),
  add column repeat_every smallint not null default 1
    check (repeat_every between 1 and 12),
  add column days_of_week smallint[] not null default '{}'
    check (days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);

alter table public.medications
  add constraint weekly_needs_days
    check (frequency <> 'weekly' or cardinality(days_of_week) > 0);
