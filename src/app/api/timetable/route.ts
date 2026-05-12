import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ApiResponse, Timetable } from '@/types/index'

// GET /api/timetable — 내 시간표 목록 조회
export async function GET(): Promise<NextResponse<ApiResponse<{ timetables: Timetable[] }>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('timetables')
    .select('*, schedule_slots(*)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/timetable] 조회 실패:', error.message)
    return NextResponse.json({ ok: false, error: '시간표 조회 실패: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, timetables: (data ?? []) as Timetable[] })
}

// POST /api/timetable — 새 시간표 생성
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: { title?: string; semester?: string; year_class?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '요청 본문이 유효한 JSON이 아닙니다.' }, { status: 400 })
  }

  const { title, semester, year_class } = body
  if (!title) return NextResponse.json({ ok: false, error: '시간표 제목은 필수입니다.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('timetables')
    .insert({ title, semester, year_class, owner_id: user.id, custom_fields: [] })
    .select('id')
    .single()

  if (error) {
    console.error('[POST /api/timetable] 생성 실패:', error.message)
    return NextResponse.json({ ok: false, error: '시간표 생성 실패: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}