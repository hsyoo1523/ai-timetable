// 앱 시작 시 필수 환경변수 누락이면 명확한 에러 메시지 출력
const required = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
} as const

if (typeof window === 'undefined') {
  // 서버 사이드에서만 검증 (빌드 시 누락 즉시 감지)
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(
        `[env] 필수 환경변수 누락: ${key}\n` +
        `.env.local 파일에 ${key}=값 형태로 추가하세요.`
      )
    }
  }
}

export const env = {
  supabaseUrl: required.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: required.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: required.SUPABASE_SERVICE_ROLE_KEY!,
  groqApiKey: required.GROQ_API_KEY!,
}
