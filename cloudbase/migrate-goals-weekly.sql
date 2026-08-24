-- 迁移：goals 表支持 weekly 每周目标
-- 在 CloudBase 控制台 → SQL 型数据库 → PostgreSQL → SQL 编辑器 中执行

ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_period_type_check;
ALTER TABLE public.goals
  ADD CONSTRAINT goals_period_type_check
  CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly'));

COMMENT ON COLUMN public.goals.period_type IS 'daily / weekly / monthly / quarterly';

NOTIFY pgrst, 'reload schema';
