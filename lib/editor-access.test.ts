import { getEditorRedirect } from './editor-access'

function params(obj: Record<string, string>) {
  return new URLSearchParams(obj)
}

describe('getEditorRedirect', () => {
  const ASSIGNED = 'EDUCATION' // EDUCATION is in CULTURE_RESEARCH division

  it('returns /no-access when assignedPillarId is null', () => {
    expect(getEditorRedirect('/dashboard', params({}), null)).toBe('/no-access')
  })

  it('returns /no-access when assignedPillarId is empty string', () => {
    expect(getEditorRedirect('/dashboard', params({}), '')).toBe('/no-access')
  })

  it('returns sector home when bare /dashboard with no params', () => {
    expect(getEditorRedirect('/dashboard', params({}), ASSIGNED))
      .toBe('/dashboard?division=CULTURE_RESEARCH')
  })

  it('returns null when already on correct sector homepage', () => {
    expect(getEditorRedirect('/dashboard', params({ division: 'CULTURE_RESEARCH' }), ASSIGNED))
      .toBeNull()
  })

  it('returns null when on own department page', () => {
    expect(getEditorRedirect('/dashboard', params({ pillar: 'EDUCATION', division: 'CULTURE_RESEARCH' }), ASSIGNED))
      .toBeNull()
  })

  it('returns sector home when accessing wrong pillar in same division', () => {
    expect(getEditorRedirect('/dashboard', params({ pillar: 'ORPHANS', division: 'CULTURE_RESEARCH' }), ASSIGNED))
      .toBe('/dashboard?division=CULTURE_RESEARCH')
  })

  it('returns sector home when accessing wrong division', () => {
    expect(getEditorRedirect('/dashboard', params({ division: 'INSTITUTIONAL_SUPPORT' }), ASSIGNED))
      .toBe('/dashboard?division=CULTURE_RESEARCH')
  })

  it('returns null for /no-access path (no redirect loop)', () => {
    expect(getEditorRedirect('/no-access', params({}), null)).toBeNull()
  })

  it('returns null for non-dashboard paths (upload, etc.)', () => {
    expect(getEditorRedirect('/upload', params({}), ASSIGNED)).toBeNull()
  })

  it('handles INSTITUTIONAL_SUPPORT assignment correctly', () => {
    expect(getEditorRedirect('/dashboard', params({}), 'HR_MANAGEMENT'))
      .toBe('/dashboard?division=INSTITUTIONAL_SUPPORT')
  })
})
