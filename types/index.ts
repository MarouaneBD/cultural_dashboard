export type VarianceColor = 'green' | 'amber' | 'red'

export type PillarId =
  | 'ISLAMIC_EDUCATION'
  | 'HOLY_QURAN'
  | 'TEACHER_SPONSORSHIP'
  | 'UNIVERSITY_SPONSORSHIP'

export interface KpiVariance {
  actual: number
  target: number
  pct: number
  color: VarianceColor
}

export interface KpiWithVariance {
  id: string
  nameAr: string
  pillar: PillarId
  unit: 'PERCENT' | 'COUNT' | 'CURRENCY'
  variance: KpiVariance
  sparkline: number[]   // last 4 quarter actuals, oldest first
}

export interface DrillDownRow {
  region: string
  facility?: string
  actual: number
  target: number
  variance: KpiVariance
}

export interface UploadRow {
  kpiId: string
  period: string
  year: number
  value: number
  region?: string
  facility?: string
}

export interface UploadValidationResult {
  valid: UploadRow[]
  errors: Array<{ row: number; message: string }>
}
