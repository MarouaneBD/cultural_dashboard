import * as XLSX from 'xlsx'
import type { ActivityType } from '@prisma/client'
import type { ActivityRow, ActivityUploadResult } from '@/types'
import { REPORTING_YEAR } from '@/lib/config'

const ACTIVITY_TYPE_MAP: Record<string, ActivityType> = {
  'تراكمي': 'CUMULATIVE',
  'شهري':   'MONTHLY_VARIANCE',
}

const DEPT_NAME_TO_PILLAR: Record<string, string> = {
  'ادارة التعليم':              'EDUCATION',
  'ادارة ثقافة الأسرة':        'FAMILY_CULTURE',
  'مركز المعلومات الاسلامي':   'ISLAMIC_INFO_CENTER',
  'مشروع البر - ذكور':         'AL_BIRR_MALE',
  'مشروع البر - اناث':         'AL_BIRR_FEMALE',
  'قسم الأيتام':                'ORPHANS',
  'مكتب البرامج العلمية':       'SCIENTIFIC_PROGRAMS',
  'وحدة البحوث والمطبوعات':    'RESEARCH_PUBLICATIONS',
  'ادارة الموارد البشرية':      'HR_MANAGEMENT',
  'ادارة الشؤون الادارية':      'ADMIN_AFFAIRS',
  'ادارة المشتريات':            'PROCUREMENT',
  'ادارة المشاريع التنموية':    'DEVELOPMENT_PROJECTS',
  'ادارة الزكاة':               'ZAKAT_MANAGEMENT',
}

// Quarter column names are derived from REPORTING_YEAR in lib/config.ts.
// Advance REPORTING_YEAR there to match the new year's Excel column headers.
const QUARTER_COL: Record<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
  [`${REPORTING_YEAR} Q1`]: 'Q1',
  [`${REPORTING_YEAR} Q2`]: 'Q2',
  [`${REPORTING_YEAR} Q3`]: 'Q3',
  [`${REPORTING_YEAR} Q4`]: 'Q4',
}

const toNum = (v: unknown) => {
  const n = Number(v)
  return isNaN(n) || v === '' ? undefined : n
}

/** Strip invisible Unicode chars Excel adds to Arabic text (RTL marks, ZWNBSP, NBSP, etc.) */
export function normalizeAr(s: string): string {
  return s.replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00a0]/g, '').trim()
}

/** Find a value in a raw Excel row by column name, tolerating invisible Unicode in headers */
function getCol(raw: Record<string, unknown>, name: string): unknown {
  // Try exact match first
  if (name in raw) return raw[name]
  // Fall back to normalized match
  const normalName = normalizeAr(name)
  for (const key of Object.keys(raw)) {
    if (normalizeAr(key) === normalName) return raw[key]
  }
  return undefined
}

export function isActivityFile(buffer: ArrayBuffer): boolean {
  try {
    const wb = XLSX.read(new Uint8Array(buffer))
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const [headers] = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    return (headers ?? []).some(h => normalizeAr(String(h)) === 'الأنشطة')
  } catch {
    return false
  }
}

export function parseActivityFile(buffer: ArrayBuffer): Omit<ActivityUploadResult, 'scopeErrors'> {
  try {
    const wb = XLSX.read(new Uint8Array(buffer), { cellDates: true, codepage: 65001 })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    const rows: ActivityRow[] = []
    const parseErrors: Array<{ row: number; message: string }> = []

    rawRows.forEach((raw, index) => {
      const rowNum = index + 2
      const nameAr = normalizeAr(String(getCol(raw, 'الأنشطة') ?? ''))

      // Skip blank activity rows silently
      if (!nameAr) return

      const deptRaw = normalizeAr(String(getCol(raw, 'الوحدة التنظيمية') ?? ''))
      const pillar = DEPT_NAME_TO_PILLAR[deptRaw]

      if (!pillar) {
        parseErrors.push({ row: rowNum, message: `الصف ${rowNum}: الوحدة التنظيمية غير معروفة "${deptRaw}"` })
        return
      }

      const actuals: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>> = {}
      for (const [col, q] of Object.entries(QUARTER_COL)) {
        const val = toNum(getCol(raw, col))
        if (val !== undefined) actuals[q] = val
      }

      const activityTypeRaw = normalizeAr(String(getCol(raw, 'نوع النشاط') ?? ''))
      const activityType: ActivityType = ACTIVITY_TYPE_MAP[activityTypeRaw] ?? 'MONTHLY_VARIANCE'

      rows.push({
        nameAr,
        pillar: pillar as ActivityRow['pillar'],
        category: normalizeAr(String(getCol(raw, 'الفئة') ?? '')) || undefined,
        actual2025: toNum(getCol(raw, String(REPORTING_YEAR - 1))),
        target2026: toNum(getCol(raw, `المستهدف ${REPORTING_YEAR}`)),
        actuals,
        activityType,
      })
    })

    return { rows, parseErrors }
  } catch {
    return { rows: [], parseErrors: [{ row: 0, message: 'تعذّر قراءة الملف — تأكد من أنه ملف Excel صالح' }] }
  }
}
