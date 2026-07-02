import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  try {
    // Use interactive transaction to guarantee FK-safe delete order
    const result = await prisma.$transaction(async (tx) => {
      const actuals = await tx.actual.deleteMany()
      const targets = await tx.target.deleteMany()
      const kpis    = await tx.kpiRegistry.deleteMany()
      return { actuals: actuals.count, targets: targets.count, kpis: kpis.count }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('POST /api/admin/clear-data failed', err)
    return NextResponse.json({ error: 'فشل مسح البيانات' }, { status: 500 })
  }
}
