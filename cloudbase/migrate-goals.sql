-- 单独迁移：创建 goals 目标表
-- 在 CloudBase 控制台 → SQL 型数据库 → PostgreSQL → SQL 编辑器 中执行

CREATE TABLE IF NOT EXISTS public.goals (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(512) NOT NULL,
  period_type VARCHAR(16) NOT NULL CHECK (period_type IN ('daily', 'monthly', 'quarterly')),
  start_date VARCHAR(10) NOT NULL,
  end_date VARCHAR(10) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at BIGINT DEFAULT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals (user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_completed ON public.goals (user_id, completed);

COMMENT ON TABLE public.goals IS '用户目标';

-- 刷新 PostgREST schema 缓存（建表后必须执行，否则 API 仍报找不到表）
NOTIFY pgrst, 'reload schema';

-- 验证表是否创建成功（应返回多行字段信息）
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'goals'
-- ORDER BY ordinal_position;
