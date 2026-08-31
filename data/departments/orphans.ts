import type { DeptData } from '@/types/department'

export const orphansData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'الأيتام المسجلون',     value: 680,  unit: '',  icon: 'Users' },
      { labelAr: 'الكفلاء النشطون',      value: 524,  unit: '',  icon: 'CheckCircle' },
      { labelAr: 'البرامج التربوية',      value: 29,   unit: '',  icon: 'BookOpen' },
      { labelAr: 'نسبة التغطية',          value: 96,   unit: '%', icon: 'TrendingUp' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 85 }, { month: 'Feb', value: 87 },
      { month: 'Mar', value: 90 }, { month: 'Apr', value: 88 },
      { month: 'May', value: 91 }, { month: 'Jun', value: 93 },
      { month: 'Jul', value: 92 }, { month: 'Aug', value: 94 },
      { month: 'Sep', value: 96 }, { month: 'Oct', value: 95 },
      { month: 'Nov', value: 94 }, { month: 'Dec', value: 93 },
    ],
    categoryBreakdown: [
      { nameAr: 'الكفالة المالية',       value: 45 },
      { nameAr: 'الدعم التعليمي',        value: 30 },
      { nameAr: 'الرعاية الصحية',        value: 15 },
      { nameAr: 'الأنشطة الترفيهية',    value: 10 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 88, target: 85 },
      { quarter: 'Q2', achieved: 92, target: 88 },
      { quarter: 'Q3', achieved: 95, target: 90 },
      { quarter: 'Q4', achieved: 94, target: 92 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'الأيتام المسجلون', target: 720, current: 340, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 680,
        quarters: [
          { q: 'Q1', actual: 170,  target: 180 },
          { q: 'Q2', actual: 170,  target: 180 },
          { q: 'Q3', actual: null, target: 180 },
          { q: 'Q4', actual: null, target: 180 },
        ],
      },
      {
        labelAr: 'الكفلاء النشطون', target: 580, current: 268, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 524,
        quarters: [
          { q: 'Q1', actual: 134,  target: 145 },
          { q: 'Q2', actual: 134,  target: 145 },
          { q: 'Q3', actual: null, target: 145 },
          { q: 'Q4', actual: null, target: 145 },
        ],
      },
      {
        labelAr: 'البرامج التربوية', target: 36, current: 14, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 29,
        quarters: [
          { q: 'Q1', actual: 7,    target: 9 },
          { q: 'Q2', actual: 7,    target: 9 },
          { q: 'Q3', actual: null, target: 9 },
          { q: 'Q4', actual: null, target: 9 },
        ],
      },
      {
        labelAr: 'نسبة التغطية', target: 98, current: 96, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 96,
        quarters: [
          { q: 'Q1', actual: 96,   target: 98 },
          { q: 'Q2', actual: 96,   target: 98 },
          { q: 'Q3', actual: null, target: 98 },
          { q: 'Q4', actual: null, target: 98 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 88,   target: 86 },
      { month: 'Feb', actual: 91,   target: 88 },
      { month: 'Mar', actual: 93,   target: 90 },
      { month: 'Apr', actual: 92,   target: 90 },
      { month: 'May', actual: null, target: 91 },
      { month: 'Jun', actual: null, target: 92 },
      { month: 'Jul', actual: null, target: 93 },
      { month: 'Aug', actual: null, target: 94 },
      { month: 'Sep', actual: null, target: 95 },
      { month: 'Oct', actual: null, target: 96 },
      { month: 'Nov', actual: null, target: 97 },
      { month: 'Dec', actual: null, target: 98 },
    ],
  },
}

export async function parseFromFile(_file: File): Promise<DeptData> {
  throw new Error('File upload not yet implemented for قسم الأيتام')
}
