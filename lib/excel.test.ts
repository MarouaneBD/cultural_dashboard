import * as XLSX from 'xlsx'
import { validateRow, normalizeRow, parseExcelFile, isActivityFile, parseActivityFile } from '@/lib/excel'

describe('validateRow', () => {
  it('returns no errors for a valid row', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }, 1)
    expect(errors).toHaveLength(0)
  })

  it('returns error when kpiId is missing', () => {
    const errors = validateRow({ kpiId: '', period: 'Q1', year: 2026, value: 100 }, 2)
    expect(errors[0]).toMatch(/kpiId/)
  })

  it('returns error for invalid period', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'X3' as any, year: 2026, value: 100 }, 3)
    expect(errors[0]).toMatch(/period/)
  })

  it('returns error for non-numeric value', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'Q2', year: 2026, value: NaN }, 4)
    expect(errors[0]).toMatch(/value/)
  })

  it('returns error for year outside 2020-2030', () => {
    const errors = validateRow({ kpiId: 'k1', period: 'Q1', year: 1999, value: 50 }, 5)
    expect(errors[0]).toMatch(/year/)
  })
})

describe('normalizeRow', () => {
  it('trims whitespace from string fields', () => {
    const row = normalizeRow({ kpiId: '  k1  ', period: ' Q1 ' as any, year: 2026, value: 10 })
    expect(row.kpiId).toBe('k1')
    expect(row.period).toBe('Q1')
  })

  it('coerces string numbers to numbers', () => {
    const row = normalizeRow({ kpiId: 'k1', period: 'Q1', year: '2026' as any, value: '99.5' as any })
    expect(typeof row.year).toBe('number')
    expect(typeof row.value).toBe('number')
  })
})

describe('parseExcelFile', () => {
  function makeBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    return out as ArrayBuffer
  }

  it('returns valid rows for a well-formed file', () => {
    const buffer = makeBuffer([{ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }])
    const result = parseExcelFile(buffer)
    expect(result.valid).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })

  it('returns errors for invalid rows', () => {
    const buffer = makeBuffer([{ kpiId: '', period: 'Q1', year: 2026, value: 100 }])
    const result = parseExcelFile(buffer)
    expect(result.valid).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toMatch(/kpiId/)
  })

  it('returns structured error when XLSX.read throws', () => {
    // Pass null to trigger a try/catch (XLSX.read will throw on null)
    const result = parseExcelFile(null as any)
    expect(result.valid).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].row).toBe(0)
    expect(result.errors[0].message).toMatch(/تعذّر/)
  })

  it('row numbers in errors account for header offset (start at 2)', () => {
    const buffer = makeBuffer([
      { kpiId: 'k1', period: 'Q1', year: 2026, value: 100 },
      { kpiId: '', period: 'Q1', year: 2026, value: 50 },
    ])
    const result = parseExcelFile(buffer)
    expect(result.errors[0].row).toBe(3) // row 1=header, row 2=first data, row 3=second data
  })
})

describe('isActivityFile', () => {
  function makeActivityBuffer(): ArrayBuffer {
    const ws = XLSX.utils.json_to_sheet([
      { 'الوحدة التنظيمية': 'ادارة التعليم', 'الأنشطة': 'نشاط 1', '2025': 80, 'المستهدف 2026': 100, '2026 Q1': 85, 'الفئة': 'تعليم' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  }

  it('returns true when الأنشطة header is present', () => {
    expect(isActivityFile(makeActivityBuffer())).toBe(true)
  })

  it('returns false for the legacy format', () => {
    const ws = XLSX.utils.json_to_sheet([{ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    expect(isActivityFile(buf)).toBe(false)
  })
})

describe('parseActivityFile', () => {
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

  it('parses a valid row correctly', () => {
    const result = parseActivityFile(makeBuffer([validRow]))
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
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
    expect(result.errors[0].message).toMatch(/الوحدة التنظيمية/)
  })

  it('skips rows with an empty activity name silently', () => {
    const result = parseActivityFile(makeBuffer([{ ...validRow, 'الأنشطة': '' }]))
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('handles missing optional columns gracefully', () => {
    const { 'الفئة': _, '2025': __, ...rowWithoutOptionals } = validRow
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
