'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ErrorMessage } from '@/components/ErrorMessage'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Step = 'form' | 'otp'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Step 1: 인증번호 발송 ──────────────────────────────────────────────────
  async function handleSendOtp(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)

    if (!email.toLowerCase().endsWith('@ync.ac.kr')) {
      setError('영남외국어대학교 이메일(@ync.ac.kr)만 가입할 수 있습니다.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // signInWithOtp: 사용자가 없으면 생성하고 6자리 OTP 이메일 발송
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    if (otpError) {
      console.error('[SignupPage] OTP 발송 실패:', otpError.message)
      setError('인증번호 발송 실패: ' + otpError.message)
      setLoading(false)
      return
    }

    setStep('otp')
    setLoading(false)
  }

  // ── Step 2: OTP 인증 + 비밀번호 설정 ────────────────────────────────────────
  async function handleVerifyOtp(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)

    if (otp.length !== 6) {
      setError('인증번호 6자리를 모두 입력해주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // OTP 검증 → 성공 시 로그인 세션 생성
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (verifyError) {
      console.error('[SignupPage] OTP 검증 실패:', verifyError.message)
      if (verifyError.message.includes('expired')) {
        setError('인증번호가 만료되었습니다. 처음부터 다시 시도해주세요.')
        setStep('form')
      } else {
        setError('인증번호가 올바르지 않습니다.')
      }
      setLoading(false)
      return
    }

    // 세션이 생긴 상태에서 비밀번호 설정
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      console.error('[SignupPage] 비밀번호 설정 실패:', pwError.message)
      setError('비밀번호 설정 실패: ' + pwError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  // ── 렌더링 ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow">

        {step === 'form' && (
          <>
            <div className="space-y-1">
              <h1 className="text-center text-2xl font-bold text-gray-900">회원가입</h1>
              <p className="text-center text-xs text-blue-600 font-medium">
                영남외국어대학교 이메일(@ync.ac.kr)만 가입 가능합니다
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  학교 이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="학번@ync.ac.kr"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="최소 8자"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <ErrorMessage message={error} />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '발송 중...' : '인증번호 받기'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">로그인</Link>
            </p>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="space-y-1">
              <h1 className="text-center text-2xl font-bold text-gray-900">이메일 인증</h1>
              <p className="text-center text-sm text-gray-500">
                <span className="font-medium text-gray-700">{email}</span>으로<br />
                인증번호 6자리를 보냈습니다
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  인증번호
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6자리 입력"
                  autoFocus
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-center text-xl tracking-widest focus:border-blue-500 focus:outline-none"
                />
              </div>

              <ErrorMessage message={error} />

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '인증 중...' : '가입 완료'}
              </button>
            </form>

            <button
              onClick={() => { setStep('form'); setOtp(''); setError(null) }}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← 이메일 다시 입력
            </button>
          </>
        )}

      </div>
    </div>
  )
}
