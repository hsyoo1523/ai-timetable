import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Timetable } from '@/types/index'
import { NewTimetableButton } from './NewTimetableButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: timetables, error } = await supabaseAdmin
    .from('timetables')
    .select('id, title, semester, year_class, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[DashboardPage] 시간표 조회 실패:', error.message)
  }

  const list = (timetables ?? []) as Timetable[]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 시간표</h1>
        <div className="flex gap-2">
          <NewTimetableButton />
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          아직 시간표가 없습니다. 새 시간표를 만들어보세요.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map(tt => (
            <Link
              key={tt.id}
              href={`/dashboard/${tt.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h2 className="font-semibold text-gray-900">{tt.title}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {[tt.semester, tt.year_class].filter(Boolean).join(' · ') || '학기 미지정'}
              </p>
              <p className="mt-2 text-xs text-gray-400">
                {new Date(tt.created_at).toLocaleDateString('ko-KR')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}