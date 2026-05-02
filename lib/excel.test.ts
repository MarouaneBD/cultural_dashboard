import { validateRow, normalizeRow } from '@/lib/excel'

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
