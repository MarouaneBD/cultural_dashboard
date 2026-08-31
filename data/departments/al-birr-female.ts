import type { DeptData } from '@/types/department'

export const alBirrFemaleData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'المستفيدات (إناث)',      value: 2140, unit: '',  icon: 'Users' },
      { labelAr: 'البرامج المنفذة',         value: 44,   unit: '',  icon: 'BookOpen' },
      { labelAr: 'نسبة التغطية',            value: 82,   unit: '%', icon: 'TrendingUp' },
      { labelAr: 'رضا المستفيدات',          value: 94,   unit: '%', icon: 'Star' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 70 }, { month: 'Feb', value: 74 },
      { month: 'Mar', value: 78 }, { month: 'Apr', value: 76 },
      { month: 'May', value: 80 }, { month: 'Jun', value: 84 },
      { month: 'Jul', value: 82 }, { month: 'Aug', value: 86 },
      { month: 'Sep', value: 89 }, { month: 'Oct', value: 87 },
      { month: 'Nov', value: 85 }, { month: 'Dec', value: 84 },
    ],
    categoryBreakdown: [
      { nameAr: 'الدعم المادي',         value: 38 },
      { nameAr: 'التمكين الأسري',       value: 32 },
      { nameAr: 'التدريب والتأهيل',     value: 18 },
      { nameAr: 'الأنشطة الاجتماعية',  value: 12 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 74, target: 78 },
      { quarter: 'Q2', achieved: 82, target: 80 },
      { quarter: 'Q3', achieved: 86, target: 83 },
      { quarter: 'Q4', achieved: 85, target: 83 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'المستفيدات (إناث)', target: 2600, current: 1020, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 2140,
        quarters: [
          { q: 'Q1', actual: 510,  target: 650 },
          { q: 'Q2', actual: 510,  target: 650 },
          { q: 'Q3', actual: null, target: 650 },
          { q: 'Q4', actual: null, target: 650 },
        ],
      },
      {
        labelAr: 'البرامج المنفذة', target: 52, current: 18, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 44,
        quarters: [
          { q: 'Q1', actual: 9,    target: 13 },
          { q: 'Q2', actual: 9,    target: 13 },
          { q: 'Q3', actual: null, target: 13 },
          { q: 'Q4', actual: null, target: 13 },
        ],
      },
      {
        labelAr: 'نسبة التغطية', target: 88, current: 80, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 82,
        quarters: [
          { q: 'Q1', actual: 80,   target: 88 },
          { q: 'Q2', actual: 80,   target: 88 },
          { q: 'Q3', actual: null, target: 88 },
          { q: 'Q4', actual: null, target: 88 },
        ],
      },
      {
        labelAr: 'رضا المستفيدات', target: 96, current: 93, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 94,
        quarters: [
          { q: 'Q1', actual: 93,   target: 96 },
          { q: 'Q2', actual: 93,   target: 96 },
          { q: 'Q3', actual: null, target: 96 },
          { q: 'Q4', actual: null, target: 96 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 74,   target: 72 },
      { month: 'Feb', actual: 78,   target: 74 },
      { month: 'Mar', actual: 81,   target: 76 },
      { month: 'Apr', actual: 79,   target: 76 },
      { month: 'May', actual: null, target: 78 },
      { month: 'Jun', actual: null, target: 80 },
      { month: 'Jul', actual: null, target: 82 },
      { month: 'Aug', actual: null, target: 82 },
      { month: 'Sep', actual: null, target: 84 },
      { month: 'Oct', actual: null, target: 86 },
      { month: 'Nov', actual: null, target: 88 },
      { month: 'Dec', actual: null, target: 88 },
    ],
  },
}

export async function parseFromFile(_file: File): Promise<DeptData> {
  throw new Error('File upload not yet implemented for مشروع البر - اناث')
}
