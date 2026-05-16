import * as XLSX from 'xlsx'
import type { UploadRow, UploadValidationResult, ActivityRow, ActivityUploadResult } from '@/types'

const VALID_PERIODS = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'])

export function normalizeRow(raw: Partial<UploadRow>): UploadRow {
  return {
    kpiId: String(raw.kpiId ?? '').trim(),
    // period is cast here — caller must pass through validateRow before trusting the value
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
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    if (!workbook.SheetNames.length || !sheet) {
      return { valid: [], errors: [{ row: 0, message: 'الملف لا يحتوي على أوراق عمل' }] }
    }

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
  } catch {
    return { valid: [], errors: [{ row: 0, message: 'تعذّر قراءة الملف — تأكد من أنه ملف Excel صالح' }] }
  }
}

const DEPT_NAME_TO_PILLAR: Record<string, string> = {
  'ادارة التعليم':           'EDUCATION',
  'ادارة ثقافة الأسرة':     'FAMILY_CULTURE',
  'مركز المعلومات الاسلامي': 'ISLAMIC_INFO_CENTER',
  'مشروع البر - ذكور':      'AL_BIRR_MALE',
  'مشروع البر - اناث':      'AL_BIRR_FEMALE',
  'قسم الأيتام':             'ORPHANS',
  'مكتب البرامج العلمية':    'SCIENTIFIC_PROGRAMS',
}

// Quarter column names are hardcoded to 2026.
// To support a different reporting year, update these keys to match
// the column headers in the uploaded file (e.g. '2027 Q1').
const QUARTER_COL: Record<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
  '2026 Q1': 'Q1',
  '2026 Q2': 'Q2',
  '2026 Q3': 'Q3',
  '2026 Q4': 'Q4',
}

const toNum = (v: unknown) => {
  const n = Number(v)
  return isNaN(n) || v === '' ? undefined : n
}

export function isActivityFile(buffer: ArrayBuffer): boolean {
  try {
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const [headers] = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    return (headers ?? []).some(h => String(h).trim() === 'الأنشطة')
  } catch {
    return false
  }
}

export function parseActivityFile(buffer: ArrayBuffer): ActivityUploadResult {
  try {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    const rows: ActivityRow[] = []
    const errors: Array<{ row: number; message: string }> = []

    rawRows.forEach((raw, index) => {
      const rowNum = index + 2
      const nameAr = String(raw['الأنشطة'] ?? '').trim()

      // Skip blank activity rows silently
      if (!nameAr) return

      const deptRaw = String(raw['الوحدة التنظيمية'] ?? '').trim()
      const pillar = DEPT_NAME_TO_PILLAR[deptRaw]

      if (!pillar) {
        errors.push({ row: rowNum, message: `الصف ${rowNum}: الوحدة التنظيمية غير معروفة "${deptRaw}"` })
        return
      }

      const actuals: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>> = {}
      for (const [col, q] of Object.entries(QUARTER_COL)) {
        const val = toNum(raw[col])
        if (val !== undefined) actuals[q] = val
      }

      rows.push({
        nameAr,
        pillar: pillar as ActivityRow['pillar'],
        category: String(raw['الفئة'] ?? '').trim() || undefined,
        actual2025: toNum(raw['2025']),
        target2026: toNum(raw['المستهدف 2026']),
        actuals,
      })
    })

    return { rows, errors }
  } catch {
    return { rows: [], errors: [{ row: 0, message: 'تعذّر قراءة الملف — تأكد من أنه ملف Excel صالح' }] }
  }
}
