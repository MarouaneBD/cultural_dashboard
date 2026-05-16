export type VarianceColor = 'green' | 'amber' | 'red'

export type PillarId =
  | 'EDUCATION'
  | 'FAMILY_CULTURE'
  | 'ISLAMIC_INFO_CENTER'
  | 'AL_BIRR_MALE'
  | 'AL_BIRR_FEMALE'
  | 'ORPHANS'
  | 'SCIENTIFIC_PROGRAMS'

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
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL'
  year: number
  value: number
  region?: string
  facility?: string
}

export interface UploadValidationResult {
  valid: UploadRow[]
  errors: Array<{ row: number; message: string }>
}

export interface ActivityRow {
  nameAr: string
  pillar: PillarId
  category?: string
  actual2025?: number
  target2026?: number
  actuals: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>>
}

export interface ActivityUploadResult {
  rows: ActivityRow[]
  errors: Array<{ row: number; message: string }>
}

export interface ActivityUploadResponse {
  created: number
  updated: number
  errors: Array<{ row: number; message: string }>
}
