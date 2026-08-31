import type { DeptData } from '@/types/department'

export const alBirrMaleData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'المستفيدون (ذكور)',      value: 1860, unit: '',  icon: 'Users' },
      { labelAr: 'البرامج المنفذة',         value: 38,   unit: '',  icon: 'BookOpen' },
      { labelAr: 'نسبة التغطية',            value: 78,   unit: '%', icon: 'TrendingUp' },
      { labelAr: 'رضا المستفيدين',          value: 89,   unit: '%', icon: 'Star' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 65 }, { month: 'Feb', value: 68 },
      { month: 'Mar', value: 72 }, { month: 'Apr', value: 70 },
      { month: 'May', value: 74 }, { month: 'Jun', value: 78 },
      { month: 'Jul', value: 76 }, { month: 'Aug', value: 80 },
      { month: 'Sep', value: 83 }, { month: 'Oct', value: 81 },
      { month: 'Nov', value: 79 }, { month: 'Dec', value: 77 },
    ],
    categoryBreakdown: [
      { nameAr: 'الدعم المادي',       value: 40 },
      { nameAr: 'التأهيل المهني',     value: 30 },
      { nameAr: 'الدعم التعليمي',     value: 20 },
      { nameAr: 'الأنشطة الترفيهية', value: 10 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 68, target: 75 },
      { quarter: 'Q2', achieved: 76, target: 78 },
      { quarter: 'Q3', achieved: 80, target: 80 },
      { quarter: 'Q4', achieved: 78, target: 80 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'المستفيدون (ذكور)', target: 2200, current: 860, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 1860,
        quarters: [
          { q: 'Q1', actual: 430,  target: 550 },
          { q: 'Q2', actual: 430,  target: 550 },
          { q: 'Q3', actual: null, target: 550 },
          { q: 'Q4', actual: null, target: 550 },
        ],
      },
      {
        labelAr: 'البرامج المنفذة', target: 48, current: 14, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 38,
        quarters: [
          { q: 'Q1', actual: 7,    target: 12 },
          { q: 'Q2', actual: 7,    target: 12 },
          { q: 'Q3', actual: null, target: 12 },
          { q: 'Q4', actual: null, target: 12 },
        ],
      },
      {
        labelAr: 'نسبة التغطية', target: 85, current: 74, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 78,
        quarters: [
          { q: 'Q1', actual: 74,   target: 85 },
          { q: 'Q2', actual: 74,   target: 85 },
          { q: 'Q3', actual: null, target: 85 },
          { q: 'Q4', actual: null, target: 85 },
        ],
      },
      {
        labelAr: 'رضا المستفيدين', target: 92, current: 88, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 89,
        quarters: [
          { q: 'Q1', actual: 88,   target: 92 },
          { q: 'Q2', actual: 88,   target: 92 },
          { q: 'Q3', actual: null, target: 92 },
          { q: 'Q4', actual: null, target: 92 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 70,   target: 68 },
      { month: 'Feb', actual: 73,   target: 70 },
      { month: 'Mar', actual: 76,   target: 72 },
      { month: 'Apr', actual: 74,   target: 72 },
      { month: 'May', actual: null, target: 74 },
      { month: 'Jun', actual: null, target: 76 },
      { month: 'Jul', actual: null, target: 78 },
      { month: 'Aug', actual: null, target: 78 },
      { month: 'Sep', actual: null, target: 80 },
      { month: 'Oct', actual: null, target: 82 },
      { month: 'Nov', actual: null, target: 84 },
      { month: 'Dec', actual: null, target: 85 },
    ],
  },
}

export async function parseFromFile(_file: File): Promise<DeptData> {
  throw new Error('File upload not yet implemented for مشروع البر - ذكور')
}
