import type { DivisionId } from '@/lib/divisions'

export const DEPARTMENTS = [
  { id: 'EDUCATION',             labelAr: 'ادارة التعليم',              icon: '📚', color: '#0284c7', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'FAMILY_CULTURE',        labelAr: 'ادارة ثقافة الأسرة',        icon: '👨‍👩‍👧', color: '#7c3aed', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'ISLAMIC_INFO_CENTER',   labelAr: 'مركز المعلومات الاسلامي',   icon: '🕌', color: '#059669', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'AL_BIRR_MALE',          labelAr: 'مشروع البر - ذكور',         icon: '👦', color: '#0369a1', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'AL_BIRR_FEMALE',        labelAr: 'مشروع البر - اناث',         icon: '👧', color: '#0d9488', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'ORPHANS',               labelAr: 'قسم الأيتام',               icon: '🤲', color: '#d97706', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'SCIENTIFIC_PROGRAMS',   labelAr: 'مكتب البرامج العلمية',      icon: '📖', color: '#6d28d9', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'RESEARCH_PUBLICATIONS', labelAr: 'وحدة البحوث والمطبوعات',    icon: '📝', color: '#0369a1', division: 'CULTURE_RESEARCH'      as DivisionId },
  { id: 'HR_MANAGEMENT',         labelAr: 'ادارة الموارد البشرية',     icon: '👥', color: '#0e7490', division: 'INSTITUTIONAL_SUPPORT' as DivisionId },
  { id: 'ADMIN_AFFAIRS',         labelAr: 'ادارة الشؤون الادارية',     icon: '🏛️', color: '#7c3aed', division: 'INSTITUTIONAL_SUPPORT' as DivisionId },
  { id: 'PROCUREMENT',           labelAr: 'ادارة المشتريات',            icon: '📦', color: '#b45309', division: 'INSTITUTIONAL_SUPPORT' as DivisionId },
] as const

export type DeptId = typeof DEPARTMENTS[number]['id']

export const DEPT_MAP = Object.fromEntries(
  DEPARTMENTS.map(d => [d.id, d])
) as Record<DeptId, typeof DEPARTMENTS[number]>

export const VALID_PILLAR_IDS = new Set<string>(DEPARTMENTS.map(d => d.id))
