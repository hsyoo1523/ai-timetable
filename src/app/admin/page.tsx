import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { FileUpload } from '@/components/FileUpload'
import Link from 'next/link'

type ParsedFileRow = {
  id: string
  filename: string
  file_type: string
  created_at: string
}

type CurriculumRow = {
  id: string
  filename: string
  created_at: string
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[AdminPage] 프로필 조회 실패:', profileError.message)
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">접근 권한이 없습니다.</p>
          <Link href="/dashboard" className="mt-2 block text-sm text-blue-600 hover:underline">대시보드로 이동</Link>
        </div>
      </div>
    )
  }

  const [{ data: parsedFiles }, { data: curriculums }] = await Promise.all([
    supabaseAdmin
      .from('parsed_files')
      .select('id, filename, file_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('curriculums')
      .select('id, filename, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">관리자 페이지</h1>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">← 대시보드</Link>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">파일 업로드</h2>
        <FileUpload />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">교육과정 파일</h2>
        {!curriculums || curriculums.length === 0 ? (
          <p className="text-sm text-gray-400">업로드된 교육과정 파일이 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">파일명</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">업로드 일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(curriculums as CurriculumRow[]).map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-gray-800">{row.filename}</td>
                    <td className="px-4 py-2 text-gray-400">
                      {new Date(row.created_at).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">기타 파싱 파일</h2>
        {!parsedFiles || parsedFiles.length === 0 ? (
          <p className="text-sm text-gray-400">업로드된 파일이 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">파일명</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">형식</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">업로드 일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(parsedFiles as ParsedFileRow[]).map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-gray-800">{row.filename}</td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{row.file_type}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {new Date(row.created_at).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
