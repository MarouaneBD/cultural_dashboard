// Registry of departments that have a full DepartmentDashboard data file.
// Adding a new dept = create data/departments/[slug].ts and add one entry here.

import type { DeptConfig } from '@/components/department/DepartmentDashboard'
import type { PillarId } from '@/types'
import { educationData }          from './education'
import { familyCultureData }      from './family-culture'
import { islamicInfoCenterData }  from './islamic-info-center'
import { alBirrMaleData }         from './al-birr-male'
import { alBirrFemaleData }       from './al-birr-female'
import { orphansData }            from './orphans'
import { scientificProgramsData }      from './scientific-programs'
import { researchPublicationsData }    from './research-publications'

export const DEPT_DASHBOARDS: Record<PillarId, DeptConfig> = {
  EDUCATION: {
    nameAr: 'ادارة التعليم',
    icon: '📚',
    color: '#0284c7',
    data: educationData,
  },
  FAMILY_CULTURE: {
    nameAr: 'ادارة ثقافة الأسرة',
    icon: '👨‍👩‍👧',
    color: '#7c3aed',
    data: familyCultureData,
  },
  ISLAMIC_INFO_CENTER: {
    nameAr: 'مركز المعلومات الاسلامي',
    icon: '🕌',
    color: '#059669',
    data: islamicInfoCenterData,
  },
  AL_BIRR_MALE: {
    nameAr: 'مشروع البر - ذكور',
    icon: '👦',
    color: '#0369a1',
    data: alBirrMaleData,
  },
  AL_BIRR_FEMALE: {
    nameAr: 'مشروع البر - اناث',
    icon: '👧',
    color: '#0d9488',
    data: alBirrFemaleData,
  },
  ORPHANS: {
    nameAr: 'قسم الأيتام',
    icon: '🤲',
    color: '#d97706',
    data: orphansData,
  },
  SCIENTIFIC_PROGRAMS: {
    nameAr: 'مكتب البرامج العلمية',
    icon: '📖',
    color: '#6d28d9',
    data: scientificProgramsData,
  },
  RESEARCH_PUBLICATIONS: {
    nameAr: 'وحدة البحوث والمطبوعات',
    icon: '📝',
    color: '#0369a1',
    data: researchPublicationsData,
  },
}
