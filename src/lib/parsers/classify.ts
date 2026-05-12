import Groq from 'groq-sdk'
import { env } from '@/lib/env'
import type { ClassifyResult, ParseTarget } from '@/types/index'

const CLASSIFY_PROMPT = `
당신은 업로드된 파일의 내용을 분석하여 어떤 종류의 데이터인지 판단합니다.

판단 기준:
- "curriculum": 교육과정, 강의계획서, 과목 목록, 수업시간표, 학점 정보가 포함된 경우
- "other": 그 외 모든 파일 (일반 문서, 공지, 이미지 등)

텍스트를 읽고 다음 JSON 형식으로만 응답하세요. 다른 설명은 하지 마세요.
{"target": "curriculum" | "other", "reason": "판단 이유를 한 문장으로"}
`.trim()

export async function classifyContent(text: string): Promise<ClassifyResult> {
  const groq = new Groq({ apiKey: env.groqApiKey })

  const preview = text.slice(0, 3000)

  let raw: string
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: CLASSIFY_PROMPT },
        { role: 'user', content: preview },
      ],
      max_tokens: 256,
      temperature: 0,
    })
    raw = res.choices[0]?.message?.content ?? ''
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[classifyContent] Groq 분류 API 오류:', msg)
    throw new Error(`파일 분류 실패: ${msg}`)
  }

  const match = raw.match(/\{[\s\S]*?\}/)
  if (!match) {
    console.error('[classifyContent] Groq 응답 파싱 실패:', raw)
    return { target: 'other', reason: '분류 응답 파싱 실패 — 기본값 other 처리' }
  }

  try {
    const parsed = JSON.parse(match[0]) as { target: ParseTarget; reason: string }
    const target: ParseTarget = parsed.target === 'curriculum' ? 'curriculum' : 'other'
    return { target, reason: parsed.reason ?? '' }
  } catch (e) {
    console.error('[classifyContent] JSON 파싱 오류:', e, '원문:', match[0])
    return { target: 'other', reason: 'JSON 파싱 실패 — 기본값 other 처리' }
  }
}