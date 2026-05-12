import Groq from 'groq-sdk'
import { env } from '@/lib/env'

export async function parseImageBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const groq = new Groq({ apiKey: env.groqApiKey })
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  let response
  try {
    response = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
            {
              type: 'text',
              text: '이 이미지의 모든 텍스트를 그대로 추출해줘. 표가 있으면 각 셀 내용을 줄별로 정리해줘.',
            },
          ],
        },
      ],
      max_tokens: 4096,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[parseImageBuffer] Groq vision API 오류:', msg)
    throw new Error(`이미지 OCR 실패: ${msg}`)
  }

  const text = response.choices[0]?.message?.content ?? ''
  if (!text) {
    console.error('[parseImageBuffer] Groq 응답이 비어있음')
    throw new Error('이미지에서 텍스트를 추출하지 못했습니다.')
  }

  return text.trim()
}