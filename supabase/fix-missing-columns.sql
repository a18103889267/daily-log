-- 修复 daily_logs 表缺少字段的问题
-- 在 Supabase Dashboard → SQL Editor 中执行

alter table public.daily_logs
  add column if not exists mood text;

alter table public.daily_logs
  add column if not exists tags text[] default '{}';

alter table public.daily_logs
  add column if not exists items jsonb default '[]'::jsonb;

alter table public.daily_logs
  add column if not exists summary text default '';

alter table public.daily_logs
  add column if not exists created_at timestamptz not null default now();

alter table public.daily_logs
  add column if not exists updated_at timestamptz not null default now();

-- 如果还没有 RLS 策略，可再执行 supabase/schema.sql 后半部分

notify pgrst, 'reload schema';
