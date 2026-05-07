export const DEPARTMENTS = [
  { id: 'EDUCATION',           labelAr: 'ادارة التعليم',                    icon: '📚' },
  { id: 'FAMILY_CULTURE',      labelAr: 'ادارة ثقافة الأسرة',              icon: '👨‍👩‍👧' },
  { id: 'ISLAMIC_INFO_CENTER', labelAr: 'مركز المعلومات الاسلامي',          icon: '🕌' },
  { id: 'AL_BIRR_MALE',        labelAr: 'مشروع البر - ذكور',               icon: '👦' },
  { id: 'AL_BIRR_FEMALE',      labelAr: 'مشروع البر - اناث',               icon: '👧' },
  { id: 'ORPHANS',             labelAr: 'قسم الأيتام',                      icon: '🤲' },
  { id: 'SCIENTIFIC_PROGRAMS', labelAr: 'مكتب البرامج العلمية والأيتام',    icon: '📖' },
] as const

export type DeptId = typeof DEPARTMENTS[number]['id']

export const DEPT_MAP = Object.fromEntries(
  DEPARTMENTS.map(d => [d.id, d])
) as Record<DeptId, typeof DEPARTMENTS[number]>
