import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parsePdf } from '@/lib/parsers/pdf'
import { parseExcelBuffer, parseCsvText, tableToText } from '@/lib/parsers/excel'
import { parseImageBuffer } from '@/lib/parsers/image'
import { parseHtmlText } from '@/lib/parsers/html'
import { classifyContent } from '@/lib/parsers/classify'
import type { ApiResponse, FileType, ParsedTable } from '@/types/index'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function detectFileType(filename: string, mimeType: string): FileType | null {
  const name = filename.toLowerCase()
  if (name.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf'
  if (name.endsWith('.xlsx') || mimeType.includes('spreadsheetml')) return 'xlsx'
  if (name.endsWith('.xls') || mimeType.includes('ms-excel')) return 'xlsx'
  if (name.endsWith('.csv') || mimeType === 'text/csv') return 'csv'
  if (name.endsWith('.html') || name.endsWith('.htm') || mimeType.includes('html')) return 'html'
  if (mimeType.startsWith('image/')) return 'image'
  return null
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ message: string; target: string }>>> {
  // 1. 인증 확인
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[POST /api/parse] 인증 실패:', authError?.message ?? '사용자 없음')
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // 2. 관리자 권한 확인
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[POST /api/parse] 프로필 조회 실패:', profileError.message)
    return NextResponse.json({ ok: false, error: '프로필 조회 실패' }, { status: 500 })
  }
  if (profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: '관리자만 파일을 업로드할 수 있습니다.' }, { status: 403 })
  }

  // 3. 파일 수신
  let formData: FormData
  try {
    formData = await req.formData()
  } catch (e) {
    console.error('[POST /api/parse] FormData 파싱 실패:', e)
    return NextResponse.json({ ok: false, error: '파일 요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: '파일이 포함되지 않았습니다.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: `파일 크기는 10MB 이하여야 합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)` }, { status: 413 })
  }

  // 4. 파일 타입 감지
  const fileType = detectFileType(file.name, file.type)
  if (!fileType) {
    console.error('[POST /api/parse] 지원하지 않는 파일 타입:', file.type, file.name)
    return NextResponse.json({ ok: false, error: `지원하지 않는 파일 형식입니다: ${file.type || file.name}` }, { status: 415 })
  }

  // 5. 파싱
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  let extractedText = ''
  let tables: ParsedTable[] = []

  try {
    if (fileType === 'pdf') {
      extractedText = await parsePdf(buffer)
    } else if (fileType === 'xlsx') {
      tables = parseExcelBuffer(buffer)
      extractedText = tables.map(t => tableToText(t)).join('\n\n')
    } else if (fileType === 'csv') {
      const text = buffer.toString('utf-8')
      const table = parseCsvText(text)
      tables = [table]
      extractedText = tableToText(table)
    } else if (fileType === 'image') {
      extractedText = await parseImageBuffer(buffer, file.type)
    } else if (fileType === 'html') {
      const html = buffer.toString('utf-8')
      extractedText = parseHtmlText(html)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[POST /api/parse] ${fileType} 파싱 오류:`, msg)
    return NextResponse.json({ ok: false, error: `파싱 실패: ${msg}` }, { status: 500 })
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ ok: false, error: '파일에서 텍스트를 추출하지 못했습니다.' }, { status: 422 })
  }

  // 6. Groq 분류
  let classify
  try {
    classify = await classifyContent(extractedText)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/parse] 분류 오류:', msg)
    return NextResponse.json({ ok: false, error: `분류 실패: ${msg}` }, { status: 500 })
  }

  // 7. DB 저장
  if (classify.target === 'curriculum') {
    const { error: dbError } = await supabaseAdmin.from('curriculums').insert({
      filename: file.name,
      content: extractedText,
      tables: tables.length > 0 ? tables : null,
      uploaded_by: user.id,
    })
    if (dbError) {
      console.error('[POST /api/parse] curriculums 저장 실패:', dbError.message)
      return NextResponse.json({ ok: false, error: `DB 저장 실패: ${dbError.message}` }, { status: 500 })
    }
  } else {
    const { error: dbError } = await supabaseAdmin.from('parsed_files').insert({
      filename: file.name,
      file_type: fileType,
      content: extractedText,
      uploaded_by: user.id,
    })
    if (dbError) {
      console.error('[POST /api/parse] parsed_files 저장 실패:', dbError.message)
      return NextResponse.json({ ok: false, error: `DB 저장 실패: ${dbError.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    message: `"${file.name}" 파싱 및 저장 완료`,
    target: classify.target,
  })
}