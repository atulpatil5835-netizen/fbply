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

function addPageIfNeeded(doc, y, height, meta = {}) {
  if (y + height <= PAGE.height - PAGE.margin) {
    return y
  }

  return addProfessionalPage(doc, meta)
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

function finaliseProfessionalDoc(doc, meta) {
  drawProfessionalFooter(doc, meta)
  return doc.output('blob')
}

function cleanSentence(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()

  if (!text || /^(moderate|strong|balanced)\s+visibility$/i.test(text) || /^balanced\s+overall$/i.test(text)) {
    return ''
  }

  return /[.!?]$/.test(text) ? text : `${text}.`
}

function uniqueSentences(items = [], limit = 5) {
  const seen = new Set()
  const result = []

  items.forEach((item) => {
    const sentence = cleanSentence(item)
    const key = sentence.toLowerCase()

    if (!sentence || seen.has(key) || result.length >= limit) {
      return
    }

    seen.add(key)
    result.push(sentence)
  })

  return result
}

function plural(value, singular, pluralLabel = `${singular}s`) {
  return value === 1 ? singular : pluralLabel
}

function percentLabel(value) {
  return `${Math.max(0, Math.min(Math.round(value || 0), 100))}%`
}

function sectionLimit(meta = {}, standard = 8) {
  if (meta.template === 'compact') {
    return Math.min(standard, 5)
  }

  if (meta.template === 'executive') {
    return Math.max(standard, 12)
  }

  return standard
}

function sortedMoneyItems(items = [], valueKey = 'value') {
  return items
    .map((item) => ({
      ...item,
      amount: safeAmount(item[valueKey] ?? item.amount ?? item.value),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

function barItems(items = [], currency = 'INR', { valueKey = 'value', labelKey = 'name', detailKey = 'detail', total = 0 } = {}) {
  const sorted = sortedMoneyItems(items, valueKey)
  const baseTotal = total || sumMoney(sorted, (item) => item.amount)

  return sorted.map((item) => {
    const share = baseTotal > 0 ? Math.round((item.amount / baseTotal) * 100) : 0

    return {
      label: item[labelKey] || item.label || 'Other',
      value: currencyMoney(item.amount, currency),
      detail: item[detailKey] || item.source || `${share}% of total`,
      percentage: share,
      barValue: share,
      amount: item.amount,
    }
  })
}

function drawDocumentHeading(doc, title, y, subtitle = '') {
  setText(doc, COLORS.navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(title, PAGE.margin, y)

  if (subtitle) {
    return drawTextBlock(doc, subtitle, PAGE.margin, y + 7, PAGE.width - PAGE.margin * 2, {
      size: 8.4,
      lineHeight: 4,
      maxLines: 3,
    }) + 2
  }

  return y + 11
}

function drawMinorHeading(doc, title, y) {
  setText(doc, COLORS.navy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text(title, PAGE.margin, y)
  setStroke(doc, [226, 232, 240])
  doc.setLineWidth(0.2)
  doc.line(PAGE.margin, y + 3, PAGE.width - PAGE.margin, y + 3)
  return y + 9
}

function drawKeyNumbers(doc, y, title, numbers = [], meta = {}, { large = false } = {}) {
  const visible = numbers.filter(Boolean).slice(0, large ? 6 : sectionLimit(meta, 8))

  if (visible.length === 0) {
    return y
  }

  y = addPageIfNeeded(doc, y, 20 + Math.ceil(visible.length / 2) * (large ? 27 : 22), meta)
  y = drawMinorHeading(doc, title, y)

  const columns = large ? 2 : 3
  const gap = large ? 9 : 7
  const width = (PAGE.width - PAGE.margin * 2 - gap * (columns - 1)) / columns
  const rowHeight = large ? 28 : 23

  visible.forEach((item, index) => {
    const x = PAGE.margin + (index % columns) * (width + gap)
    const top = y + Math.floor(index / columns) * rowHeight

    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.1)
    doc.text(String(item.label || '').toUpperCase(), x, top)
    setText(doc, item.tone || COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(large ? 16 : 12.8)
    doc.text(String(item.value || '-'), x, top + (large ? 9 : 8), { maxWidth: width })
    if (item.detail) {
      drawTextBlock(doc, item.detail, x, top + (large ? 15 : 14), width, {
        size: 7.3,
        lineHeight: 3.4,
        maxLines: 2,
      })
    }

    setStroke(doc, [226, 232, 240])
    doc.setLineWidth(0.18)
    doc.line(x, top + rowHeight - 5, x + width, top + rowHeight - 5)
  })

  return y + Math.ceil(visible.length / columns) * rowHeight + 3
}

function drawObservationList(doc, y, title, observations = [], meta = {}) {
  const visible = uniqueSentences(observations, meta.template === 'compact' ? 3 : 5)

  if (visible.length === 0) {
    return y
  }

  y = addPageIfNeeded(doc, y, 18 + visible.length * 12, meta)
  y = drawMinorHeading(doc, title, y)

  visible.forEach((item, index) => {
    const rowY = y + index * 11
    setText(doc, COLORS.blue)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.4)
    doc.text(`${index + 1}.`, PAGE.margin, rowY)
    drawTextBlock(doc, item, PAGE.margin + 8, rowY, PAGE.width - PAGE.margin * 2 - 8, {
      size: 8.5,
      lineHeight: 3.8,
      color: COLORS.text,
      maxLines: 2,
    })
  })

  return y + visible.length * 11 + 4
}

function drawExecutiveSummary(doc, y, { summary = '', snapshot = [], observations = [] } = {}, meta = {}) {
  y = drawDocumentHeading(doc, 'Executive Summary', y, 'A plain-language view of the financial period, prepared for quick review and sharing.')
  y = drawTextBlock(doc, summary, PAGE.margin, y + 3, PAGE.width - PAGE.margin * 2, {
    size: 10,
    lineHeight: 4.8,
    color: COLORS.text,
    maxLines: 6,
  }) + 6
  y = drawKeyNumbers(doc, y, 'Financial Snapshot', snapshot, meta, { large: true })
  return drawObservationList(doc, y, 'Key Observations', observations, meta)
}

function drawHorizontalBars(doc, y, section, meta = {}) {
  const visible = (section.items || []).filter(Boolean).slice(0, sectionLimit(meta, section.limit || 8))

  if (visible.length === 0) {
    return y
  }

  y = addPageIfNeeded(doc, y, 18 + visible.length * 14, meta)
  y = drawMinorHeading(doc, section.title, y)
  if (section.subtitle) {
    y = drawTextBlock(doc, section.subtitle, PAGE.margin, y - 1, PAGE.width - PAGE.margin * 2, {
      size: 7.8,
      lineHeight: 3.6,
      maxLines: 2,
    }) + 3
  }

  const barWidth = 82
  const amountX = PAGE.width - PAGE.margin - 42

  visible.forEach((item, index) => {
    const rowY = y + index * 14
    const barY = rowY + 4.5
    const percent = Math.max(0, Math.min(safeAmount(item.barValue ?? item.percentage), 100))

    setText(doc, COLORS.navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.3)
    doc.text(String(item.label || '-'), PAGE.margin, rowY, { maxWidth: 56 })
    setText(doc, COLORS.text)
    doc.setFontSize(8.2)
    doc.text(String(item.value || ''), amountX, rowY, { maxWidth: 42 })
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.text(item.percentage != null ? percentLabel(item.percentage) : String(item.detail || ''), PAGE.margin + 61, rowY, { maxWidth: 22 })

    setFill(doc, [226, 232, 240])
    doc.roundedRect(PAGE.margin + 84, barY, barWidth, 2.6, 1.3, 1.3, 'F')
    setFill(doc, item.tone || COLORS.blue)
    doc.roundedRect(PAGE.margin + 84, barY, Math.max(2, (barWidth * percent) / 100), 2.6, 1.3, 1.3, 'F')
  })

  return y + visible.length * 14 + 4
}

function drawDocumentTable(doc, y, section, meta = {}) {
  const visible = (section.items || []).filter(Boolean).slice(0, sectionLimit(meta, section.limit || 10))

  if (visible.length === 0) {
    return y
  }

  const columns = section.columns || [
    { key: 'label', label: 'Item', width: 72 },
    { key: 'value', label: 'Amount', width: 42 },
    { key: 'detail', label: 'Notes', width: 58 },
  ]

  y = addPageIfNeeded(doc, y, 20 + visible.length * 10, meta)
  y = drawMinorHeading(doc, section.title, y)
  if (section.subtitle) {
    y = drawTextBlock(doc, section.subtitle, PAGE.margin, y - 1, PAGE.width - PAGE.margin * 2, {
      size: 7.8,
      lineHeight: 3.6,
      maxLines: 2,
    }) + 3
  }

  const drawHeader = () => {
    let x = PAGE.margin
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    columns.forEach((column) => {
      doc.text(String(column.label || '').toUpperCase(), x, y)
      x += column.width
    })
    setStroke(doc, [203, 213, 225])
    doc.setLineWidth(0.18)
    doc.line(PAGE.margin, y + 3, PAGE.width - PAGE.margin, y + 3)
    y += 9
  }

  drawHeader()

  visible.forEach((item) => {
    if (y + 14 > PAGE.height - PAGE.margin) {
      y = addProfessionalPage(doc, meta)
      y = drawMinorHeading(doc, section.title, y)
      drawHeader()
    }

    let x = PAGE.margin
    columns.forEach((column, columnIndex) => {
      setText(doc, columnIndex === 1 ? COLORS.blue : COLORS.text)
      doc.setFont('helvetica', columnIndex === 0 ? 'bold' : 'normal')
      doc.setFontSize(8)
      const lines = doc.splitTextToSize(String(item[column.key] || ''), column.width - 5).slice(0, 2)
      doc.text(lines, x, y)
      x += column.width
    })
    setStroke(doc, [226, 232, 240])
    doc.setLineWidth(0.16)
    doc.line(PAGE.margin, y + 5.5, PAGE.width - PAGE.margin, y + 5.5)
    y += 10
  })

  return y + 4
}

function drawAnalysisSection(doc, y, section, meta = {}) {
  if (section.kind === 'bars') {
    return drawHorizontalBars(doc, y, section, meta)
  }

  return drawDocumentTable(doc, y, section, meta)
}

function drawRecommendations(doc, y, recommendations = [], meta = {}) {
  const visible = uniqueSentences(recommendations, 3)

  if (visible.length === 0) {
    return y
  }

  y = addPageIfNeeded(doc, y, 22 + visible.length * 15, meta)
  y = drawDocumentHeading(doc, 'Recommendations', y, 'Focused next steps only. These are planning prompts, not professional financial advice.')

  visible.forEach((item, index) => {
    const rowY = y + index * 15
    setFill(doc, COLORS.soft)
    doc.circle(PAGE.margin + 3, rowY - 1.5, 3.2, 'F')
    setText(doc, COLORS.blue)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(String(index + 1), PAGE.margin + 3, rowY + 0.8, { align: 'center' })
    drawTextBlock(doc, item, PAGE.margin + 11, rowY, PAGE.width - PAGE.margin * 2 - 11, {
      size: 8.8,
      lineHeight: 4,
      color: COLORS.text,
      maxLines: 2,
    })
  })

  return y + visible.length * 15 + 3
}

function dataQualityLines(accuracy = {}) {
  return [
    `Recognized records: ${accuracy.recognizedTransactions ?? 0}.`,
    `Needs review: ${accuracy.needsReviewCount ?? 0}.`,
    `Confidence: ${accuracy.confidenceScore ?? 100}%.`,
    `Coverage: ${accuracy.coverage ?? 100}%.`,
    `User overrides used: ${accuracy.userOverrides ?? 0}.`,
  ]
}

function drawFinalSummary(doc, y, finalSummary = '', accuracy = {}, meta = {}) {
  y = addPageIfNeeded(doc, y, 56, meta)
  y = drawDocumentHeading(doc, 'Final Summary', y)
  y = drawTextBlock(doc, finalSummary, PAGE.margin, y + 2, PAGE.width - PAGE.margin * 2, {
    size: 9.2,
    lineHeight: 4.4,
    color: COLORS.text,
    maxLines: 6,
  }) + 8
  y = drawMinorHeading(doc, 'Report Data Quality', y)
  drawTextBlock(doc, dataQualityLines(accuracy).join(' '), PAGE.margin, y, PAGE.width - PAGE.margin * 2, {
    size: 7.8,
    lineHeight: 3.6,
    maxLines: 4,
  })

  return y + 22
}

function createProfessionalPdfDocument({
  meta,
  executiveSummary = '',
  executiveNumbers = [],
  keyNumbers = [],
  observations = [],
  analysisSections = [],
  recommendations = [],
  finalSummary = '',
  accuracy = {},
}) {
  const doc = new meta.jsPDF({ unit: 'mm', format: 'a4' })
  doc.__fbplyLogoDataUrl = meta.logoDataUrl || ''
  drawProfessionalCover(doc, meta)

  let y = addProfessionalPage(doc, meta)
  y = drawExecutiveSummary(doc, y, {
    summary: executiveSummary,
    snapshot: executiveNumbers,
    observations,
  }, meta)

  y = addProfessionalPage(doc, meta)
  y = drawDocumentHeading(doc, 'Key Numbers', y, 'The most important values from the saved report data.')
  y = drawKeyNumbers(doc, y, 'Primary Information', keyNumbers, meta)

  y = addPageIfNeeded(doc, y, 34, meta)
  y = drawDocumentHeading(doc, 'Detailed Analysis', y, 'Sorted tables and simple bars for the parts of the report that need inspection.')
  if (analysisSections.length === 0) {
    y = drawTextBlock(doc, 'No detailed rows were available for this report period.', PAGE.margin, y + 3, PAGE.width - PAGE.margin * 2, {
      size: 8.5,
      lineHeight: 4,
      maxLines: 2,
    }) + 6
  }

  analysisSections.forEach((section) => {
    y = drawAnalysisSection(doc, y, section, meta)
  })

  y = drawRecommendations(doc, y, recommendations, meta)
  drawFinalSummary(doc, y, finalSummary, accuracy, meta)

  return finaliseProfessionalDoc(doc, meta)
}

async function createProfessionalReportBlob({
  meta,
  executiveSummary,
  executiveNumbers,
  keyNumbers,
  observations,
  analysisSections,
  recommendations,
  finalSummary,
  accuracy,
}) {
  const { jsPDF } = await import('jspdf')
  const logoDataUrl = await loadLogoDataUrl()

  return createProfessionalPdfDocument({
    meta: {
      ...meta,
      jsPDF,
      logoDataUrl,
    },
    executiveSummary,
    executiveNumbers,
    keyNumbers,
    observations,
    analysisSections,
    recommendations,
    finalSummary,
    accuracy,
  })
}

export async function createMonthlyBudgetReportPdfBlob(reportData = {}) {
  const currency = reportData.reportMeta?.currency || reportData.profile?.currency || 'INR'
  const template = reportData.reportMeta?.template || 'standard'
  const report = reportData.advancedReport || buildAdvancedReport(reportData)
  const profile = reportData.profile || {}
  const financialState = reportData.financialState || {}
  const savingsBuckets = Array.isArray(reportData.savingsBuckets) ? reportData.savingsBuckets : []
  const moneyBookSummary = reportData.moneyBookSummary || {}
  const sharedSummary = reportData.sharedSummary || {}
  const commitments = commitmentItems(profile)
  const income = safeAmount(financialState.income)
  const expenses = safeAmount(financialState.committed)
  const remaining = safeAmount(financialState.flexibility ?? financialState.remainingFlexibility)
  const safeRoom = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom)
  const bills = safeAmount(financialState.fixedTotal ?? sumMoney(commitments, (item) => item.value))
  const saved = sumMoney(savingsBuckets, (bucket) => bucket.saved)
  const activeGoals = savingsBuckets.filter((bucket) => safeAmount(bucket.target) > 0)
  const sharedPending = safeAmount(sharedSummary.pendingRecoverable) + safeAmount(sharedSummary.pendingLiability)
  const openSettlementCount = safeAmount(moneyBookSummary.pendingCount) + (sharedPending > 0 ? 1 : 0)
  const openSettlementValue = safeAmount(moneyBookSummary.pendingSettlements) + sharedPending
  const topCategories = barItems(reportData.expenseBreakdown || [], currency, { valueKey: 'value', total: expenses })
  const topCategory = topCategories[0]
  const storyItems = [
    ...(report.pressureAnalysis || []),
    ...(report.spendingPatterns || []),
    ...(report.purchaseInsights || []),
    ...(report.behaviorInsights || []),
  ]
  const goalProgressRows = activeGoals.map((bucket) => {
    const savedAmount = safeAmount(bucket.saved)
    const target = safeAmount(bucket.target)

    return {
      label: bucket.name || 'Savings goal',
      value: target > 0 ? percentLabel((savedAmount / target) * 100) : '0%',
      detail: `${currencyMoney(savedAmount, currency)} of ${currencyMoney(target, currency)}`,
    }
  })
  const commitmentRows = commitments.map((item) => ({
    label: item.name,
    value: currencyMoney(item.value, currency),
    detail: item.type,
  }))
  const observations = uniqueSentences([
    expenses > 0 ? `You spent ${currencyMoney(expenses, currency)} this month.` : 'No spending has been recorded for this report period.',
    topCategory ? `${topCategory.label} was the largest tracked category at ${currencyMoney(topCategory.amount, currency)} (${topCategory.percentage}% of spending).` : '',
    openSettlementCount > 0 ? `${openSettlementCount} open ${plural(openSettlementCount, 'settlement')} remain, worth ${currencyMoney(openSettlementValue, currency)}.` : 'No open settlement is currently shown in this report.',
    activeGoals.length > 0 ? `${activeGoals.length} active ${plural(activeGoals.length, 'savings goal')} are being tracked.` : 'No active savings goal is currently being tracked.',
    ...storyItems.map((item) => item.detail || item.title),
  ])
  const recommendations = uniqueSentences([
    topCategory ? `Review ${topCategory.label} spending first because it is the largest tracked category.` : 'Add a few categorized expenses so the next report can show a stronger category picture.',
    activeGoals.length === 0 ? 'Consider setting a savings goal so remaining money has a clear destination.' : '',
    bills > income * 0.45 && income > 0 ? 'Review recurring bills and EMIs because fixed commitments take meaningful monthly space.' : '',
    openSettlementCount > 0 ? 'Close pending settlements before sharing the report with someone who needs a final balance.' : '',
    reportData.recommendation?.reason || reportData.recommendation?.waitSuggestion || report.advisory,
  ], 3)
  const executiveSummary = [
    income > 0 ? `Income for the period is ${currencyMoney(income, currency)}.` : 'No monthly income is currently set for this report.',
    `Expenses and fixed commitments total ${currencyMoney(expenses, currency)}.`,
    remaining >= 0
      ? `${currencyMoney(remaining, currency)} remains before the selected safety buffer is considered.`
      : `Spending is above income by ${currencyMoney(Math.abs(remaining), currency)}.`,
    openSettlementCount > 0
      ? `${openSettlementCount} settlement ${openSettlementCount === 1 ? 'is' : 'are'} still open.`
      : 'Settlements do not show an open balance in this report.',
  ].join(' ')
  const analysisSections = [
    {
      kind: 'bars',
      title: 'Category Analysis',
      subtitle: 'Spending categories are sorted from highest to lowest and shown as a share of monthly spending.',
      items: topCategories,
    },
    {
      title: 'Bills And Commitments',
      subtitle: 'Fixed monthly bills and EMI-like commitments saved in the profile.',
      items: commitmentRows,
    },
    {
      title: 'Goals Progress',
      subtitle: 'Active savings goals only. Past records are not modified by this report.',
      items: goalProgressRows,
    },
    {
      title: 'Money Story',
      subtitle: 'Plain-language observations from the existing insight system.',
      items: storyItems.map((item) => ({
        label: item.title,
        value: item.confidence || '',
        detail: item.detail,
      })),
      columns: [
        { key: 'label', label: 'Observation', width: 55 },
        { key: 'value', label: 'Signal', width: 31 },
        { key: 'detail', label: 'Detail', width: 96 },
      ],
    },
  ].filter((section) => section.items?.length)

  return createProfessionalReportBlob({
    meta: {
      title: 'Monthly Financial Report',
      typeLabel: 'Monthly Financial Report',
      subtitle: 'Income, expenses, remaining money, goals, settlements, and practical next steps.',
      preparedFor: profile.name || profile.email || 'FBPly user',
      currency,
      period: reportData.reportMeta?.period || currentMonthLabel(),
      reportId: reportData.reportMeta?.reportId,
      generatedAt: reportData.reportMeta?.generatedAt,
      template,
    },
    executiveSummary,
    executiveNumbers: [
      { label: 'Income', value: currencyMoney(income, currency), detail: 'Saved monthly income', tone: COLORS.green },
      { label: 'Expenses', value: currencyMoney(expenses, currency), detail: `${financialState.usagePercent || 0}% of income used`, tone: COLORS.orange },
      { label: 'Remaining', value: currencyMoney(remaining, currency), detail: 'Income less saved commitments and expenses' },
      { label: 'Savings', value: currencyMoney(saved, currency), detail: `${activeGoals.length} active ${plural(activeGoals.length, 'goal')}` },
      { label: 'Bills', value: currencyMoney(bills, currency), detail: 'Fixed monthly commitments' },
      { label: 'Open Settlements', value: String(openSettlementCount), detail: currencyMoney(openSettlementValue, currency) },
    ],
    keyNumbers: [
      { label: 'Safe Room', value: currencyMoney(safeRoom, currency), detail: 'After the configured safety buffer' },
      { label: 'Monthly Usage', value: `${financialState.usagePercent || 0}%`, detail: financialState.pressure || 'Current pressure' },
      { label: 'EMI Load', value: `${financialState.emiLoad || 0}%`, detail: currencyMoney(financialState.emiAmount, currency) },
      { label: 'Goal Saved', value: currencyMoney(saved, currency), detail: activeGoals.length > 0 ? `${activeGoals.length} active` : 'No active goal' },
      { label: 'Borrow/Lend Pending', value: String(moneyBookSummary.pendingCount || 0), detail: currencyMoney(moneyBookSummary.pendingSettlements || 0, currency) },
      { label: 'Upcoming Commitments', value: currencyMoney(bills, currency), detail: `${commitments.length} saved ${plural(commitments.length, 'bill')}` },
    ],
    observations,
    analysisSections,
    recommendations,
    accuracy: reportData.reportMeta?.accuracy || {
      recognizedTransactions: Array.isArray(reportData.expenses) ? reportData.expenses.length : 0,
      needsReviewCount: 0,
      confidenceScore: 100,
      userOverrides: 0,
      coverage: 100,
    },
    finalSummary: report.advisory || 'Use this report as a clear monthly review, not as professional financial advice.',
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
  const paymentBars = barItems(payments, currency, {
    valueKey: 'amount',
    labelKey: 'label',
    detailKey: 'paidBy',
    total: totalCost,
  }).map((item) => ({
    ...item,
    detail: item.detail ? `Paid by ${item.detail}` : item.detail,
  }))
  const settlementRows = settlements.map((item) => ({
    label: item.direction === 'incoming' ? `${item.from} owes You` : `You owe ${item.to}`,
    value: currencyMoney(item.remainingAmount || item.amount, currency),
    detail: item.status || 'pending',
  }))
  const memberRows = members.map((member) => ({
    label: member,
    value: member === whoPaidMost?.[0] ? 'Top payer' : 'Member',
    detail: paidBy[member] ? currencyMoney(paidBy[member], currency) : 'No upfront payment',
  }))
  const observations = uniqueSentences([
    `The trip total is ${currencyMoney(totalCost, currency)} across ${members.length || 0} ${plural(members.length || 0, 'member')}.`,
    whoPaidMost ? `${whoPaidMost[0]} paid the most upfront at ${currencyMoney(whoPaidMost[1], currency)}.` : '',
    pendingAmount > 0 ? `${currencyMoney(pendingAmount, currency)} remains pending in trip settlements.` : 'All saved trip settlements are marked complete.',
    `The equal split estimate is ${currencyMoney(group.share || totalCost / Math.max(members.length, 1), currency)} per person.`,
  ])
  const recommendations = uniqueSentences([
    pendingAmount > 0 ? 'Share the pending settlement list with group members before closing the trip.' : '',
    payments.length === 0 ? 'Add trip payments before using this report as a final expense record.' : '',
    settlements.length > 0 ? 'Mark each settlement as received or paid as soon as money moves.' : '',
    members.length < 2 ? 'Add all members so the trip report shows a meaningful split.' : '',
  ], 3)
  const analysisSections = [
    {
      kind: 'bars',
      title: 'Expense Breakdown',
      subtitle: 'Trip payments are sorted by amount.',
      items: paymentBars,
    },
    {
      title: 'Outstanding Balances',
      subtitle: 'Saved settlement state from the shared expense system.',
      items: settlementRows,
    },
    {
      title: 'Members',
      subtitle: 'Member list and upfront contribution signals.',
      items: memberRows,
    },
  ].filter((section) => section.items?.length)

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
    executiveSummary: [
      `This trip report summarizes ${group.name || 'the selected trip'} from saved shared expense records.`,
      `Total cost is ${currencyMoney(totalCost, currency)} for ${members.length || 0} ${plural(members.length || 0, 'member')}.`,
      pendingAmount > 0
        ? `${currencyMoney(pendingAmount, currency)} remains pending.`
        : 'Saved settlements are currently marked complete.',
    ].join(' '),
    executiveNumbers: [
      { label: 'Total Cost', value: currencyMoney(totalCost, currency), detail: 'All shared payments' },
      { label: 'Members', value: String(members.length || 0), detail: members.join(', ') || 'No members added' },
      { label: 'Per Person', value: currencyMoney(group.share || totalCost / Math.max(members.length, 1), currency), detail: 'Equal split estimate' },
      { label: 'Settled', value: `${Math.round((settledAmount / Math.max(totalCost, 1)) * 100)}%`, detail: currencyMoney(settledAmount, currency), tone: COLORS.green },
      { label: 'Pending', value: `${Math.round((pendingAmount / Math.max(totalCost, 1)) * 100)}%`, detail: currencyMoney(pendingAmount, currency), tone: COLORS.orange },
      { label: 'Paid Most', value: whoPaidMost?.[0] || 'Review', detail: whoPaidMost ? currencyMoney(whoPaidMost[1], currency) : 'No payment yet' },
    ],
    keyNumbers: [
      { label: 'Payments', value: String(payments.length), detail: 'Saved trip payments' },
      { label: 'Settlements', value: String(settlements.length), detail: 'Generated balances' },
      { label: 'Settled Amount', value: currencyMoney(settledAmount, currency), detail: 'Marked settled' },
      { label: 'Pending Amount', value: currencyMoney(pendingAmount, currency), detail: 'Still open' },
      { label: 'Top Payer', value: whoPaidMost?.[0] || 'None', detail: whoPaidMost ? currencyMoney(whoPaidMost[1], currency) : 'No payment yet' },
    ],
    observations,
    analysisSections: template === 'compact' ? analysisSections.filter((section) => section.title !== 'Members') : analysisSections,
    recommendations,
    accuracy: { recognizedTransactions: payments.length, needsReviewCount: 0, confidenceScore: 100, userOverrides: 0, coverage: 100 },
    finalSummary: 'This trip report is built from saved shared expense records and settlement status. It is suitable for sharing with the group after the pending balances are reviewed.',
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
  const paidAmount = sumMoney(paid, (item) => item.settledAmount || item.amount)
  const pendingAmount = sumMoney(pending, (item) => item.remainingAmount || item.amount)
  const settlementRows = settlements.map((item) => ({
    label: item.direction === 'incoming' ? `${item.from} owes You` : `You owe ${item.to}`,
    value: currencyMoney(item.remainingAmount || item.settledAmount || item.amount, currency),
    detail: `${item.groupName} - ${item.status || 'pending'}`,
  }))
  const pendingRows = pending.map((item) => ({
    label: item.direction === 'incoming' ? `${item.from} owes You` : `You owe ${item.to}`,
    value: currencyMoney(item.remainingAmount || item.amount, currency),
    detail: item.groupName,
  }))
  const paidRows = paid.map((item) => ({
    label: item.direction === 'incoming' ? `${item.from} paid You` : `You paid ${item.to}`,
    value: currencyMoney(item.settledAmount || item.amount, currency),
    detail: item.groupName,
  }))
  const observations = uniqueSentences([
    `${settlements.length} ${plural(settlements.length, 'settlement')} are included in this report.`,
    pending.length > 0 ? `${pending.length} settlement ${pending.length === 1 ? 'is' : 'are'} pending, worth ${currencyMoney(pendingAmount, currency)}.` : 'No saved settlement is currently pending.',
    paid.length > 0 ? `${paid.length} settlement ${paid.length === 1 ? 'has' : 'have'} already been marked paid or received.` : '',
  ])
  const recommendations = uniqueSentences([
    pending.length > 0 ? 'Use the pending settlement table as the action list for follow-up.' : '',
    pendingAmount > 0 ? 'Confirm money movement before marking pending settlements as complete.' : '',
    settlements.length === 0 ? 'Create shared expenses before generating a settlement report for a group.' : '',
  ], 3)
  const analysisSections = [
    {
      title: 'Settlement Summary',
      subtitle: 'All saved settlement rows, including paid and pending status.',
      items: settlementRows,
    },
    {
      title: 'Pending Settlements',
      subtitle: 'Open balances that still require action.',
      items: pendingRows,
    },
    {
      title: 'Paid Settlements',
      subtitle: 'Completed settlement records.',
      items: paidRows,
    },
  ].filter((section) => section.items?.length)

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
    executiveSummary: [
      `This settlement report summarizes saved balances across ${groups.length || 0} ${plural(groups.length || 0, 'shared group')}.`,
      pending.length > 0
        ? `${pending.length} settlement ${pending.length === 1 ? 'is' : 'are'} still pending.`
        : 'No saved settlement is currently pending.',
      `Completed settlements total ${currencyMoney(paidAmount, currency)}.`,
    ].join(' '),
    executiveNumbers: [
      { label: 'Total Settlements', value: String(settlements.length), detail: 'Generated balances' },
      { label: 'Paid', value: String(paid.length), detail: currencyMoney(paidAmount, currency), tone: COLORS.green },
      { label: 'Pending', value: String(pending.length), detail: currencyMoney(pendingAmount, currency), tone: COLORS.orange },
    ],
    keyNumbers: [
      { label: 'Pending Amount', value: currencyMoney(pendingAmount, currency), detail: 'Open balances' },
      { label: 'Paid Amount', value: currencyMoney(paidAmount, currency), detail: 'Completed balances' },
      { label: 'Groups', value: String(groups.length || 0), detail: 'Shared expense groups' },
      { label: 'Rows Included', value: String(settlements.length), detail: 'Settlement records' },
    ],
    observations,
    analysisSections: template === 'compact' ? analysisSections.filter((section) => section.title !== 'Paid Settlements') : analysisSections,
    recommendations,
    accuracy: { recognizedTransactions: settlements.length, needsReviewCount: 0, confidenceScore: 100, userOverrides: 0, coverage: 100 },
    finalSummary: 'Paid, pending, and overdue labels are based on saved settlement state. Review open balances before treating this report as final.',
  })
}

export async function createStatementAnalysisReportPdfBlob({ reportMeta = {}, profile = {}, statementReport = {}, transactions = [] } = {}) {
  const currency = reportMeta.currency || profile.currency || 'INR'
  const template = reportMeta.template || 'standard'
  const needsReview = transactions.filter((item) => item.confidence === 'low' || item.category === 'Other' || !item.date)
  const recognized = Math.max(statementReport.transactionCount || transactions.length, 0)
  const confidenceScore = recognized > 0 ? Math.max(0, Math.round(((recognized - needsReview.length) / recognized) * 100)) : 0
  const expenseCategoryBars = barItems(statementReport.expenseCategories || [], currency, {
    valueKey: 'amount',
    labelKey: 'name',
    total: safeAmount(statementReport.totalExpense),
  }).map((item) => ({
    ...item,
    detail: item.detail || `${item.percentage}% of money out`,
  }))
  const incomeSourceRows = (statementReport.incomeSources || []).map((item) => ({
    label: item.name,
    value: currencyMoney(item.amount, currency),
    detail: `${item.count || 0} rows`,
  }))
  const merchantRows = (statementReport.merchants || []).map((item) => ({
    label: item.name,
    value: currencyMoney(item.amount, currency),
    detail: `${item.count || 0} rows`,
  }))
  const needsReviewRows = needsReview.map((item) => ({
    label: item.description,
    value: currencyMoney(item.amount, currency),
    detail: item.category || 'Needs Review',
  }))
  const observations = uniqueSentences([
    `Money in was ${currencyMoney(statementReport.totalIncome, currency)} and money out was ${currencyMoney(statementReport.totalExpense, currency)}.`,
    expenseCategoryBars[0] ? `${expenseCategoryBars[0].label} was the largest detected spending category at ${expenseCategoryBars[0].percentage}% of money out.` : '',
    needsReview.length > 0 ? `${needsReview.length} statement ${plural(needsReview.length, 'row')} need review before relying on the analysis.` : 'No statement rows are currently marked for review.',
    ...(statementReport.insights || []),
  ])
  const recommendations = uniqueSentences([
    needsReview.length > 0 ? 'Review rows marked Needs Review before using this report for decisions.' : '',
    expenseCategoryBars[0] ? `Check ${expenseCategoryBars[0].label} transactions first because it is the largest category.` : '',
    merchantRows.length > 0 ? 'Confirm merchant labels for recurring or high-value transactions.' : '',
  ], 3)
  const analysisSections = [
    {
      title: 'Top Categories',
      kind: 'bars',
      subtitle: 'Detected spending categories sorted by amount.',
      items: expenseCategoryBars,
    },
    {
      title: 'Income Sources',
      subtitle: 'Detected incoming money rows.',
      items: incomeSourceRows,
    },
    {
      title: 'Top Merchants',
      subtitle: 'Merchants sorted by detected amount.',
      items: merchantRows,
    },
    {
      title: 'Needs Review',
      subtitle: 'Rows that should be checked before relying on the report.',
      items: needsReviewRows,
    },
  ].filter((section) => section.items?.length)

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
    executiveSummary: [
      `This statement report summarizes ${recognized} readable transaction ${recognized === 1 ? 'row' : 'rows'}.`,
      `Money in was ${currencyMoney(statementReport.totalIncome, currency)} and money out was ${currencyMoney(statementReport.totalExpense, currency)}.`,
      needsReview.length > 0
        ? `${needsReview.length} ${plural(needsReview.length, 'row')} should be reviewed before decisions are made.`
        : 'No readable row is currently marked as needing review.',
    ].join(' '),
    executiveNumbers: [
      { label: 'Money In', value: currencyMoney(statementReport.totalIncome, currency), detail: `${statementReport.incomeCount || 0} rows`, tone: COLORS.green },
      { label: 'Money Out', value: currencyMoney(statementReport.totalExpense, currency), detail: `${statementReport.expenseCount || 0} rows`, tone: COLORS.orange },
      { label: 'Net Movement', value: currencyMoney(statementReport.netMovement, currency), detail: statementReport.dateRange || 'Statement period' },
      { label: 'Confidence', value: `${confidenceScore}%`, detail: `Based on ${recognized} recognized transactions`, tone: COLORS.green },
      { label: 'Needs Review', value: String(needsReview.length), detail: 'Rows to verify before decisions', tone: COLORS.orange },
    ],
    keyNumbers: [
      { label: 'Readable Rows', value: String(recognized), detail: 'Included in analysis' },
      { label: 'Income Rows', value: String(statementReport.incomeCount || 0), detail: currencyMoney(statementReport.totalIncome, currency) },
      { label: 'Expense Rows', value: String(statementReport.expenseCount || 0), detail: currencyMoney(statementReport.totalExpense, currency) },
      { label: 'Top Category', value: expenseCategoryBars[0]?.label || 'None', detail: expenseCategoryBars[0]?.value || 'No category amount' },
      { label: 'Confidence', value: `${confidenceScore}%`, detail: 'Parser confidence from readable rows' },
    ],
    observations,
    analysisSections: template === 'compact'
      ? analysisSections.filter((section) => ['Top Categories', 'Needs Review'].includes(section.title))
      : analysisSections,
    recommendations,
    accuracy: {
      recognizedTransactions: recognized,
      needsReviewCount: needsReview.length,
      confidenceScore,
      userOverrides: reportMeta.userOverrides || 0,
      coverage: recognized > 0 ? Math.round(((recognized - needsReview.length) / recognized) * 100) : 0,
    },
    finalSummary: 'Statement analysis is based only on readable rows. Review uncertain rows before relying on the report.',
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
