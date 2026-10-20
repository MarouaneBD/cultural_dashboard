// Department data for: ادارة الموارد البشرية (HR_MANAGEMENT)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const hrManagementData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'عدد الموظفين',             value: 142, unit: '',  icon: 'Users' },
      { labelAr: 'نسبة الالتزام بالحضور',     value: 94,  unit: '%', icon: 'CheckCircle' },
      { labelAr: 'عدد الدورات التدريبية',     value: 28,  unit: '',  icon: 'BookOpen' },
      { labelAr: 'رضا الموظفين',              value: 82,  unit: '%', icon: 'Star' },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 88 },
      { month: 'Feb', value: 90 },
      { month: 'Mar', value: 92 },
      { month: 'Apr', value: 91 },
      { month: 'May', value: 93 },
      { month: 'Jun', value: 94 },
      { month: 'Jul', value: 92 },
      { month: 'Aug', value: 91 },
      { month: 'Sep', value: 93 },
      { month: 'Oct', value: 94 },
      { month: 'Nov', value: 93 },
      { month: 'Dec', value: 94 },
    ],
    categoryBreakdown: [
      { nameAr: 'التوظيف والاستقطاب',   value: 30 },
      { nameAr: 'التدريب والتطوير',       value: 35 },
      { nameAr: 'شؤون الموظفين',          value: 25 },
      { nameAr: 'الرواتب والمزايا',       value: 10 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 88, target: 90 },
      { quarter: 'Q2', achieved: 91, target: 90 },
      { quarter: 'Q3', achieved: 93, target: 92 },
      { quarter: 'Q4', achieved: 94, target: 92 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'عدد الموظفين', target: 155, current: 148, unit: '',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 142,
        quarters: [
          { q: 'Q1', actual: 145, target: 148 },
          { q: 'Q2', actual: 148, target: 150 },
          { q: 'Q3', actual: null, target: 152 },
          { q: 'Q4', actual: null, target: 155 },
        ],
      },
      {
        labelAr: 'معدل دوران الموظفين', target: 6, current: 7, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lowerIsBetter: true,
        lastYearValue: 8,
        quarters: [
          { q: 'Q1', actual: 7,    target: 7 },
          { q: 'Q2', actual: 7,    target: 6 },
          { q: 'Q3', actual: null, target: 6 },
          { q: 'Q4', actual: null, target: 6 },
        ],
      },
      {
        labelAr: 'نسبة الالتزام بالحضور', target: 96, current: 95, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 94,
        quarters: [
          { q: 'Q1', actual: 95,   target: 96 },
          { q: 'Q2', actual: 95,   target: 96 },
          { q: 'Q3', actual: null, target: 96 },
          { q: 'Q4', actual: null, target: 96 },
        ],
      },
      {
        labelAr: 'عدد الدورات التدريبية', target: 35, current: 16, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 28,
        quarters: [
          { q: 'Q1', actual: 8,    target: 9 },
          { q: 'Q2', actual: 8,    target: 9 },
          { q: 'Q3', actual: null, target: 9 },
          { q: 'Q4', actual: null, target: 8 },
        ],
      },
      {
        labelAr: 'رضا الموظفين', target: 88, current: 85, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 82,
        quarters: [
          { q: 'Q1', actual: 84,   target: 88 },
          { q: 'Q2', actual: 85,   target: 88 },
          { q: 'Q3', actual: null, target: 88 },
          { q: 'Q4', actual: null, target: 88 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 90,   target: 90 },
      { month: 'Feb', actual: 91,   target: 91 },
      { month: 'Mar', actual: 92,   target: 92 },
      { month: 'Apr', actual: 93,   target: 93 },
      { month: 'May', actual: 92,   target: 93 },
      { month: 'Jun', actual: 93,   target: 94 },
      { month: 'Jul', actual: null, target: 94 },
      { month: 'Aug', actual: null, target: 94 },
      { month: 'Sep', actual: null, target: 95 },
      { month: 'Oct', actual: null, target: 95 },
      { month: 'Nov', actual: null, target: 96 },
      { month: 'Dec', actual: null, target: 96 },
    ],
  },
}
