const CATEGORY_PALETTE = {
  Income: '#16A34A',
  Expense: '#EF4444',
  Salary: '#22C55E',
  Travel: '#F59E0B',
  Food: '#06B6D4',
  Grocery: '#10B981',
  Subscription: '#6366F1',
  Loan: '#84CC16',
  Housing: '#64748B',
  Shopping: '#2563EB',
  Medical: '#EF4444',
  Entertainment: '#A855F7',
  Education: '#14B8A6',
  Personal: '#EC4899',
  Savings: '#16A34A',
  Shared: '#0EA5E9',
  'Money Book': '#7C3AED',
  Lending: '#EF4444',
  Borrowed: '#22C55E',
  Recurring: '#475569',
  Transfer: '#8B5CF6',
  Refund: '#14B8A6',
  Planner: '#F97316',
  Other: '#94A3B8',
}

const FALLBACK_PALETTE = [
  '#2563EB',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#64748B',
]

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function fallbackColor(key) {
  const clean = normalizeKey(key)
  if (!clean) {
    return CATEGORY_PALETTE.Other
  }

  let hash = 0
  for (let index = 0; index < clean.length; index += 1) {
    hash = (hash + clean.charCodeAt(index) * (index + 3)) % FALLBACK_PALETTE.length
  }

  return FALLBACK_PALETTE[hash]
}

export const FINANCE_CATEGORY_COLORS = CATEGORY_PALETTE
export const FINANCE_CHART_COLORS = FALLBACK_PALETTE

export function getFinanceColor(category, index = 0) {
  const exact = Object.keys(CATEGORY_PALETTE).find(
    (item) => normalizeKey(item) === normalizeKey(category),
  )

  return exact
    ? CATEGORY_PALETTE[exact]
    : FALLBACK_PALETTE[index % FALLBACK_PALETTE.length] || fallbackColor(category)
}

export function getFinanceGradient(category, index = 0) {
  const color = getFinanceColor(category, index)

  return {
    start: color,
    end: index % 2 === 0 ? '#38BDF8' : '#A78BFA',
  }
}

export function getTransactionTone(direction, impactType) {
  if (direction === 'incoming' || impactType === 'income' || impactType === 'refund') {
    return 'incoming'
  }

  if (direction === 'outgoing' || impactType === 'expense') {
    return 'outgoing'
  }

  if (impactType === 'transfer' || impactType === 'goal') {
    return 'transfer'
  }

  return 'neutral'
}
