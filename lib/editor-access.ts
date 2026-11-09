import { DEPARTMENTS } from '@/lib/departments'

/**
 * Decides whether an EDITOR should be redirected based on their assigned pillar
 * and the page they are requesting.
 *
 * Returns a redirect path string, or null if no redirect is needed.
 * Only applies to /dashboard paths — all other paths return null.
 */
export function getEditorRedirect(
  pathname: string,
  searchParams: URLSearchParams,
  assignedPillarId: string | null | undefined,
): string | null {
  // Never redirect from the no-access page itself (would create a loop)
  if (pathname === '/no-access') return null

  // Only intercept dashboard routes
  if (!pathname.startsWith('/dashboard')) return null

  // No pillar assigned → send to no-access page
  if (!assignedPillarId) return '/no-access'

  const dept = DEPARTMENTS.find(d => d.id === assignedPillarId)
  if (!dept) return '/no-access' // unknown pillar — treat as unassigned

  const assignedDivision = dept.division
  const sectorHome = `/dashboard?division=${assignedDivision}`

  const pillarParam = searchParams.get('pillar')
  const divisionParam = searchParams.get('division')

  // Trying to access a different pillar
  if (pillarParam && pillarParam !== assignedPillarId) return sectorHome

  // Trying to access a different division
  if (divisionParam && divisionParam !== assignedDivision) return sectorHome

  // Bare /dashboard with no params → send to their sector
  if (!divisionParam && !pillarParam) return sectorHome

  // Already on the right path
  return null
}
