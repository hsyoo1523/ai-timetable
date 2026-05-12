'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (prompt: string) => Promise<void>
  loading: boolean
}

export function PromptInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || loading) return
    setValue('')
    await onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={loading}
        placeholder="AI에게 시간표 수정을 요청하세요 (예: 월요일 2교시에 수학 추가)"
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '처리중...' : '전송'}
      </button>
    </form>
  )
}