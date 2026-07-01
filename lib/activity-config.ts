export type ActivityType = 'cumulative' | 'monthly_variance'

/**
 * Maps "pillar.slug" → ActivityType.
 *
 * Key format: lowercase pillar enum value + "." + KpiRegistry.slug
 * Example: "education.total_students_enrolled"
 *
 * To add an activity:
 *   1. Set KpiRegistry.slug for the record (via Prisma Studio or a seed script)
 *   2. Add an entry here
 *
 * Unknown activities fall back to 'monthly_variance' (the safer default —
 * it never incorrectly inflates a snapshot value by summing it).
 */
export const ACTIVITY_TYPES: Record<string, ActivityType> = {
  // ── Add entries here as slugs are assigned ──────────────────────────────
  // 'education.total_students_enrolled': 'cumulative',
  // 'education.active_students':         'monthly_variance',
}

/**
 * Returns the ActivityType for a KPI.
 *
 * @param pillar - The Pillar enum value in lowercase, e.g. "education"
 * @param slug   - The KpiRegistry.slug value, e.g. "total_students_enrolled"
 */
export function getActivityType(pillar: string, slug: string): ActivityType {
  return ACTIVITY_TYPES[`${pillar.toLowerCase()}.${slug}`] ?? 'monthly_variance'
}
