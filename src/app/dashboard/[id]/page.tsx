'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TimetableGrid } from '@/components/TimetableGrid'
import { PromptInput } from '@/components/PromptInput'
import { ErrorMessage } from '@/components/ErrorMessage'
import type { Timetable, ScheduleSlot } from '@/types/index'
import { DAYS, DAYTIME_TIMES } from '@/types/index'

export default function TimetablePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [timetable, setTimetable] = useState<Timetable | null>(null)
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/timetable')
    const json = await res.json()
    if (!json.ok) {
      console.error('[TimetablePage] 시간표 목록 조회 실패:', json.error)
      setLoadError(json.error)
      return
    }
    const found = json.timetables.find((t: Timetable) => t.id === id)
    if (!found) {
      setLoadError('시간표를 찾을 수 없습니다.')
      return
    }
    setTimetable(found)
    setSlots(found.schedule_slots ?? [])
  }, [id])

  useEffect(() => { load() }, [load])

  function buildContext(): string {
    const lines: string[] = []
    for (const day of DAYS) {
      for (let p = 1; p <= DAYTIME_TIMES.length; p++) {
        const slot = slots.find(s => s.day === day && s.period === p)
        if (slot) lines.push(`${day} ${p}교시: ${slot.subject_name}${slot.room ? ` (${slot.room})` : ''}`)
      }
    }
    return lines.join('\n') || '(비어있음)'
  }

  async function handlePrompt(prompt: string) {
    setAiError(null)
    setAiMessage(null)
    setAiLoading(true)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timetableId: id, prompt, context: buildContext() }),
    })
    const json = await res.json()

    if (!json.ok) {
      console.error('[TimetablePage] AI 요청 실패:', json.error)
      setAiError(json.error)
    } else {
      if (json.message) setAiMessage(json.message)
      await load()
    }
    setAiLoading(false)
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorMessage message={loadError} />
        <button onClick={() => router.push('/dashboard')} className="mt-4 text-sm text-blue-600 hover:underline">
          대시보드로 돌아가기
        </button>
      </div>
    )
  }

  if (!timetable) {
    return <div className="p-8 text-center text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">
          ← 대시보드
        </button>
        <h1 className="text-xl font-bold">{timetable.title}</h1>
        {timetable.semester && (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{timetable.semester}</span>
        )}
      </div>

      <TimetableGrid slots={slots} />

      <div className="space-y-2">
        <PromptInput onSubmit={handlePrompt} loading={aiLoading} />
        <ErrorMessage message={aiError} />
        {aiMessage && (
          <div className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
            {aiMessage}
          </div>
        )}
      </div>
    </div>
  )
}