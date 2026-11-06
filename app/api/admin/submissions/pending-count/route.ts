import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ count: 0 })
  }

  const count = await prisma.submissionRow.count({
    where: { status: 'PENDING' },
  })

  return NextResponse.json({ count })
}
