import type { KpiWithVariance } from '@/types'

export function generateNarrative(kpis: KpiWithVariance[]): string {
  if (kpis.length === 0) return 'لا توجد بيانات كافية لإنشاء الملخص التنفيذي.'

  const green = kpis.filter(k => k.variance.color === 'green')
  const amber = kpis.filter(k => k.variance.color === 'amber')
  const red = kpis.filter(k => k.variance.color === 'red')

  const parts: string[] = []

  if (green.length > 0) {
    const names = green.map(k => k.nameAr).join(' و')
    parts.push(`بلغت ${names} أهدافها بنسبة تجاوزت ٩٥٪، وهو مؤشر ممتاز.`)
  }

  if (amber.length > 0) {
    const names = amber.map(k => k.nameAr).join(' و')
    parts.push(`يسير كل من ${names} بوتيرة مقبولة تتراوح بين ٨٥ و٩٥٪، وتستدعي متابعة دقيقة.`)
  }

  if (red.length > 0) {
    const names = red.map(k => k.nameAr).join(' و')
    parts.push(`تستدعي ${names} تدخلاً عاجلاً؛ إذ لم تتجاوز نسبة الإنجاز ٨٥٪ المطلوبة.`)
  }

  return parts.join(' ')
}
