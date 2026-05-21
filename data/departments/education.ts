// Department data for: ادارة التعليم (EDUCATION)
// Replace dummy values by wiring parseFromFile() when upload is ready.

import type { DeptData } from '@/types/department'

export const educationData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'الطلاب المسجلون',   value: 2840, unit: '',  icon: 'Users' },
      { labelAr: 'البرامج المنفذة',    value: 47,   unit: '',  icon: 'BookOpen' },
      { labelAr: 'معدل الإتمام',       value: 84,   unit: '%', icon: 'GraduationCap' },
      { labelAr: 'رضا المستفيدين',     value: 91,   unit: '%', icon: 'Star' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 75 },
      { month: 'Feb', value: 78 },
      { month: 'Mar', value: 82 },
      { month: 'Apr', value: 80 },
      { month: 'May', value: 84 },
      { month: 'Jun', value: 88 },
      { month: 'Jul', value: 85 },
      { month: 'Aug', value: 89 },
      { month: 'Sep', value: 91 },
      { month: 'Oct', value: 87 },
      { month: 'Nov', value: 86 },
      { month: 'Dec', value: 84 },
    ],
    categoryBreakdown: [
      { nameAr: 'التعليم القرآني',    value: 38 },
      { nameAr: 'التربية الإسلامية',  value: 32 },
      { nameAr: 'التعليم العام',       value: 18 },
      { nameAr: 'الأنشطة الطلابية',   value: 12 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 80, target: 85 },
      { quarter: 'Q2', achieved: 87, target: 85 },
      { quarter: 'Q3', achieved: 91, target: 88 },
      { quarter: 'Q4', achieved: 88, target: 88 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'الطلاب المسجلون', target: 3200, current: 1540, unit: '',
        lastYearValue: 2840,
        quarters: [
          { q: 'Q1', actual: 770,  target: 800 },
          { q: 'Q2', actual: 770,  target: 800 },
          { q: 'Q3', actual: null, target: 800 },
          { q: 'Q4', actual: null, target: 800 },
        ],
      },
      {
        labelAr: 'البرامج المنفذة', target: 55, current: 18, unit: '',
        lastYearValue: 47,
        quarters: [
          { q: 'Q1', actual: 9,    target: 14 },
          { q: 'Q2', actual: 9,    target: 14 },
          { q: 'Q3', actual: null, target: 14 },
          { q: 'Q4', actual: null, target: 14 },
        ],
      },
      {
        labelAr: 'معدل الإتمام', target: 90, current: 86, unit: '%',
        lastYearValue: 84,
        quarters: [
          { q: 'Q1', actual: 86,   target: 90 },
          { q: 'Q2', actual: 86,   target: 90 },
          { q: 'Q3', actual: null, target: 90 },
          { q: 'Q4', actual: null, target: 90 },
        ],
      },
      {
        labelAr: 'رضا المستفيدين', target: 93, current: 92, unit: '%',
        lastYearValue: 91,
        quarters: [
          { q: 'Q1', actual: 92,   target: 93 },
          { q: 'Q2', actual: 92,   target: 93 },
          { q: 'Q3', actual: null, target: 93 },
          { q: 'Q4', actual: null, target: 93 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 82,   target: 80 },
      { month: 'Feb', actual: 86,   target: 82 },
      { month: 'Mar', actual: 88,   target: 84 },
      { month: 'Apr', actual: 85,   target: 84 },
      { month: 'May', actual: null, target: 86 },
      { month: 'Jun', actual: null, target: 86 },
      { month: 'Jul', actual: null, target: 88 },
      { month: 'Aug', actual: null, target: 88 },
      { month: 'Sep', actual: null, target: 90 },
      { month: 'Oct', actual: null, target: 90 },
      { month: 'Nov', actual: null, target: 90 },
      { month: 'Dec', actual: null, target: 90 },
    ],
  },
}

/**
 * TODO: Parse an uploaded Excel/CSV/PDF file and return data in the same
 * shape as `educationData`. Wire to the "Upload Data File" button once the
 * file-ingestion layer is ready (see /app/upload for the upload UI).
 *
 * Expected file columns (Excel): Month | Actual | Target | Category | ...
 */
export async function parseFromFile(_file: File): Promise<DeptData> {
  throw new Error('File upload not yet implemented for ادارة التعليم')
}
