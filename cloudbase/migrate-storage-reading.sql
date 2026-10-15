-- 阅读图片 Bucket「reading」：仅登录用户可读写自己的文件
-- 对象路径第一段必须是 auth.uid()，例如 {uid}/{date}/photo.jpg

DROP POLICY IF EXISTS reading_select_own ON storage.objects;
DROP POLICY IF EXISTS reading_insert_own ON storage.objects;
DROP POLICY IF EXISTS reading_update_own ON storage.objects;
DROP POLICY IF EXISTS reading_delete_own ON storage.objects;

CREATE POLICY reading_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reading'
    AND (storage.foldername(name))[1] = auth.uid()
  );

CREATE POLICY reading_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reading'
    AND (storage.foldername(name))[1] = auth.uid()
  );

CREATE POLICY reading_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'reading'
    AND (storage.foldername(name))[1] = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'reading'
    AND (storage.foldername(name))[1] = auth.uid()
  );

CREATE POLICY reading_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'reading'
    AND (storage.foldername(name))[1] = auth.uid()
  );
