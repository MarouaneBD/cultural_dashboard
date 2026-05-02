import * as XLSX from 'xlsx'
import type { UploadRow, UploadValidationResult } from '@/types'

const VALID_PERIODS = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'])

export function normalizeRow(raw: Partial<UploadRow>): UploadRow {
  return {
    kpiId: String(raw.kpiId ?? '').trim(),
    period: String(raw.period ?? '').trim().toUpperCase() as UploadRow['period'],
    year: Number(raw.year),
    value: Number(raw.value),
    region: raw.region ? String(raw.region).trim() : undefined,
    facility: raw.facility ? String(raw.facility).trim() : undefined,
  }
}

export function validateRow(row: UploadRow, rowIndex: number): string[] {
  const errors: string[] = []
  if (!row.kpiId) errors.push(`الصف ${rowIndex}: kpiId مطلوب`)
  if (!VALID_PERIODS.has(row.period)) errors.push(`الصف ${rowIndex}: period غير صحيح (${row.period})`)
  if (isNaN(row.value)) errors.push(`الصف ${rowIndex}: value يجب أن يكون رقماً`)
  if (isNaN(row.year) || row.year < 2020 || row.year > 2030) {
    errors.push(`الصف ${rowIndex}: year غير صحيح (${row.year})`)
  }
  return errors
}

export function parseExcelFile(buffer: ArrayBuffer): UploadValidationResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const valid: UploadRow[] = []
  const errors: Array<{ row: number; message: string }> = []

  rawRows.forEach((raw, index) => {
    const row = normalizeRow(raw as Partial<UploadRow>)
    const rowErrors = validateRow(row, index + 2) // +2: 1-based + header row

    if (rowErrors.length > 0) {
      errors.push(...rowErrors.map(message => ({ row: index + 2, message })))
    } else {
      valid.push(row)
    }
  })

  return { valid, errors }
}
