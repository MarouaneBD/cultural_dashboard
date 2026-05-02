import { POST } from './route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/excel', () => ({
  parseExcelFile: jest.fn().mockReturnValue({
    valid: [{ kpiId: 'k1', period: 'Q1', year: 2026, value: 100 }],
    errors: [],
  }),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    actual: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
  },
}))

describe('POST /api/upload', () => {
  it('returns 200 with import summary on valid file', async () => {
    const formData = new FormData()
    formData.append('file', new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'data.xlsx')
    formData.append('dryRun', 'false')

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.imported).toBe(1)
    expect(body.errors).toHaveLength(0)
  })

  it('returns dry run preview without committing', async () => {
    const formData = new FormData()
    formData.append('file', new Blob([''], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'data.xlsx')
    formData.append('dryRun', 'true')

    const req = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.dryRun).toBe(true)
    expect(body.preview).toHaveLength(1)
  })
})
