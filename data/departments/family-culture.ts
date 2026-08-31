import type { DeptData } from '@/types/department'

export const familyCultureData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'الجلسات الأسرية',         value: 312,  unit: '',  icon: 'Users' },
      { labelAr: 'المستفيدون من البرامج',    value: 4180, unit: '',  icon: 'BookOpen' },
      { labelAr: 'معدل المشاركة',             value: 88,   unit: '%', icon: 'TrendingUp' },
      { labelAr: 'رضا المستفيدين',           value: 93,   unit: '%', icon: 'Star' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 78 }, { month: 'Feb', value: 82 },
      { month: 'Mar', value: 85 }, { month: 'Apr', value: 83 },
      { month: 'May', value: 87 }, { month: 'Jun', value: 91 },
      { month: 'Jul', value: 89 }, { month: 'Aug', value: 92 },
      { month: 'Sep', value: 95 }, { month: 'Oct', value: 93 },
      { month: 'Nov', value: 94 }, { month: 'Dec', value: 96 },
    ],
    categoryBreakdown: [
      { nameAr: 'التوجيه الأسري',    value: 35 },
      { nameAr: 'تنمية المهارات',     value: 28 },
      { nameAr: 'برامج الطفولة',      value: 22 },
      { nameAr: 'الدعم النفسي',       value: 15 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 83, target: 82 },
      { quarter: 'Q2', achieved: 88, target: 85 },
      { quarter: 'Q3', achieved: 92, target: 88 },
      { quarter: 'Q4', achieved: 96, target: 90 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'الجلسات الأسرية', target: 360, current: 168, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 312,
        quarters: [
          { q: 'Q1', actual: 84,   target: 90 },
          { q: 'Q2', actual: 84,   target: 90 },
          { q: 'Q3', actual: null, target: 90 },
          { q: 'Q4', actual: null, target: 90 },
        ],
      },
      {
        labelAr: 'المستفيدون', target: 5000, current: 2290, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 4180,
        quarters: [
          { q: 'Q1', actual: 1145, target: 1250 },
          { q: 'Q2', actual: 1145, target: 1250 },
          { q: 'Q3', actual: null, target: 1250 },
          { q: 'Q4', actual: null, target: 1250 },
        ],
      },
      {
        labelAr: 'معدل المشاركة', target: 92, current: 90, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 88,
        quarters: [
          { q: 'Q1', actual: 90,   target: 92 },
          { q: 'Q2', actual: 90,   target: 92 },
          { q: 'Q3', actual: null, target: 92 },
          { q: 'Q4', actual: null, target: 92 },
        ],
      },
      {
        labelAr: 'رضا المستفيدين', target: 95, current: 94, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 93,
        quarters: [
          { q: 'Q1', actual: 94,   target: 95 },
          { q: 'Q2', actual: 94,   target: 95 },
          { q: 'Q3', actual: null, target: 95 },
          { q: 'Q4', actual: null, target: 95 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 84,   target: 82 },
      { month: 'Feb', actual: 88,   target: 84 },
      { month: 'Mar', actual: 91,   target: 86 },
      { month: 'Apr', actual: 90,   target: 86 },
      { month: 'May', actual: null, target: 88 },
      { month: 'Jun', actual: null, target: 88 },
      { month: 'Jul', actual: null, target: 90 },
      { month: 'Aug', actual: null, target: 90 },
      { month: 'Sep', actual: null, target: 92 },
      { month: 'Oct', actual: null, target: 92 },
      { month: 'Nov', actual: null, target: 92 },
      { month: 'Dec', actual: null, target: 92 },
    ],
  },
}

export async function parseFromFile(_file: File): Promise<DeptData> {
  throw new Error('File upload not yet implemented for ادارة ثقافة الأسرة')
}
