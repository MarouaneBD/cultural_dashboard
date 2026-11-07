export type VarianceColor = 'green' | 'amber' | 'red' | 'neutral'

export type PillarId =
  | 'EDUCATION'
  | 'FAMILY_CULTURE'
  | 'ISLAMIC_INFO_CENTER'
  | 'AL_BIRR_MALE'
  | 'AL_BIRR_FEMALE'
  | 'ORPHANS'
  | 'SCIENTIFIC_PROGRAMS'
  | 'RESEARCH_PUBLICATIONS'
  | 'DEVELOPMENT_PROJECTS'
  | 'ZAKAT_MANAGEMENT'
  | 'HR_MANAGEMENT'
  | 'ADMIN_AFFAIRS'
  | 'PROCUREMENT'

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

export interface ActivityRow {
  nameAr: string
  pillar: PillarId
  category?: string
  actual2025?: number
  target2026?: number
  actuals: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>>
  activityType: import('@prisma/client').ActivityType
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

export interface SubmissionRowClient {
  id: string
  kpiId: string
  kpiNameAr: string
  period: string
  year: number
  newValue: number
  oldValue: number
  tableType: 'ACTUAL' | 'TARGET'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISMISSED'
  adminComment: string | null
  reviewedAt: string | null
}

export interface UploadSubmissionClient {
  id: string
  filename: string
  uploadedAt: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submitter: { id: string; username: string; name: string | null }
  rows: SubmissionRowClient[]
  pendingCount: number
  totalCount: number
}

export interface ActivityUploadResponseWithQueue {
  created: number
  updated: number
  queued: number
  submissionId: string | null
  errors: Array<{ row: number; message: string }>
}
