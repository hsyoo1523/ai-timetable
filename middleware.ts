import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 환경변수 미설정 시 로그인 페이지로 보내고 계속 진행
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[middleware] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 누락')
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (c) =>
        c.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
    },
  })

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error('[middleware] auth.getUser 에러:', error.message)
    } else {
      user = data.user
    }
  } catch (e) {
    // Supabase 일시정지 또는 네트워크 장애 — 인증 없이 통과
    console.error('[middleware] auth 예외:', e)
    return response
  }

  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
}