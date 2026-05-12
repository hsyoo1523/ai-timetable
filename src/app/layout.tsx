import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 시간표',
  description: 'AI로 시간표를 자동으로 생성하고 관리하세요',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}