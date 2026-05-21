// Shared data-shape types for all department dashboard pages.
// Every dept data file must export an object that satisfies DeptData.

export interface DeptKpiStat {
  labelAr: string
  value: number
  unit: string          // '', '%', 'hrs', etc.
  icon: string          // lucide-react icon name
}

export interface MonthlyPoint {
  month: string         // 'Jan'…'Dec'
  value: number | null  // null = not yet available
}

export interface CategorySlice {
  nameAr: string
  value: number         // absolute count or %
}

export interface QuarterlyPoint {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  achieved: number
  target: number
}

export interface QuarterActual {
  q: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  actual: number | null   // null = not yet available
  target: number          // quarterly target
}

export interface TargetProgress {
  labelAr: string
  target: number            // annual target
  current: number           // cumulative actual (sum for COUNT; latest for PERCENT)
  unit: string
  lowerIsBetter?: boolean
  lastYearValue: number | null   // 2025 annual actual
  quarters: QuarterActual[]      // Q1–Q4 breakdown for current year
}

export interface MonthlyProgressPoint {
  month: string
  actual: number | null   // null for future months
  target: number
}

export interface DeptData {
  lastYear: {
    year: number
    kpis: DeptKpiStat[]
    monthlyActivity: MonthlyPoint[]
    categoryBreakdown: CategorySlice[]
    quarterlyComparison: QuarterlyPoint[]
  }
  currentYear: {
    year: number
    targets: TargetProgress[]
    monthlyProgress: MonthlyProgressPoint[]
  }
}
