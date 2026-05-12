import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (c) =>
        c.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
    },
  })
}