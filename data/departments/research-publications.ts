import type { DeptData } from '@/types/department'

export const researchPublicationsData: DeptData = {
  lastYear: {
    year: 2025,
    kpis: [],
    monthlyActivity: [
      { month: 'Jan', value: null }, { month: 'Feb', value: null },
      { month: 'Mar', value: null }, { month: 'Apr', value: null },
      { month: 'May', value: null }, { month: 'Jun', value: null },
      { month: 'Jul', value: null }, { month: 'Aug', value: null },
      { month: 'Sep', value: null }, { month: 'Oct', value: null },
      { month: 'Nov', value: null }, { month: 'Dec', value: null },
    ],
    categoryBreakdown: [],
    quarterlyComparison: [],
  },
  currentYear: {
    year: 2026,
    targets: [],
    monthlyProgress: [
      { month: 'Jan', actual: null, target: 0 }, { month: 'Feb', actual: null, target: 0 },
      { month: 'Mar', actual: null, target: 0 }, { month: 'Apr', actual: null, target: 0 },
      { month: 'May', actual: null, target: 0 }, { month: 'Jun', actual: null, target: 0 },
      { month: 'Jul', actual: null, target: 0 }, { month: 'Aug', actual: null, target: 0 },
      { month: 'Sep', actual: null, target: 0 }, { month: 'Oct', actual: null, target: 0 },
      { month: 'Nov', actual: null, target: 0 }, { month: 'Dec', actual: null, target: 0 },
    ],
  },
}
