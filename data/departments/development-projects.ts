// Department data for: ادارة المشاريع التنموية (DEVELOPMENT_PROJECTS)
// Dummy data — replace by uploading the department's Excel file.

import type { DeptData } from '@/types/department'

export const developmentProjectsData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [
      { labelAr: 'عدد المشاريع المنجزة',          value: 24,   unit: '',  icon: 'CheckCircle' },
      { labelAr: 'نسبة الإنجاز',                   value: 88,   unit: '%', icon: 'TrendingUp'  },
      { labelAr: 'عدد المستفيدين',                  value: 5200, unit: '',  icon: 'Users'       },
      { labelAr: 'نسبة الالتزام بالميزانية',        value: 92,   unit: '%', icon: 'Star'        },
    ],
    monthlyActivity: [
      { month: 'Jan', value: 80 },
      { month: 'Feb', value: 83 },
      { month: 'Mar', value: 85 },
      { month: 'Apr', value: 84 },
      { month: 'May', value: 87 },
      { month: 'Jun', value: 88 },
      { month: 'Jul', value: 86 },
      { month: 'Aug', value: 87 },
      { month: 'Sep', value: 89 },
      { month: 'Oct', value: 90 },
      { month: 'Nov', value: 89 },
      { month: 'Dec', value: 88 },
    ],
    categoryBreakdown: [
      { nameAr: 'مشاريع البنية التحتية',   value: 35 },
      { nameAr: 'مشاريع اجتماعية',         value: 30 },
      { nameAr: 'مشاريع تعليمية',           value: 25 },
      { nameAr: 'مشاريع أخرى',              value: 10 },
    ],
    quarterlyComparison: [
      { quarter: 'Q1', achieved: 82, target: 85 },
      { quarter: 'Q2', achieved: 86, target: 87 },
      { quarter: 'Q3', achieved: 88, target: 88 },
      { quarter: 'Q4', achieved: 90, target: 90 },
    ],
  },
  currentYear: {
    year: 2026,
    targets: [
      {
        labelAr: 'عدد المشاريع المنجزة', target: 30, current: 14, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 24,
        quarters: [
          { q: 'Q1', actual: 7,    target: 8  },
          { q: 'Q2', actual: 7,    target: 8  },
          { q: 'Q3', actual: null, target: 7  },
          { q: 'Q4', actual: null, target: 7  },
        ],
      },
      {
        labelAr: 'نسبة الإنجاز', target: 92, current: 87, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 88,
        quarters: [
          { q: 'Q1', actual: 86,   target: 90 },
          { q: 'Q2', actual: 87,   target: 91 },
          { q: 'Q3', actual: null, target: 92 },
          { q: 'Q4', actual: null, target: 92 },
        ],
      },
      {
        labelAr: 'عدد المستفيدين', target: 6500, current: 3100, unit: '',
        activityType: 'CUMULATIVE',
        lastYearValue: 5200,
        quarters: [
          { q: 'Q1', actual: 1500, target: 1600 },
          { q: 'Q2', actual: 1600, target: 1650 },
          { q: 'Q3', actual: null, target: 1650 },
          { q: 'Q4', actual: null, target: 1600 },
        ],
      },
      {
        labelAr: 'نسبة الالتزام بالميزانية', target: 95, current: 91, unit: '%',
        activityType: 'MONTHLY_VARIANCE',
        lastYearValue: 92,
        quarters: [
          { q: 'Q1', actual: 90,   target: 94 },
          { q: 'Q2', actual: 91,   target: 95 },
          { q: 'Q3', actual: null, target: 95 },
          { q: 'Q4', actual: null, target: 95 },
        ],
      },
    ],
    monthlyProgress: [
      { month: 'Jan', actual: 83,   target: 85  },
      { month: 'Feb', actual: 85,   target: 87  },
      { month: 'Mar', actual: 86,   target: 88  },
      { month: 'Apr', actual: 87,   target: 89  },
      { month: 'May', actual: 87,   target: 90  },
      { month: 'Jun', actual: 88,   target: 91  },
      { month: 'Jul', actual: null, target: 91  },
      { month: 'Aug', actual: null, target: 92  },
      { month: 'Sep', actual: null, target: 92  },
      { month: 'Oct', actual: null, target: 93  },
      { month: 'Nov', actual: null, target: 94  },
      { month: 'Dec', actual: null, target: 95  },
    ],
  },
}
