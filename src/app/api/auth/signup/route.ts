import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types/index'

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '요청 본문이 유효한 JSON이 아닙니다.' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'email과 password는 필수입니다.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: '비밀번호는 최소 8자 이상이어야 합니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    console.error('[POST /api/auth/signup] Supabase 사용자 생성 실패:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.user.id }, { status: 201 })
}