import * as XLSX from 'xlsx'
import type { ParsedTable, ParsedRow } from '@/types/index'

export function parseExcelBuffer(buffer: Buffer): ParsedTable[] {
  const wb = XLSX.read(buffer)
  return wb.SheetNames.map(sheetName => {
    const ws = wb.Sheets[sheetName]
    const allRows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
      header: 1,
      defval: '',
    })
    const headerIdx = allRows.findIndex(row =>
      row.some(cell => String(cell).trim() !== '')
    )
    if (headerIdx === -1) return { headers: [], rows: [] }

    const headers = allRows[headerIdx].map(h => String(h).trim())
    const rows: ParsedRow[] = allRows
      .slice(headerIdx + 1)
      .filter(row => row.some(cell => String(cell).trim() !== ''))
      .map(row =>
        Object.fromEntries(headers.map((h, i) => [h, row[i] ?? null]))
      )
    return { headers, rows }
  })
}

export function parseCsvText(text: string): ParsedTable {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  const rows: ParsedRow[] = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim())
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? null]))
  })
  return { headers, rows }
}

export function tableToText(table: ParsedTable): string {
  const header = table.headers.join(',')
  const data = table.rows.map(row =>
    table.headers.map(h => String(row[h] ?? '')).join(',')
  )
  return [header, ...data].join('\n')
}