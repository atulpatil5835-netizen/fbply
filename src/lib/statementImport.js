const MAX_TEXT_BYTES = 1_500_000
const MAX_PDF_SCAN_BYTES = 1_200_000
const MAX_PDF_PAGES = 12
const MAX_TRANSACTIONS = 1200
const MAX_PREVIEW_TRANSACTIONS = 120

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const knownMerchants = [
  ['zomato', 'Zomato'],
  ['swiggy', 'Swiggy'],
  ['blinkit', 'Blinkit'],
  ['zepto', 'Zepto'],
  ['bigbasket', 'BigBasket'],
  ['dmart', 'DMart'],
  ['reliance fresh', 'Reliance Fresh'],
  ['amazon', 'Amazon'],
  ['flipkart', 'Flipkart'],
  ['myntra', 'Myntra'],
  ['ajio', 'AJIO'],
  ['netflix', 'Netflix'],
  ['spotify', 'Spotify'],
  ['hotstar', 'Hotstar'],
  ['prime video', 'Prime Video'],
  ['uber', 'Uber'],
  ['ola', 'Ola'],
  ['irctc', 'IRCTC'],
  ['bookmyshow', 'BookMyShow'],
  ['apollo', 'Apollo Pharmacy'],
  ['medplus', 'MedPlus'],
  ['pharmeasy', 'PharmEasy'],
  ['1mg', 'Tata 1mg'],
  ['airtel', 'Airtel'],
  ['jio', 'Jio'],
  ['vi ', 'Vi'],
  ['vodafone', 'Vodafone'],
  ['bsnl', 'BSNL'],
  ['mseb', 'Electricity Board'],
  ['mahavitaran', 'Mahavitaran'],
  ['hpcl', 'HP Petrol Pump'],
  ['bpcl', 'Bharat Petroleum'],
  ['iocl', 'Indian Oil'],
  ['paytm', 'Paytm'],
  ['phonepe', 'PhonePe'],
  ['google pay', 'Google Pay'],
  ['gpay', 'Google Pay'],
  ['razorpay', 'Razorpay'],
  ['cashfree', 'Cashfree'],
]

const categoryRules = [
  {
    category: 'Food',
    terms: ['zomato', 'swiggy', 'restaurant', 'cafe', 'coffee', 'tea', 'bakery', 'dominos', 'pizza', 'kfc', 'mcdonald', 'burger', 'hotel food', 'eatery', 'mess', 'canteen'],
  },
  {
    category: 'Grocery',
    terms: ['grocery', 'kirana', 'supermarket', 'mart', 'dmart', 'bigbasket', 'blinkit', 'zepto', 'milk', 'dairy', 'vegetable', 'fruit', 'ration'],
  },
  {
    category: 'Fuel',
    terms: ['petrol', 'diesel', 'fuel', 'cng', 'hpcl', 'bpcl', 'iocl', 'indian oil', 'bharat petroleum', 'petrol pump'],
  },
  {
    category: 'Travel',
    terms: ['uber', 'ola', 'cab', 'taxi', 'auto', 'rickshaw', 'metro', 'train', 'railway', 'irctc', 'bus', 'flight', 'airline', 'parking', 'toll', 'hotel', 'travel'],
  },
  {
    category: 'Shopping',
    terms: ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'fashion', 'clothes', 'shoe', 'mall', 'store', 'electronics'],
  },
  {
    category: 'Subscription',
    terms: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'subscription', 'ott', 'cloud', 'storage'],
  },
  {
    category: 'Utilities',
    terms: ['electricity', 'mseb', 'mahavitaran', 'water bill', 'gas bill', 'broadband', 'internet', 'wifi', 'airtel', 'jio', 'vodafone', 'vi ', 'bsnl', 'recharge', 'postpaid', 'prepaid'],
  },
  {
    category: 'Health',
    terms: ['medical', 'medicine', 'pharmacy', 'apollo', 'medplus', 'pharmeasy', '1mg', 'doctor', 'clinic', 'hospital', 'diagnostic', 'lab', 'health'],
  },
  {
    category: 'Housing',
    terms: ['rent', 'maintenance', 'society', 'flat', 'house rent', 'home rent', 'landlord'],
  },
  {
    category: 'Loan',
    terms: ['emi', 'loan', 'installment', 'instalment', 'finance', 'nbfc', 'credit card payment', 'card payment'],
  },
  {
    category: 'Education',
    terms: ['school', 'college', 'fees', 'tuition', 'course', 'class', 'education', 'book store', 'exam'],
  },
  {
    category: 'Entertainment',
    terms: ['bookmyshow', 'movie', 'cinema', 'game', 'gaming', 'party', 'concert', 'event'],
  },
  {
    category: 'Cash / ATM',
    terms: ['atm', 'cash withdrawal', 'cash wdl', 'withdrawal atm'],
  },
  {
    category: 'Personal Transfer',
    terms: ['upi', 'imps', 'neft', 'rtgs', 'transfer to', 'paid to', 'sent to'],
  },
]

const incomeRules = [
  { source: 'Salary', terms: ['salary', 'payroll', 'sal ', 'wages', 'stipend', 'employer'] },
  { source: 'Cashback / Refund', terms: ['cashback', 'cash back', 'refund', 'reversal', 'reward', 'reimbursement'] },
  { source: 'Interest', terms: ['interest', 'int.pd', 'int pd', 'savings interest', 'dividend'] },
  { source: 'Cash Deposit', terms: ['cash deposit', 'cash dep', 'by cash'] },
  { source: 'Friends / Personal', terms: ['upi', 'imps', 'neft', 'rtgs', 'received from', 'from ', 'cr from', 'transfer from'] },
]

const noiseTokens = new Set([
  'upi',
  'neft',
  'imps',
  'rtgs',
  'pos',
  'ecom',
  'inb',
  'mmt',
  'p2a',
  'p2p',
  'ref',
  'rrn',
  'txn',
  'transaction',
  'payment',
  'transfer',
  'debit',
  'credit',
  'dr',
  'cr',
  'to',
  'from',
  'by',
  'at',
  'in',
  'india',
  'limited',
  'ltd',
  'pvt',
  'private',
  'bank',
  'ifsc',
  'ac',
  'a/c',
  'account',
])

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function safeAmount(value) {
  const text = String(value || '')
    .replace(/,/g, '')
    .replace(/[₹RsINR\s]/gi, '')
    .replace(/[()]/g, '-')
  const match = text.match(/-?\d+(?:\.\d{1,2})?/)
  const amount = match ? Number(match[0]) : 0
  return Number.isFinite(amount) ? Math.abs(amount) : 0
}

function parseAmount(value) {
  const text = String(value || '').trim()
  const amount = safeAmount(text)
  const normalized = normalizeKey(text)
  const hasDebitHint = /\b(dr|debit|withdrawal|paid|payment)\b/.test(normalized) || /^\s*-/.test(text) || /\(.+\)/.test(text)
  const hasCreditHint = /\b(cr|credit|deposit|received)\b/.test(normalized)

  return {
    amount,
    signed: hasDebitHint ? -amount : amount,
    hint: hasCreditHint ? 'income' : hasDebitHint ? 'expense' : '',
  }
}

function detectMonthFromText(value) {
  const text = String(value || '')
  const isoMatch = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.]\d{1,2}\b/)

  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}`
  }

  const indianDate = text.match(/\b\d{1,2}[-/.](0?[1-9]|1[0-2])[-/.](\d{2}|20\d{2})\b/)

  if (indianDate) {
    return `${normalizeYear(indianDate[2])}-${String(indianDate[1]).padStart(2, '0')}`
  }

  const dayMonthName = text.match(/\b\d{1,2}[-\s]([a-z]{3,9})[-\s,]+(20\d{2}|\d{2})\b/i)
  const monthName = dayMonthName || text.match(/\b([a-z]{3,9})[-\s,]+(20\d{2}|\d{2})\b/i)

  if (monthName) {
    const monthIndex = monthKeys.indexOf(monthName[1].slice(0, 3).toLowerCase())

    if (monthIndex >= 0) {
      return `${normalizeYear(monthName[2])}-${String(monthIndex + 1).padStart(2, '0')}`
    }
  }

  return ''
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isHistoricalMonth(monthKey) {
  return Boolean(monthKey) && monthKey !== currentMonthKey()
}

function readableMonth(monthKey) {
  if (!monthKey) {
    return 'Month not detected'
  }

  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)

  if (Number.isNaN(date.getTime())) {
    return 'Month not detected'
  }

  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function normalizeYear(value) {
  const year = Number(value)

  if (!Number.isFinite(year)) {
    return ''
  }

  if (year < 100) {
    return String(year >= 70 ? 1900 + year : 2000 + year)
  }

  return String(year)
}

function normalizeDate(value, fallbackYear = '') {
  const text = String(value || '').trim()
  const isoMatch = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](\d{1,2})\b/)

  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`
  }

  const indianDate = text.match(/\b(\d{1,2})[-/.](0?[1-9]|1[0-2])[-/.](\d{2}|20\d{2})\b/)

  if (indianDate) {
    return `${normalizeYear(indianDate[3])}-${String(indianDate[2]).padStart(2, '0')}-${String(indianDate[1]).padStart(2, '0')}`
  }

  const dayMonthName = text.match(/\b(\d{1,2})[-\s]([a-z]{3,9})[-\s,]+(20\d{2}|\d{2})\b/i)

  if (dayMonthName) {
    const monthIndex = monthKeys.indexOf(dayMonthName[2].slice(0, 3).toLowerCase())

    if (monthIndex >= 0) {
      return `${normalizeYear(dayMonthName[3])}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayMonthName[1]).padStart(2, '0')}`
    }
  }

  const monthDayYear = text.match(/\b([a-z]{3,9})[-\s](\d{1,2})(?:,)?[-\s]+(20\d{2}|\d{2})\b/i)

  if (monthDayYear) {
    const monthIndex = monthKeys.indexOf(monthDayYear[1].slice(0, 3).toLowerCase())

    if (monthIndex >= 0) {
      return `${normalizeYear(monthDayYear[3])}-${String(monthIndex + 1).padStart(2, '0')}-${String(monthDayYear[2]).padStart(2, '0')}`
    }
  }

  const dayMonthOnly = text.match(/\b(\d{1,2})[-\s]([a-z]{3,9})\b/i)

  if (dayMonthOnly && fallbackYear) {
    const monthIndex = monthKeys.indexOf(dayMonthOnly[2].slice(0, 3).toLowerCase())

    if (monthIndex >= 0) {
      return `${fallbackYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayMonthOnly[1]).padStart(2, '0')}`
    }
  }

  return ''
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  const chars = String(text || '').split('')

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index]

    if (char === '"') {
      if (inQuotes && chars[index + 1] === '"') {
        cell += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && chars[index + 1] === '\n') {
        continue
      }

      row.push(cell.trim())
      if (row.some(Boolean)) {
        rows.push(row)
      }
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell.trim())

  if (row.some(Boolean)) {
    rows.push(row)
  }

  return rows
}

function normalizeHeader(value) {
  return normalizeKey(value)
}

function findColumn(headers, terms, rejectTerms = []) {
  const normalizedTerms = terms.map(normalizeKey)
  const normalizedRejects = rejectTerms.map(normalizeKey)

  let best = { index: -1, score: 0 }

  headers.forEach((header, index) => {
    if (!header || normalizedRejects.some((term) => header.includes(term))) {
      return
    }

    normalizedTerms.forEach((term) => {
      if (!term) {
        return
      }

      const score = header === term ? 5 : header.includes(term) ? 3 : 0

      if (score > best.score) {
        best = { index, score }
      }
    })
  })

  return best.index
}

function scoreHeaderRow(row) {
  const headers = row.map(normalizeHeader)
  const dateIndex = findColumn(headers, ['date', 'txn date', 'transaction date', 'value date', 'posting date'])
  const descIndex = findColumn(headers, ['description', 'narration', 'details', 'particulars', 'remarks', 'merchant'])
  const amountIndex = findColumn(headers, ['debit', 'withdrawal', 'credit', 'deposit', 'amount', 'paid', 'received'], ['balance'])

  return (dateIndex >= 0 ? 2 : 0) + (descIndex >= 0 ? 2 : 0) + (amountIndex >= 0 ? 2 : 0)
}

function findHeaderRow(rows) {
  let best = { index: 0, score: 0 }

  rows.slice(0, 35).forEach((row, index) => {
    const score = scoreHeaderRow(row)

    if (score > best.score) {
      best = { index, score }
    }
  })

  return best.score >= 4 ? best.index : 0
}

function getCell(row, index) {
  return index >= 0 ? row[index] || '' : ''
}

function findDateInRow(row, fallbackYear = '') {
  for (const cell of row) {
    const date = normalizeDate(cell, fallbackYear)

    if (date) {
      return date
    }
  }

  return ''
}

function findDescription(row, descIndex, dateIndex) {
  const explicit = getCell(row, descIndex)

  if (explicit && /[a-z]/i.test(explicit)) {
    return explicit
  }

  const candidates = row
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell, index }) => index !== dateIndex && /[a-z]/i.test(cell) && safeAmount(cell) === 0)
    .sort((a, b) => b.cell.length - a.cell.length)

  return candidates[0]?.cell || 'Statement transaction'
}

function detectDirection({ debitAmount, creditAmount, amountInfo, directionText, description }) {
  const text = normalizeKey([directionText, description].filter(Boolean).join(' '))

  if (creditAmount > 0 && debitAmount === 0) {
    return 'income'
  }

  if (debitAmount > 0 && creditAmount === 0) {
    return 'expense'
  }

  if (amountInfo.hint) {
    return amountInfo.hint
  }

  if (/\b(cr|credit|deposit|received)\b/.test(text) || incomeRules.some((rule) => rule.terms.some((term) => text.includes(normalizeKey(term))))) {
    return 'income'
  }

  return 'expense'
}

function detectKnownMerchant(description) {
  const text = normalizeKey(description)
  const match = knownMerchants.find(([term]) => text.includes(normalizeKey(term)))
  return match?.[1] || ''
}

function extractMerchant(description) {
  const known = detectKnownMerchant(description)

  if (known) {
    return known
  }

  const cleaned = String(description || '')
    .replace(/\b\d{6,}\b/g, ' ')
    .replace(/\b[XS]{2,}\d+\b/gi, ' ')
    .replace(/[*/:_|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = cleaned
    .split(/[-/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => {
      const key = normalizeKey(part)
      return key.length >= 3 && !noiseTokens.has(key) && ![...noiseTokens].some((token) => key === token)
    })
    .sort((a, b) => b.length - a.length)

  const candidate = parts.find((part) => /[a-z]/i.test(part)) || cleaned
  const words = normalizeKey(candidate)
    .split(' ')
    .filter((word) => word.length > 1 && !noiseTokens.has(word) && !/^\d+$/.test(word))
    .slice(0, 4)

  return titleCase(words.join(' ')) || 'Unknown merchant'
}

function categorizeExpense(description, merchant = '') {
  const text = normalizeKey(`${description} ${merchant}`)

  for (const rule of categoryRules) {
    if (rule.terms.some((term) => text.includes(normalizeKey(term)))) {
      return rule.category
    }
  }

  return 'Other'
}

function categorizeIncome(description, merchant = '') {
  const text = normalizeKey(`${description} ${merchant}`)

  for (const rule of incomeRules) {
    if (rule.terms.some((term) => text.includes(normalizeKey(term)))) {
      return rule.source
    }
  }

  return 'Other income'
}

function buildTransaction({ date, description, amount, direction, fileName, confidence = 'review' }, index) {
  const merchant = extractMerchant(description)
  const category = direction === 'income' ? categorizeIncome(description, merchant) : categorizeExpense(description, merchant)

  return {
    id: `statement-${index}-${date || 'date'}-${String(description).slice(0, 18)}`,
    date,
    description: String(description || 'Statement transaction').trim(),
    merchant,
    amount,
    category,
    direction,
    imported: false,
    fileName,
    confidence,
  }
}

function extractCsvTransactions(text, fileName = '') {
  const rows = parseCsvRows(text)

  if (rows.length < 2) {
    return []
  }

  const headerIndex = findHeaderRow(rows)
  const headers = rows[headerIndex].map(normalizeHeader)
  const metadataText = rows.slice(0, headerIndex).flat().join(' ')
  const fallbackYear = detectMonthFromText(metadataText).split('-')[0] || ''
  const dateIndex = findColumn(headers, ['date', 'txn date', 'transaction date', 'value date', 'posting date'])
  const descIndex = findColumn(headers, ['description', 'narration', 'details', 'particulars', 'remarks', 'merchant'])
  const debitIndex = findColumn(headers, ['debit', 'withdrawal', 'paid out', 'dr amount', 'payment amount'], ['balance'])
  const creditIndex = findColumn(headers, ['credit', 'deposit', 'paid in', 'cr amount', 'received amount'], ['balance'])
  const amountIndex = findColumn(headers, ['amount', 'transaction amount', 'txn amount'], ['balance'])
  const directionIndex = findColumn(headers, ['type', 'dr cr', 'debit credit', 'transaction type'])

  return rows
    .slice(headerIndex + 1)
    .map((row, index) => {
      const date = normalizeDate(getCell(row, dateIndex), fallbackYear) || findDateInRow(row, fallbackYear)
      const description = findDescription(row, descIndex, dateIndex)
      const debitAmount = parseAmount(getCell(row, debitIndex)).amount
      const creditAmount = parseAmount(getCell(row, creditIndex)).amount
      const amountInfo = parseAmount(getCell(row, amountIndex))
      const amount = creditAmount || debitAmount || amountInfo.amount
      const direction = detectDirection({
        debitAmount,
        creditAmount,
        amountInfo,
        directionText: getCell(row, directionIndex),
        description,
      })

      return buildTransaction({ date, description, amount, direction, fileName, confidence: date ? 'review' : 'low' }, index)
    })
    .filter((transaction) => transaction.amount > 0 && !/opening balance|closing balance/i.test(transaction.description))
    .slice(0, MAX_TRANSACTIONS)
}

function extractAmountTokens(line) {
  const matches = [...String(line || '').matchAll(/(?:₹|rs\.?|inr)?\s*-?\(?\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?\)?(?:\s*(?:cr|dr))?/gi)]
    .map((match) => ({
      token: match[0],
      amount: safeAmount(match[0]),
      index: match.index || 0,
      hint: parseAmount(match[0]).hint,
    }))
    .filter((item) => item.amount > 0 && item.amount < 100_000_000)

  return matches
}

function cleanPdfDescription(line, dateToken, amountTokens) {
  let description = String(line || '').replace(dateToken, ' ')

  amountTokens.forEach((item) => {
    description = description.replace(item.token, ' ')
  })

  return description
    .replace(/\b(balance|debit|credit|withdrawal|deposit|dr|cr)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTextTransactions(text, fileName = '') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8)
  const monthKey = detectMonthFromText(text)
  const fallbackYear = monthKey.split('-')[0] || ''
  const transactions = []
  const datePattern = /\b(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.](?:20\d{2}|\d{2})|\d{1,2}[-\s][a-z]{3,9}[-\s,]+(?:20\d{2}|\d{2}))\b/i

  lines.forEach((line, index) => {
    const dateMatch = line.match(datePattern)

    if (!dateMatch) {
      return
    }

    const date = normalizeDate(dateMatch[0], fallbackYear)
    const amountTokens = extractAmountTokens(line)

    if (!date || amountTokens.length === 0) {
      return
    }

    const likelyAmount = amountTokens.length >= 2 ? amountTokens.at(-2) : amountTokens.at(-1)
    const description = cleanPdfDescription(line, dateMatch[0], amountTokens) || 'Statement transaction'
    const direction = detectDirection({
      debitAmount: likelyAmount.hint === 'expense' ? likelyAmount.amount : 0,
      creditAmount: likelyAmount.hint === 'income' ? likelyAmount.amount : 0,
      amountInfo: likelyAmount,
      directionText: line,
      description,
    })

    transactions.push(buildTransaction({
      date,
      description,
      amount: likelyAmount.amount,
      direction,
      fileName,
      confidence: 'low',
    }, index))
  })

  return transactions.slice(0, MAX_TRANSACTIONS)
}

async function readFileText(file) {
  if (!file || file.size > MAX_TEXT_BYTES) {
    return ''
  }

  return file.text()
}

async function readPdfText(file, password = '') {
  const pdfjs = await import('pdfjs-dist')

  pdfjs.GlobalWorkerOptions.workerSrc ||= new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()

  try {
    const data = new Uint8Array(await file.arrayBuffer())
    const pdf = await pdfjs.getDocument({
      data,
      password: password || undefined,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES)
    const pages = []

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const lines = new Map()

      content.items.forEach((item) => {
        const y = Math.round(item.transform?.[5] || 0)
        const x = item.transform?.[4] || 0
        const line = lines.get(y) || []
        line.push({ x, text: item.str })
        lines.set(y, line)
      })

      const pageText = [...lines.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, line]) => line.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '))
        .join('\n')

      pages.push(pageText)
    }

    await pdf.destroy?.()
    return pages.join('\n')
  } catch (error) {
    if (/password/i.test(error?.name || '') || /password/i.test(error?.message || '')) {
      const passwordError = new Error('PDF password required')
      passwordError.code = 'PDF_PASSWORD_REQUIRED'
      throw passwordError
    }

    throw error
  }
}

async function pdfLooksEncrypted(file) {
  const chunk = file.slice(0, Math.min(file.size, MAX_PDF_SCAN_BYTES))
  const text = await chunk.text().catch(() => '')
  return /\/Encrypt\b|\/EncryptMetadata\b/i.test(text)
}

function aggregateBy(items, keyGetter) {
  const totals = new Map()

  items.forEach((item) => {
    const key = keyGetter(item) || 'Other'
    const current = totals.get(key) || { name: key, amount: 0, count: 0 }
    current.amount += item.amount
    current.count += 1
    totals.set(key, current)
  })

  return [...totals.values()].sort((a, b) => b.amount - a.amount)
}

function formatDateRange(transactions) {
  const dates = transactions.map((item) => item.date).filter(Boolean).sort()

  if (dates.length === 0) {
    return 'Date range needs review'
  }

  if (dates[0] === dates.at(-1)) {
    return dates[0]
  }

  return `${dates[0]} to ${dates.at(-1)}`
}

function buildInsights({ incomes, expenses, incomeSources, expenseCategories, merchants, totalIncome, totalExpense }) {
  const insights = []

  if (incomes.length > 0) {
    const topIncome = incomeSources[0]
    insights.push(`${topIncome.name} is the largest detected money-in source in the readable rows.`)
  } else {
    insights.push('No money-in rows were clearly detected in the readable rows.')
  }

  if (expenses.length > 0) {
    const topExpense = expenseCategories[0]
    insights.push(`${topExpense.name} is the largest detected spending category in the readable rows.`)
  } else {
    insights.push('No money-out rows were clearly detected in the readable rows.')
  }

  if (merchants.length > 0) {
    insights.push(`${merchants[0].name} has the highest detected merchant spend in this file.`)
  }

  if (totalIncome > 0 || totalExpense > 0) {
    insights.push(totalIncome >= totalExpense
      ? 'Detected money-in is higher than detected spending for this statement window.'
      : 'Detected spending is higher than detected money-in for this statement window. Please review the period before using it.')
  }

  return insights
}

export function buildStatementReport(transactions = []) {
  const validTransactions = transactions.filter((item) => item.amount > 0)
  const incomes = validTransactions.filter((item) => item.direction === 'income')
  const expenses = validTransactions.filter((item) => item.direction !== 'income')
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0)
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0)
  const incomeSources = aggregateBy(incomes, (item) => item.category || 'Other income')
  const expenseCategories = aggregateBy(expenses, (item) => item.category || 'Other')
  const merchants = aggregateBy(expenses, (item) => item.merchant || item.description)
    .filter((item) => item.name && item.name !== 'Unknown merchant')
    .slice(0, 8)
  const months = Array.from(new Set(validTransactions.map((item) => item.date?.slice(0, 7)).filter(Boolean))).sort()
  const lowConfidenceCount = validTransactions.filter((item) => item.confidence === 'low' || !item.date).length
  const confidence = validTransactions.length === 0
    ? 'low'
    : lowConfidenceCount / validTransactions.length > 0.45
      ? 'review'
      : 'good'

  return {
    transactionCount: validTransactions.length,
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    totalIncome,
    totalExpense,
    netMovement: totalIncome - totalExpense,
    incomeSources,
    expenseCategories,
    merchants,
    months,
    dateRange: formatDateRange(validTransactions),
    confidence,
    insights: buildInsights({ incomes, expenses, incomeSources, expenseCategories, merchants, totalIncome, totalExpense }),
  }
}

function summarizeTransactions(transactions, text = '') {
  const transactionMonths = Array.from(new Set(transactions.map((item) => item.date?.slice(0, 7)).filter(Boolean))).sort()
  const detectedMonth = transactionMonths[0] || detectMonthFromText(text)
  const report = buildStatementReport(transactions)

  return {
    detectedMonth,
    monthLabel: transactionMonths.length > 1 ? `${readableMonth(transactionMonths[0])} - ${readableMonth(transactionMonths.at(-1))}` : readableMonth(detectedMonth),
    rows: transactions.length,
    visibleAmountSample: report.totalIncome + report.totalExpense,
    transactions,
    report,
  }
}

export async function inspectStatementFilesForPasswords(files = []) {
  const protectedFiles = []

  for (const file of Array.from(files)) {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const isPdf = extension === 'pdf' || file.type.includes('pdf')

    if (isPdf && await pdfLooksEncrypted(file)) {
      protectedFiles.push({
        name: file.name,
        size: file.size,
      })
    }
  }

  return protectedFiles
}

export async function parseStatementFiles(files = [], mode = 'reflection', options = {}) {
  const fileList = Array.from(files)
  const parsedFiles = []
  const allTransactions = []
  const passwordProvided = Boolean(options.pdfPassword)

  for (const file of fileList) {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const isCsv = extension === 'csv' || file.type.includes('csv')
    const isPdf = extension === 'pdf' || file.type.includes('pdf')
    let summary = null
    let status = 'File selected for import review. Raw uploads are not stored by default.'

    if (isCsv) {
      const text = await readFileText(file)
      const transactions = extractCsvTransactions(text, file.name)
      summary = summarizeTransactions(transactions, text)
      status = 'CSV scanned locally. Review dates, money-in, spending categories, and merchants before import.'
    }

    if (isPdf) {
      const text = await readPdfText(file, options.pdfPassword)
      const transactions = extractTextTransactions(text, file.name)
      summary = summarizeTransactions(transactions, text)
      status = passwordProvided
        ? 'PDF password was used temporarily in memory. Text was scanned locally for review.'
        : 'PDF text was scanned locally. Review rows before import because PDF layouts vary by bank.'
    }

    const detectedMonth = summary?.detectedMonth || detectMonthFromText(file.name)
    const historicalOnly = isHistoricalMonth(detectedMonth)

    parsedFiles.push({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      type: isPdf ? 'PDF' : isCsv ? 'CSV' : 'File',
      size: file.size,
      detectedMonth,
      monthLabel: summary?.monthLabel || readableMonth(detectedMonth),
      rows: summary?.rows || 0,
      visibleAmountSample: summary?.visibleAmountSample || 0,
      historicalOnly,
      status,
    })

    if (summary?.transactions?.length) {
      allTransactions.push(...summary.transactions.map((transaction) => ({
        ...transaction,
        historicalOnly,
      })))
    }
  }

  const months = Array.from(new Set(allTransactions.map((item) => item.date?.slice(0, 7)).filter(Boolean)
    .concat(parsedFiles.map((item) => item.detectedMonth).filter(Boolean)))).sort()
  const historicalTimeline = months.map((month) => ({
    month,
    label: readableMonth(month),
    files: parsedFiles.filter((item) => item.detectedMonth === month).length,
  }))
  const statementReport = buildStatementReport(allTransactions)

  return {
    mode,
    files: parsedFiles,
    transactions: allTransactions.slice(0, MAX_PREVIEW_TRANSACTIONS),
    transactionCount: allTransactions.length,
    previewLimited: allTransactions.length > MAX_PREVIEW_TRANSACTIONS,
    statementReport,
    detectedMonths: months,
    historicalTimeline,
    currentMonth: currentMonthKey(),
    historicalOnly: parsedFiles.some((item) => item.historicalOnly),
    confidence: statementReport.confidence,
    privacyNote: 'Raw statement files are used only for this preview and are not saved permanently by default.',
  }
}
