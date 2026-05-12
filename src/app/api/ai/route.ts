import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { groq, AI_SYSTEM_PROMPT } from '@/lib/groq'
import type { ApiResponse, ScheduleSlot, CustomField } from '@/types/index'

type AiAction =
  | { action: 'insert_slot'; subject_name: string; day: string; period: number; room: string | null; professor: string | null; color?: string }
  | { action: 'update_slot'; day: string; period: number; subject_name?: string; room?: string | null; professor?: string | null }
  | { action: 'delete_slot'; day: string; period: number }
  | { action: 'bulk_import'; slots: Omit<ScheduleSlot, 'id'>[] }
  | { action: 'add_field'; field_key: string; field_label: string; field_type: string }
  | { action: 'remove_field'; field_key: string }
  | { action: 'show_data'; data: unknown[] }
  | { action: 'none'; message: string }
  | { action: 'clear_all' }

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ action: string; message?: string }>>> {
  // 1. 인증
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[POST /api/ai] 인증 실패:', authError?.message ?? '사용자 없음')
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 2. 요청 파싱
  let body: { timetableId?: string; prompt?: string; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: '요청 본문이 유효한 JSON이 아닙니다.' }, { status: 400 })
  }

  const { timetableId, prompt, context } = body
  if (!timetableId) return NextResponse.json({ ok: false, error: 'timetableId가 필요합니다.' }, { status: 400 })
  if (!prompt) return NextResponse.json({ ok: false, error: 'prompt가 필요합니다.' }, { status: 400 })

  // 3. 시간표 소유자 확인
  const { data: timetable, error: ttError } = await supabaseAdmin
    .from('timetables')
    .select('id, owner_id')
    .eq('id', timetableId)
    .single()

  if (ttError || !timetable) {
    console.error('[POST /api/ai] 시간표 조회 실패:', ttError?.message)
    return NextResponse.json({ ok: false, error: '시간표를 찾을 수 없습니다.' }, { status: 404 })
  }
  if (timetable.owner_id !== user.id) {
    return NextResponse.json({ ok: false, error: '본인의 시간표만 수정할 수 있습니다.' }, { status: 403 })
  }

  // 4. Groq AI 호출
  let raw: string
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        ...(context ? [{ role: 'user' as const, content: `현재 시간표:\n${context}` }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0,
    })
    raw = res.choices[0]?.message?.content ?? ''
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/ai] Groq API 오류:', msg)
    return NextResponse.json({ ok: false, error: `AI 요청 실패: ${msg}` }, { status: 502 })
  }

  // 5. 응답 파싱
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('[POST /api/ai] AI 응답 JSON 파싱 실패:', raw)
    return NextResponse.json({ ok: false, error: 'AI 응답을 파싱할 수 없습니다.' }, { status: 502 })
  }

  let aiResult: AiAction
  try {
    aiResult = JSON.parse(match[0]) as AiAction
  } catch (e) {
    console.error('[POST /api/ai] JSON 파싱 오류:', e, '원문:', match[0])
    return NextResponse.json({ ok: false, error: 'AI 응답 JSON 오류' }, { status: 502 })
  }

  // 6. 액션 처리
  try {
    await handleAction(timetableId, aiResult)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/ai] 액션 처리 오류:', msg)
    return NextResponse.json({ ok: false, error: `시간표 업데이트 실패: ${msg}` }, { status: 500 })
  }

  const message = aiResult.action === 'none' ? (aiResult as { action: 'none'; message: string }).message : undefined
  return NextResponse.json({ ok: true, action: aiResult.action, message })
}

async function handleAction(timetableId: string, ai: AiAction): Promise<void> {
  switch (ai.action) {
    case 'insert_slot': {
      const { error } = await supabaseAdmin.from('schedule_slots').insert({
        timetable_id: timetableId,
        subject_name: ai.subject_name,
        day: ai.day,
        period: ai.period,
        room: ai.room,
        professor: ai.professor,
        color: ai.color ?? '#4F86F7',
      })
      if (error) throw new Error(`슬롯 추가 실패: ${error.message}`)
      break
    }
    case 'update_slot': {
      const { error } = await supabaseAdmin
        .from('schedule_slots')
        .update({ subject_name: ai.subject_name, room: ai.room, professor: ai.professor })
        .eq('timetable_id', timetableId)
        .eq('day', ai.day)
        .eq('period', ai.period)
      if (error) throw new Error(`슬롯 수정 실패: ${error.message}`)
      break
    }
    case 'delete_slot': {
      const { error } = await supabaseAdmin
        .from('schedule_slots')
        .delete()
        .eq('timetable_id', timetableId)
        .eq('day', ai.day)
        .eq('period', ai.period)
      if (error) throw new Error(`슬롯 삭제 실패: ${error.message}`)
      break
    }
    case 'bulk_import': {
      const slots = ai.slots.map(s => ({ ...s, timetable_id: timetableId }))
      const { error } = await supabaseAdmin.from('schedule_slots').insert(slots)
      if (error) throw new Error(`대량 추가 실패: ${error.message}`)
      break
    }
    case 'add_field': {
      const { data: tt } = await supabaseAdmin
        .from('timetables')
        .select('custom_fields')
        .eq('id', timetableId)
        .single()
      const existing: CustomField[] = (tt?.custom_fields as CustomField[]) ?? []
      const updated = [...existing, { key: ai.field_key, label: ai.field_label, type: ai.field_type }]
      const { error } = await supabaseAdmin
        .from('timetables')
        .update({ custom_fields: updated })
        .eq('id', timetableId)
      if (error) throw new Error(`필드 추가 실패: ${error.message}`)
      break
    }
    case 'remove_field': {
      const { data: tt } = await supabaseAdmin
        .from('timetables')
        .select('custom_fields')
        .eq('id', timetableId)
        .single()
      const existing: CustomField[] = (tt?.custom_fields as CustomField[]) ?? []
      const updated = existing.filter(f => f.key !== ai.field_key)
      const { error } = await supabaseAdmin
        .from('timetables')
        .update({ custom_fields: updated })
        .eq('id', timetableId)
      if (error) throw new Error(`필드 삭제 실패: ${error.message}`)
      break
    }
    case 'clear_all': {
      const { error } = await supabaseAdmin
        .from('schedule_slots')
        .delete()
        .eq('timetable_id', timetableId)
      if (error) throw new Error(`전체 삭제 실패: ${error.message}`)
      break
    }
    case 'show_data':
    case 'none':
      break
  }
}
