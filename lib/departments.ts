import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, HeartHandshake, Landmark, UserRound, UserRoundCheck,
  HandHeart, LibraryBig, ScrollText, Building2, Coins,
  Users, Briefcase, Package,
} from 'lucide-react'
import type { DivisionId } from '@/lib/divisions'

type Dept = {
  id: string
  labelAr: string
  icon: LucideIcon
  color: string
  division: DivisionId
}

export const DEPARTMENTS: Dept[] = [
  { id: 'EDUCATION',             labelAr: 'ادارة التعليم',              icon: GraduationCap,  color: '#0284c7', division: 'CULTURE_RESEARCH'      },
  { id: 'FAMILY_CULTURE',        labelAr: 'ادارة ثقافة الأسرة',        icon: HeartHandshake, color: '#7c3aed', division: 'CULTURE_RESEARCH'      },
  { id: 'ISLAMIC_INFO_CENTER',   labelAr: 'مركز المعلومات الاسلامي',   icon: Landmark,       color: '#059669', division: 'CULTURE_RESEARCH'      },
  { id: 'AL_BIRR_MALE',          labelAr: 'مشروع البر - ذكور',         icon: UserRound,      color: '#0369a1', division: 'CULTURE_RESEARCH'      },
  { id: 'AL_BIRR_FEMALE',        labelAr: 'مشروع البر - اناث',         icon: UserRoundCheck, color: '#9333ea', division: 'CULTURE_RESEARCH'      },
  { id: 'ORPHANS',               labelAr: 'قسم الأيتام',               icon: HandHeart,      color: '#d97706', division: 'CULTURE_RESEARCH'      },
  { id: 'SCIENTIFIC_PROGRAMS',   labelAr: 'مكتب البرامج العلمية',      icon: LibraryBig,     color: '#6d28d9', division: 'CULTURE_RESEARCH'      },
  { id: 'RESEARCH_PUBLICATIONS', labelAr: 'وحدة البحوث والمطبوعات',    icon: ScrollText,     color: '#0369a1', division: 'CULTURE_RESEARCH'      },
  { id: 'DEVELOPMENT_PROJECTS',  labelAr: 'ادارة المشاريع التنموية',   icon: Building2,      color: '#0369a1', division: 'ZAKAT_DEVELOPMENT'      },
  { id: 'ZAKAT_MANAGEMENT',      labelAr: 'ادارة الزكاة',              icon: Coins,          color: '#059669', division: 'ZAKAT_DEVELOPMENT'      },
  { id: 'HR_MANAGEMENT',         labelAr: 'ادارة الموارد البشرية',     icon: Users,          color: '#0e7490', division: 'INSTITUTIONAL_SUPPORT'  },
  { id: 'ADMIN_AFFAIRS',         labelAr: 'ادارة الشؤون الادارية',     icon: Briefcase,      color: '#7c3aed', division: 'INSTITUTIONAL_SUPPORT'  },
  { id: 'PROCUREMENT',           labelAr: 'ادارة المشتريات',           icon: Package,        color: '#b45309', division: 'INSTITUTIONAL_SUPPORT'  },
]

export type DeptId = typeof DEPARTMENTS[number]['id']

export const DEPT_MAP = Object.fromEntries(
  DEPARTMENTS.map(d => [d.id, d])
) as Record<DeptId, Dept>

export const VALID_PILLAR_IDS = new Set<string>(DEPARTMENTS.map(d => d.id))
