import { buildAdvancedReport } from './reportInsights.js'
import { normalizeMoney, sumMoney } from './money.js'

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
}

const COLORS = {
  navy: [11, 16, 32],
  navy2: [15, 28, 59],
  card: [248, 250, 252],
  soft: [239, 246, 255],
  border: [219, 226, 238],
  text: [15, 23, 42],
  muted: [100, 116, 139],
  blue: [29, 78, 216],
  blueSoft: [219, 234, 254],
  cyan: [56, 189, 248],
  green: [34, 197, 94],
  greenSoft: [220, 252, 231],
  orange: [245, 158, 11],
  orangeSoft: [254, 243, 199],
  white: [255, 255, 255],
}

function safeAmount(value) {
  return normalizeMoney(value)
}

function formatIndian(value) {
  const amount = safeAmount(value)
  const fractionDigits = Number.isInteger(amount) ? 0 : 2

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

function formatMoney(value) {
  return `INR ${formatIndian(value)}`
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function setText(doc, color = COLORS.text) {
  doc.setTextColor(color[0], color[1], color[2])
}

function setFill(doc, color) {
  doc.setFillColor(color[0], color[1], color[2])
}

function setStroke(doc, color = COLORS.border) {
  doc.setDrawColor(color[0], color[1], color[2])
}

function drawRoundedCard(doc, x, y, width, height, { fill = COLORS.white, stroke = COLORS.border } = {}) {
  setFill(doc, fill)
  setStroke(doc, stroke)
  doc.setLineWidth(0.25)
  doc.roundedRect(x, y, width, height, 4, 4, 'FD')
}

function drawTextBlock(doc, text, x, y, width, {
  size = 9,
  lineHeight = 4.2,
  color = COLORS.muted,
  weight = 'normal',
  maxLines = 4,
} = {}) {
  setText(doc, color)
  doc.setFont('helvetica', weight)
  doc.setFontSize(size)
  const lines = doc.splitTextToSize(String(text || ''), width).slice(0, maxLines)
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = last.length > 4 ? `${last.slice(0, -3)}...` : last
  }
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

async function loadLogoDataUrl() {
  if (typeof document === 'undefined' || typeof fetch !== 'function') {
    return ''
  }

  try {
    const response = await fetch('/fbply-logo.png')

    if (!response.ok) {
      return ''
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = objectUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 320
    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(objectUrl)

    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

function drawBrandMark(doc, x, y, size = 10) {
  const logo = doc.__fbplyLogoDataUrl

  drawRoundedCard(doc, x, y, size, size, { fill: COLORS.white, stroke: [191, 219, 254] })

  if (logo) {
    doc.addImage(logo, 'PNG', x + 1, y + 1, size - 2, size - 2)
    return
  }

  setText(doc, COLORS.blue)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(Math.max(size * 0.42, 5))
  doc.text('FB', x + size * 0.22, y + size * 0.62)
}

function drawBrandLockup(doc, x, y, { color = COLORS.navy, compact = false } = {}) {
  const size = compact ? 8 : 14
  drawBrandMark(doc, x, y, size)
  setText(doc, color)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(compact ? 8.8 : 13)
  doc.text('FBPly Financial Report', x + size + 4, y + (compact ? 5.8 : 7.8))
  setText(doc, compact ? COLORS.muted : [203, 213, 225])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(compact ? 6.8 : 7.5)
  doc.text('Built from saved and reviewed data', x + size + 4, y + (compact ? 10.5 : 13.5))
}

function addPage(doc, title = 'Monthly Financial Report') {
  doc.addPage()
  drawPageHeader(doc, title)
  return PAGE.margin + 18
}

function drawPageHeader(doc, title) {
  setFill(doc, COLORS.white)
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F')
  setStroke(doc, [232, 238, 247])
  doc.setLineWidth(0.25)
  doc.line(PAGE.margin, PAGE.margin + 9, PAGE.width - PAGE.margin, PAGE.margin + 9)

  drawBrandLockup(doc, PAGE.margin, PAGE.margin - 1, { compact: true })

  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(title, PAGE.width - PAGE.margin, PAGE.margin + 5, { align: 'right' })
}

function addPageIfNeeded(doc, y, height, title) {
  if (y + height <= PAGE.height - PAGE.margin) {
    return y
  }

  return addPage(doc, title)
}

function commitmentItems(profile = {}) {
  const commitments = Array.isArray(profile.commitments) ? profile.commitments : profile.fixedExpenses || []
  return commitments
    .map((item) => ({
      name: item.name || item.label || 'Monthly bill',
      value: safeAmount(item.amount),
      type: /\b(emi|loan|installment|instalment|finance|bnpl)\b/i.test(item.name || item.label || '')
        ? 'EMI / loan'
        : 'Fixed monthly',
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

function drawMetricCard(doc, x, y, width, height, metric) {
  drawRoundedCard(doc, x, y, width, height, { fill: metric.fill || COLORS.card, stroke: COLORS.border })
  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.2)
  doc.text(metric.label.toUpperCase(), x + 5, y + 8)
  setText(doc, metric.tone || COLORS.blue)
  doc.setFontSize(12)
  doc.text(String(metric.value), x + 5, y + 20, { maxWidth: width - 10 })
  drawTextBlock(doc, metric.detail, x + 5, y + 28, width - 10, {
    size: 7.4,
    lineHeight: 3.4,
    maxLines: 2,
  })
}

function drawSectionLabel(doc, title, y, subtitle = '') {
  setText(doc, COLORS.navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, PAGE.margin, y)

  if (subtitle) {
    drawTextBlock(doc, subtitle, PAGE.margin, y + 6, PAGE.width - PAGE.margin * 2, {
      size: 8,
      lineHeight: 3.8,
      maxLines: 2,
    })
    return y + 14
  }

  return y + 7
}

function currencyMoney(value, currency = 'INR') {
  const amount = safeAmount(value)

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: String(currency || 'INR').toUpperCase(),
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return formatMoney(amount)
  }
}

function reportDateLabel(value = new Date().toISOString()) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString('en-IN')
  }

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function drawProfessionalFooter(doc, meta = {}) {
  const total = doc.getNumberOfPages()

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    setStroke(doc, [226, 232, 240])
    doc.setLineWidth(0.2)
    doc.line(PAGE.margin, PAGE.height - 14, PAGE.width - PAGE.margin, PAGE.height - 14)
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.text(`Generated with FBPLY | fbply.com | ${meta.reportId || 'Report ID pending'}`, PAGE.margin, PAGE.height - 9)
    doc.text(`Page ${page} of ${total}`, PAGE.width - PAGE.margin, PAGE.height - 9, { align: 'right' })
  }
}

function drawProfessionalCover(doc, meta = {}) {
  setFill(doc, COLORS.navy)
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F')
  drawBrandLockup(doc, PAGE.margin, 18, { color: COLORS.white })

  setText(doc, COLORS.cyan)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(String(meta.typeLabel || 'FINANCIAL REPORT').toUpperCase(), PAGE.margin, 72)

  setText(doc, COLORS.white)
  doc.setFontSize(24)
  doc.text(meta.title || 'FBPly Report', PAGE.margin, 92, { maxWidth: 150 })
  drawTextBlock(doc, meta.subtitle || 'Professional financial document generated from saved and reviewed FBPLY data.', PAGE.margin, 108, 130, {
    color: [203, 213, 225],
    size: 10.2,
    lineHeight: 4.8,
    maxLines: 3,
  })

  const rows = [
    ['Prepared for', meta.preparedFor || 'FBPly user'],
    ['Currency', meta.currency || 'INR'],
    ['Report period', meta.period || currentMonthLabel()],
    ['Generated', reportDateLabel(meta.generatedAt)],
    ['Report ID', meta.reportId || 'FBP-REPORT'],
  ]

  drawRoundedCard(doc, PAGE.margin, 142, PAGE.width - PAGE.margin * 2, 78, { fill: [15, 28, 59], stroke: [37, 99, 235] })
  rows.forEach(([label, value], index) => {
    const rowY = 156 + index * 12
    setText(doc, [148, 163, 184])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.4)
    doc.text(label.toUpperCase(), PAGE.margin + 8, rowY)
    setText(doc, COLORS.white)
    doc.setFontSize(9.4)
    doc.text(String(value), PAGE.margin + 58, rowY, { maxWidth: 110 })
  })

  setText(doc, [148, 163, 184])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Generated with FBPLY | fbply.com', PAGE.width / 2, 274, { align: 'center' })
}

function drawProfessionalHeader(doc, meta = {}) {
  setFill(doc, COLORS.white)
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F')
  drawBrandLockup(doc, PAGE.margin, PAGE.margin - 1, { compact: true })
  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(meta.reportId || '', PAGE.width - PAGE.margin, PAGE.margin + 5, { align: 'right' })
  setStroke(doc, [232, 238, 247])
  doc.setLineWidth(0.25)
  doc.line(PAGE.margin, PAGE.margin + 10, PAGE.width - PAGE.margin, PAGE.margin + 10)
}

function addProfessionalPage(doc, meta = {}) {
  doc.addPage()
  drawProfessionalHeader(doc, meta)
  return PAGE.margin + 22
}

function drawProfessionalMetrics(doc, y, metrics = [], meta = {}) {
  if (metrics.length === 0) {
    return y
  }

  const compact = meta.template === 'compact'
  const columns = compact ? 2 : 3
  const gap = 5
  const width = (PAGE.width - PAGE.margin * 2 - gap * (columns - 1)) / columns

  metrics.slice(0, compact ? 4 : 6).forEach((metric, index) => {
    const x = PAGE.margin + (index % columns) * (width + gap)
    const top = y + Math.floor(index / columns) * 32
    drawMetricCard(doc, x, top, width, 27, {
      label: metric.label,
      value: metric.value,
      detail: metric.detail || '',
      fill: metric.fill || COLORS.card,
      tone: metric.tone || COLORS.blue,
    })
  })

  return y + Math.ceil(Math.min(metrics.length, compact ? 4 : 6) / columns) * 32 + 8
}

function drawProfessionalList(doc, y, title, items = [], meta = {}, { columns = ['label', 'value', 'detail'] } = {}) {
  const maxItems = meta.template === 'compact' ? 5 : meta.template === 'executive' ? 12 : 10
  const visible = items.filter(Boolean).slice(0, maxItems)

  if (visible.length === 0) {
    return y
  }

  y = addPageIfNeeded(doc, y, 18 + visible.length * 9, title)
  y = drawSectionLabel(doc, title, y)

  visible.forEach((item, index) => {
    const rowY = y + index * 9
    if (index % 2 === 0) {
      setFill(doc, COLORS.card)
      doc.roundedRect(PAGE.margin, rowY - 5, PAGE.width - PAGE.margin * 2, 8, 2, 2, 'F')
    }
    setText(doc, COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.text(String(item[columns[0]] || item.name || item.title || '-'), PAGE.margin + 4, rowY, { maxWidth: 70 })
    setText(doc, COLORS.blue)
    doc.setFontSize(8.2)
    doc.text(String(item[columns[1]] || item.amount || item.value || ''), PAGE.margin + 80, rowY, { maxWidth: 42 })
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.6)
    doc.text(String(item[columns[2]] || item.detail || ''), PAGE.margin + 126, rowY, { maxWidth: 54 })
  })

  return y + visible.length * 9 + 8
}

function drawAccuracySummary(doc, y, accuracy = {}, meta = {}) {
  const metrics = [
    { label: 'Recognized Transactions', value: String(accuracy.recognizedTransactions ?? 0), detail: 'Readable rows included' },
    { label: 'Needs Review', value: String(accuracy.needsReviewCount ?? 0), detail: 'Rows requiring user attention', tone: COLORS.orange, fill: COLORS.orangeSoft },
    { label: 'Confidence', value: `${accuracy.confidenceScore ?? 100}%`, detail: 'Analysis confidence score', tone: COLORS.green, fill: COLORS.greenSoft },
    { label: 'Coverage', value: `${accuracy.coverage ?? 100}%`, detail: 'Recognized data coverage' },
    { label: 'User Overrides', value: String(accuracy.userOverrides ?? 0), detail: 'Saved corrections used' },
  ]

  y = addPageIfNeeded(doc, y, 72, 'Report Accuracy')
  y = drawSectionLabel(doc, 'Report Accuracy Summary', y)
  return drawProfessionalMetrics(doc, y, metrics, meta)
}

function finaliseProfessionalDoc(doc, meta) {
  drawProfessionalFooter(doc, meta)
  return doc.output('blob')
}

function topCategoryItems(expenseBreakdown = [], currency = 'INR') {
  return expenseBreakdown
    .filter((item) => safeAmount(item.value) > 0)
    .slice(0, 8)
    .map((item) => ({
      label: item.name,
      value: currencyMoney(item.value, currency),
      detail: item.source || 'Tracked category',
    }))
}

function buildMonthlySections({ advancedReport, expenseBreakdown, financialState, profile, savingsBuckets, recommendation, moneyBookSummary, currency }) {
  const commitments = commitmentItems(profile)
  const saved = sumMoney(savingsBuckets, (bucket) => bucket.saved)
  const target = sumMoney(savingsBuckets, (bucket) => bucket.target)
  const storyItems = [
    ...(advancedReport?.pressureAnalysis || []),
    ...(advancedReport?.spendingPatterns || []),
    ...(advancedReport?.purchaseInsights || []),
    ...(advancedReport?.behaviorInsights || []),
  ]

  return {
    metrics: [
      { label: 'Income', value: currencyMoney(financialState.income, currency), detail: 'Saved monthly income', tone: COLORS.green, fill: COLORS.greenSoft },
      { label: 'Used', value: `${financialState.usagePercent || 0}%`, detail: 'Income used this month' },
      { label: 'Safe Room', value: currencyMoney(financialState.safeToSpend ?? financialState.breathingRoom, currency), detail: 'Available after safety buffer', tone: COLORS.cyan, fill: [224, 242, 254] },
      { label: 'Goals', value: currencyMoney(saved, currency), detail: target > 0 ? `${Math.round((saved / target) * 100)}% of goal targets` : 'No active target' },
      { label: 'Open Settlements', value: String(moneyBookSummary?.pendingCount || 0), detail: 'Borrow/lend pending items' },
      { label: 'Comfort', value: financialState.comfort || 'Balanced', detail: financialState.pressure || 'Current pressure' },
    ],
    lists: [
      {
        title: 'Top Categories',
        items: topCategoryItems(expenseBreakdown, currency),
      },
      {
        title: 'Bills & Commitments',
        items: commitments.map((item) => ({
          label: item.name,
          value: currencyMoney(item.value, currency),
          detail: item.type,
        })),
      },
      {
        title: 'Goals Progress',
        items: savingsBuckets.filter((bucket) => safeAmount(bucket.target) > 0).map((bucket) => ({
          label: bucket.name || 'Savings goal',
          value: `${Math.min(Math.round((safeAmount(bucket.saved) / Math.max(safeAmount(bucket.target), 1)) * 100), 100)}%`,
          detail: `${currencyMoney(bucket.saved, currency)} of ${currencyMoney(bucket.target, currency)}`,
        })),
      },
      {
        title: 'Money Story',
        items: storyItems.map((item) => ({
          label: item.title,
          value: item.confidence || '',
          detail: item.detail,
        })),
      },
      {
        title: 'Recommendations',
        items: [
          {
            label: recommendation?.decision || 'Keep tracking',
            value: recommendation?.comfortLabel || '',
            detail: recommendation?.reason || advancedReport?.advisory || 'Review spending and upcoming commitments before large purchases.',
          },
        ],
      },
    ],
  }
}

function createProfessionalPdfDocument({ meta, metrics = [], lists = [], accuracy = {}, closing = '' }) {
  const doc = new meta.jsPDF({ unit: 'mm', format: 'a4' })
  doc.__fbplyLogoDataUrl = meta.logoDataUrl || ''
  drawProfessionalCover(doc, meta)
  let y = addProfessionalPage(doc, meta)
  y = drawProfessionalMetrics(doc, y, metrics, meta)

  lists.forEach((section) => {
    y = drawProfessionalList(doc, y, section.title, section.items, meta)
  })

  y = drawAccuracySummary(doc, y, accuracy, meta)

  if (closing) {
    y = addPageIfNeeded(doc, y, 36, 'Final Summary')
    y = drawSectionLabel(doc, 'Final Summary', y)
    drawTextBlock(doc, closing, PAGE.margin, y + 4, PAGE.width - PAGE.margin * 2, {
      size: 9,
      lineHeight: 4.2,
      maxLines: 6,
    })
  }

  return finaliseProfessionalDoc(doc, meta)
}

async function createProfessionalReportBlob({ meta, metrics, lists, accuracy, closing }) {
  const { jsPDF } = await import('jspdf')
  const logoDataUrl = await loadLogoDataUrl()

  return createProfessionalPdfDocument({
    meta: {
      ...meta,
      jsPDF,
      logoDataUrl,
    },
    metrics,
    lists,
    accuracy,
    closing,
  })
}

export async function createMonthlyBudgetReportPdfBlob(reportData = {}) {
  const currency = reportData.reportMeta?.currency || reportData.profile?.currency || 'INR'
  const template = reportData.reportMeta?.template || 'standard'
  const report = reportData.advancedReport || buildAdvancedReport(reportData)
  const sections = buildMonthlySections({
    ...reportData,
    advancedReport: report,
    currency,
  })
  const executiveHighlights = (report.snapshot || []).map((item) => ({
    label: item.label,
    value: item.value,
    detail: item.detail,
  }))
  const executiveWatchlist = [
    ...(report.pressureAnalysis || []),
    ...(report.purchaseInsights || []),
  ].map((item) => ({
    label: item.title,
    value: item.confidence || '',
    detail: item.detail,
  }))
  const lists = template === 'compact'
    ? sections.lists.filter((section) => ['Top Categories', 'Goals Progress', 'Recommendations'].includes(section.title))
    : template === 'executive'
      ? [
        { title: 'Executive Summary', items: executiveHighlights },
        ...sections.lists,
        { title: 'Risk & Watchlist', items: executiveWatchlist },
      ]
      : sections.lists

  return createProfessionalReportBlob({
    meta: {
      title: 'Monthly Budget Report',
      typeLabel: 'Monthly Budget Report',
      subtitle: 'Income, spending, commitments, goals, money story, and practical recommendations.',
      preparedFor: reportData.profile?.name || reportData.profile?.email || 'FBPly user',
      currency,
      period: reportData.reportMeta?.period || currentMonthLabel(),
      reportId: reportData.reportMeta?.reportId,
      generatedAt: reportData.reportMeta?.generatedAt,
      template,
    },
    metrics: sections.metrics,
    lists,
    accuracy: reportData.reportMeta?.accuracy || {
      recognizedTransactions: Array.isArray(reportData.expenses) ? reportData.expenses.length : 0,
      needsReviewCount: 0,
      confidenceScore: 100,
      userOverrides: 0,
      coverage: 100,
    },
    closing: report.advisory || 'Use this report as a clear monthly review, not as professional financial advice.',
  })
}

export async function createTripReportPdfBlob({ reportMeta = {}, profile = {}, groups = [] } = {}) {
  const currency = reportMeta.currency || profile.currency || 'INR'
  const template = reportMeta.template || 'standard'
  const group = groups[0] || {}
  const payments = group.payments || []
  const settlements = group.settlements || []
  const totalCost = safeAmount(group.amount)
  const settledAmount = sumMoney(settlements, (item) => item.settledAmount)
  const pendingAmount = sumMoney(settlements, (item) => item.remainingAmount)
  const members = group.people || []
  const paidBy = payments.reduce((map, payment) => {
    map[payment.paidBy] = safeAmount(map[payment.paidBy]) + safeAmount(payment.amount)
    return map
  }, {})
  const whoPaidMost = Object.entries(paidBy).sort((a, b) => b[1] - a[1])[0]

  const lists = [
    {
      title: 'Expense Breakdown',
      items: payments.map((payment) => ({
        label: payment.label || 'Shared payment',
        value: currencyMoney(payment.amount, currency),
        detail: `Paid by ${payment.paidBy || 'member'}`,
      })),
    },
    {
      title: 'Outstanding Balances',
      items: settlements.map((item) => ({
        label: item.direction === 'incoming' ? `${item.from} owes You` : `You owe ${item.to}`,
        value: currencyMoney(item.remainingAmount || item.amount, currency),
        detail: item.status || 'pending',
      })),
    },
  ]

  if (template === 'executive') {
    lists.splice(1, 0, {
      title: 'Members',
      items: members.map((member) => ({
        label: member,
        value: member === whoPaidMost?.[0] ? 'Top payer' : 'Member',
        detail: paidBy[member] ? currencyMoney(paidBy[member], currency) : 'No upfront payment',
      })),
    })
  }

  return createProfessionalReportBlob({
    meta: {
      title: group.name ? `${group.name} Trip Report` : 'Trip Report',
      typeLabel: 'Trip Report',
      subtitle: 'Shareable trip cost, member, payer, and settlement summary.',
      preparedFor: profile.name || profile.email || 'FBPly user',
      currency,
      period: reportMeta.period || group.date || currentMonthLabel(),
      reportId: reportMeta.reportId,
      generatedAt: reportMeta.generatedAt,
      template,
    },
    metrics: [
      { label: 'Total Cost', value: currencyMoney(totalCost, currency), detail: 'All shared payments' },
      { label: 'Members', value: String(members.length || 0), detail: members.join(', ') || 'No members added' },
      { label: 'Per Person', value: currencyMoney(group.share || totalCost / Math.max(members.length, 1), currency), detail: 'Equal split estimate' },
      { label: 'Settled', value: `${Math.round((settledAmount / Math.max(totalCost, 1)) * 100)}%`, detail: currencyMoney(settledAmount, currency), tone: COLORS.green, fill: COLORS.greenSoft },
      { label: 'Pending', value: `${Math.round((pendingAmount / Math.max(totalCost, 1)) * 100)}%`, detail: currencyMoney(pendingAmount, currency), tone: COLORS.orange, fill: COLORS.orangeSoft },
      { label: 'Paid Most', value: whoPaidMost?.[0] || 'Review', detail: whoPaidMost ? currencyMoney(whoPaidMost[1], currency) : 'No payment yet' },
    ],
    lists: template === 'compact' ? lists.slice(1) : lists,
    accuracy: { recognizedTransactions: payments.length, needsReviewCount: 0, confidenceScore: 100, userOverrides: 0, coverage: 100 },
    closing: 'This trip report is built from saved shared expense records and settlement status.',
  })
}

export async function createSettlementReportPdfBlob({ reportMeta = {}, profile = {}, groups = [] } = {}) {
  const currency = reportMeta.currency || profile.currency || 'INR'
  const template = reportMeta.template || 'standard'
  const settlements = groups.flatMap((group) => (group.settlements || []).map((settlement) => ({
    ...settlement,
    groupName: group.name || 'Shared group',
  })))
  const paid = settlements.filter((item) => ['received', 'paid', 'settled'].includes(item.status))
  const pending = settlements.filter((item) => !['received', 'paid', 'settled'].includes(item.status))

  const lists = [
    {
      title: 'Settlement Summary',
      items: settlements.map((item) => ({
        label: item.direction === 'incoming' ? `${item.from} owes You` : `You owe ${item.to}`,
        value: currencyMoney(item.remainingAmount || item.settledAmount || item.amount, currency),
        detail: `${item.groupName} - ${item.status || 'pending'}`,
      })),
    },
  ]

  if (template === 'executive') {
    lists.push(
      {
        title: 'Pending Settlements',
        items: pending.map((item) => ({
          label: item.direction === 'incoming' ? `${item.from} owes You` : `You owe ${item.to}`,
          value: currencyMoney(item.remainingAmount || item.amount, currency),
          detail: item.groupName,
        })),
      },
      {
        title: 'Paid Settlements',
        items: paid.map((item) => ({
          label: item.direction === 'incoming' ? `${item.from} paid You` : `You paid ${item.to}`,
          value: currencyMoney(item.settledAmount || item.amount, currency),
          detail: item.groupName,
        })),
      },
    )
  }

  return createProfessionalReportBlob({
    meta: {
      title: 'Settlement Report',
      typeLabel: 'Settlement Report',
      subtitle: 'Focused outstanding balance and settlement status document.',
      preparedFor: profile.name || profile.email || 'FBPly user',
      currency,
      period: reportMeta.period || currentMonthLabel(),
      reportId: reportMeta.reportId,
      generatedAt: reportMeta.generatedAt,
      template,
    },
    metrics: [
      { label: 'Total Settlements', value: String(settlements.length), detail: 'Generated balances' },
      { label: 'Paid', value: String(paid.length), detail: currencyMoney(sumMoney(paid, (item) => item.settledAmount || item.amount), currency), tone: COLORS.green, fill: COLORS.greenSoft },
      { label: 'Pending', value: String(pending.length), detail: currencyMoney(sumMoney(pending, (item) => item.remainingAmount || item.amount), currency), tone: COLORS.orange, fill: COLORS.orangeSoft },
    ],
    lists,
    accuracy: { recognizedTransactions: settlements.length, needsReviewCount: 0, confidenceScore: 100, userOverrides: 0, coverage: 100 },
    closing: 'Paid, pending, and overdue labels are based on saved settlement state.',
  })
}

export async function createStatementAnalysisReportPdfBlob({ reportMeta = {}, profile = {}, statementReport = {}, transactions = [] } = {}) {
  const currency = reportMeta.currency || profile.currency || 'INR'
  const template = reportMeta.template || 'standard'
  const needsReview = transactions.filter((item) => item.confidence === 'low' || item.category === 'Other' || !item.date)
  const recognized = Math.max(statementReport.transactionCount || transactions.length, 0)
  const confidenceScore = recognized > 0 ? Math.max(0, Math.round(((recognized - needsReview.length) / recognized) * 100)) : 0
  const statementLists = [
    {
      title: 'Top Categories',
      items: (statementReport.expenseCategories || []).map((item) => ({
        label: item.name,
        value: currencyMoney(item.amount, currency),
        detail: `${item.count || 0} rows`,
      })),
    },
    {
      title: 'Top Merchants',
      items: (statementReport.merchants || []).map((item) => ({
        label: item.name,
        value: currencyMoney(item.amount, currency),
        detail: `${item.count || 0} rows`,
      })),
    },
    {
      title: 'Needs Review',
      items: needsReview.map((item) => ({
        label: item.description,
        value: currencyMoney(item.amount, currency),
        detail: item.category || 'Needs Review',
      })),
    },
  ]

  if (template === 'executive') {
    statementLists.splice(1, 0, {
      title: 'Income Sources',
      items: (statementReport.incomeSources || []).map((item) => ({
        label: item.name,
        value: currencyMoney(item.amount, currency),
        detail: `${item.count || 0} rows`,
      })),
    })
    statementLists.push({
      title: 'Statement Insights',
      items: (statementReport.insights || []).map((insight) => ({
        label: 'Insight',
        value: '',
        detail: insight,
      })),
    })
  }

  return createProfessionalReportBlob({
    meta: {
      title: 'Statement Analysis Report',
      typeLabel: 'Statement Analysis Report',
      subtitle: 'Statement intelligence with confidence, trends, categories, merchants, and needs-review rows.',
      preparedFor: profile.name || profile.email || 'FBPly user',
      currency,
      period: reportMeta.period || statementReport.dateRange || currentMonthLabel(),
      reportId: reportMeta.reportId,
      generatedAt: reportMeta.generatedAt,
      template,
    },
    metrics: [
      { label: 'Money In', value: currencyMoney(statementReport.totalIncome, currency), detail: `${statementReport.incomeCount || 0} rows`, tone: COLORS.green, fill: COLORS.greenSoft },
      { label: 'Money Out', value: currencyMoney(statementReport.totalExpense, currency), detail: `${statementReport.expenseCount || 0} rows`, tone: COLORS.orange, fill: COLORS.orangeSoft },
      { label: 'Net Movement', value: currencyMoney(statementReport.netMovement, currency), detail: statementReport.dateRange || 'Statement period' },
      { label: 'Confidence', value: `${confidenceScore}%`, detail: `Based on ${recognized} recognized transactions`, tone: COLORS.green, fill: COLORS.greenSoft },
      { label: 'Needs Review', value: String(needsReview.length), detail: 'Rows to verify before decisions', tone: COLORS.orange, fill: COLORS.orangeSoft },
    ],
    lists: template === 'compact'
      ? statementLists.filter((section) => ['Top Categories', 'Needs Review'].includes(section.title))
      : statementLists,
    accuracy: {
      recognizedTransactions: recognized,
      needsReviewCount: needsReview.length,
      confidenceScore,
      userOverrides: reportMeta.userOverrides || 0,
      coverage: recognized > 0 ? Math.round(((recognized - needsReview.length) / recognized) * 100) : 0,
    },
    closing: 'Statement analysis is based only on readable rows. Review uncertain rows before relying on the report.',
  })
}

export async function createReportPdfBlob({ type = 'monthly', payload = {} } = {}) {
  if (type === 'trip') {
    return createTripReportPdfBlob(payload)
  }

  if (type === 'settlement') {
    return createSettlementReportPdfBlob(payload)
  }

  if (type === 'statement') {
    return createStatementAnalysisReportPdfBlob(payload)
  }

  return createMonthlyBudgetReportPdfBlob(payload)
}

export async function createMonthlyReportPdfBlob({
  advancedReport,
  expenseBreakdown = [],
  expenses = [],
  financialState = {},
  insights = [],
  moneyBookSummary = {},
  profile = {},
  reportMeta = {},
  recommendation = null,
  savingsBuckets = [],
  sharedSummary = null,
}) {
  return createMonthlyBudgetReportPdfBlob({
    advancedReport,
    expenseBreakdown,
    expenses,
    financialState,
    insights,
    moneyBookSummary,
    profile,
    reportMeta,
    recommendation,
    savingsBuckets,
    sharedSummary,
  })
}

export async function generateMonthlyReportPdf(reportData) {
  const blob = await createMonthlyReportPdfBlob(reportData)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'FBPly-financial-report.pdf'
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}
