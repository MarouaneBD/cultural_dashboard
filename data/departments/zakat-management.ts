// Department data for: ادارة الزكاة (ZAKAT_MANAGEMENT)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const zakatManagementData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'إجمالي الزكاة المجموعة',         value: 2800000, unit: 'AED', icon: 'TrendingUp'  },
      { labelAr: 'عدد المستفيدين من الزكاة',        value: 1850,    unit: '',    icon: 'Users'       },
      { labelAr: 'نسبة توزيع الزكاة',               value: 96,      unit: '%',   icon: 'CheckCircle' },
      { labelAr: 'عدد المتبرعين',                    value: 420,     unit: '',    icon: 'Star'        },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 85 },
      { month: 'Feb', value: 88 },
      { month: 'Mar', value: 92 },
      { month: 'Apr', value: 90 },
      { month: 'May', value: 91 },
      { month: 'Jun', value: 93 },
      { month: 'Jul', value: 89 },
      { month: 'Aug', value: 90 },
      { month: 'Sep', value: 94 },
      { month: 'Oct', value: 95 },
      { month: 'Nov', value: 96 },
      { month: 'Dec', value: 97 },
    ],
    categoryBreakdown: [
      { nameAr: 'زكاة المال',    value: 55 },
      { nameAr: 'زكاة الفطر',   value: 25 },
      { nameAr: 'الكفارات',      value: 12 },
      { nameAr: 'النذور',        value: 8  },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 88, target: 90 },
      { quarter: 'Q2', achieved: 92, target: 92 },
      { quarter: 'Q3', achieved: 94, target: 94 },
      { quarter: 'Q4', achieved: 97, target: 95 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'إجمالي الزكاة المجموعة', target: 3500000, current: 1620000, unit: 'AED',
        activityType: 'CUMULATIVE',
        lastYearValue: 2800000,
        quarters: [
          { q: 'Q1', actual: 780000,  target: 850000  },
          { q: 'Q2', actual: 840000,  target: 875000  },
          { q: 'Q3', actual: null,    target: 875000  },
          { q: 'Q4', actual: null,    target: 900000  },
        ],
      },
      {
        labelAr: 'عدد المستفيدين من الزكاة', target: 2200, current: 1040, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 1850,
        quarters: [
          { q: 'Q1', actual: 500,  target: 540  },
          { q: 'Q2', actual: 540,  target: 560  },
          { q: 'Q3', actual: null, target: 560  },
          { q: 'Q4', actual: null, target: 540  },
        ],
      },
      {
        labelAr: 'نسبة توزيع الزكاة', target: 98, current: 95, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 96,
        quarters: [
          { q: 'Q1', actual: 94,   target: 97 },
          { q: 'Q2', actual: 95,   target: 98 },
          { q: 'Q3', actual: null, target: 98 },
          { q: 'Q4', actual: null, target: 98 },
        ],
      },
      {
        labelAr: 'عدد المتبرعين', target: 520, current: 248, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 420,
        quarters: [
          { q: 'Q1', actual: 120, target: 128 },
          { q: 'Q2', actual: 128, target: 132 },
          { q: 'Q3', actual: null, target: 132 },
          { q: 'Q4', actual: null, target: 128 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 88,   target: 90  },
      { month: 'Feb', actual: 90,   target: 92  },
      { month: 'Mar', actual: 92,   target: 93  },
      { month: 'Apr', actual: 93,   target: 94  },
      { month: 'May', actual: 94,   target: 95  },
      { month: 'Jun', actual: 95,   target: 96  },
      { month: 'Jul', actual: null, target: 96  },
      { month: 'Aug', actual: null, target: 97  },
      { month: 'Sep', actual: null, target: 97  },
      { month: 'Oct', actual: null, target: 97  },
      { month: 'Nov', actual: null, target: 98  },
      { month: 'Dec', actual: null, target: 98  },
    ],
  },
}
