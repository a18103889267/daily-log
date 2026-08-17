import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '缺少 Supabase 配置。请在项目根目录创建 .env.local，并填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY，然后重启 npm run dev。',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
