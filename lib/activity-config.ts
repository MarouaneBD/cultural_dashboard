import type { ActivityType } from '@prisma/client'

export type { ActivityType }

/**
 * Maps "pillar.slug" → ActivityType.
 *
 * Key format: lowercase pillar enum value + "." + KpiRegistry.slug
 * Example: "education.total_students_enrolled"
 *
 * This map is a fallback for programmatic use only.
 * For uploaded data, the activityType is stored directly on KpiRegistry
 * and set via the نوع النشاط column in the Excel upload format.
 */
export const ACTIVITY_TYPES: Record<string, ActivityType> = {
  // ── Add entries here if needed for programmatic seeding ─────────────────
  // 'education.total_students_enrolled': 'CUMULATIVE',
}

/**
 * Returns the ActivityType for a KPI by pillar + slug.
 * Falls back to MONTHLY_VARIANCE for unknown combinations.
 */
export function getActivityType(pillar: string, slug: string): ActivityType {
  return ACTIVITY_TYPES[`${pillar.toLowerCase()}.${slug}`] ?? 'MONTHLY_VARIANCE'
}
