'use client'

import { useRef, useState } from 'react'
import { ErrorMessage } from './ErrorMessage'

interface Props {
  onSuccess?: (filename: string, target: string) => void
}

const ACCEPTED = '.pdf,.xlsx,.xls,.csv,.html,.htm,.jpg,.jpeg,.png,.webp'

export function FileUpload({ onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/parse', { method: 'POST', body: form })
      const json = await res.json()

      if (!json.ok) {
        setError(json.error ?? '업로드 실패')
      } else {
        const msg = `${json.message} (분류: ${json.target === 'curriculum' ? '교육과정' : '일반파일'})`
        setSuccessMsg(msg)
        onSuccess?.(file.name, json.target)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '네트워크 오류'
      console.error('[FileUpload] 업로드 오류:', msg)
      setError('업로드 중 오류가 발생했습니다: ' + msg)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">파일 업로드</label>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleChange}
          disabled={loading}
          className="text-sm text-gray-600 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1 file:text-sm hover:file:bg-gray-50 disabled:opacity-50"
        />
        {loading && <span className="text-sm text-gray-500">업로드 중...</span>}
      </div>
      <p className="text-xs text-gray-400">
        지원 형식: PDF, Excel (xlsx/xls), CSV, HTML, 이미지 (jpg/png/webp) — 최대 10MB
      </p>
      <ErrorMessage message={error} />
      {successMsg && (
        <div className="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}
    </div>
  )
}