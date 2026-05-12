import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// service_role 키 사용 — API 라우트(서버)에서만 import할 것
export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey
)