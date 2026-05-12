// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse') as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>

export async function parsePdf(buffer: Buffer): Promise<string> {
  const { text } = await pdfParse(buffer)
  return text
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0)
    .filter((l: string) => !/^[\d\s]{1,4}$/.test(l))
    .map((l: string) => l.replace(/\s{3,}/g, ' | '))
    .join('\n')
}