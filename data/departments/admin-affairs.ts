// Department data for: ادارة الشؤون الادارية (ADMIN_AFFAIRS)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const adminAffairsData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'المعاملات المنجزة',         value: 3840, unit: '',    icon: 'FileCheck' },
      { labelAr: 'متوسط وقت الإنجاز',         value: 3.2,  unit: ' يوم', icon: 'Clock' },
      { labelAr: 'نسبة رضا المراجعين',         value: 87,   unit: '%',   icon: 'Star' },
      { labelAr: 'الاجتماعات المنعقدة',         value: 96,   unit: '',    icon: 'Users' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 310 },
      { month: 'Feb', value: 295 },
      { month: 'Mar', value: 330 },
      { month: 'Apr', value: 318 },
      { month: 'May', value: 325 },
      { month: 'Jun', value: 340 },
      { month: 'Jul', value: 298 },
      { month: 'Aug', value: 305 },
      { month: 'Sep', value: 322 },
      { month: 'Oct', value: 335 },
      { month: 'Nov', value: 328 },
      { month: 'Dec', value: 314 },
    ],
    categoryBreakdown: [
      { nameAr: 'المراسلات الرسمية',  value: 40 },
      { nameAr: 'إدارة العقود',        value: 25 },
      { nameAr: 'الاجتماعات',          value: 20 },
      { nameAr: 'الأرشفة والتوثيق',    value: 15 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 935,  target: 950 },
      { quarter: 'Q2', achieved: 983,  target: 960 },
      { quarter: 'Q3', achieved: 925,  target: 960 },
      { quarter: 'Q4', achieved: 997,  target: 970 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'عدد المعاملات المنجزة', target: 4200, current: 2040, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 3840,
        quarters: [
          { q: 'Q1', actual: 1020, target: 1050 },
          { q: 'Q2', actual: 1020, target: 1050 },
          { q: 'Q3', actual: null, target: 1050 },
          { q: 'Q4', actual: null, target: 1050 },
        ],
      },
      {
        labelAr: 'متوسط وقت إنجاز المعاملة (يوم)', target: 2.5, current: 2.8, unit: ' يوم',
        activityType: 'MONTHLY_VARIANCE',
        lowerIsBetter: true,
        lastYearValue: 3.2,
        quarters: [
          { q: 'Q1', actual: 3,    target: 3 },
          { q: 'Q2', actual: 2.8,  target: 2.8 },
          { q: 'Q3', actual: null, target: 2.6 },
          { q: 'Q4', actual: null, target: 2.5 },
        ],
      },
      {
        labelAr: 'نسبة رضا المراجعين', target: 92, current: 89, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 87,
        quarters: [
          { q: 'Q1', actual: 88,   target: 90 },
          { q: 'Q2', actual: 89,   target: 91 },
          { q: 'Q3', actual: null, target: 91 },
          { q: 'Q4', actual: null, target: 92 },
        ],
      },
      {
        labelAr: 'عدد الاجتماعات المنعقدة', target: 110, current: 54, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 96,
        quarters: [
          { q: 'Q1', actual: 26,   target: 28 },
          { q: 'Q2', actual: 28,   target: 28 },
          { q: 'Q3', actual: null, target: 27 },
          { q: 'Q4', actual: null, target: 27 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 335,  target: 330 },
      { month: 'Feb', actual: 342,  target: 335 },
      { month: 'Mar', actual: 343,  target: 340 },
      { month: 'Apr', actual: 340,  target: 340 },
      { month: 'May', actual: 338,  target: 345 },
      { month: 'Jun', actual: 342,  target: 345 },
      { month: 'Jul', actual: null, target: 348 },
      { month: 'Aug', actual: null, target: 350 },
      { month: 'Sep', actual: null, target: 352 },
      { month: 'Oct', actual: null, target: 355 },
      { month: 'Nov', actual: null, target: 355 },
      { month: 'Dec', actual: null, target: 360 },
    ],
  },
}
