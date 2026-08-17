-- 手动确认某个邮箱账号（关闭 Confirm email 后，旧账号仍可能处于未验证状态）
-- 在 Supabase Dashboard → SQL Editor 中执行

update auth.users
set
  email_confirmed_at = now(),
  raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{email_verified}',
    'true'::jsonb,
    true
  )
where email = '你的邮箱@example.com'
  and email_confirmed_at is null;
