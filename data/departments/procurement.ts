// Department data for: ادارة المشتريات (PROCUREMENT)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const procurementData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'قيمة العقود المبرمة',        value: 4200000, unit: ' د.إ', icon: 'DollarSign' },
      { labelAr: 'عدد العقود',                  value: 38,      unit: '',     icon: 'FileText' },
      { labelAr: 'نسبة الالتزام بالميزانية',    value: 91,      unit: '%',    icon: 'TrendingUp' },
      { labelAr: 'متوسط وقت إتمام المشتريات',   value: 18,      unit: ' يوم', icon: 'Clock' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 3 },
      { month: 'Feb', value: 4 },
      { month: 'Mar', value: 3 },
      { month: 'Apr', value: 4 },
      { month: 'May', value: 3 },
      { month: 'Jun', value: 3 },
      { month: 'Jul', value: 2 },
      { month: 'Aug', value: 3 },
      { month: 'Sep', value: 4 },
      { month: 'Oct', value: 3 },
      { month: 'Nov', value: 4 },
      { month: 'Dec', value: 2 },
    ],
    categoryBreakdown: [
      { nameAr: 'مشتريات تشغيلية',   value: 45 },
      { nameAr: 'عقود خدمات',          value: 30 },
      { nameAr: 'مشتريات رأسمالية',    value: 15 },
      { nameAr: 'مناقصات',             value: 10 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 10, target: 10 },
      { quarter: 'Q2', achieved: 10, target: 10 },
      { quarter: 'Q3', achieved: 9,  target: 10 },
      { quarter: 'Q4', achieved: 9,  target: 8 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'قيمة العقود المبرمة', target: 5000000, current: 2350000, unit: ' د.إ',
        activityType: 'CUMULATIVE',
        lastYearValue: 4200000,
        quarters: [
          { q: 'Q1', actual: 1150000, target: 1250000 },
          { q: 'Q2', actual: 1200000, target: 1250000 },
          { q: 'Q3', actual: null,    target: 1250000 },
          { q: 'Q4', actual: null,    target: 1250000 },
        ],
      },
      {
        labelAr: 'عدد العقود', target: 45, current: 22, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 38,
        quarters: [
          { q: 'Q1', actual: 11,   target: 11 },
          { q: 'Q2', actual: 11,   target: 11 },
          { q: 'Q3', actual: null, target: 12 },
          { q: 'Q4', actual: null, target: 11 },
        ],
      },
      {
        labelAr: 'نسبة الالتزام بالميزانية', target: 95, current: 92, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 91,
        quarters: [
          { q: 'Q1', actual: 91,   target: 93 },
          { q: 'Q2', actual: 92,   target: 94 },
          { q: 'Q3', actual: null, target: 95 },
          { q: 'Q4', actual: null, target: 95 },
        ],
      },
      {
        labelAr: 'متوسط وقت إتمام المشتريات (يوم)', target: 14, current: 16, unit: ' يوم',
        activityType: 'MONTHLY_VARIANCE',
        lowerIsBetter: true,
        lastYearValue: 18,
        quarters: [
          { q: 'Q1', actual: 17,   target: 16 },
          { q: 'Q2', actual: 16,   target: 15 },
          { q: 'Q3', actual: null, target: 14 },
          { q: 'Q4', actual: null, target: 14 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 380000,  target: 400000 },
      { month: 'Feb', actual: 395000,  target: 400000 },
      { month: 'Mar', actual: 375000,  target: 450000 },
      { month: 'Apr', actual: 410000,  target: 420000 },
      { month: 'May', actual: 390000,  target: 410000 },
      { month: 'Jun', actual: 400000,  target: 420000 },
      { month: 'Jul', actual: null,    target: 420000 },
      { month: 'Aug', actual: null,    target: 420000 },
      { month: 'Sep', actual: null,    target: 420000 },
      { month: 'Oct', actual: null,    target: 420000 },
      { month: 'Nov', actual: null,    target: 420000 },
      { month: 'Dec', actual: null,    target: 420000 },
    ],
  },
}
