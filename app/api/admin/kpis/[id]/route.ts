import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params
  const kpi = await prisma.kpiRegistry.findUnique({ where: { id } })
  if (!kpi) return NextResponse.json({ error: 'المؤشر غير موجود' }, { status: 404 })

  return NextResponse.json({
    id: kpi.id,
    nameAr: kpi.nameAr,
    pillar: kpi.pillar,
    activityType: kpi.activityType,
    unit: kpi.unit,
    owner: kpi.owner,
    showInDashboard: kpi.showInDashboard,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params

  let body: { nameAr?: string; activityType?: string; unit?: string; owner?: string; pillar?: unknown; showInDashboard?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  // Pillar is immutable — silently exclude it
  const { nameAr, activityType, unit, owner, showInDashboard } = body

  if (nameAr === undefined && activityType === undefined && unit === undefined && owner === undefined && showInDashboard === undefined) {
    return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 })
  }

  if (nameAr !== undefined && nameAr.trim().length < 3) {
    return NextResponse.json({ error: 'الاسم قصير جداً (3 أحرف على الأقل)' }, { status: 400 })
  }

  // Fetch current KPI to get pillar for uniqueness check
  const current = await prisma.kpiRegistry.findUnique({ where: { id } })
  if (!current) return NextResponse.json({ error: 'المؤشر غير موجود' }, { status: 404 })

  if (nameAr) {
    const collision = await prisma.kpiRegistry.findFirst({
      where: { nameAr: nameAr.trim(), pillar: current.pillar, id: { not: id } },
    })
    if (collision) {
      return NextResponse.json({ error: 'هذا الاسم مستخدم لمؤشر آخر في نفس القسم' }, { status: 409 })
    }
  }

  const patch: Record<string, unknown> = {}
  if (nameAr !== undefined) patch.nameAr = nameAr.trim()
  if (activityType !== undefined) patch.activityType = activityType
  if (unit !== undefined) patch.unit = unit
  if (owner !== undefined) patch.owner = owner || null
  if (showInDashboard !== undefined) patch.showInDashboard = Boolean(showInDashboard)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 })
  }

  try {
    const updated = await withAuditUser(session.user.id, () =>
      prisma.kpiRegistry.update({ where: { id }, data: patch })
    )
    return NextResponse.json({
      id: updated.id,
      nameAr: updated.nameAr,
      activityType: updated.activityType,
      unit: updated.unit,
      owner: updated.owner,
    })
  } catch (err) {
    console.error('[admin/kpis] update failed', err)
    return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
  }
}
