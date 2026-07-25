import { normalizeMoney } from './money.js'

const RECENT_TEMPLATE_LIMIT = 8
const HISTORY_SCAN_LIMIT = 80
const BULK_LINE_LIMIT = 12

export const MONEY_INBOX_SYSTEM = 'v10-money-inbox'

export const moneyInboxKinds = Object.freeze({
  expense: 'expense',
  income: 'income',
  borrow: 'borrow',
  lend: 'lend',
  transfer: 'transfer',
  split: 'split',
})

export const moneyInboxSources = Object.freeze({
  universal: 'universal',
  manual: 'manual',
  template: 'template',
  bulk: 'bulk',
  notebook: 'notebook',
  voice: 'voice',
  ocr: 'ocr',
  trip: 'trip',
  recurring: 'recurring',
  unknown: 'unknown',
})

export const moneyInboxIntentTypes = Object.freeze({
  expense: moneyInboxKinds.expense,
  income: moneyInboxKinds.income,
  borrow: moneyInboxKinds.borrow,
  lend: moneyInboxKinds.lend,
  transfer: moneyInboxKinds.transfer,
  unknown: 'unknown',
})

export const moneyInboxConfidence = Object.freeze({
  high: 'high',
  medium: 'medium',
  low: 'low',
})

const expenseKeywordCategories = [
  { pattern: /\b(tea|coffee|chai|cafe)\b/, category: 'Food' },
  { pattern: /\b(lunch|dinner|breakfast|food|meal|snack|restaurant|zomato|swiggy)\b/, category: 'Food' },
  { pattern: /\b(milk|kirana|grocery|groceries|mart|vegetable|fruit)\b/, category: 'Grocery' },
  { pattern: /\b(fuel|petrol|diesel|gas|parking)\b/, category: 'Fuel' },
  { pattern: /\b(cab|taxi|auto|bus|train|metro|transport|uber|ola)\b/, category: 'Transport' },
  { pattern: /\b(recharge|phone|internet|electricity|bill|wifi|broadband)\b/, category: 'Bills' },
  { pattern: /\b(rent|housing|maintenance)\b/, category: 'Housing' },
  { pattern: /\b(emi|loan|installment|instalment)\b/, category: 'Loan' },
  { pattern: /\b(medical|medicine|doctor|hospital|pharmacy)\b/, category: 'Medical' },
  { pattern: /\b(movie|netflix|prime|spotify|subscription)\b/, category: 'Subscription' },
  { pattern: /\b(shopping|shirt|shoes|amazon|flipkart)\b/, category: 'Shopping' },
]

const incomeKeywords = /\b(salary|income|credited|credit|received|receive|bonus|freelance|invoice|payout|refund|cashback)\b/
const transferKeywords = /\b(transfer|move|moved|saving|savings|goal|bucket|deposit)\b/
const borrowKeywords = /\b(borrow|borrowed|taken|took|loan from|owe)\b/
const lendKeywords = /\b(lend|lent|given|gave|paid for|loan to)\b/

function cleanText(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizedText(value = '') {
  return cleanText(value).toLowerCase()
}

function normalizeKind(kind = moneyInboxKinds.expense) {
  return Object.values(moneyInboxKinds).includes(kind) ? kind : moneyInboxKinds.expense
}

function normalizeSource(source = moneyInboxSources.manual) {
  return Object.values(moneyInboxSources).includes(source) ? source : moneyInboxSources.unknown
}

function draftId(prefix = 'inbox') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function ensureMoneyInboxRollbackFlag() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.__FBPLY_LEGACY_MONEY_INBOX__ === 'undefined') {
    window.__FBPLY_LEGACY_MONEY_INBOX__ = false
  }
}

export function isMoneyInboxEnabled() {
  return typeof window === 'undefined' || !window.__FBPLY_LEGACY_MONEY_INBOX__
}

export function createMoneyInboxDraft(input = {}) {
  const kind = normalizeKind(input.kind)
  const amount = normalizeMoney(input.amount)
  const label = cleanText(input.label || input.name || input.category)
  const person = cleanText(input.person)

  return {
    system: MONEY_INBOX_SYSTEM,
    id: input.id || draftId('inbox-draft'),
    kind,
    source: normalizeSource(input.source),
    label,
    category: cleanText(input.category),
    amount,
    note: cleanText(input.note),
    person,
    targetId: cleanText(input.targetId),
    rawText: cleanText(input.rawText),
    createdAt: input.createdAt || new Date().toISOString(),
    bulkIndex: Number.isFinite(Number(input.bulkIndex)) ? Number(input.bulkIndex) : null,
  }
}

export function createMoneyInboxTemplate(input = {}) {
  const draft = createMoneyInboxDraft({
    ...input,
    source: input.source || moneyInboxSources.template,
  })

  return {
    ...draft,
    templateId: input.templateId || `${draft.kind}:${draft.label || draft.person || draft.targetId || draft.id}`.toLowerCase(),
    iconKey: input.iconKey || iconKeyForDraft(draft),
    useCount: Math.max(Number(input.useCount || 0), 0),
    lastUsedAt: input.lastUsedAt || '',
  }
}

function amountKey(value) {
  return normalizeMoney(value).toFixed(2)
}

function labelFromTemplate(template = {}) {
  if (template.kind === moneyInboxKinds.borrow || template.kind === moneyInboxKinds.lend) {
    return cleanText(template.person || template.label)
  }

  return cleanText(template.label || template.category)
}

function iconKeyForDraft(draft = {}) {
  const text = `${draft.label || ''} ${draft.category || ''}`.toLowerCase()

  if (draft.kind === moneyInboxKinds.income) {
    return 'wallet'
  }

  if (draft.kind === moneyInboxKinds.borrow || draft.kind === moneyInboxKinds.lend) {
    return 'creditCard'
  }

  if (draft.kind === moneyInboxKinds.transfer) {
    return 'piggyBank'
  }

  if (draft.kind === moneyInboxKinds.split) {
    return 'plane'
  }

  if (/\b(tea|coffee|chai|cafe)\b/.test(text)) {
    return 'coffee'
  }

  if (/\b(fuel|petrol|diesel|gas|cab|taxi|auto)\b/.test(text)) {
    return 'car'
  }

  if (/\b(lunch|dinner|food|meal|snack|restaurant)\b/.test(text)) {
    return 'utensils'
  }

  if (/\b(grocery|groceries|mart|shopping|recharge)\b/.test(text)) {
    return 'shoppingBag'
  }

  return 'receipt'
}

function upsertTemplate(templateMap, template) {
  const key = `${template.kind}:${template.label || template.person || template.targetId}:${amountKey(template.amount)}`
  const existing = templateMap.get(key)

  if (!existing) {
    templateMap.set(key, template)
    return
  }

  templateMap.set(key, {
    ...existing,
    useCount: existing.useCount + 1,
    lastUsedAt: [existing.lastUsedAt, template.lastUsedAt].filter(Boolean).sort().slice(-1)[0] || '',
  })
}

export function buildRecentMoneyInboxTemplates({
  expenses = [],
  profile = {},
  moneyBookEntries = [],
  savingsBuckets = [],
  sharedGroups = [],
  limit = RECENT_TEMPLATE_LIMIT,
} = {}) {
  const templateMap = new Map()

  expenses.slice(0, HISTORY_SCAN_LIMIT).forEach((expense) => {
    const amount = normalizeMoney(expense.amount)
    const label = cleanText(expense.label || expense.category)

    if (!label || amount <= 0) {
      return
    }

    upsertTemplate(templateMap, createMoneyInboxTemplate({
      kind: expense.type === 'income' ? moneyInboxKinds.income : moneyInboxKinds.expense,
      label,
      category: expense.category || 'Other',
      amount,
      note: expense.note || '',
      lastUsedAt: expense.createdAt || expense.date || '',
      useCount: 1,
    }))
  })

  if (normalizeMoney(profile.income) > 0) {
    upsertTemplate(templateMap, createMoneyInboxTemplate({
      kind: moneyInboxKinds.income,
      label: 'Salary',
      amount: profile.income,
      lastUsedAt: profile.updatedAt || '',
      useCount: 1,
      iconKey: 'wallet',
    }))
  }

  moneyBookEntries.slice(0, HISTORY_SCAN_LIMIT).forEach((entry) => {
    const amount = normalizeMoney(entry.amount)
    const person = cleanText(entry.person)

    if (!person || amount <= 0) {
      return
    }

    upsertTemplate(templateMap, createMoneyInboxTemplate({
      kind: entry.kind === 'taken' ? moneyInboxKinds.borrow : moneyInboxKinds.lend,
      person,
      label: entry.kind === 'taken' ? `Borrow from ${person}` : `Lend to ${person}`,
      amount,
      note: entry.note || '',
      lastUsedAt: entry.updatedAt || entry.createdAt || entry.date || '',
      useCount: 1,
      iconKey: 'creditCard',
    }))
  })

  savingsBuckets.slice(0, 4).forEach((bucket) => {
    const targetId = cleanText(bucket.id)
    const label = cleanText(bucket.name)

    if (!targetId || !label) {
      return
    }

    upsertTemplate(templateMap, createMoneyInboxTemplate({
      kind: moneyInboxKinds.transfer,
      label: `Move to ${label}`,
      targetId,
      amount: 0,
      useCount: 1,
      iconKey: 'piggyBank',
    }))
  })

  sharedGroups.slice(0, 4).forEach((group) => {
    const label = cleanText(group.name)

    if (!label) {
      return
    }

    upsertTemplate(templateMap, createMoneyInboxTemplate({
      kind: moneyInboxKinds.split,
      label,
      targetId: cleanText(group.id),
      amount: 0,
      useCount: 1,
      iconKey: 'plane',
    }))
  })

  return Array.from(templateMap.values())
    .sort((a, b) => {
      if (b.useCount !== a.useCount) {
        return b.useCount - a.useCount
      }

      return String(b.lastUsedAt || '').localeCompare(String(a.lastUsedAt || ''))
    })
    .slice(0, Math.max(limit, 0))
}

function titleCaseWords(value = '') {
  return cleanText(value)
    .split(' ')
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : '')
    .join(' ')
}

function stripIntentWords(value = '', intent) {
  let result = ` ${cleanText(value)} `

  if (intent === moneyInboxIntentTypes.income) {
    result = result.replace(/\b(salary|income|credited|credit|received|receive|bonus|freelance|invoice|payout|refund|cashback)\b/gi, ' ')
  } else if (intent === moneyInboxIntentTypes.transfer) {
    result = result.replace(/\b(transfer|move|moved|saving|savings|goal|bucket|deposit|to)\b/gi, ' ')
  } else if (intent === moneyInboxIntentTypes.borrow) {
    result = result.replace(/\b(borrow|borrowed|taken|took|loan|from|owe)\b/gi, ' ')
  } else if (intent === moneyInboxIntentTypes.lend) {
    result = result.replace(/\b(lend|lent|given|gave|paid|for|loan|to)\b/gi, ' ')
  }

  return cleanText(result)
}

function categoryForTitle(title = '', templates = []) {
  const normalizedTitle = normalizedText(title)

  const historyMatch = templates.find((template) => {
    if (template.kind !== moneyInboxKinds.expense) {
      return false
    }

    const label = normalizedText(labelFromTemplate(template))
    return label && (label === normalizedTitle || normalizedTitle.includes(label) || label.includes(normalizedTitle))
  })

  if (historyMatch?.category) {
    return historyMatch.category
  }

  const keywordMatch = expenseKeywordCategories.find((item) => item.pattern.test(normalizedTitle))
  return keywordMatch?.category || 'Other'
}

function buildKnownTemplateSignals(templates = []) {
  return templates.reduce((signals, template) => {
    const label = labelFromTemplate(template)
    const normalizedLabel = normalizedText(label)

    if (!normalizedLabel) {
      return signals
    }

    signals.labels.set(normalizedLabel, template)

    if (template.kind === moneyInboxKinds.borrow || template.kind === moneyInboxKinds.lend) {
      signals.people.set(normalizedText(template.person || label), template)
    }

    return signals
  }, {
    labels: new Map(),
    people: new Map(),
  })
}

function findTemplateMatch(title = '', templates = []) {
  const normalizedTitle = normalizedText(title)

  if (!normalizedTitle) {
    return null
  }

  return templates.find((template) => {
    const label = normalizedText(labelFromTemplate(template))
    return label && (label === normalizedTitle || normalizedTitle.startsWith(label) || label.startsWith(normalizedTitle))
  }) || null
}

function hasExpenseKeyword(title = '') {
  const normalizedTitle = normalizedText(title)
  return expenseKeywordCategories.some((item) => item.pattern.test(normalizedTitle))
}

function confidenceFromScore(score) {
  if (score >= 82) {
    return moneyInboxConfidence.high
  }

  if (score >= 58) {
    return moneyInboxConfidence.medium
  }

  return moneyInboxConfidence.low
}

function uniqueFields(fields = []) {
  return Array.from(new Set(fields.filter(Boolean)))
}

export function parseUniversalMoneyInboxInput(text = '', context = {}) {
  const rawText = cleanText(text)
  const parsedLine = parseLineAmount(rawText)
  const amount = parsedLine.amount
  const remainder = cleanText(parsedLine.label)
  const templates = buildRecentMoneyInboxTemplates({ ...context, limit: 16 })
  const signals = buildKnownTemplateSignals(templates)
  const templateMatch = findTemplateMatch(remainder, templates)
  const lowerText = normalizedText(rawText)
  const lowerRemainder = normalizedText(remainder)
  const unknownFields = []
  let detectedType = moneyInboxIntentTypes.unknown
  let title = remainder
  let person = ''
  let category = ''
  let confidenceScore = 0
  let reason = ''

  if (!rawText) {
    return {
      rawText,
      detectedType,
      confidence: moneyInboxConfidence.low,
      confidenceScore,
      detectedAmount: 0,
      detectedTitle: '',
      detectedPerson: '',
      category: '',
      unknownFields: ['title', 'amount', 'type'],
      reason: 'Waiting for input.',
      templateMatch: null,
      draft: null,
    }
  }

  if (incomeKeywords.test(lowerText)) {
    detectedType = moneyInboxIntentTypes.income
    title = stripIntentWords(remainder, detectedType) || 'Salary'
    confidenceScore = amount > 0 ? 92 : 46
    reason = 'Income keyword matched.'
  } else if (transferKeywords.test(lowerText)) {
    detectedType = moneyInboxIntentTypes.transfer
    title = stripIntentWords(remainder, detectedType) || 'Transfer'
    confidenceScore = amount > 0 ? 88 : 44
    reason = 'Transfer keyword matched.'
  } else if (borrowKeywords.test(lowerText)) {
    detectedType = moneyInboxIntentTypes.borrow
    person = stripIntentWords(remainder, detectedType)
    title = person || 'Borrow'
    confidenceScore = amount > 0 && person ? 88 : 52
    reason = 'Borrow keyword matched.'
  } else if (lendKeywords.test(lowerText)) {
    detectedType = moneyInboxIntentTypes.lend
    person = stripIntentWords(remainder, detectedType)
    title = person || 'Lend'
    confidenceScore = amount > 0 && person ? 88 : 52
    reason = 'Lend keyword matched.'
  } else if (templateMatch) {
    detectedType = templateMatch.kind
    title = labelFromTemplate(templateMatch) || remainder
    person = cleanText(templateMatch.person)
    category = templateMatch.category || ''
    confidenceScore = amount > 0 || normalizeMoney(templateMatch.amount) > 0 ? 86 : 62
    reason = 'Recent history matched.'
  } else if (hasExpenseKeyword(remainder)) {
    detectedType = moneyInboxIntentTypes.expense
    title = remainder
    confidenceScore = amount > 0 ? 86 : 42
    reason = 'Expense keyword matched.'
  } else if (signals.people.has(lowerRemainder)) {
    const personMatch = signals.people.get(lowerRemainder)
    detectedType = personMatch.kind
    person = personMatch.person || remainder
    title = person
    confidenceScore = amount > 0 ? 78 : 42
    reason = 'Recent money book person matched.'
  } else if (amount > 0 && remainder) {
    detectedType = moneyInboxIntentTypes.unknown
    title = remainder
    person = /^[a-z]+(?:\s+[a-z]+)?$/i.test(remainder) && normalizeMoney(amount) >= 1000 ? titleCaseWords(remainder) : ''
    confidenceScore = 36
    reason = 'Amount and title found, but intent is ambiguous.'
  }

  if (amount <= 0) {
    unknownFields.push('amount')
  }

  if (!title && detectedType !== moneyInboxIntentTypes.unknown) {
    unknownFields.push(detectedType === moneyInboxIntentTypes.borrow || detectedType === moneyInboxIntentTypes.lend ? 'person' : 'title')
  }

  if (detectedType === moneyInboxIntentTypes.unknown) {
    unknownFields.push('type')
  }

  if (detectedType === moneyInboxIntentTypes.transfer && !title.replace(/^transfer$/i, '').trim()) {
    unknownFields.push('goal')
  }

  if (!category && detectedType === moneyInboxIntentTypes.expense) {
    category = categoryForTitle(title, templates)
  }

  const confidence = confidenceFromScore(confidenceScore)
  const draftKind = detectedType === moneyInboxIntentTypes.unknown ? moneyInboxKinds.expense : detectedType
  const draft = amount > 0 && title
    ? createMoneyInboxDraft({
        kind: draftKind,
        source: moneyInboxSources.universal,
        label: title,
        category: detectedType === moneyInboxIntentTypes.expense ? category || 'Other' : '',
        person,
        amount,
        note: rawText,
        rawText,
        targetId: templateMatch?.targetId || '',
      })
    : null

  return {
    rawText,
    detectedType,
    confidence,
    confidenceScore,
    detectedAmount: amount,
    detectedTitle: title,
    detectedPerson: person,
    category,
    unknownFields: uniqueFields(unknownFields),
    reason,
    templateMatch,
    draft,
  }
}

export function createMoneyInboxDraftFromParsedIntent(parsed = {}, overrideKind = '') {
  const kind = normalizeKind(overrideKind || parsed.detectedType || moneyInboxKinds.expense)
  const label = cleanText(parsed.detectedTitle || parsed.detectedPerson || parsed.rawText)

  return createMoneyInboxDraft({
    kind,
    source: moneyInboxSources.universal,
    label,
    category: kind === moneyInboxKinds.expense ? parsed.category || label || 'Other' : '',
    person: kind === moneyInboxKinds.borrow || kind === moneyInboxKinds.lend ? parsed.detectedPerson || label : '',
    amount: parsed.detectedAmount,
    note: parsed.rawText,
    rawText: parsed.rawText,
    targetId: parsed.templateMatch?.targetId || '',
  })
}

export function buildUniversalQuickAddSuggestions(query = '', context = {}, limit = 6) {
  const normalizedQuery = normalizedText(query)
  const templates = buildRecentMoneyInboxTemplates({ ...context, limit: 16 })
  const seen = new Set()

  return templates
    .map((template) => {
      const label = labelFromTemplate(template)
      const amount = normalizeMoney(template.amount)
      const fillText = amount > 0 ? `${label} ${amount}` : label

      return {
        id: template.templateId,
        kind: template.kind,
        label,
        amount,
        category: template.category || '',
        person: template.person || '',
        iconKey: template.iconKey,
        fillText,
        template,
      }
    })
    .filter((suggestion) => {
      if (!suggestion.label) {
        return false
      }

      const key = `${suggestion.kind}:${normalizedText(suggestion.label)}:${amountKey(suggestion.amount)}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)

      if (!normalizedQuery) {
        return true
      }

      const haystack = normalizedText(`${suggestion.label} ${suggestion.category} ${suggestion.person}`)
      return haystack.includes(normalizedQuery) || normalizedQuery.includes(normalizedText(suggestion.label))
    })
    .sort((a, b) => {
      if (!normalizedQuery) {
        return 0
      }

      const aStarts = normalizedText(a.label).startsWith(normalizedQuery) ? 1 : 0
      const bStarts = normalizedText(b.label).startsWith(normalizedQuery) ? 1 : 0
      return bStarts - aStarts
    })
    .slice(0, Math.max(limit, 0))
}

function parseLineAmount(line = '') {
  const match = String(line).match(/(?:^|\s)(\d[\d,]*(?:\.\d{1,2})?)(?:\s|$)/)

  if (!match) {
    return { amount: 0, label: cleanText(line) }
  }

  const amount = normalizeMoney(match[1])
  const label = cleanText(`${line.slice(0, match.index)} ${line.slice(match.index + match[0].length)}`)

  return { amount, label }
}

export function parseBulkMoneyInboxLines(text = '', { limit = BULK_LINE_LIMIT } = {}) {
  return String(text || '')
    .split(/\r?\n/)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, Math.max(limit, 0))
    .map((line, index) => {
      const parsed = parseLineAmount(line)

      return createMoneyInboxDraft({
        kind: moneyInboxKinds.expense,
        source: moneyInboxSources.bulk,
        label: parsed.label || 'Expense',
        category: 'Other',
        amount: parsed.amount,
        rawText: line,
        bulkIndex: index,
      })
    })
}

export function createNotebookMoneyInboxDraft(draftState = {}, context = {}) {
  return createMoneyInboxDraft({
    kind: context.kind || moneyInboxKinds.expense,
    source: moneyInboxSources.notebook,
    label: draftState.label || draftState.title || '',
    amount: draftState.amount,
    note: draftState.note || draftState.text || '',
    rawText: draftState.text || '',
  })
}

export function prepareMoneyInboxDraftForExistingEngine(draft = {}) {
  const normalizedDraft = createMoneyInboxDraft(draft)

  if (normalizedDraft.kind === moneyInboxKinds.borrow || normalizedDraft.kind === moneyInboxKinds.lend) {
    return {
      mode: 'borrow',
      draft: normalizedDraft,
      moneyBookDraft: {
        kind: normalizedDraft.kind === moneyInboxKinds.borrow ? 'taken' : 'given',
        person: normalizedDraft.person || normalizedDraft.label,
        amount: normalizedDraft.amount > 0 ? String(normalizedDraft.amount) : '',
        note: normalizedDraft.note,
      },
    }
  }

  if (normalizedDraft.kind === moneyInboxKinds.income) {
    return {
      mode: 'income',
      draft: normalizedDraft,
      incomeAmount: normalizedDraft.amount > 0 ? String(normalizedDraft.amount) : '',
    }
  }

  if (normalizedDraft.kind === moneyInboxKinds.transfer) {
    return {
      mode: 'transfer',
      draft: normalizedDraft,
      transferDraft: {
        amount: normalizedDraft.amount > 0 ? String(normalizedDraft.amount) : '',
        bucketId: normalizedDraft.targetId,
      },
    }
  }

  if (normalizedDraft.kind === moneyInboxKinds.split) {
    return {
      mode: 'split',
      draft: normalizedDraft,
    }
  }

  return {
    mode: 'expense',
    draft: normalizedDraft,
    expenseChip: {
      label: normalizedDraft.label,
      amount: normalizedDraft.amount,
      category: normalizedDraft.category || normalizedDraft.label || 'Other',
    },
    expenseNote: normalizedDraft.note || normalizedDraft.rawText || normalizedDraft.label,
  }
}
