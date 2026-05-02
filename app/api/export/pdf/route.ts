import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import { generateNarrative } from '@/lib/narrative'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'
import type { KpiWithVariance } from '@/types'

Font.register({
  family: 'Cairo',
  src: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hA.woff2',
})

const styles = StyleSheet.create({
  page: { fontFamily: 'Cairo', padding: 40, direction: 'rtl' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  subtitle: { fontSize: 10, color: '#64748b', marginBottom: 24, textAlign: 'right' },
  narrative: { fontSize: 11, marginBottom: 24, lineHeight: 1.6, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', borderBottom: '1pt solid #e5e7eb', paddingVertical: 6 },
  cell: { fontSize: 10, flex: 1, textAlign: 'right' },
  header: { fontSize: 9, color: '#94a3b8', flex: 1, textAlign: 'right' },
  green: { color: '#059669' },
  amber: { color: '#d97706' },
  red: { color: '#dc2626' },
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const year = parseInt(searchParams.get('year') ?? '2026')
    const period = searchParams.get('period') ?? 'ANNUAL'

    const kpis = await prisma.kpiRegistry.findMany({
      include: {
        targets: { where: { year } },
        actuals: { where: { year } },
      },
    })

    const kpiData: KpiWithVariance[] = kpis.map(kpi => {
      const target = kpi.targets.find(t => t.period === period)?.value ?? 0
      const actual = kpi.actuals.find(a => a.period === period)?.value ?? 0
      return {
        id: kpi.id,
        nameAr: kpi.nameAr,
        pillar: kpi.pillar as KpiWithVariance['pillar'],
        unit: kpi.unit as KpiWithVariance['unit'],
        variance: computeVariance(actual, target),
        sparkline: [],
      }
    })

    const narrative = generateNarrative(kpiData)

    const doc = React.createElement(Document, {},
      React.createElement(Page, { size: 'A4', style: styles.page },
        React.createElement(Text, { style: styles.title }, 'التقرير التنفيذي — شؤون الإسلامية'),
        React.createElement(Text, { style: styles.subtitle }, `${period} ${year}`),
        React.createElement(Text, { style: styles.narrative }, narrative),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.header }, 'نسبة الإنجاز'),
          React.createElement(Text, { style: styles.header }, 'المستهدف'),
          React.createElement(Text, { style: styles.header }, 'الفعلي'),
          React.createElement(Text, { style: styles.header }, 'المؤشر'),
        ),
        ...kpiData.map(kpi => {
          const colorStyle = kpi.variance.color === 'green'
            ? styles.green
            : kpi.variance.color === 'amber'
              ? styles.amber
              : styles.red
          return React.createElement(View, { key: kpi.id, style: styles.row },
            React.createElement(Text, { style: [styles.cell, colorStyle] },
              `${kpi.variance.pct.toFixed(1)}%`
            ),
            React.createElement(Text, { style: styles.cell }, String(kpi.variance.target)),
            React.createElement(Text, { style: styles.cell }, String(kpi.variance.actual)),
            React.createElement(Text, { style: styles.cell }, kpi.nameAr),
          )
        })
      )
    )

    const buffer = await renderToBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ers-report-${period}-${year}.pdf"`,
      },
    })
  } catch (err) {
    console.error('GET /api/export/pdf failed', err)
    return NextResponse.json({ error: 'خطأ في إنشاء التقرير' }, { status: 500 })
  }
}
