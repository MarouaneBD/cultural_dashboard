import { NextRequest, NextResponse } from 'next/server'
import { Period, Pillar } from '@prisma/client'
import { isActivityFile, parseActivityFile, normalizeAr } from '@/lib/excel'
import { prisma, withAuditUser } from '@/lib/prisma'
import { auth } from '@/auth'
import { REPORTING_YEAR, PREV_REPORTING_YEAR } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  let session: import('next-auth').Session | null = null
  try {
    session = await auth()
  } catch (err) {
    console.error('[upload] auth() threw', err)
    return NextResponse.json({ error: 'خطأ في التحقق من الجلسة' }, { status: 500 })
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  // ── Parse form data ──────────────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch (err) {
    console.error('[upload] formData() threw', err)
    return NextResponse.json({ error: 'تعذّر قراءة بيانات النموذج' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const dryRun = formData.get('dryRun') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
  }

  // ── Validate file size and MIME type ─────────────────────────────────────────
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'حجم الملف يتجاوز الحد المسموح به (10 ميغابايت)' }, { status: 400 })
  }
  const ALLOWED_MIMES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json({ error: 'نوع الملف غير مدعوم. يُسمح فقط بملفات Excel' }, { status: 400 })
  }

  // ── Read buffer ──────────────────────────────────────────────────────────────
  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch (err) {
    console.error('[upload] arrayBuffer() threw', err)
    return NextResponse.json({ error: 'تعذّر قراءة الملف' }, { status: 400 })
  }

  try {
    // ── Activity format ────────────────────────────────────────────────────────
    if (isActivityFile(buffer)) {
      const { rows, errors } = parseActivityFile(buffer)

      const isEditor = session!.user.role === 'EDITOR'
      const assignedPillarId = session!.user.assignedPillarId ?? null

      // Run scope checks during dry-run so the preview shows permission errors
      // before the user clicks commit.
      const dryRunScopeErrors: Array<{ row: number; message: string }> = []
      if (dryRun) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (isEditor) {
            if (!assignedPillarId) {
              dryRunScopeErrors.push({ row: i + 2, message: 'لم يتم تعيين قسم لهذا المحرر، تواصل مع المدير' })
            } else if (row.pillar !== assignedPillarId) {
              dryRunScopeErrors.push({ row: i + 2, message: `ليس لديك صلاحية رفع بيانات القسم: ${row.pillar}` })
            }
          }
        }
        return NextResponse.json({ dryRun: true, rows, parseErrors: errors, scopeErrors: dryRunScopeErrors })
      }

      let created = 0
      let updated = 0
      let submissionId: string | null = null
      const dbErrors: Array<{ row: number; message: string }> = []
      const scopeErrors: Array<{ row: number; message: string }> = []

      type StagingRow = {
        kpiId: string; kpiNameAr: string; period: string; year: number
        newValue: number; oldValue: number; tableType: string
      }

      try {
        await withAuditUser(session!.user.id, () => prisma.$transaction(async (tx: TxClient) => {
          const stagingRows: StagingRow[] = []

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
              // EDITOR scope check — null assignedPillarId means no pillar assigned, block all writes
              if (isEditor) {
                if (!assignedPillarId) {
                  scopeErrors.push({ row: i + 2, message: 'لم يتم تعيين قسم لهذا المحرر، تواصل مع المدير' })
                  continue
                }
                if (row.pillar !== assignedPillarId) {
                  scopeErrors.push({ row: i + 2, message: `ليس لديك صلاحية رفع بيانات القسم: ${row.pillar}` })
                  continue
                }
              }

              const existing = await tx.kpiRegistry.findUnique({
                where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
              })

              // EDITORs may update existing KPIs but must not create new registry entries.
              // New KPI definitions require ADMIN review — reject with a scope error.
              if (!existing && isEditor) {
                scopeErrors.push({
                  row: i + 2,
                  message: `لا يمكن للمحرر إنشاء مؤشرات جديدة (${row.nameAr}). تواصل مع المدير لإضافة المؤشر أولاً`,
                })
                continue
              }

              // All users (ADMIN and EDITOR) may upsert KPI registry entries for existing KPIs.
              // EDITORs are blocked above from creating new KPIs, so by this point the KPI exists.
              // ADMINs may also create new KPIs via the upsert path (create branch).
              const kpi = await tx.kpiRegistry.upsert({
                where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
                create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category ? normalizeAr(row.category) : undefined, activityType: row.activityType },
                update: { activityType: row.activityType, ...(row.category ? { owner: normalizeAr(row.category) } : {}) },
              })

              if (row.target2026 !== undefined) {
                if (isEditor) {
                  const existingTarget = await tx.target.findUnique({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: REPORTING_YEAR } },
                  })
                  stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: 'ANNUAL', year: REPORTING_YEAR, newValue: row.target2026, oldValue: existingTarget ? Number(existingTarget.value) : 0, tableType: 'TARGET' })
                } else {
                  await tx.target.upsert({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: REPORTING_YEAR } },
                    create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: REPORTING_YEAR, value: row.target2026 },
                    update: { value: row.target2026 },
                  })
                }
              }

              if (row.actual2025 !== undefined) {
                if (isEditor) {
                  const existingActual = await tx.actual.findUnique({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: PREV_REPORTING_YEAR } },
                  })
                  stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: 'ANNUAL', year: PREV_REPORTING_YEAR, newValue: row.actual2025, oldValue: existingActual ? Number(existingActual.value) : 0, tableType: 'ACTUAL' })
                } else {
                  await tx.actual.upsert({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: PREV_REPORTING_YEAR } },
                    create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: PREV_REPORTING_YEAR, value: row.actual2025 },
                    update: { value: row.actual2025 },
                  })
                }
              }

              const VALID_PERIODS: Period[] = ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL']
              for (const [q, val] of Object.entries(row.actuals)) {
                if (val !== undefined && VALID_PERIODS.includes(q as Period)) {
                  if (isEditor) {
                    const existingActual = await tx.actual.findUnique({
                      where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: REPORTING_YEAR } },
                    })
                    stagingRows.push({ kpiId: kpi.id, kpiNameAr: row.nameAr, period: q, year: REPORTING_YEAR, newValue: val, oldValue: existingActual ? Number(existingActual.value) : 0, tableType: 'ACTUAL' })
                  } else {
                    await tx.actual.upsert({
                      where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: REPORTING_YEAR } },
                      create: { kpiId: kpi.id, period: q as Period, year: REPORTING_YEAR, value: val },
                      update: { value: val },
                    })
                  }
                }
              }

              if (existing) { updated++ } else { created++ }
            } catch (err) {
              console.error('[upload] row failed', i + 2, err)
              dbErrors.push({ row: i + 2, message: `خطأ في حفظ النشاط: ${row.nameAr}` })
            }
          }

          // Write staging rows as a single UploadSubmission
          if (stagingRows.length > 0) {
            const sub = await tx.uploadSubmission.create({
              data: {
                submitterId: session!.user.id,
                filename: file.name,
                rows: {
                  create: stagingRows.map(r => ({
                    kpiId: r.kpiId,
                    kpiNameAr: r.kpiNameAr,
                    period: r.period as Period,
                    year: r.year,
                    newValue: r.newValue,
                    oldValue: r.oldValue,
                    tableType: r.tableType,
                  })),
                },
              },
            })
            submissionId = sub.id
          }
        }, { timeout: 50000 }))
      } catch (err) {
        console.error('[upload] transaction failed', err)
        return NextResponse.json({ error: 'فشل حفظ البيانات' }, { status: 500 })
      }

      const staged = submissionId
        ? await prisma.submissionRow.count({ where: { submissionId } })
        : 0

      return NextResponse.json({
        created,
        updated,
        staged,
        submissionId,
        scopeErrors,
        dbErrors: [...errors, ...dbErrors],
      })
    }

    return NextResponse.json(
      { error: 'صيغة الملف غير مدعومة. استخدم قالب رفع النشاط' },
      { status: 400 }
    )
  } catch (err) {
    console.error('[upload] unhandled error', err)
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة الملف' }, { status: 500 })
  }
}
