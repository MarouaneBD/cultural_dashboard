import * as XLSX from 'xlsx'
import { validateRow, normalizeRow, parseExcelFile } from '@/lib/excel'

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
