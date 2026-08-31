import type { DeptData } from '@/types/department'

export const islamicInfoCenterData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'الاستفسارات المجابة',   value: 8640, unit: '',  icon: 'CheckCircle' },
      { labelAr: 'المطبوعات الصادرة',     value: 124,  unit: '',  icon: 'BookOpen' },
      { labelAr: 'الزوار الرقميون',        value: 52400, unit: '', icon: 'TrendingUp' },
      { labelAr: 'دقة المعلومات',          value: 97,   unit: '%', icon: 'Star' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 72 }, { month: 'Feb', value: 75 },
      { month: 'Mar', value: 79 }, { month: 'Apr', value: 77 },
      { month: 'May', value: 81 }, { month: 'Jun', value: 84 },
      { month: 'Jul', value: 82 }, { month: 'Aug', value: 86 },
      { month: 'Sep', value: 89 }, { month: 'Oct', value: 87 },
      { month: 'Nov', value: 85 }, { month: 'Dec', value: 83 },
    ],
    categoryBreakdown: [
      { nameAr: 'الفقه والفتاوى',     value: 42 },
      { nameAr: 'السيرة والتاريخ',    value: 25 },
      { nameAr: 'التفسير والقرآن',    value: 20 },
      { nameAr: 'الأنشطة والفعاليات', value: 13 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 75, target: 80 },
      { quarter: 'Q2', achieved: 82, target: 82 },
      { quarter: 'Q3', achieved: 86, target: 84 },
      { quarter: 'Q4', achieved: 85, target: 85 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'الاستفسارات المجابة', target: 10000, current: 4320, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 8640,
        quarters: [
          { q: 'Q1', actual: 2160,  target: 2500 },
          { q: 'Q2', actual: 2160,  target: 2500 },
          { q: 'Q3', actual: null,  target: 2500 },
          { q: 'Q4', actual: null,  target: 2500 },
        ],
      },
      {
        labelAr: 'المطبوعات الصادرة', target: 150, current: 52, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 124,
        quarters: [
          { q: 'Q1', actual: 26,   target: 38 },
          { q: 'Q2', actual: 26,   target: 38 },
          { q: 'Q3', actual: null, target: 38 },
          { q: 'Q4', actual: null, target: 38 },
        ],
      },
      {
        labelAr: 'الزوار الرقميون', target: 65000, current: 26200, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 52400,
        quarters: [
          { q: 'Q1', actual: 13100, target: 16250 },
          { q: 'Q2', actual: 13100, target: 16250 },
          { q: 'Q3', actual: null,  target: 16250 },
          { q: 'Q4', actual: null,  target: 16250 },
        ],
      },
      {
        labelAr: 'دقة المعلومات', target: 98, current: 97, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 97,
        quarters: [
          { q: 'Q1', actual: 97,   target: 98 },
          { q: 'Q2', actual: 97,   target: 98 },
          { q: 'Q3', actual: null, target: 98 },
          { q: 'Q4', actual: null, target: 98 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 78,   target: 76 },
      { month: 'Feb', actual: 80,   target: 78 },
      { month: 'Mar', actual: 83,   target: 80 },
      { month: 'Apr', actual: 81,   target: 80 },
      { month: 'May', actual: null, target: 82 },
      { month: 'Jun', actual: null, target: 82 },
      { month: 'Jul', actual: null, target: 84 },
      { month: 'Aug', actual: null, target: 84 },
      { month: 'Sep', actual: null, target: 86 },
      { month: 'Oct', actual: null, target: 86 },
      { month: 'Nov', actual: null, target: 88 },
      { month: 'Dec', actual: null, target: 88 },
    ],
  },
}

export async function parseFromFile(_file: File): Promise<DeptData> {
  throw new Error('File upload not yet implemented for مركز المعلومات الاسلامي')
}
