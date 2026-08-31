import type { DeptData } from '@/types/department'

export const scientificProgramsData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'البحوث المنجزة',        value: 18,   unit: '',  icon: 'BookOpen' },
      { labelAr: 'المنح الدراسية',         value: 63,   unit: '',  icon: 'GraduationCap' },
      { labelAr: 'الشراكات العلمية',       value: 11,   unit: '',  icon: 'CheckCircle' },
      { labelAr: 'معدل الإنجاز',           value: 81,   unit: '%', icon: 'TrendingUp' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 62 }, { month: 'Feb', value: 65 },
      { month: 'Mar', value: 69 }, { month: 'Apr', value: 67 },
      { month: 'May', value: 71 }, { month: 'Jun', value: 75 },
      { month: 'Jul', value: 73 }, { month: 'Aug', value: 77 },
      { month: 'Sep', value: 80 }, { month: 'Oct', value: 78 },
      { month: 'Nov', value: 76 }, { month: 'Dec', value: 74 },
    ],
    categoryBreakdown: [
      { nameAr: 'البحث العلمي',          value: 36 },
      { nameAr: 'المنح والابتعاث',       value: 30 },
      { nameAr: 'المؤتمرات والندوات',    value: 22 },
      { nameAr: 'الشراكات الأكاديمية',   value: 12 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 65, target: 72 },
      { quarter: 'Q2', achieved: 73, target: 75 },
      { quarter: 'Q3', achieved: 78, target: 78 },
      { quarter: 'Q4', achieved: 76, target: 78 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'البحوث المنجزة', target: 24, current: 7, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 18,
        quarters: [
          { q: 'Q1', actual: 4,    target: 6 },
          { q: 'Q2', actual: 3,    target: 6 },
          { q: 'Q3', actual: null, target: 6 },
          { q: 'Q4', actual: null, target: 6 },
        ],
      },
      {
        labelAr: 'المنح الدراسية', target: 80, current: 28, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 63,
        quarters: [
          { q: 'Q1', actual: 14,   target: 20 },
          { q: 'Q2', actual: 14,   target: 20 },
          { q: 'Q3', actual: null, target: 20 },
          { q: 'Q4', actual: null, target: 20 },
        ],
      },
      {
        labelAr: 'الشراكات العلمية', target: 15, current: 5, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 11,
        quarters: [
          { q: 'Q1', actual: 3,    target: 4 },
          { q: 'Q2', actual: 2,    target: 4 },
          { q: 'Q3', actual: null, target: 4 },
          { q: 'Q4', actual: null, target: 4 },
        ],
      },
      {
        labelAr: 'معدل الإنجاز', target: 88, current: 78, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 81,
        quarters: [
          { q: 'Q1', actual: 78,   target: 88 },
          { q: 'Q2', actual: 78,   target: 88 },
          { q: 'Q3', actual: null, target: 88 },
          { q: 'Q4', actual: null, target: 88 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 66,   target: 64 },
      { month: 'Feb', actual: 70,   target: 66 },
      { month: 'Mar', actual: 73,   target: 68 },
      { month: 'Apr', actual: 71,   target: 68 },
      { month: 'May', actual: null, target: 70 },
      { month: 'Jun', actual: null, target: 72 },
      { month: 'Jul', actual: null, target: 74 },
      { month: 'Aug', actual: null, target: 76 },
      { month: 'Sep', actual: null, target: 78 },
      { month: 'Oct', actual: null, target: 80 },
      { month: 'Nov', actual: null, target: 84 },
      { month: 'Dec', actual: null, target: 88 },
    ],
  },
}

export async function parseFromFile(_file: File): Promise<DeptData> {
  throw new Error('File upload not yet implemented for مكتب البرامج العلمية')
}
