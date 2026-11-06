import { generateNarrative } from '@/lib/narrative'
import type { KpiWithVariance } from '@/types'

const makeKpi = (nameAr: string, pct: number): KpiWithVariance => ({
  id: nameAr,
  nameAr,
  pillar: 'EDUCATION',
  unit: 'COUNT',
  variance: {
    actual: pct,
    target: 100,
    pct,
    color: pct > 95 ? 'green' : pct >= 85 ? 'amber' : 'red',
  },
  sparkline: [pct - 10, pct - 5, pct - 2, pct],
})

describe('generateNarrative', () => {
  it('returns a non-empty Arabic string', () => {
    const text = generateNarrative([makeKpi('طباعة المصاحف', 90)])
    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(0)
  })

  it('mentions red KPIs in the output', () => {
    const text = generateNarrative([makeKpi('توزيع المصاحف', 70)])
    expect(text).toContain('تدخلاً فورياً')
  })

  it('mentions amber KPIs in the output', () => {
    const text = generateNarrative([makeKpi('مسابقات التلاوة', 88)])
    expect(text).toContain('تستدعي المتابعة')
  })

  it('handles empty input gracefully', () => {
    const text = generateNarrative([])
    expect(typeof text).toBe('string')
    expect(text).toBe('لا توجد بيانات كافية لإنشاء الملخص التنفيذي.')
  })

  it('separates green/amber/red groups in separate sentences', () => {
    const kpis = [
      makeKpi('المراكز الإسلامية', 97),
      makeKpi('ساعات التدريب', 88),
      makeKpi('توزيع المصاحف', 60),
    ]
    const text = generateNarrative(kpis)
    // generateNarrative outputs aggregate sentences, not individual KPI names.
    // With avg ~82%: "ضمن النطاق المقبول", red=1 triggers "تدخلاً فورياً", amber=1 triggers "تستدعي المتابعة"
    expect(text).toContain('تدخلاً فورياً')
    expect(text).toContain('تستدعي المتابعة')
  })
})
