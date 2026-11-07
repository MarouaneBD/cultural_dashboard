/**
 * Unit tests for the still-active functions in lib/excel.ts.
 *
 * Tests for the removed legacy-format functions (validateRow, normalizeRow,
 * parseExcelFile) were deleted alongside those functions in c9fbe72. The
 * legacy-format rejection path is covered at the HTTP layer in
 * app/api/upload/route.test.ts.
 *
 * The original parseActivityFile describe had 5 tests (not 6); the XLSX.read
 * throws test only existed in the now-deleted parseExcelFile block. We restore
 * those 7 tests (2 isActivityFile + 5 parseActivityFile) and add a unit test
 * for normalizeAr, which became an exported function in f3408b8 and has no
 * other direct coverage.
 */

import * as XLSX from 'xlsx'
import { isActivityFile, parseActivityFile, normalizeAr } from '@/lib/excel'

// ── Shared buffer builder ──────────────────────────────────────────────────────

function makeBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

const validRow = {
  'الوحدة التنظيمية': 'ادارة التعليم',
  'الأنشطة': 'برامج التعليم القرآني',
  '2025': 80,
  'المستهدف 2026': 100,
  '2026 Q1': 85,
  'الفئة': 'تعليم',
}

// ── isActivityFile ─────────────────────────────────────────────────────────────

describe('isActivityFile', () => {
  it('returns true when الأنشطة header is present', () => {
    expect(isActivityFile(makeBuffer([validRow]))).toBe(true)
  })

  it('returns false for the legacy format (no الأنشطة column)', () => {
    const buf = makeBuffer([{ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }])
    expect(isActivityFile(buf)).toBe(false)
  })
})

// ── parseActivityFile ──────────────────────────────────────────────────────────

describe('parseActivityFile', () => {
  it('parses a valid row correctly', () => {
    const result = parseActivityFile(makeBuffer([validRow]))
    expect(result.rows).toHaveLength(1)
    expect(result.parseErrors).toHaveLength(0)
    const row = result.rows[0]
    expect(row.nameAr).toBe('برامج التعليم القرآني')
    expect(row.pillar).toBe('EDUCATION')
    expect(row.category).toBe('تعليم')
    expect(row.actual2025).toBe(80)
    expect(row.target2026).toBe(100)
    expect(row.actuals.Q1).toBe(85)
  })

  it('returns an error for an unrecognised department', () => {
    const result = parseActivityFile(makeBuffer([{ ...validRow, 'الوحدة التنظيمية': 'قسم مجهول' }]))
    expect(result.rows).toHaveLength(0)
    expect(result.parseErrors[0].message).toMatch(/الوحدة التنظيمية/)
  })

  it('skips rows with an empty activity name silently', () => {
    const result = parseActivityFile(makeBuffer([{ ...validRow, 'الأنشطة': '' }]))
    expect(result.rows).toHaveLength(0)
    expect(result.parseErrors).toHaveLength(0)
  })

  it('handles missing optional columns gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { 'الفئة': _cat, '2025': _act, ...rowWithoutOptionals } = validRow
    const result = parseActivityFile(makeBuffer([rowWithoutOptionals]))
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].category).toBeUndefined()
    expect(result.rows[0].actual2025).toBeUndefined()
  })

  it('parses multiple quarterly actuals when present', () => {
    const result = parseActivityFile(makeBuffer([{ ...validRow, '2026 Q2': 90, '2026 Q3': 92 }]))
    expect(result.rows[0].actuals.Q1).toBe(85)
    expect(result.rows[0].actuals.Q2).toBe(90)
    expect(result.rows[0].actuals.Q3).toBe(92)
    expect(result.rows[0].actuals.Q4).toBeUndefined()
  })
})

// ── normalizeAr ───────────────────────────────────────────────────────────────
// normalizeAr was exported in f3408b8 so the upload route can call it at write
// time to prevent invisible-Unicode / trailing-space duplicate donut segments.

describe('normalizeAr', () => {
  it('strips invisible Unicode characters and trims surrounding whitespace', () => {
    // zero-width space (U+200B), RTL mark (U+200F), trailing space
    const dirty = '\u200bتعليم\u200f '
    expect(normalizeAr(dirty)).toBe('تعليم')
  })
})
