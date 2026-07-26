import { buildAdvancedReport } from './reportInsights.js'
import { normalizeMoney, sumMoney } from './money.js'
import { displayPersonName } from './financialActivity.js'

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
  }).format(amount).replace(/\u00a0/g, ' ')
}

function cleanPdfText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatMoney(value, currency = 'INR') {
  const code = cleanPdfText(currency).toUpperCase() || 'INR'
  return `${code} ${formatIndian(value)}`
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
  const lines = doc.splitTextToSize(cleanPdfText(text), width).slice(0, maxLines)
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = last.length > 4 ? `${last.slice(0, -3)}...` : last
  }
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
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
  doc.text('FBPLY', x + size + 4, y + (compact ? 5.8 : 7.8))
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
  return formatMoney(value, currency)
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
    doc.text(meta.reportId || `Page ${page} of ${total}`, PAGE.margin, PAGE.height - 9)
    doc.text(REPORT_SITE_URL, PAGE.width - PAGE.margin, PAGE.height - 9, { align: 'right' })
  }
}

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
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
  doc.text(REPORT_SITE_URL, PAGE.width - PAGE.margin, 274, { align: 'right' })
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

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
function finaliseProfessionalDoc(doc, meta) {
  drawProfessionalFooter(doc, meta)
  return doc.output('blob')
}

const REPORT_SITE_URL = 'www.fbply.com'

const REPORT_THEME_ALIASES = {
  brownJournal: 'classic',
  navy: 'classic',
  vintageDiary: 'classic',
  executive: 'ledgerPro',
  minimal: 'receipt',
}

const REPORT_EXPORT_THEMES = {
  classic: {
    pdfFont: 'times',
    canvasFont: 'Georgia, "Times New Roman", serif',
    page: [255, 253, 247],
    card: [255, 251, 242],
    soft: [248, 241, 230],
    border: [229, 218, 201],
    text: [40, 51, 51],
    muted: [115, 107, 97],
    accent: [47, 93, 93],
    accentSoft: [231, 239, 231],
  },
  ledgerPro: {
    pdfFont: 'helvetica',
    canvasFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
    page: [255, 255, 255],
    card: [248, 249, 247],
    soft: [240, 241, 238],
    border: [218, 222, 226],
    text: [23, 26, 31],
    muted: [101, 107, 115],
    accent: [138, 106, 46],
    accentSoft: [238, 232, 218],
  },
  receipt: {
    pdfFont: 'courier',
    canvasFont: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    page: [255, 255, 255],
    card: [250, 250, 249],
    soft: [241, 241, 239],
    border: [226, 226, 222],
    text: [24, 24, 27],
    muted: [113, 113, 122],
    accent: [82, 82, 91],
    accentSoft: [238, 238, 234],
  },
  minimalWhite: {
    pdfFont: 'helvetica',
    canvasFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
    page: [255, 255, 255],
    card: [248, 250, 252],
    soft: [243, 246, 250],
    border: [226, 232, 240],
    text: [17, 24, 39],
    muted: [100, 116, 139],
    accent: [17, 24, 39],
    accentSoft: [238, 244, 255],
  },
  blueRegister: {
    pdfFont: 'helvetica',
    canvasFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
    page: [248, 251, 255],
    card: [255, 255, 255],
    soft: [231, 240, 248],
    border: [207, 222, 235],
    text: [19, 34, 56],
    muted: [91, 107, 125],
    accent: [30, 58, 95],
    accentSoft: [220, 235, 250],
  },
  emerald: {
    pdfFont: 'helvetica',
    canvasFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
    page: [251, 255, 253],
    card: [255, 255, 255],
    soft: [227, 243, 236],
    border: [205, 228, 218],
    text: [24, 49, 40],
    muted: [99, 117, 109],
    accent: [36, 91, 73],
    accentSoft: [216, 241, 229],
  },
  midnight: {
    pdfFont: 'helvetica',
    canvasFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
    page: [17, 25, 39],
    card: [18, 28, 42],
    soft: [23, 35, 52],
    border: [52, 67, 91],
    text: [245, 248, 252],
    muted: [167, 179, 197],
    accent: [134, 183, 255],
    accentSoft: [30, 45, 68],
  },
  sunset: {
    pdfFont: 'times',
    canvasFont: 'Georgia, "Times New Roman", serif',
    page: [255, 249, 241],
    card: [255, 253, 248],
    soft: [241, 226, 210],
    border: [226, 207, 188],
    text: [47, 41, 36],
    muted: [115, 103, 93],
    accent: [106, 61, 46],
    accentSoft: [247, 216, 198],
  },
}

function resolveReportTheme(themeId = 'classic') {
  const normalized = REPORT_THEME_ALIASES[themeId] || themeId
  return REPORT_EXPORT_THEMES[normalized] || REPORT_EXPORT_THEMES.classic
}

function rgbToCss(color = COLORS.text) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
}

function setThemeText(doc, theme, color = theme.text) {
  doc.setTextColor(color[0], color[1], color[2])
}

function setThemeFill(doc, color) {
  doc.setFillColor(color[0], color[1], color[2])
}

function setThemeStroke(doc, color) {
  doc.setDrawColor(color[0], color[1], color[2])
}

function setThemeFont(doc, theme, weight = 'normal', size = 9) {
  doc.setFont(theme.pdfFont, weight === 'bold' ? 'bold' : 'normal')
  doc.setFontSize(size)
}

function reportBottomY() {
  return PAGE.height - 22
}

function drawSimpleReportHeader(doc, meta = {}, theme = resolveReportTheme()) {
  setThemeFill(doc, theme.page)
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F')

  setThemeText(doc, theme, theme.accent)
  setThemeFont(doc, theme, 'bold', 12)
  doc.text('FBPLY', PAGE.margin, 15)

  setThemeText(doc, theme, theme.muted)
  setThemeFont(doc, theme, 'normal', 7.2)
  doc.text(cleanPdfText(meta.typeLabel || 'Report'), PAGE.margin, 20)
}

function drawSimpleReportFooters(doc, meta = {}, theme = resolveReportTheme()) {
  const total = doc.getNumberOfPages()

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    setThemeStroke(doc, theme.border)
    doc.setLineWidth(0.16)
    doc.line(PAGE.margin, PAGE.height - 15, PAGE.width - PAGE.margin, PAGE.height - 15)

    setThemeText(doc, theme, theme.muted)
    setThemeFont(doc, theme, 'normal', 7)
    doc.text(meta.reportId || `Page ${page} of ${total}`, PAGE.margin, PAGE.height - 9)
    doc.text(REPORT_SITE_URL, PAGE.width - PAGE.margin, PAGE.height - 9, { align: 'right' })
  }
}

function addSimpleReportPage(doc, meta = {}, theme = resolveReportTheme()) {
  doc.addPage()
  drawSimpleReportHeader(doc, meta, theme)
  return PAGE.margin + 16
}

function addSimplePageIfNeeded(doc, y, height, meta = {}, theme = resolveReportTheme()) {
  if (y + height <= reportBottomY()) {
    return y
  }

  return addSimpleReportPage(doc, meta, theme)
}

function drawSimpleTitle(doc, meta = {}, theme = resolveReportTheme()) {
  let y = PAGE.margin + 18
  setThemeText(doc, theme, theme.text)
  setThemeFont(doc, theme, 'bold', 20)
  doc.text(cleanPdfText(meta.title || 'FBPLY Report'), PAGE.margin, y, { maxWidth: PAGE.width - PAGE.margin * 2 })
  y += 9

  setThemeText(doc, theme, theme.muted)
  setThemeFont(doc, theme, 'normal', 8)
  const metaLine = [
    meta.period || currentMonthLabel(),
    reportDateLabel(meta.generatedAt),
    meta.currency || 'INR',
  ].filter(Boolean).join('  |  ')
  doc.text(metaLine, PAGE.margin, y, { maxWidth: PAGE.width - PAGE.margin * 2 })
  y += 9

  setThemeStroke(doc, theme.border)
  doc.setLineWidth(0.2)
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y)
  return y + 9
}

function drawSimpleSectionHeading(doc, title, y, theme = resolveReportTheme()) {
  setThemeText(doc, theme, theme.accent)
  setThemeFont(doc, theme, 'bold', 9)
  doc.text(cleanPdfText(title).toUpperCase(), PAGE.margin, y)
  return y + 6
}

function drawSimpleParagraph(doc, text, x, y, width, theme = resolveReportTheme(), { size = 8.7, maxLines = 6 } = {}) {
  const lines = doc.splitTextToSize(cleanPdfText(text), width).slice(0, maxLines)
  setThemeText(doc, theme, theme.text)
  setThemeFont(doc, theme, 'normal', size)
  doc.text(lines, x, y)
  return y + lines.length * 4.3
}

function drawSimpleMetrics(doc, y, title, items = [], meta = {}, theme = resolveReportTheme()) {
  const visible = items.filter(Boolean).slice(0, sectionLimit(meta, 6))

  if (visible.length === 0) {
    return y
  }

  y = addSimplePageIfNeeded(doc, y, 18 + Math.ceil(visible.length / 3) * 25, meta, theme)
  y = drawSimpleSectionHeading(doc, title, y, theme)

  const columns = 3
  const gap = 6
  const width = (PAGE.width - PAGE.margin * 2 - gap * (columns - 1)) / columns
  const rowHeight = 24

  visible.forEach((item, index) => {
    const x = PAGE.margin + (index % columns) * (width + gap)
    const top = y + Math.floor(index / columns) * rowHeight
    setThemeFill(doc, theme.card)
    setThemeStroke(doc, theme.border)
    doc.setLineWidth(0.16)
    doc.roundedRect(x, top, width, rowHeight - 4, 3, 3, 'FD')

    setThemeText(doc, theme, theme.muted)
    setThemeFont(doc, theme, 'bold', 6.6)
    doc.text(cleanPdfText(item.label).toUpperCase(), x + 4, top + 6)

    drawFittedText(doc, item.value || '-', x + 4, top + 13, width - 8, {
      color: item.tone || theme.text,
      font: theme.pdfFont,
      minSize: 7,
      size: 10.5,
      weight: 'bold',
    })

    if (item.detail) {
      setThemeText(doc, theme, theme.muted)
      setThemeFont(doc, theme, 'normal', 6.2)
      doc.text(doc.splitTextToSize(cleanPdfText(item.detail), width - 8).slice(0, 1), x + 4, top + 18)
    }
  })

  return y + Math.ceil(visible.length / columns) * rowHeight + 3
}

function drawSimpleNumberedList(doc, y, title, items = [], meta = {}, theme = resolveReportTheme()) {
  const visible = uniqueSentences(items, title === 'Suggestions' ? 4 : 5)

  if (visible.length === 0) {
    return y
  }

  y = addSimplePageIfNeeded(doc, y, 14 + visible.length * 12, meta, theme)
  y = drawSimpleSectionHeading(doc, title, y, theme)

  visible.forEach((item, index) => {
    const rowY = y + index * 11
    setThemeFill(doc, theme.accentSoft)
    doc.circle(PAGE.margin + 3, rowY - 1.5, 3, 'F')
    setThemeText(doc, theme, theme.accent)
    setThemeFont(doc, theme, 'bold', 7)
    doc.text(String(index + 1), PAGE.margin + 3, rowY + 0.7, { align: 'center' })
    drawSimpleParagraph(doc, item, PAGE.margin + 10, rowY, PAGE.width - PAGE.margin * 2 - 10, theme, {
      size: 8,
      maxLines: 2,
    })
  })

  return y + visible.length * 11 + 4
}

function drawSimpleRows(doc, y, section, meta = {}, theme = resolveReportTheme()) {
  const visible = (section.items || []).filter(Boolean).slice(0, resolveSectionItemLimit(meta, section, section.limit || 8))

  if (visible.length === 0) {
    return y
  }

  y = addSimplePageIfNeeded(doc, y, 16 + visible.length * 11, meta, theme)
  y = drawSimpleSectionHeading(doc, section.title, y, theme)

  if (section.subtitle) {
    y = drawSimpleParagraph(doc, section.subtitle, PAGE.margin, y - 1, PAGE.width - PAGE.margin * 2, theme, {
      size: 7.4,
      maxLines: 2,
    }) + 2
  }

  visible.forEach((item) => {
    const rowHeight = section.kind === 'bars' ? 13 : 12

    if (y + rowHeight > reportBottomY()) {
      y = addSimpleReportPage(doc, meta, theme)
      y = drawSimpleSectionHeading(doc, section.title, y, theme)
    }

    setThemeStroke(doc, theme.border)
    doc.setLineWidth(0.12)
    doc.line(PAGE.margin, y + rowHeight - 3, PAGE.width - PAGE.margin, y + rowHeight - 3)

    drawFittedText(doc, item.label || '-', PAGE.margin, y, 58, {
      color: theme.text,
      font: theme.pdfFont,
      minSize: 6.2,
      size: 7.8,
      weight: 'bold',
    })
    drawFittedText(doc, item.value || item.detail || '', PAGE.width - PAGE.margin - 42, y, 42, {
      align: 'right',
      color: theme.text,
      font: theme.pdfFont,
      minSize: 6.2,
      size: 7.6,
      weight: 'bold',
    })

    if (section.kind === 'bars') {
      const barX = PAGE.margin + 64
      const barWidth = PAGE.width - PAGE.margin * 2 - 112
      const percent = Math.max(0, Math.min(safeAmount(item.barValue ?? item.percentage), 100))
      setThemeFill(doc, theme.soft)
      doc.roundedRect(barX, y - 3, barWidth, 2.4, 1.2, 1.2, 'F')
      setThemeFill(doc, item.tone || theme.accent)
      doc.roundedRect(barX, y - 3, Math.max(2, (barWidth * percent) / 100), 2.4, 1.2, 1.2, 'F')
    } else if (item.detail) {
      setThemeText(doc, theme, theme.muted)
      setThemeFont(doc, theme, 'normal', 7)
      doc.text(doc.splitTextToSize(cleanPdfText(item.detail), 76).slice(0, 1), PAGE.margin + 64, y)
    }

    y += rowHeight
  })

  return y + 4
}

function buildSimpleReportPdfDocument({
  meta,
  executiveSummary = '',
  executiveNumbers = [],
  keyNumbers = [],
  observations = [],
  analysisSections = [],
  recommendations = [],
  finalSummary = '',
}) {
  const theme = resolveReportTheme(meta.theme)
  const doc = new meta.jsPDF({ unit: 'mm', format: 'a4' })
  drawSimpleReportHeader(doc, meta, theme)

  let y = drawSimpleTitle(doc, meta, theme)
  y = addSimplePageIfNeeded(doc, y, 36, meta, theme)
  y = drawSimpleSectionHeading(doc, 'Summary', y, theme)
  y = drawSimpleParagraph(doc, executiveSummary || finalSummary || 'This report is prepared from saved FBPLY data.', PAGE.margin, y, PAGE.width - PAGE.margin * 2, theme, {
    size: 9,
    maxLines: 7,
  }) + 6

  y = drawSimpleMetrics(doc, y, 'Key Numbers', executiveNumbers.length ? executiveNumbers : keyNumbers, meta, theme)
  y = drawSimpleNumberedList(doc, y, 'Suggestions', recommendations, meta, theme)
  y = drawSimpleNumberedList(doc, y, 'Notes', observations, meta, theme)

  analysisSections.forEach((section) => {
    y = drawSimpleRows(doc, y, section, meta, theme)
  })

  if (finalSummary) {
    y = addSimplePageIfNeeded(doc, y, 28, meta, theme)
    y = drawSimpleSectionHeading(doc, 'Close', y, theme)
    drawSimpleParagraph(doc, finalSummary, PAGE.margin, y, PAGE.width - PAGE.margin * 2, theme, {
      size: 8.2,
      maxLines: 4,
    })
  }

  drawSimpleReportFooters(doc, meta, theme)
  return doc
}

function drawCanvasText(context, text, x, y, width, lineHeight, maxLines = 4) {
  const words = cleanPdfText(text).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (context.measureText(next).width <= width || !current) {
      current = next
      return
    }
    lines.push(current)
    current = word
  })

  if (current) {
    lines.push(current)
  }

  const visible = lines.slice(0, maxLines)
  if (lines.length > maxLines && visible.length > 0) {
    visible[visible.length - 1] = `${visible[visible.length - 1].replace(/\.*$/, '')}...`
  }

  visible.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight)
  })

  return y + visible.length * lineHeight
}

function canvasBlob(canvas, type = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Unable to create report image.'))
      }
    }, type, quality)
  })
}

function drawCanvasRoundRect(context, x, y, width, height, radius) {
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius)
    return
  }

  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
}

async function createSimpleReportJpegBlob({
  meta,
  executiveSummary = '',
  executiveNumbers = [],
  keyNumbers = [],
  observations = [],
  recommendations = [],
}) {
  if (typeof document === 'undefined') {
    throw new Error('Image export is not available outside the browser.')
  }

  const theme = resolveReportTheme(meta.theme)
  const canvas = document.createElement('canvas')
  canvas.width = 1400
  canvas.height = 1980
  const context = canvas.getContext('2d')
  const margin = 86
  const width = canvas.width - margin * 2

  context.fillStyle = rgbToCss(theme.page)
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = rgbToCss(theme.accent)
  context.font = `800 34px ${theme.canvasFont}`
  context.fillText('FBPLY', margin, 70)

  context.fillStyle = rgbToCss(theme.muted)
  context.font = `500 20px ${theme.canvasFont}`
  context.fillText(cleanPdfText(meta.typeLabel || 'Report'), margin, 104)

  let y = 185
  context.fillStyle = rgbToCss(theme.text)
  context.font = `800 58px ${theme.canvasFont}`
  y = drawCanvasText(context, meta.title || 'FBPLY Report', margin, y, width, 64, 2) + 22

  context.fillStyle = rgbToCss(theme.muted)
  context.font = `500 22px ${theme.canvasFont}`
  context.fillText([meta.period || currentMonthLabel(), reportDateLabel(meta.generatedAt), meta.currency || 'INR'].join('  |  '), margin, y)
  y += 54

  context.strokeStyle = rgbToCss(theme.border)
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(margin, y)
  context.lineTo(canvas.width - margin, y)
  context.stroke()
  y += 54

  context.fillStyle = rgbToCss(theme.accent)
  context.font = `800 22px ${theme.canvasFont}`
  context.fillText('SUMMARY', margin, y)
  y += 42

  context.fillStyle = rgbToCss(theme.text)
  context.font = `500 27px ${theme.canvasFont}`
  y = drawCanvasText(context, executiveSummary || 'This report is prepared from saved FBPLY data.', margin, y, width, 38, 6) + 52

  const metrics = (executiveNumbers.length ? executiveNumbers : keyNumbers).filter(Boolean).slice(0, 6)
  const cardGap = 22
  const cardWidth = (width - cardGap * 2) / 3
  const cardHeight = 132
  metrics.forEach((item, index) => {
    const x = margin + (index % 3) * (cardWidth + cardGap)
    const top = y + Math.floor(index / 3) * (cardHeight + 18)
    context.fillStyle = rgbToCss(theme.card)
    context.strokeStyle = rgbToCss(theme.border)
    context.lineWidth = 2
    context.beginPath()
    drawCanvasRoundRect(context, x, top, cardWidth, cardHeight, 22)
    context.fill()
    context.stroke()
    context.fillStyle = rgbToCss(theme.muted)
    context.font = `800 17px ${theme.canvasFont}`
    context.fillText(cleanPdfText(item.label).toUpperCase(), x + 24, top + 38)
    context.fillStyle = rgbToCss(theme.text)
    context.font = `800 31px ${theme.canvasFont}`
    drawCanvasText(context, item.value || '-', x + 24, top + 82, cardWidth - 48, 34, 1)
  })
  y += Math.ceil(metrics.length / 3) * (cardHeight + 18) + 34

  const suggestionItems = uniqueSentences(recommendations.length ? recommendations : observations, 4)
  if (suggestionItems.length > 0) {
    context.fillStyle = rgbToCss(theme.accent)
    context.font = `800 22px ${theme.canvasFont}`
    context.fillText('SUGGESTIONS', margin, y)
    y += 42
    suggestionItems.forEach((item, index) => {
      context.fillStyle = rgbToCss(theme.accentSoft)
      context.beginPath()
      context.arc(margin + 18, y - 8, 18, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = rgbToCss(theme.accent)
      context.font = `800 18px ${theme.canvasFont}`
      context.fillText(String(index + 1), margin + 12, y - 2)
      context.fillStyle = rgbToCss(theme.text)
      context.font = `500 25px ${theme.canvasFont}`
      y = drawCanvasText(context, item, margin + 54, y, width - 54, 34, 2) + 24
    })
  }

  context.strokeStyle = rgbToCss(theme.border)
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(margin, canvas.height - 86)
  context.lineTo(canvas.width - margin, canvas.height - 86)
  context.stroke()
  context.fillStyle = rgbToCss(theme.muted)
  context.font = `500 20px ${theme.canvasFont}`
  context.textAlign = 'right'
  context.fillText(REPORT_SITE_URL, canvas.width - margin, canvas.height - 48)
  context.textAlign = 'left'

  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

const EXPENSE_REPORT_CHART_COLORS = [
  [47, 93, 93],
  [29, 78, 216],
  [22, 163, 74],
  [217, 119, 6],
  [147, 51, 234],
  [220, 38, 38],
  [8, 145, 178],
  [82, 82, 91],
]

function reportDateKey(value) {
  const text = String(value || '').trim()
  const direct = text.slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) {
    return direct
  }

  const parsed = new Date(text)

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

function expenseReportDateKey(item = {}) {
  return reportDateKey(item.date || item.dateTime || item.createdAt)
}

function expenseReportDateTimeValue(item = {}) {
  return item.dateTime || item.createdAt || item.date || ''
}

function expenseReportDateLabel(dateKey) {
  const parsed = new Date(`${String(dateKey || '').slice(0, 10)}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return cleanPdfText(dateKey) || '-'
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function expenseReportShortDateLabel(dateKey) {
  const parsed = new Date(`${String(dateKey || '').slice(0, 10)}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return cleanPdfText(dateKey) || '-'
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function expenseReportTimeLabel(item = {}) {
  const value = expenseReportDateTimeValue(item)

  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return '-'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function expenseReportMode(reportMeta = {}, range = {}) {
  const filter = String(reportMeta.historyFilter || '').toLowerCase()

  if (range.start && range.end && range.start === range.end) {
    return 'daily'
  }

  if (filter === 'today' || filter === 'daily' || filter === 'custom') {
    return 'daily'
  }

  if (filter === 'week' || filter === 'weekly') {
    return 'weekly'
  }

  if (filter === 'month' || filter === 'monthly') {
    return 'monthly'
  }

  if (filter === 'year' || filter === 'yearly') {
    return 'yearly'
  }

  return 'monthly'
}

function expenseReportTitle(mode) {
  if (mode === 'weekly') {
    return 'Weekly Expense Report'
  }

  if (mode === 'monthly') {
    return 'Monthly Expense Report'
  }

  if (mode === 'yearly') {
    return 'Yearly Expense Report'
  }

  return 'Daily Expense Report'
}

function dateKeySequence(startKey, endKey, maxDays = 370) {
  const start = new Date(`${String(startKey || '').slice(0, 10)}T12:00:00`)
  const end = new Date(`${String(endKey || '').slice(0, 10)}T12:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return []
  }

  const keys = []
  const cursor = new Date(start)

  while (cursor <= end && keys.length < maxDays) {
    keys.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}

function buildExpenseHistoryReportModel({ reportMeta = {}, expenses = [], range = {} } = {}) {
  const mode = expenseReportMode(reportMeta, range)
  const currency = reportMeta.currency || 'INR'
  const safeRange = {
    start: range.start || '',
    end: range.end || range.start || '',
    label: range.label || reportMeta.rangeLabel || reportMeta.period || 'Selected period',
  }
  const filtered = expenses
    .filter((item) => safeAmount(item.amount) > 0)
    .filter((item) => {
      const key = expenseReportDateKey(item)

      if (safeRange.start && key < safeRange.start) {
        return false
      }

      if (safeRange.end && key > safeRange.end) {
        return false
      }

      return true
    })
    .sort((a, b) => String(expenseReportDateTimeValue(b)).localeCompare(String(expenseReportDateTimeValue(a))))
  const rows = filtered.map((item) => {
    const dateKey = expenseReportDateKey(item)
    const amount = safeAmount(item.amount)
    const category = cleanPdfText(item.category || item.originalCategory || item.impactType || 'Other') || 'Other'

    return {
      id: item.id || `${dateKey}-${category}-${amount}`,
      dateKey,
      dateLabel: expenseReportDateLabel(dateKey),
      shortDateLabel: expenseReportShortDateLabel(dateKey),
      timeLabel: expenseReportTimeLabel(item),
      category,
      title: cleanPdfText(item.title || item.label || item.note || category) || category,
      amount,
      amountLabel: currencyMoney(amount, currency),
    }
  })
  const categoryMap = new Map()
  const dayMap = new Map()

  rows.forEach((row) => {
    categoryMap.set(row.category, safeAmount(categoryMap.get(row.category)) + row.amount)
    dayMap.set(row.dateKey, safeAmount(dayMap.get(row.dateKey)) + row.amount)
  })

  const total = sumMoney(rows, (row) => row.amount)
  const categories = Array.from(categoryMap.entries())
    .map(([label, amount], index) => ({
      label,
      amount,
      amountLabel: currencyMoney(amount, currency),
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: EXPENSE_REPORT_CHART_COLORS[index % EXPENSE_REPORT_CHART_COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount)
  const rangeKeys = safeRange.start && safeRange.end ? dateKeySequence(safeRange.start, safeRange.end) : []
  const dayKeys = rangeKeys.length > 0
    ? rangeKeys
    : Array.from(dayMap.keys()).sort()
  const dayTotals = dayKeys.map((key) => ({
    key,
    label: expenseReportShortDateLabel(key),
    amount: safeAmount(dayMap.get(key)),
    amountLabel: currencyMoney(dayMap.get(key), currency),
  }))

  return {
    currency,
    mode,
    title: expenseReportTitle(mode),
    periodLabel: safeRange.label,
    includeDayBars: mode !== 'daily',
    rows,
    categories,
    dayTotals,
    total,
    totalLabel: currencyMoney(total, currency),
  }
}

function drawExpensePieCanvas(context, model, theme, box) {
  const { x, y, width, height } = box
  const centerX = x + Math.min(width * 0.33, 220)
  const centerY = y + height / 2 + 8
  const radius = Math.min(height * 0.32, width * 0.16, 130)
  const total = model.total || sumMoney(model.categories, (item) => item.amount)

  context.fillStyle = rgbToCss(theme.card)
  context.strokeStyle = rgbToCss(theme.border)
  context.lineWidth = 2
  context.beginPath()
  drawCanvasRoundRect(context, x, y, width, height, 28)
  context.fill()
  context.stroke()

  context.fillStyle = rgbToCss(theme.accent)
  context.font = `800 24px ${theme.canvasFont}`
  context.fillText('CATEGORY PIE CHART', x + 34, y + 46)

  if (model.categories.length === 0 || total <= 0) {
    context.fillStyle = rgbToCss(theme.soft)
    context.beginPath()
    context.arc(centerX, centerY, radius, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = rgbToCss(theme.muted)
    context.font = `600 22px ${theme.canvasFont}`
    context.textAlign = 'center'
    context.fillText('No entries', centerX, centerY + 8)
    context.textAlign = 'left'
  } else {
    let start = -Math.PI / 2
    model.categories.forEach((item) => {
      const angle = (item.amount / total) * Math.PI * 2
      context.fillStyle = rgbToCss(item.color)
      context.beginPath()
      context.moveTo(centerX, centerY)
      context.arc(centerX, centerY, radius, start, start + angle)
      context.closePath()
      context.fill()
      start += angle
    })
    context.fillStyle = rgbToCss(theme.page)
    context.beginPath()
    context.arc(centerX, centerY, radius * 0.42, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = rgbToCss(theme.text)
    context.font = `800 24px ${theme.canvasFont}`
    context.textAlign = 'center'
    context.fillText(model.totalLabel, centerX, centerY + 8)
    context.textAlign = 'left'
  }

  const legendX = x + Math.min(width * 0.55, width - 380)
  let legendY = y + 86
  model.categories.slice(0, 8).forEach((item) => {
    context.fillStyle = rgbToCss(item.color)
    context.beginPath()
    context.arc(legendX, legendY - 5, 8, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = rgbToCss(theme.text)
    context.font = `800 21px ${theme.canvasFont}`
    context.fillText(item.label, legendX + 22, legendY)

    context.fillStyle = rgbToCss(theme.muted)
    context.font = `600 18px ${theme.canvasFont}`
    context.fillText(`${item.amountLabel} - ${item.percentage}%`, legendX + 22, legendY + 27)
    legendY += 58
  })
}

function drawExpenseDayBarsCanvas(context, model, theme, box) {
  const { x, y, width, height } = box
  const maxAmount = Math.max(1, ...model.dayTotals.map((item) => item.amount))
  const chartX = x + 58
  const chartY = y + 76
  const chartWidth = width - 100
  const chartHeight = height - 132
  const visibleDays = model.dayTotals.slice(0, 62)
  const gap = Math.max(4, Math.min(10, chartWidth / Math.max(visibleDays.length, 1) * 0.2))
  const barWidth = Math.max(5, (chartWidth - gap * Math.max(visibleDays.length - 1, 0)) / Math.max(visibleDays.length, 1))

  context.fillStyle = rgbToCss(theme.card)
  context.strokeStyle = rgbToCss(theme.border)
  context.lineWidth = 2
  context.beginPath()
  drawCanvasRoundRect(context, x, y, width, height, 28)
  context.fill()
  context.stroke()

  context.fillStyle = rgbToCss(theme.accent)
  context.font = `800 24px ${theme.canvasFont}`
  context.fillText('DAY-WISE BAR CHART', x + 34, y + 46)

  context.strokeStyle = rgbToCss(theme.border)
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(chartX, chartY + chartHeight)
  context.lineTo(chartX + chartWidth, chartY + chartHeight)
  context.stroke()

  visibleDays.forEach((item, index) => {
    const barX = chartX + index * (barWidth + gap)
    const barHeight = Math.max(item.amount > 0 ? 5 : 0, (item.amount / maxAmount) * chartHeight)
    const barY = chartY + chartHeight - barHeight

    context.fillStyle = item.amount > 0 ? rgbToCss(theme.accent) : rgbToCss(theme.soft)
    context.beginPath()
    drawCanvasRoundRect(context, barX, barY, barWidth, barHeight, Math.min(8, barWidth / 2))
    context.fill()

    if (visibleDays.length <= 14 || index % 3 === 0) {
      context.save()
      context.translate(barX + barWidth / 2, chartY + chartHeight + 24)
      context.rotate(-Math.PI / 7)
      context.fillStyle = rgbToCss(theme.muted)
      context.font = `600 15px ${theme.canvasFont}`
      context.textAlign = 'right'
      context.fillText(item.label, 0, 0)
      context.restore()
    }
  })

  context.fillStyle = rgbToCss(theme.text)
  context.font = `800 22px ${theme.canvasFont}`
  context.textAlign = 'right'
  context.fillText(model.totalLabel, x + width - 34, y + 47)
  context.textAlign = 'left'
}

function createExpenseChartDataUrl(draw) {
  if (typeof document === 'undefined') {
    return ''
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1100
  canvas.height = 520
  const context = canvas.getContext('2d')

  draw(context, canvas)
  return canvas.toDataURL('image/jpeg', 0.92)
}

function createExpenseReportChartImages(model, theme) {
  return {
    pie: createExpenseChartDataUrl((context, canvas) => {
      context.fillStyle = rgbToCss(theme.page)
      context.fillRect(0, 0, canvas.width, canvas.height)
      drawExpensePieCanvas(context, model, theme, {
        x: 28,
        y: 28,
        width: canvas.width - 56,
        height: canvas.height - 56,
      })
    }),
    bars: model.includeDayBars
      ? createExpenseChartDataUrl((context, canvas) => {
        context.fillStyle = rgbToCss(theme.page)
        context.fillRect(0, 0, canvas.width, canvas.height)
        drawExpenseDayBarsCanvas(context, model, theme, {
          x: 28,
          y: 28,
          width: canvas.width - 56,
          height: canvas.height - 56,
        })
      })
      : '',
  }
}

function drawExpenseFallbackBarsPdf(doc, y, items = [], meta = {}, theme = resolveReportTheme()) {
  const visible = items.filter((item) => safeAmount(item.amount) > 0).slice(0, 12)
  const maxAmount = Math.max(1, ...visible.map((item) => item.amount))

  if (visible.length === 0) {
    setThemeText(doc, theme, theme.muted)
    setThemeFont(doc, theme, 'normal', 8)
    doc.text('No entries in this period.', PAGE.margin, y)
    return y + 10
  }

  visible.forEach((item) => {
    y = addSimplePageIfNeeded(doc, y, 10, meta, theme)
    drawFittedText(doc, item.label, PAGE.margin, y, 45, {
      color: theme.text,
      font: theme.pdfFont,
      minSize: 6.2,
      size: 7.6,
      weight: 'bold',
    })
    setThemeFill(doc, theme.soft)
    doc.roundedRect(PAGE.margin + 50, y - 3.5, 76, 3, 1.4, 1.4, 'F')
    setThemeFill(doc, item.color || theme.accent)
    doc.roundedRect(PAGE.margin + 50, y - 3.5, Math.max(2, (item.amount / maxAmount) * 76), 3, 1.4, 1.4, 'F')
    drawFittedText(doc, item.amountLabel, PAGE.width - PAGE.margin - 42, y, 42, {
      align: 'right',
      color: theme.text,
      font: theme.pdfFont,
      minSize: 6.2,
      size: 7.4,
      weight: 'bold',
    })
    y += 9
  })

  return y + 2
}

function drawExpenseChartPdf(doc, y, title, dataUrl, fallbackItems, meta = {}, theme = resolveReportTheme()) {
  y = addSimplePageIfNeeded(doc, y, 84, meta, theme)
  y = drawSimpleSectionHeading(doc, title, y, theme)

  if (dataUrl) {
    doc.addImage(dataUrl, 'JPEG', PAGE.margin, y, PAGE.width - PAGE.margin * 2, 70)
    return y + 78
  }

  return drawExpenseFallbackBarsPdf(doc, y + 2, fallbackItems, meta, theme) + 6
}

function drawExpenseHistoryTablePdf(doc, y, model, meta = {}, theme = resolveReportTheme()) {
  y = addSimplePageIfNeeded(doc, y, 22, meta, theme)
  y = drawSimpleSectionHeading(doc, 'History', y, theme)

  if (model.rows.length === 0) {
    setThemeText(doc, theme, theme.muted)
    setThemeFont(doc, theme, 'normal', 8.2)
    doc.text('No expense lines were written in this period.', PAGE.margin, y)
    return y + 12
  }

  const columns = [
    { key: 'dateLabel', label: 'Date', width: 31 },
    { key: 'timeLabel', label: 'Time', width: 22 },
    { key: 'category', label: 'Category', width: 38, wrap: true },
    { key: 'title', label: 'Line', width: 54, wrap: true },
    { key: 'amountLabel', label: 'Amount', width: 37, align: 'right' },
  ]
  const drawHeader = () => {
    let x = PAGE.margin
    setThemeText(doc, theme, theme.muted)
    setThemeFont(doc, theme, 'bold', 6.8)
    columns.forEach((column) => {
      doc.text(column.label.toUpperCase(), column.align === 'right' ? x + column.width : x, y, {
        align: column.align || 'left',
      })
      x += column.width
    })
    setThemeStroke(doc, theme.border)
    doc.setLineWidth(0.14)
    doc.line(PAGE.margin, y + 3, PAGE.width - PAGE.margin, y + 3)
    y += 9
  }

  drawHeader()

  model.rows.forEach((row) => {
    const preparedCells = columns.map((column) => {
      const text = cleanPdfText(row[column.key] || '-')
      const lines = column.wrap
        ? doc.splitTextToSize(text, column.width - 4).slice(0, 2)
        : [text]

      return {
        column,
        lines: lines.length > 0 ? lines : ['-'],
      }
    })
    const maxLines = Math.max(1, ...preparedCells.map((cell) => cell.lines.length))
    const rowHeight = Math.max(12, maxLines * 4.3 + 5)

    if (y + rowHeight > reportBottomY()) {
      y = addSimpleReportPage(doc, meta, theme)
      y = drawSimpleSectionHeading(doc, 'History', y, theme)
      drawHeader()
    }

    let x = PAGE.margin
    preparedCells.forEach(({ column, lines }, index) => {
      const color = index === 4 ? theme.text : index === 2 ? theme.accent : theme.text
      const weight = index === 2 || index === 4 ? 'bold' : 'normal'

      if (column.align === 'right') {
        drawFittedText(doc, lines[0], x, y, column.width, {
          align: 'right',
          color,
          font: theme.pdfFont,
          minSize: 5.9,
          size: 7.2,
          weight,
        })
      } else {
        setThemeText(doc, theme, color)
        setThemeFont(doc, theme, weight, 7.1)
        doc.text(lines, x, y)
      }

      x += column.width
    })
    setThemeStroke(doc, theme.border)
    doc.setLineWidth(0.1)
    doc.line(PAGE.margin, y + rowHeight - 3, PAGE.width - PAGE.margin, y + rowHeight - 3)
    y += rowHeight
  })

  return y + 5
}

function drawExpenseReportIntroPdf(doc, y, model, meta = {}, theme = resolveReportTheme()) {
  setThemeText(doc, theme, theme.text)
  setThemeFont(doc, theme, 'bold', 20)
  doc.text(model.title, PAGE.margin, y)
  y += 9

  setThemeText(doc, theme, theme.muted)
  setThemeFont(doc, theme, 'normal', 8)
  doc.text([model.periodLabel, reportDateLabel(meta.generatedAt), meta.currency || model.currency].filter(Boolean).join('  |  '), PAGE.margin, y, {
    maxWidth: PAGE.width - PAGE.margin * 2,
  })
  y += 9

  setThemeStroke(doc, theme.border)
  doc.setLineWidth(0.2)
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y)
  y += 10

  setThemeText(doc, theme, theme.text)
  setThemeFont(doc, theme, 'bold', 12)
  doc.text(model.totalLabel, PAGE.margin, y)
  setThemeText(doc, theme, theme.muted)
  setThemeFont(doc, theme, 'normal', 7.4)
  doc.text(`${model.rows.length} line${model.rows.length === 1 ? '' : 's'} in this report`, PAGE.margin + 42, y)

  return y + 12
}

async function createExpenseHistoryReportJpegBlob({ meta, model, theme }) {
  if (typeof document === 'undefined') {
    throw new Error('Image export is not available outside the browser.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1400
  canvas.height = 1980
  const context = canvas.getContext('2d')
  const margin = 86
  const width = canvas.width - margin * 2

  context.fillStyle = rgbToCss(theme.page)
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = rgbToCss(theme.accent)
  context.font = `800 34px ${theme.canvasFont}`
  context.fillText('FBPLY', margin, 70)

  let y = 158
  context.fillStyle = rgbToCss(theme.text)
  context.font = `800 58px ${theme.canvasFont}`
  y = drawCanvasText(context, model.title, margin, y, width, 64, 2) + 22

  context.fillStyle = rgbToCss(theme.muted)
  context.font = `500 22px ${theme.canvasFont}`
  context.fillText([model.periodLabel, reportDateLabel(meta.generatedAt), meta.currency || model.currency].filter(Boolean).join('  |  '), margin, y)
  y += 48

  context.strokeStyle = rgbToCss(theme.border)
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(margin, y)
  context.lineTo(canvas.width - margin, y)
  context.stroke()
  y += 50

  context.fillStyle = rgbToCss(theme.text)
  context.font = `800 32px ${theme.canvasFont}`
  context.fillText(model.totalLabel, margin, y)
  context.fillStyle = rgbToCss(theme.muted)
  context.font = `600 20px ${theme.canvasFont}`
  context.fillText(`${model.rows.length} line${model.rows.length === 1 ? '' : 's'} written`, margin + 260, y)
  y += 34

  drawExpensePieCanvas(context, model, theme, {
    x: margin,
    y,
    width,
    height: 430,
  })
  y += 468

  if (model.includeDayBars) {
    drawExpenseDayBarsCanvas(context, model, theme, {
      x: margin,
      y,
      width,
      height: 330,
    })
    y += 368
  }

  context.fillStyle = rgbToCss(theme.accent)
  context.font = `800 22px ${theme.canvasFont}`
  context.fillText('HISTORY', margin, y)
  y += 38

  context.fillStyle = rgbToCss(theme.muted)
  context.font = `800 16px ${theme.canvasFont}`
  context.fillText('DATE', margin, y)
  context.fillText('TIME', margin + 205, y)
  context.fillText('CATEGORY', margin + 340, y)
  context.fillText('LINE', margin + 560, y)
  context.textAlign = 'right'
  context.fillText('AMOUNT', canvas.width - margin, y)
  context.textAlign = 'left'
  y += 30

  const bottomLimit = canvas.height - 126
  model.rows.forEach((row) => {
    const rowHeight = 58

    if (y + rowHeight > bottomLimit) {
      return
    }

    context.strokeStyle = rgbToCss(theme.border)
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(margin, y + rowHeight - 14)
    context.lineTo(canvas.width - margin, y + rowHeight - 14)
    context.stroke()

    context.fillStyle = rgbToCss(theme.text)
    context.font = `600 19px ${theme.canvasFont}`
    context.fillText(row.dateLabel, margin, y)
    context.fillText(row.timeLabel, margin + 205, y)

    context.fillStyle = rgbToCss(theme.accent)
    context.font = `800 19px ${theme.canvasFont}`
    drawCanvasText(context, row.category, margin + 340, y, 180, 22, 1)

    context.fillStyle = rgbToCss(theme.muted)
    context.font = `500 17px ${theme.canvasFont}`
    drawCanvasText(context, row.title, margin + 560, y, 330, 22, 2)

    context.fillStyle = rgbToCss(theme.text)
    context.font = `800 19px ${theme.canvasFont}`
    context.textAlign = 'right'
    context.fillText(row.amountLabel, canvas.width - margin, y)
    context.textAlign = 'left'
    y += rowHeight
  })

  context.strokeStyle = rgbToCss(theme.border)
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(margin, canvas.height - 86)
  context.lineTo(canvas.width - margin, canvas.height - 86)
  context.stroke()
  context.fillStyle = rgbToCss(theme.muted)
  context.font = `500 20px ${theme.canvasFont}`
  context.textAlign = 'right'
  context.fillText(REPORT_SITE_URL, canvas.width - margin, canvas.height - 48)
  context.textAlign = 'left'

  return canvasBlob(canvas, 'image/jpeg', 0.92)
}

async function createExpenseHistoryReportBlob(reportData = {}) {
  const { jsPDF } = await import('jspdf')
  const meta = {
    ...(reportData.reportMeta || {}),
    title: '',
    typeLabel: 'Expense History',
    jsPDF,
  }
  const model = buildExpenseHistoryReportModel(reportData)
  const theme = resolveReportTheme(meta.theme)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const chartImages = createExpenseReportChartImages(model, theme)

  drawSimpleReportHeader(doc, meta, theme)

  let y = drawExpenseReportIntroPdf(doc, PAGE.margin + 18, model, meta, theme)
  y = drawExpenseChartPdf(doc, y, 'Category pie chart', chartImages.pie, model.categories, meta, theme)

  if (model.includeDayBars) {
    y = drawExpenseChartPdf(doc, y, 'Day-wise bar chart', chartImages.bars, model.dayTotals, meta, theme)
  }

  drawExpenseHistoryTablePdf(doc, y, model, meta, theme)
  drawSimpleReportFooters(doc, meta, theme)

  const pageCount = doc.getNumberOfPages()

  if (meta.exportMode === 'auto' && pageCount <= 1) {
    try {
      const imageBlob = await createExpenseHistoryReportJpegBlob({ meta, model, theme })

      return {
        blob: imageBlob,
        extension: 'jpg',
        format: 'jpg',
        mimeType: 'image/jpeg',
        pageCount,
      }
    } catch {
      // Browser image export is best effort; PDF remains the reliable fallback.
    }
  }

  const pdfBlob = doc.output('blob')

  if (meta.exportMode === 'auto') {
    return {
      blob: pdfBlob,
      extension: 'pdf',
      format: 'pdf',
      mimeType: 'application/pdf',
      pageCount,
    }
  }

  return pdfBlob
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

function settlementReportLabel(item = {}, profile = {}, settled = false) {
  const from = displayPersonName(item.from, profile)
  const to = displayPersonName(item.to, profile)

  return `${from} ${settled ? 'paid' : 'pays'} ${to}`
}

function percentLabel(value) {
  return `${Math.max(0, Math.min(Math.round(value || 0), 100))}%`
}

function sectionLimit(meta = {}, standard = 8) {
  if (meta.unlimitedSections) {
    return 9999
  }

  if (meta.template === 'compact') {
    return Math.min(standard, 5)
  }

  if (meta.template === 'executive') {
    return Math.max(standard, 12)
  }

  return standard
}

function resolveSectionItemLimit(meta = {}, section = {}, standard = 8) {
  if (Number.isFinite(section.limit)) {
    return section.limit
  }

  return sectionLimit(meta, standard)
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

function drawFittedText(doc, value, x, y, maxWidth, {
  align = 'left',
  color = COLORS.text,
  font = 'helvetica',
  minSize = 6.5,
  size = 8,
  weight = 'normal',
} = {}) {
  const text = cleanPdfText(value) || '-'
  let fontSize = size

  setText(doc, color)
  doc.setFont(font, weight)
  doc.setFontSize(fontSize)

  while (fontSize > minSize && doc.getTextWidth(text) > maxWidth) {
    fontSize -= 0.25
    doc.setFontSize(fontSize)
  }

  doc.text(text, align === 'right' ? x + maxWidth : x, y, {
    align,
    maxWidth,
  })
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
    doc.text(cleanPdfText(item.label).toUpperCase(), x, top)
    drawFittedText(doc, item.value || '-', x, top + (large ? 9 : 8), width, {
      color: item.tone || COLORS.navy,
      minSize: large ? 10 : 8,
      size: large ? 16 : 12.8,
      weight: 'bold',
    })
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

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
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
  const visible = (section.items || []).filter(Boolean).slice(0, resolveSectionItemLimit(meta, section, section.limit || 8))

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

  const contentRight = PAGE.width - PAGE.margin
  const labelWidth = 58
  const percentX = PAGE.margin + labelWidth + 5
  const percentWidth = 19
  const amountWidth = 38
  const amountX = contentRight - amountWidth
  const barX = percentX + percentWidth + 5
  const barWidth = Math.max(50, amountX - barX - 7)

  visible.forEach((item, index) => {
    const rowY = y + index * 14
    const barY = rowY + 4.5
    const percent = Math.max(0, Math.min(safeAmount(item.barValue ?? item.percentage), 100))

    drawFittedText(doc, item.label || '-', PAGE.margin, rowY, labelWidth, {
      color: COLORS.navy,
      minSize: 6.8,
      size: 8.3,
      weight: 'bold',
    })
    drawFittedText(doc, item.percentage != null ? percentLabel(item.percentage) : item.detail || '', percentX, rowY, percentWidth, {
      color: COLORS.muted,
      minSize: 6.2,
      size: 7.2,
    })
    drawFittedText(doc, item.value || '', amountX, rowY, amountWidth, {
      align: 'right',
      color: COLORS.text,
      minSize: 6.8,
      size: 8.2,
      weight: 'bold',
    })

    setFill(doc, [226, 232, 240])
    doc.roundedRect(barX, barY, barWidth, 2.6, 1.3, 1.3, 'F')
    setFill(doc, item.tone || COLORS.blue)
    doc.roundedRect(barX, barY, Math.max(2, (barWidth * percent) / 100), 2.6, 1.3, 1.3, 'F')
  })

  return y + visible.length * 14 + 4
}

function drawDocumentTable(doc, y, section, meta = {}) {
  const visible = (section.items || []).filter(Boolean).slice(0, resolveSectionItemLimit(meta, section, section.limit || 10))

  if (visible.length === 0) {
    return y
  }

  const columns = section.columns || [
    { key: 'label', label: 'Item', width: 70 },
    { key: 'value', label: 'Amount', width: 44, align: 'right' },
    { key: 'detail', label: 'Notes', width: 68 },
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
      const label = cleanPdfText(column.label).toUpperCase()
      doc.text(label, column.align === 'right' ? x + column.width - 4 : x, y, {
        align: column.align || 'left',
      })
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

    const preparedColumns = columns.map((column) => {
      const text = cleanPdfText(item[column.key])
      const lines = column.align === 'right'
        ? [text]
        : doc.splitTextToSize(text, column.width - 5).slice(0, 2)

      return { column, lines: lines.length > 0 ? lines : [''] }
    })
    const maxLines = Math.max(1, ...preparedColumns.map(({ lines }) => lines.length))
    const rowHeight = Math.max(10, maxLines * 4 + 4)

    if (y + rowHeight + 4 > PAGE.height - PAGE.margin) {
      y = addProfessionalPage(doc, meta)
      y = drawMinorHeading(doc, section.title, y)
      drawHeader()
    }

    let x = PAGE.margin
    preparedColumns.forEach(({ column, lines }, columnIndex) => {
      const color = column.align === 'right' ? COLORS.blue : COLORS.text

      if (column.align === 'right') {
        drawFittedText(doc, lines[0], x, y, column.width - 4, {
          align: 'right',
          color,
          minSize: 6.5,
          size: 8,
          weight: 'bold',
        })
      } else {
        setText(doc, color)
        doc.setFont('helvetica', columnIndex === 0 ? 'bold' : 'normal')
        doc.setFontSize(8)
        doc.text(lines, x, y)
      }

      x += column.width
    })
    setStroke(doc, [226, 232, 240])
    doc.setLineWidth(0.16)
    doc.line(PAGE.margin, y + rowHeight - 3, PAGE.width - PAGE.margin, y + rowHeight - 3)
    y += rowHeight
  })

  return y + 4
}

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
function drawAnalysisSection(doc, y, section, meta = {}) {
  if (section.kind === 'bars') {
    return drawHorizontalBars(doc, y, section, meta)
  }

  return drawDocumentTable(doc, y, section, meta)
}

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
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

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
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

// eslint-disable-next-line no-unused-vars -- Retained for legacy report rollback compatibility.
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
  return buildSimpleReportPdfDocument({
    meta,
    executiveSummary,
    executiveNumbers,
    keyNumbers,
    observations,
    analysisSections,
    recommendations,
    finalSummary,
    accuracy,
  }).output('blob')
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
  const preparedReport = {
    meta: {
      ...meta,
      jsPDF,
    },
    executiveSummary,
    executiveNumbers,
    keyNumbers,
    observations,
    analysisSections,
    recommendations,
    finalSummary,
    accuracy,
  }

  const doc = buildSimpleReportPdfDocument(preparedReport)
  const pageCount = doc.getNumberOfPages()

  if (meta?.exportMode === 'auto' && pageCount <= 1) {
    try {
      const imageBlob = await createSimpleReportJpegBlob(preparedReport)

      return {
        blob: imageBlob,
        extension: 'jpg',
        format: 'jpg',
        mimeType: 'image/jpeg',
        pageCount,
      }
    } catch {
      // Fall back to PDF if the browser cannot create a canvas image.
    }
  }

  const pdfBlob = doc.output('blob')

  if (meta?.exportMode === 'auto') {
    return {
      blob: pdfBlob,
      extension: 'pdf',
      format: 'pdf',
      mimeType: 'application/pdf',
      pageCount,
    }
  }

  return pdfBlob
}

function withReportExportMode(payload = {}, exportMode = 'pdf') {
  return {
    ...payload,
    reportMeta: {
      ...(payload.reportMeta || {}),
      exportMode,
    },
  }
}

function normalizeReportExportResult(result, fallbackFormat = 'pdf') {
  if (result?.blob) {
    return result
  }

  return {
    blob: result,
    extension: fallbackFormat,
    format: fallbackFormat,
    mimeType: fallbackFormat === 'jpg' ? 'image/jpeg' : 'application/pdf',
    pageCount: fallbackFormat === 'jpg' ? 1 : undefined,
  }
}

async function createTypedReportBlob(type = 'monthly', payload = {}) {
  if (type === 'expense-history') {
    return createExpenseHistoryReportBlob(payload)
  }

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

export async function createReportExportBlob({ type = 'monthly', payload = {} } = {}) {
  const result = await createTypedReportBlob(type, withReportExportMode(payload, 'auto'))

  return normalizeReportExportResult(result)
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
      title: 'Monthly Report',
      typeLabel: 'Monthly Report',
      subtitle: 'Income, expenses, remaining money, goals, settlements, and practical next steps.',
      preparedFor: profile.name || profile.email || 'FBPly user',
      currency,
      period: reportData.reportMeta?.period || currentMonthLabel(),
      reportId: reportData.reportMeta?.reportId,
      generatedAt: reportData.reportMeta?.generatedAt,
      theme: reportData.reportMeta?.theme,
      exportMode: reportData.reportMeta?.exportMode,
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
  const perPersonShare = safeAmount(group.share || totalCost / Math.max(members.length, 1))
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
    detail: item.detail ? `Paid by ${displayPersonName(item.detail, profile)}` : item.detail,
  }))
  const paymentDetailRows = payments.map((payment) => ({
    label: payment.label || 'Trip payment',
    value: currencyMoney(payment.amount, currency),
    detail: `Paid by ${displayPersonName(payment.paidBy, profile)}`,
  }))
  const contributionRows = members.map((member) => {
    const paid = safeAmount(paidBy[member])
    const balance = paid - perPersonShare

    return {
      label: displayPersonName(member, profile),
      value: currencyMoney(paid, currency),
      detail: balance >= 0
        ? `Share ${currencyMoney(perPersonShare, currency)} · Credit ${currencyMoney(balance, currency)}`
        : `Share ${currencyMoney(perPersonShare, currency)} · Owes ${currencyMoney(Math.abs(balance), currency)}`,
    }
  })
  const settlementRows = settlements.map((item) => ({
    label: settlementReportLabel(item, profile),
    value: currencyMoney(item.remainingAmount || item.amount, currency),
    detail: item.status || 'pending',
  }))
  const memberRows = members.map((member) => ({
    label: displayPersonName(member, profile),
    value: member === whoPaidMost?.[0] ? 'Top payer' : 'Member',
    detail: paidBy[member] ? currencyMoney(paidBy[member], currency) : 'No upfront payment',
  }))
  const balanceRows = members.map((member) => {
    const paid = safeAmount(paidBy[member])
    const netBalance = paid - perPersonShare

    return {
      label: displayPersonName(member, profile),
      value: netBalance >= 0 ? currencyMoney(netBalance, currency) : `-${currencyMoney(Math.abs(netBalance), currency)}`,
      detail: netBalance >= 0 ? 'Paid above share' : 'Below equal share',
    }
  })
  const observations = uniqueSentences([
    `The trip total is ${currencyMoney(totalCost, currency)} across ${members.length || 0} ${plural(members.length || 0, 'member')}.`,
    whoPaidMost ? `${displayPersonName(whoPaidMost[0], profile)} paid the most upfront at ${currencyMoney(whoPaidMost[1], currency)}.` : '',
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
      limit: 9999,
    },
    {
      title: 'Payment Details',
      subtitle: 'Every saved trip payment with payer information.',
      items: paymentDetailRows,
      limit: 9999,
      columns: [
        { key: 'label', label: 'Payment', width: 58 },
        { key: 'value', label: 'Amount', width: 34, align: 'right' },
        { key: 'detail', label: 'Paid By', width: 90 },
      ],
    },
    {
      title: 'Contribution Details',
      subtitle: 'Upfront payments compared with the equal-share estimate.',
      items: contributionRows,
      limit: 9999,
    },
    {
      title: 'Outstanding Balances',
      subtitle: 'Saved settlement state from the shared expense system.',
      items: settlementRows,
      limit: 9999,
    },
    {
      title: 'Member Balances',
      subtitle: 'Net position against the equal split for each participant.',
      items: balanceRows,
      limit: 9999,
    },
    {
      title: 'Members',
      subtitle: 'Member list and upfront contribution signals.',
      items: memberRows,
      limit: 9999,
    },
    {
      title: 'Trip Summary',
      subtitle: 'Quick reference totals for the full trip report.',
      items: [
        { label: 'Total Expense', value: currencyMoney(totalCost, currency), detail: `${payments.length} payment${payments.length === 1 ? '' : 's'}` },
        { label: 'Participants', value: String(members.length || 0), detail: 'Saved trip members' },
        { label: 'Per Person Share', value: currencyMoney(perPersonShare, currency), detail: 'Equal split estimate' },
        { label: 'Settled', value: currencyMoney(settledAmount, currency), detail: 'Marked complete' },
        { label: 'Pending', value: currencyMoney(pendingAmount, currency), detail: `${settlements.filter((item) => safeAmount(item.remainingAmount) > 0).length} open settlement${settlements.filter((item) => safeAmount(item.remainingAmount) > 0).length === 1 ? '' : 's'}` },
        { label: 'Top Payer', value: whoPaidMost ? displayPersonName(whoPaidMost[0], profile) : 'None', detail: whoPaidMost ? currencyMoney(whoPaidMost[1], currency) : 'No payment yet' },
      ],
      limit: 9999,
    },
  ].filter((section) => section.items?.length)

  return createProfessionalReportBlob({
    meta: {
      title: group.name ? `${group.name} Trip Report` : 'Trip Report',
      typeLabel: 'Trip Report',
      subtitle: 'Complete trip cost, contribution, balance, and settlement documentation.',
      preparedFor: profile.name || profile.email || 'FBPly user',
      currency,
      period: reportMeta.period || group.date || currentMonthLabel(),
      reportId: reportMeta.reportId,
      generatedAt: reportMeta.generatedAt,
      theme: reportMeta.theme,
      exportMode: reportMeta.exportMode,
      template,
      unlimitedSections: true,
      reportType: 'trip',
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
      { label: 'Members', value: String(members.length || 0), detail: members.length > 0 ? `${members.length} participant${members.length === 1 ? '' : 's'}` : 'No members added' },
      { label: 'Per Person', value: currencyMoney(group.share || totalCost / Math.max(members.length, 1), currency), detail: 'Equal split estimate' },
      { label: 'Settled', value: `${Math.round((settledAmount / Math.max(totalCost, 1)) * 100)}%`, detail: currencyMoney(settledAmount, currency), tone: COLORS.green },
      { label: 'Pending', value: `${Math.round((pendingAmount / Math.max(totalCost, 1)) * 100)}%`, detail: currencyMoney(pendingAmount, currency), tone: COLORS.orange },
      { label: 'Paid Most', value: whoPaidMost ? displayPersonName(whoPaidMost[0], profile) : 'Review', detail: whoPaidMost ? currencyMoney(whoPaidMost[1], currency) : 'No payment yet' },
    ],
    keyNumbers: [
      { label: 'Payments', value: String(payments.length), detail: 'Saved trip payments' },
      { label: 'Settlements', value: String(settlements.length), detail: 'Generated balances' },
      { label: 'Settled Amount', value: currencyMoney(settledAmount, currency), detail: 'Marked settled' },
      { label: 'Pending Amount', value: currencyMoney(pendingAmount, currency), detail: 'Still open' },
      { label: 'Top Payer', value: whoPaidMost ? displayPersonName(whoPaidMost[0], profile) : 'None', detail: whoPaidMost ? currencyMoney(whoPaidMost[1], currency) : 'No payment yet' },
    ],
    observations,
    analysisSections,
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
    label: settlementReportLabel(item, profile),
    value: currencyMoney(item.remainingAmount || item.settledAmount || item.amount, currency),
    detail: `${item.groupName} - ${item.status || 'pending'}`,
  }))
  const pendingRows = pending.map((item) => ({
    label: settlementReportLabel(item, profile),
    value: currencyMoney(item.remainingAmount || item.amount, currency),
    detail: item.groupName,
  }))
  const paidRows = paid.map((item) => ({
    label: settlementReportLabel(item, profile, true),
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
      theme: reportMeta.theme,
      exportMode: reportMeta.exportMode,
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
      theme: reportMeta.theme,
      exportMode: reportMeta.exportMode,
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
  const result = await createTypedReportBlob(type, withReportExportMode(payload, 'pdf'))

  return result?.blob || result
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
