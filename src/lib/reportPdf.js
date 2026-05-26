import { buildAdvancedReport } from './reportInsights.js'

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

const CHART_COLORS = [
  [37, 99, 235],
  [14, 165, 233],
  [16, 185, 129],
  [245, 158, 11],
  [168, 85, 247],
  [236, 72, 153],
  [20, 184, 166],
  [100, 116, 139],
]

function safeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function formatIndian(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(safeAmount(value))
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

function hexToRgb(hex, fallback = COLORS.blue) {
  const clean = String(hex || '').replace('#', '').trim()
  if (!/^[0-9a-f]{6}$/i.test(clean)) {
    return fallback
  }

  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
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

function monthlyFeeling(financialState = {}) {
  if (financialState.pressureTone === 'slight-pressure') {
    return 'Saved data shows this month carried extra pressure.'
  }

  if (financialState.pressureTone === 'warm') {
    return 'Saved data shows the month stayed manageable, with a few areas to watch.'
  }

  if (financialState.pressureTone === 'comfortable') {
    return 'Saved data shows the month had useful planning space.'
  }

  return 'Your month looks balanced from the saved data.'
}

function buildMetricCards(report, financialState, savingsBuckets = []) {
  const saved = savingsBuckets.reduce((total, bucket) => total + safeAmount(bucket.saved), 0)
  const target = savingsBuckets.reduce((total, bucket) => total + safeAmount(bucket.target), 0)
  const savingsRhythm = report.snapshot?.find((item) => item.label === 'Savings consistency')?.value || (saved > 0 ? 'Forming' : 'Early')

  return [
    {
      label: 'Financial Balance',
      value: financialState.comfort || 'Balanced Month',
      detail: financialState.pressure || 'Moderate',
      tone: COLORS.blue,
      fill: COLORS.blueSoft,
    },
    {
      label: 'Spending Comfort',
      value: `${financialState.usagePercent || 0}% used`,
      detail: 'Income allocated this month',
      tone: COLORS.cyan,
      fill: [224, 242, 254],
    },
    {
      label: 'Breathing Room',
      value: formatMoney(financialState.breathingRoom || 0),
      detail: 'After protected buffer',
      tone: COLORS.green,
      fill: COLORS.greenSoft,
    },
    {
      label: 'Savings Rhythm',
      value: savingsRhythm,
      detail: target > 0 ? `${Math.round((saved / target) * 100)}% bucket progress` : 'No bucket target yet',
      tone: COLORS.orange,
      fill: COLORS.orangeSoft,
    },
    {
      label: 'Commitment Stability',
      value: (financialState.emiLoad || 0) > 24 ? 'Needs space' : 'Stable',
      detail: `${financialState.emiLoad || 0}% EMI load`,
      tone: (financialState.emiLoad || 0) > 24 ? COLORS.orange : COLORS.green,
      fill: (financialState.emiLoad || 0) > 24 ? COLORS.orangeSoft : COLORS.greenSoft,
    },
  ]
}

function buildMixItems(expenseBreakdown = [], report = {}) {
  const fromBreakdown = expenseBreakdown
    .filter((item) => safeAmount(item.value) > 0)
    .map((item, index) => ({
      name: item.name,
      value: safeAmount(item.value),
      color: hexToRgb(item.color, CHART_COLORS[index % CHART_COLORS.length]),
    }))

  if (fromBreakdown.length > 0) {
    return fromBreakdown
  }

  return (report.spending?.categories || []).map((item, index) => ({
    name: item.name,
    value: safeAmount(item.value),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
}

function commitmentItems(profile = {}) {
  const commitments = Array.isArray(profile.commitments) ? profile.commitments : profile.fixedExpenses || []
  return commitments
    .map((item) => ({
      name: item.name || item.label || 'Monthly commitment',
      value: safeAmount(item.amount),
      type: /\b(emi|loan|installment|instalment|finance|bnpl)\b/i.test(item.name || item.label || '')
        ? 'EMI / loan'
        : 'Fixed monthly',
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

function drawArc(doc, cx, cy, radius, startDeg, endDeg, color, width = 3.2) {
  if (endDeg <= startDeg) {
    return
  }

  setStroke(doc, color)
  doc.setLineWidth(width)
  const step = Math.max((endDeg - startDeg) / 28, 2)
  let previous = null

  for (let angle = startDeg; angle <= endDeg; angle += step) {
    const radians = (Math.min(angle, endDeg) - 90) * (Math.PI / 180)
    const point = {
      x: cx + Math.cos(radians) * radius,
      y: cy + Math.sin(radians) * radius,
    }

    if (previous) {
      doc.line(previous.x, previous.y, point.x, point.y)
    }

    previous = point
  }
}

function drawUsageRing(doc, x, y, percent, label, value, color = COLORS.cyan) {
  const radius = 17
  const cx = x + radius
  const cy = y + radius

  drawArc(doc, cx, cy, radius, 0, 360, [226, 232, 240], 3.4)
  drawArc(doc, cx, cy, radius, 0, Math.min(Math.max(percent, 0), 100) * 3.6, color, 3.4)

  setText(doc, COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(value, cx, cy + 1.5, { align: 'center' })
  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.text(label, cx, cy + 7, { align: 'center' })
}

function drawDonut(doc, x, y, items, totalLabel) {
  const total = items.reduce((sum, item) => sum + safeAmount(item.value), 0)
  const radius = 24
  const cx = x + radius
  const cy = y + radius

  drawArc(doc, cx, cy, radius, 0, 360, [226, 232, 240], 5.2)

  if (total > 0) {
    let cursor = 0
    items.slice(0, 6).forEach((item, index) => {
      const start = cursor
      const sweep = (safeAmount(item.value) / total) * 360
      cursor += sweep
      drawArc(doc, cx, cy, radius, start, cursor, item.color || CHART_COLORS[index % CHART_COLORS.length], 5.2)
    })
  }

  setText(doc, COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(totalLabel, cx, cy + 1, { align: 'center' })
  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('monthly mix', cx, cy + 6, { align: 'center' })
}

function drawCoverPage(doc, { profile, report, financialState }) {
  setFill(doc, COLORS.navy)
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F')
  setFill(doc, [18, 44, 90])
  doc.circle(178, 34, 42, 'F')
  setFill(doc, [13, 31, 64])
  doc.circle(38, 246, 58, 'F')
  setStroke(doc, [56, 189, 248])
  doc.setLineWidth(0.45)
  doc.circle(166, 47, 38, 'S')

  drawBrandLockup(doc, PAGE.margin, 18, { color: COLORS.white })

  setText(doc, COLORS.cyan)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('MONTHLY FINANCIAL REPORT', PAGE.margin, 78)

  setText(doc, COLORS.white)
  doc.setFontSize(28)
  doc.text('Your month,', PAGE.margin, 96)
  doc.text('shown clearly.', PAGE.margin, 110)

  drawTextBlock(doc, monthlyFeeling(financialState), PAGE.margin, 125, 112, {
    color: [203, 213, 225],
    size: 11,
    lineHeight: 5,
    maxLines: 3,
  })

  drawRoundedCard(doc, PAGE.margin, 160, PAGE.width - PAGE.margin * 2, 54, {
    fill: [15, 28, 59],
    stroke: [37, 99, 235],
  })
  setText(doc, COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  drawTextBlock(doc, report.advisory || 'Your month is ready for review.', PAGE.margin + 8, 174, PAGE.width - PAGE.margin * 2 - 16, {
    color: COLORS.white,
    weight: 'bold',
    size: 13,
    lineHeight: 5.4,
    maxLines: 4,
  })
  setText(doc, [203, 213, 225])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Prepared for ${profile.name || 'You'} - ${currentMonthLabel()}`, PAGE.margin + 8, 205)

  const cardY = 232
  const cardWidth = (PAGE.width - PAGE.margin * 2 - 10) / 3
  const coverCards = [
    ['Income', formatMoney(financialState.income)],
    ['Used this month', `${financialState.usagePercent || 0}%`],
    ['Breathing room', formatMoney(financialState.breathingRoom)],
  ]

  coverCards.forEach(([label, value], index) => {
    const x = PAGE.margin + index * (cardWidth + 5)
    drawRoundedCard(doc, x, cardY, cardWidth, 34, { fill: [248, 250, 252], stroke: [191, 219, 254] })
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(label.toUpperCase(), x + 5, cardY + 10)
    setText(doc, COLORS.navy)
    doc.setFontSize(12)
    doc.text(value, x + 5, cardY + 23, { maxWidth: cardWidth - 10 })
  })

  setText(doc, [148, 163, 184])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Personal financial clarity from saved and reviewed data.', PAGE.width / 2, 282, { align: 'center' })
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

function drawHealthSummary(doc, y, metrics) {
  y = addPageIfNeeded(doc, y, 74, 'Financial Health Summary')
  drawSectionLabel(doc, 'Financial Health Summary', y)
  y += 9

  const gap = 5
  const width = (PAGE.width - PAGE.margin * 2 - gap * 2) / 3
  metrics.slice(0, 3).forEach((metric, index) => {
    drawMetricCard(doc, PAGE.margin + index * (width + gap), y, width, 38, metric)
  })

  y += 43
  const wideWidth = (PAGE.width - PAGE.margin * 2 - gap) / 2
  metrics.slice(3, 5).forEach((metric, index) => {
    drawMetricCard(doc, PAGE.margin + index * (wideWidth + gap), y, wideWidth, 34, metric)
  })

  return y + 42
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

function drawVisualStory(doc, y, { financialState, mixItems }) {
  y = addPageIfNeeded(doc, y, 76, 'Financial Visuals')
  const cardWidth = (PAGE.width - PAGE.margin * 2 - 7) / 2

  drawRoundedCard(doc, PAGE.margin, y, cardWidth, 70, { fill: COLORS.white })
  setText(doc, COLORS.navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Financial balance', PAGE.margin + 6, y + 9)
  drawUsageRing(doc, PAGE.margin + 9, y + 19, financialState.usagePercent || 0, 'used', `${financialState.usagePercent || 0}%`, COLORS.cyan)
  drawTextBlock(doc, 'Lower usage leaves more room for future choices.', PAGE.margin + 50, y + 25, cardWidth - 57, {
    maxLines: 5,
    size: 8.2,
  })

  const x2 = PAGE.margin + cardWidth + 7
  drawRoundedCard(doc, x2, y, cardWidth, 70, { fill: COLORS.white })
  setText(doc, COLORS.navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Spending mix', x2 + 6, y + 9)
  const total = mixItems.reduce((sum, item) => sum + item.value, 0)
  drawDonut(doc, x2 + 7, y + 17, mixItems, formatMoney(total))
  const legendX = x2 + 60
  mixItems.slice(0, 4).forEach((item, index) => {
    const rowY = y + 23 + index * 9
    setFill(doc, item.color || CHART_COLORS[index])
    doc.circle(legendX, rowY - 1.5, 1.6, 'F')
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(item.name, legendX + 4, rowY, { maxWidth: cardWidth - 66 })
  })

  return y + 79
}

function drawInsightCards(doc, y, title, items, { maxItems = 3, titleWidth = 52 } = {}) {
  const selected = items.slice(0, maxItems)
  if (selected.length === 0) {
    return y
  }

  y = addPageIfNeeded(doc, y, 18 + selected.length * 24, title)
  y = drawSectionLabel(doc, title, y)

  selected.forEach((item) => {
    y = addPageIfNeeded(doc, y, 24, title)
    drawRoundedCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 22, { fill: COLORS.card })
    setText(doc, COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(item.title, PAGE.margin + 5, y + 8, { maxWidth: titleWidth })
    drawTextBlock(doc, item.detail, PAGE.margin + titleWidth + 8, y + 7.5, PAGE.width - PAGE.margin * 2 - titleWidth - 14, {
      size: 8,
      lineHeight: 3.8,
      maxLines: 3,
    })
    y += 26
  })

  return y + 2
}

function drawSpendingBalance(doc, y, mixItems, financialState) {
  y = addPageIfNeeded(doc, y, 80, 'Spending Balance')
  y = drawSectionLabel(doc, 'Spending Balance', y, 'A compact view of what shaped the month.')

  const total = Math.max(mixItems.reduce((sum, item) => sum + item.value, 0), 1)
  mixItems.slice(0, 6).forEach((item, index) => {
    const rowY = y + index * 12
    const share = item.value / total
    setFill(doc, item.color || CHART_COLORS[index % CHART_COLORS.length])
    doc.circle(PAGE.margin + 2, rowY + 3, 1.8, 'F')
    setText(doc, COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.6)
    doc.text(item.name, PAGE.margin + 7, rowY + 5, { maxWidth: 50 })
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(formatMoney(item.value), PAGE.margin + 62, rowY + 5)
    setFill(doc, [226, 232, 240])
    doc.roundedRect(PAGE.margin + 102, rowY + 1.5, 72, 3.8, 2, 2, 'F')
    setFill(doc, item.color || COLORS.blue)
    doc.roundedRect(PAGE.margin + 102, rowY + 1.5, Math.max(72 * share, 2), 3.8, 2, 2, 'F')
  })

  drawTextBlock(
    doc,
    `Regular commitments and tracked spending used ${financialState.usagePercent || 0}% of income. The useful question is not perfection; it is whether the remaining room feels workable.`,
    PAGE.margin,
    y + 76,
    PAGE.width - PAGE.margin * 2,
    { size: 8.4, lineHeight: 4, maxLines: 3 },
  )

  return y + 91
}

function drawCommitments(doc, y, commitments) {
  if (commitments.length === 0) {
    return y
  }

  y = addPageIfNeeded(doc, y, 58, 'Commitment Overview')
  y = drawSectionLabel(doc, 'Commitment Overview', y, 'Fixed costs stay visible because they quietly shape monthly comfort.')

  const width = (PAGE.width - PAGE.margin * 2 - 6) / 2
  commitments.slice(0, 4).forEach((item, index) => {
    const x = PAGE.margin + (index % 2) * (width + 6)
    const top = y + Math.floor(index / 2) * 25
    drawRoundedCard(doc, x, top, width, 20, { fill: COLORS.white })
    setText(doc, COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(item.name, x + 5, top + 7, { maxWidth: width - 10 })
    setText(doc, COLORS.blue)
    doc.setFontSize(10)
    doc.text(formatMoney(item.value), x + 5, top + 16)
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(item.type, x + width - 5, top + 16, { align: 'right' })
  })

  return y + Math.ceil(Math.min(commitments.length, 4) / 2) * 25 + 8
}

function drawSharedFlow(doc, y, sharedSummary = {}) {
  if (!sharedSummary?.activeGroups) {
    return y
  }

  y = addPageIfNeeded(doc, y, 52, 'Shared Expense Flow')
  y = drawSectionLabel(doc, 'Shared Expense Flow', y, 'Group payments are included in the same monthly financial picture.')

  const width = (PAGE.width - PAGE.margin * 2 - 9) / 4
  const items = [
    ['You paid', sharedSummary.totalPaidByYou],
    ['Recoverable', sharedSummary.pendingRecoverable],
    ['Received', sharedSummary.receivedRecoveries],
    ['Month impact', sharedSummary.netSharedImpact],
  ]

  items.forEach(([label, value], index) => {
    const x = PAGE.margin + index * (width + 3)
    drawRoundedCard(doc, x, y, width, 28, { fill: index === 3 ? COLORS.soft : COLORS.white })
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.text(label, x + 4, y + 8, { maxWidth: width - 8 })
    setText(doc, index === 3 ? COLORS.blue : COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.2)
    doc.text(formatMoney(value), x + 4, y + 20, { maxWidth: width - 8 })
  })

  return y + 36
}

function drawTrend(doc, y, timeline = []) {
  y = addPageIfNeeded(doc, y, 50, 'Spending Rhythm')
  y = drawSectionLabel(doc, 'Spending Rhythm', y, 'A light view of how spending entries appeared through the month.')

  drawRoundedCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 42, { fill: COLORS.white })

  if (timeline.length < 2) {
    drawTextBlock(doc, 'More dated expense entries will make this rhythm clearer in future reports.', PAGE.margin + 6, y + 18, PAGE.width - PAGE.margin * 2 - 12, {
      size: 9,
      maxLines: 2,
    })
    return y + 50
  }

  const values = timeline.map((point) => safeAmount(point.amount))
  const max = Math.max(...values, 1)
  const chart = {
    x: PAGE.margin + 8,
    y: y + 10,
    width: PAGE.width - PAGE.margin * 2 - 16,
    height: 22,
  }

  setStroke(doc, [226, 232, 240])
  doc.setLineWidth(0.2)
  doc.line(chart.x, chart.y + chart.height, chart.x + chart.width, chart.y + chart.height)

  const points = timeline.map((point, index) => ({
    x: chart.x + (index / Math.max(timeline.length - 1, 1)) * chart.width,
    y: chart.y + chart.height - (safeAmount(point.amount) / max) * chart.height,
  }))

  setStroke(doc, COLORS.cyan)
  doc.setLineWidth(1.4)
  points.slice(1).forEach((point, index) => {
    const previous = points[index]
    doc.line(previous.x, previous.y, point.x, point.y)
  })
  points.forEach((point) => {
    setFill(doc, COLORS.blue)
    doc.circle(point.x, point.y, 1.2, 'F')
  })

  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.text(timeline[0].label, chart.x, y + 37)
  doc.text(timeline[timeline.length - 1].label, chart.x + chart.width, y + 37, { align: 'right' })

  return y + 50
}

function drawPurchaseReadiness(doc, y, report, recommendation) {
  const purchaseItems = report.purchaseInsights || []
  y = addPageIfNeeded(doc, y, 78, 'Purchase Readiness')
  y = drawSectionLabel(doc, 'Purchase Readiness', y, 'A practical look at future buying comfort, not maximum affordability.')

  const width = (PAGE.width - PAGE.margin * 2 - 8) / 2
  const readinessCards = [
    {
      label: 'Financing comfort',
      value: recommendation?.comfortableEmiLabel || purchaseItems[1]?.title || 'Use Planner',
      detail: purchaseItems[1]?.detail || 'Add a target purchase in Planner to estimate a safer EMI path.',
      fill: COLORS.blueSoft,
      tone: COLORS.blue,
    },
    {
      label: 'Timing signal',
      value: recommendation?.saferTimingLabel || 'Build slowly',
      detail: purchaseItems[2]?.detail || 'Waiting can improve downpayment strength and preserve breathing room.',
      fill: COLORS.greenSoft,
      tone: COLORS.green,
    },
  ]

  readinessCards.forEach((card, index) => {
    drawMetricCard(doc, PAGE.margin + index * (width + 8), y, width, 46, card)
  })

  y += 54
  if (purchaseItems[0]) {
    drawRoundedCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 30, { fill: COLORS.card })
    setText(doc, COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(purchaseItems[0].title, PAGE.margin + 6, y + 9)
    drawTextBlock(doc, purchaseItems[0].detail, PAGE.margin + 6, y + 17, PAGE.width - PAGE.margin * 2 - 12, {
      size: 8,
      lineHeight: 3.8,
      maxLines: 3,
    })
    y += 38
  }

  return y
}

function drawClosingReflection(doc, y, report) {
  y = addPageIfNeeded(doc, y, 50, 'Final Note')
  y = drawSectionLabel(doc, 'Final Note', y)
  drawRoundedCard(doc, PAGE.margin, y, PAGE.width - PAGE.margin * 2, 42, {
    fill: COLORS.navy,
    stroke: COLORS.navy2,
  })

  setText(doc, COLORS.cyan)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('FBPly note', PAGE.margin + 7, y + 10)
  drawTextBlock(doc, report.advisory, PAGE.margin + 7, y + 20, PAGE.width - PAGE.margin * 2 - 14, {
    size: 9.2,
    lineHeight: 4.4,
    color: COLORS.white,
    maxLines: 4,
  })

  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('This report uses saved income, commitments, expense entries, planner state, and savings buckets only.', PAGE.margin, PAGE.height - 9)

  return y + 50
}

export async function createMonthlyReportPdfBlob({
  advancedReport,
  expenseBreakdown = [],
  expenses = [],
  financialState = {},
  insights = [],
  profile = {},
  recommendation = null,
  savingsBuckets = [],
  sharedSummary = null,
}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.__fbplyLogoDataUrl = await loadLogoDataUrl()
  const report = advancedReport || buildAdvancedReport({
    expenseBreakdown,
    expenses,
    financialState,
    insights,
    profile,
    recommendation,
    savingsBuckets,
    sharedSummary,
  })
  const mixItems = buildMixItems(expenseBreakdown, report)
  const metrics = buildMetricCards(report, financialState, savingsBuckets)
  const commitments = commitmentItems(profile)

  drawCoverPage(doc, { profile, report, financialState })

  let y = addPage(doc, 'Financial Health Summary')
  y = drawHealthSummary(doc, y, metrics)
  y = drawVisualStory(doc, y, { financialState, mixItems })
  drawInsightCards(doc, y, 'What Shaped The Month', [
    ...(report.spendingPatterns || []).slice(0, 2),
    ...(report.pressureAnalysis || []).slice(0, 1),
  ], { maxItems: 3 })

  y = addPage(doc, 'Spending And Planning')
  y = drawSpendingBalance(doc, y, mixItems, financialState)
  y = drawCommitments(doc, y, commitments)
  y = drawSharedFlow(doc, y, report.sharedSummary || sharedSummary)
  y = drawTrend(doc, y, report.timeline || [])
  y = drawPurchaseReadiness(doc, y, report, recommendation)
  drawClosingReflection(doc, y, report)

  return doc.output('blob')
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
