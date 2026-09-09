export const DIVISIONS = [
  {
    id: 'CULTURE_RESEARCH',
    labelAr: 'قطاع الثقافة والبحوث',
    shortAr: 'الثقافة والبحوث',
    icon: '◈',
    active: true,
  },
  {
    id: 'INSTITUTIONAL_SUPPORT',
    labelAr: 'قطاع الدعم المؤسسي',
    shortAr: 'الدعم المؤسسي',
    icon: '◉',
    active: false,
  },
  {
    id: 'ZAKAT_DEVELOPMENT',
    labelAr: 'قطاع الزكاة والمشاريع التنموية',
    shortAr: 'الزكاة والمشاريع',
    icon: '◎',
    active: false,
  },
] as const

export type DivisionId = typeof DIVISIONS[number]['id']

export const DIVISION_MAP = Object.fromEntries(
  DIVISIONS.map(d => [d.id, d])
) as Record<DivisionId, typeof DIVISIONS[number]>

export const DEFAULT_DIVISION: DivisionId = 'CULTURE_RESEARCH'
