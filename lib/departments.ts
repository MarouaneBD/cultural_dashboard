export const DEPARTMENTS = [
  { id: 'EDUCATION',             labelAr: 'ادارة التعليم',              icon: '📚', color: '#0284c7' },
  { id: 'FAMILY_CULTURE',        labelAr: 'ادارة ثقافة الأسرة',        icon: '👨‍👩‍👧', color: '#7c3aed' },
  { id: 'ISLAMIC_INFO_CENTER',   labelAr: 'مركز المعلومات الاسلامي',   icon: '🕌', color: '#059669' },
  { id: 'AL_BIRR_MALE',          labelAr: 'مشروع البر - ذكور',         icon: '👦', color: '#0369a1' },
  { id: 'AL_BIRR_FEMALE',        labelAr: 'مشروع البر - اناث',         icon: '👧', color: '#0d9488' },
  { id: 'ORPHANS',               labelAr: 'قسم الأيتام',               icon: '🤲', color: '#d97706' },
  { id: 'SCIENTIFIC_PROGRAMS',   labelAr: 'مكتب البرامج العلمية',      icon: '📖', color: '#6d28d9' },
  { id: 'RESEARCH_PUBLICATIONS', labelAr: 'وحدة البحوث والمطبوعات',    icon: '📝', color: '#0369a1' },
] as const

export type DeptId = typeof DEPARTMENTS[number]['id']

export const DEPT_MAP = Object.fromEntries(
  DEPARTMENTS.map(d => [d.id, d])
) as Record<DeptId, typeof DEPARTMENTS[number]>

export const VALID_PILLAR_IDS = new Set<string>(DEPARTMENTS.map(d => d.id))
