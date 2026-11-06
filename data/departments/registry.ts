// Registry of departments that have a full DepartmentDashboard data file.
// Adding a new dept = create data/departments/[slug].ts and add one entry here.

import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap, HeartHandshake, Landmark, UserRound, UserRoundCheck,
  HandHeart, LibraryBig, ScrollText, Building2, Coins,
  Users, Briefcase, Package,
} from 'lucide-react'
import type { DeptConfig } from '@/components/department/DepartmentDashboard'
import type { PillarId } from '@/types'
import { educationData }           from './education'
import { familyCultureData }       from './family-culture'
import { islamicInfoCenterData }   from './islamic-info-center'
import { alBirrMaleData }          from './al-birr-male'
import { alBirrFemaleData }        from './al-birr-female'
import { orphansData }             from './orphans'
import { scientificProgramsData }  from './scientific-programs'
import { researchPublicationsData } from './research-publications'
import { hrManagementData }          from './hr-management'
import { adminAffairsData }          from './admin-affairs'
import { procurementData }           from './procurement'
import { developmentProjectsData }   from './development-projects'
import { zakatManagementData }       from './zakat-management'

export type { LucideIcon }

export const DEPT_DASHBOARDS: Record<PillarId, DeptConfig> = {
  EDUCATION:             { nameAr: 'ادارة التعليم',              icon: GraduationCap,  color: '#0284c7', data: educationData },
  FAMILY_CULTURE:        { nameAr: 'ادارة ثقافة الأسرة',        icon: HeartHandshake, color: '#7c3aed', data: familyCultureData },
  ISLAMIC_INFO_CENTER:   { nameAr: 'مركز المعلومات الاسلامي',   icon: Landmark,       color: '#059669', data: islamicInfoCenterData },
  AL_BIRR_MALE:          { nameAr: 'مشروع البر - ذكور',         icon: UserRound,      color: '#0369a1', data: alBirrMaleData },
  AL_BIRR_FEMALE:        { nameAr: 'مشروع البر - اناث',         icon: UserRoundCheck, color: '#9333ea', data: alBirrFemaleData },
  ORPHANS:               { nameAr: 'قسم الأيتام',               icon: HandHeart,      color: '#d97706', data: orphansData },
  SCIENTIFIC_PROGRAMS:   { nameAr: 'مكتب البرامج العلمية',      icon: LibraryBig,     color: '#6d28d9', data: scientificProgramsData },
  RESEARCH_PUBLICATIONS: { nameAr: 'وحدة البحوث والمطبوعات',    icon: ScrollText,     color: '#0369a1', data: researchPublicationsData },
  HR_MANAGEMENT:         { nameAr: 'ادارة الموارد البشرية',     icon: Users,          color: '#0e7490', data: hrManagementData },
  ADMIN_AFFAIRS:         { nameAr: 'ادارة الشؤون الادارية',     icon: Briefcase,      color: '#7c3aed', data: adminAffairsData },
  PROCUREMENT:           { nameAr: 'ادارة المشتريات',           icon: Package,        color: '#b45309', data: procurementData },
  DEVELOPMENT_PROJECTS:  { nameAr: 'ادارة المشاريع التنموية',   icon: Building2,      color: '#0369a1', data: developmentProjectsData },
  ZAKAT_MANAGEMENT:      { nameAr: 'ادارة الزكاة',              icon: Coins,          color: '#059669', data: zakatManagementData },
}
