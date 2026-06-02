import { hashPassword, verifyPassword } from './auth-utils'

describe('hashPassword', () => {
  it('returns a bcrypt hash different from the input', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
    expect(hash.startsWith('$2')).toBe(true)
  })

  it('produces different hashes for the same input (salt)', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('correct', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
