-- 迁移：学习内容分类与条目
-- 在 CloudBase 控制台 → SQL 型数据库 → PostgreSQL → SQL 编辑器 中执行

CREATE TABLE IF NOT EXISTS public.learning_categories (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  name VARCHAR(128) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT uk_learning_category_user_name UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.learning_contents (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  category_id BIGINT NOT NULL REFERENCES public.learning_categories (id) ON DELETE CASCADE,
  concept VARCHAR(512) NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  published_date VARCHAR(10) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_categories_user_id ON public.learning_categories (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_contents_user_id ON public.learning_contents (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_contents_user_category ON public.learning_contents (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_learning_contents_user_published ON public.learning_contents (user_id, published_date DESC);

COMMENT ON TABLE public.learning_categories IS '学习内容分类';
COMMENT ON TABLE public.learning_contents IS '学习内容条目';
COMMENT ON COLUMN public.learning_contents.concept IS '学习的概念';
COMMENT ON COLUMN public.learning_contents.explanation IS '自我解释';
COMMENT ON COLUMN public.learning_contents.published_date IS '发布日期 YYYY-MM-DD';

NOTIFY pgrst, 'reload schema';
