import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'
import { VALID_PILLAR_IDS } from '@/lib/departments'
import { Prisma } from '@prisma/client'
import type { Pillar, KpiUnit, ActivityType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_UNITS = new Set<string>(['PERCENT', 'COUNT', 'CURRENCY'])
const VALID_ACTIVITY_TYPES = new Set<string>(['CUMULATIVE', 'MONTHLY_VARIANCE'])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  let body: {
    nameAr?: string
    pillar?: string
    unit?: string
    activityType?: string
    showInDashboard?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const { nameAr, pillar, unit, activityType, showInDashboard } = body

  if (!nameAr || nameAr.trim().length < 3) {
    return NextResponse.json({ error: 'الاسم قصير جداً (3 أحرف على الأقل)' }, { status: 400 })
  }
  if (!pillar || !VALID_PILLAR_IDS.has(pillar)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }
  if (!unit || !VALID_UNITS.has(unit)) {
    return NextResponse.json({ error: 'وحدة غير صالحة' }, { status: 400 })
  }
  if (!activityType || !VALID_ACTIVITY_TYPES.has(activityType)) {
    return NextResponse.json({ error: 'نوع نشاط غير صالح' }, { status: 400 })
  }

  try {
    const kpi = await withAuditUser(session.user.id, () =>
      prisma.kpiRegistry.create({
        data: {
          nameAr: nameAr.trim(),
          pillar: pillar as Pillar,
          unit: unit as KpiUnit,
          activityType: activityType as ActivityType,
          showInDashboard: Boolean(showInDashboard),
        },
      })
    )
    return NextResponse.json(kpi, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'هذا الاسم مستخدم لمؤشر آخر في نفس القسم' }, { status: 409 })
    }
    console.error('[admin/kpis] create failed', err)
    return NextResponse.json({ error: 'فشل الإنشاء' }, { status: 500 })
  }
}
