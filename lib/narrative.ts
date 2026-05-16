import type { KpiWithVariance } from '@/types'

export function generateNarrative(kpis: KpiWithVariance[]): string {
  if (kpis.length === 0) return 'لا توجد بيانات كافية لإنشاء الملخص التنفيذي.'

  const avg = Math.round(kpis.reduce((s, k) => s + k.variance.pct, 0) / kpis.length)
  const green = kpis.filter(k => k.variance.color === 'green').length
  const amber = kpis.filter(k => k.variance.color === 'amber').length
  const red   = kpis.filter(k => k.variance.color === 'red').length

  // Overall health sentence
  const health = avg >= 95
    ? `يُحقق القطاع نسبة إنجاز إجمالية ${avg}٪ مقارنةً بالمستهدف — أداء ممتاز.`
    : avg >= 85
    ? `يُحقق القطاع نسبة إنجاز إجمالية ${avg}٪ مقارنةً بالمستهدف — ضمن النطاق المقبول.`
    : `نسبة الإنجاز الإجمالية ${avg}٪ دون المستهدف — يستدعي الوضع مراجعة عاجلة.`

  // Risk sentence
  const risk = red > 0
    ? ` ${red} ${red === 1 ? 'إدارة تحتاج' : 'إدارات تحتاج'} تدخلاً فورياً، و${amber} تستدعي المتابعة.`
    : amber > 0
    ? ` ${green} ${green === 1 ? 'إدارة على المسار' : 'إدارات على المسار'}، و${amber} تستدعي المتابعة.`
    : ` جميع الإدارات الـ${green} تسير على المسار الصحيح.`

  return health + risk
}
