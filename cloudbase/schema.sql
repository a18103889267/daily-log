-- CloudBase PostgreSQL 建表语句
-- 在「SQL 型数据库 → PostgreSQL 管理 → SQL 编辑器」中执行

CREATE TABLE IF NOT EXISTS public.daily_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  log_date VARCHAR(10) NOT NULL,
  mood VARCHAR(64) DEFAULT NULL,
  tags JSONB DEFAULT NULL,
  items JSONB NOT NULL,
  summary TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT uk_user_log_date UNIQUE (user_id, log_date)
);

COMMENT ON TABLE daily_logs IS '每日记录';
COMMENT ON COLUMN daily_logs.user_id IS 'CloudBase 用户 uid';
COMMENT ON COLUMN daily_logs.log_date IS 'YYYY-MM-DD';
COMMENT ON COLUMN daily_logs.items IS 'checkbox 记录 JSON';

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
COMMENT ON COLUMN public.goals.period_type IS 'daily / monthly / quarterly';
COMMENT ON COLUMN public.goals.end_date IS '目标截止日期 YYYY-MM-DD';

-- 新建或修改表后刷新 API schema 缓存
NOTIFY pgrst, 'reload schema';
