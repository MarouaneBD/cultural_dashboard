import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function DELETE() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'غير مصرح — مطلوب دور المدير' }, { status: 403 })
  }

  try {
    // Delete dependents before parent to respect FK constraints
    const [deletedActuals, deletedTargets, deletedKpis] = await prisma.$transaction([
      prisma.actual.deleteMany(),
      prisma.target.deleteMany(),
      prisma.kpiRegistry.deleteMany(),
    ])

    return NextResponse.json({
      actuals: deletedActuals.count,
      targets: deletedTargets.count,
      kpis: deletedKpis.count,
    })
  } catch (err) {
    console.error('DELETE /api/admin/clear-data failed', err)
    return NextResponse.json({ error: 'فشل مسح البيانات' }, { status: 500 })
  }
}
