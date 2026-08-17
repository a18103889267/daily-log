-- CloudBase PostgreSQL 建表语句
-- 在「SQL 型数据库 → PostgreSQL 管理 → SQL 编辑器」中执行

CREATE TABLE IF NOT EXISTS daily_logs (
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
