import { FINANCE_CATEGORY_COLORS, getFinanceColor } from './financeColors.js'
import { addMoney, normalizeMoney, sumMoney } from './money.js'

const GENERIC_LABELS = new Set(['', 'custom', 'other', 'misc', 'miscellaneous', 'expense'])

export const CATEGORY_COLORS = FINANCE_CATEGORY_COLORS

const CATEGORY_RULES = [
  {
    category: 'Travel',
    terms: [
      'petrol',
      'diesel',
      'fuel',
      'cng',
      'uber',
      'ola',
      'cab',
      'taxi',
      'auto',
      'rickshaw',
      'train',
      'metro',
      'bus',
      'flight',
      'airfare',
      'ticket',
      'parking',
      'toll',
      'travel',
      'trip',
      'hotel',
      '\u092a\u0947\u091f\u094d\u0930\u094b\u0932',
    ],
  },
  {
    category: 'Food',
    terms: [
      'food',
      'khana',
      'meal',
      'lunch',
      'dinner',
      'breakfast',
      'snack',
      'restaurant',
      'cafe',
      'tea',
      'coffee',
      'swiggy',
      'zomato',
      '\u0916\u093e\u0928\u093e',
      '\u091c\u0947\u0935\u0923',
    ],
  },
  {
    category: 'Grocery',
    terms: [
      'milk',
      'grocery',
      'groceries',
      'kirana',
      'ration',
      'vegetable',
      'vegetables',
      'fruit',
      'fruits',
      'supermarket',
      'doodh',
      '\u0926\u0942\u0927',
      '\u0915\u093f\u0930\u093e\u0928\u093e',
    ],
  },
  {
    category: 'Subscription',
    terms: [
      'subscription',
      'netflix',
      'prime',
      'hotstar',
      'spotify',
      'youtube',
      'internet',
      'wifi',
      'broadband',
      'recharge',
      'postpaid',
      '\u0928\u0947\u091f',
    ],
  },
  {
    category: 'Loan',
    terms: ['emi', 'loan', 'installment', 'instalment', 'finance', 'bnpl', 'credit card', 'credit'],
  },
  {
    category: 'Housing',
    terms: [
      'rent',
      'house',
      'home',
      'flat',
      'maintenance',
      'society',
      'kiraya',
      'bhade',
      '\u092d\u093e\u0921\u0947',
      '\u092d\u093e\u0921\u0902',
      '\u0915\u093f\u0930\u093e\u092f\u093e',
    ],
  },
  {
    category: 'Shopping',
    terms: ['shopping', 'amazon', 'flipkart', 'myntra', 'clothes', 'dress', 'shoes', 'shirt', 'jeans'],
  },
  {
    category: 'Medical',
    terms: ['medical', 'medicine', 'doctor', 'hospital', 'pharmacy', 'clinic', 'dawa', '\u0926\u0935\u093e'],
  },
  {
    category: 'Entertainment',
    terms: ['entertainment', 'movie', 'cinema', 'game', 'gaming', 'party', 'concert'],
  },
  {
    category: 'Education',
    terms: ['education', 'school', 'college', 'course', 'book', 'books', 'fees', 'tuition', 'class'],
  },
  {
    category: 'Savings',
    terms: ['saving', 'savings', 'sip', 'investment', 'mutual fund', 'rd', 'fd', 'emergency'],
  },
  {
    category: 'Personal',
    terms: ['gym', 'salon', 'gift', 'gifts', 'family support', 'personal', 'care'],
  },
  {
    category: 'Shared',
    terms: ['shared', 'split', 'settlement', 'repayment', 'recovery', 'recoverable'],
  },
  {
    category: 'Money Book',
    terms: ['money book', 'udhar', 'lend', 'lent', 'borrow', 'borrowed', 'vyaj', 'receivable', 'payable'],
  },
]

const DIRECT_CATEGORY_MAP = new Map(
  CATEGORY_RULES.flatMap((rule) => [[normalizeKey(rule.category), rule.category]])
    .concat([
      ['fuel', 'Travel'],
      ['petrol', 'Travel'],
      ['cab', 'Travel'],
      ['taxi', 'Travel'],
      ['grocery', 'Grocery'],
      ['groceries', 'Grocery'],
      ['subscription', 'Subscription'],
      ['subscriptions', 'Subscription'],
      ['emi', 'Loan'],
      ['loan', 'Loan'],
      ['rent', 'Housing'],
      ['housing', 'Housing'],
      ['shared', 'Shared'],
      ['split', 'Shared'],
      ['money book', 'Money Book'],
      ['udhar', 'Money Book'],
      ['lending', 'Money Book'],
      ['borrowed', 'Money Book'],
    ]),
)

function safeAmount(value) {
  return normalizeMoney(value)
}

export function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function containsTerm(text, term) {
  const cleanTerm = normalizeKey(term)
  if (!cleanTerm) {
    return false
  }

  return ` ${text} `.includes(` ${cleanTerm} `)
}

function getExpenseText(expenseOrValue, note = '') {
  if (typeof expenseOrValue === 'string') {
    return [expenseOrValue, note].filter(Boolean).join(' ')
  }

  const expense = expenseOrValue || {}
  return [
    expense.category,
    expense.label,
    expense.name,
    expense.note,
    expense.description,
  ]
    .filter(Boolean)
    .join(' ')
}

function getOriginalCategory(expenseOrValue) {
  if (typeof expenseOrValue === 'string') {
    return expenseOrValue
  }

  return expenseOrValue?.category || expenseOrValue?.label || expenseOrValue?.name || ''
}

export function normalizeSpendCategory(expenseOrValue, note = '') {
  const originalCategory = String(getOriginalCategory(expenseOrValue) || '').trim()
  const categoryKey = normalizeKey(originalCategory)
  const fullText = normalizeKey(getExpenseText(expenseOrValue, note))
  const directCategory = DIRECT_CATEGORY_MAP.get(categoryKey)

  if (directCategory === 'Shared' || expenseOrValue?.source === 'shared') {
    return {
      category: 'Shared',
      displayCategory: 'Shared',
      originalCategory,
      confidence: 'high',
      matchedTerm: originalCategory || 'shared',
      source: 'category',
      color: CATEGORY_COLORS.Shared,
    }
  }

  if (directCategory === 'Money Book' || expenseOrValue?.source === 'money-book') {
    return {
      category: 'Money Book',
      displayCategory: 'Money Book',
      originalCategory,
      confidence: 'high',
      matchedTerm: originalCategory || 'money book',
      source: 'category',
      color: CATEGORY_COLORS['Money Book'],
    }
  }

  let best = directCategory
    ? { category: directCategory, score: 4, matchedTerm: originalCategory, source: 'category' }
    : { category: 'Other', score: 0, matchedTerm: '', source: 'fallback' }

  CATEGORY_RULES.forEach((rule) => {
    rule.terms.forEach((term) => {
      if (!containsTerm(fullText, term)) {
        return
      }

      const termKey = normalizeKey(term)
      const score = categoryKey === termKey || categoryKey === normalizeKey(rule.category) ? 4 : 5

      if (score > best.score) {
        best = {
          category: rule.category,
          score,
          matchedTerm: term,
          source: categoryKey === termKey ? 'category' : 'label',
        }
      }
    })
  })

  const hasSpecificOriginal = originalCategory && !GENERIC_LABELS.has(categoryKey)
  const confidence = best.score >= 5 ? 'high' : best.score >= 3 ? 'medium' : 'low'

  return {
    category: best.category,
    displayCategory: best.category === 'Other' && hasSpecificOriginal ? 'Other' : best.category,
    originalCategory,
    confidence,
    matchedTerm: best.matchedTerm,
    source: best.source,
    color: CATEGORY_COLORS[best.category] || CATEGORY_COLORS.Other,
  }
}

export function aggregateExpenses(expenses = []) {
  const records = expenses.map((expense) => {
    const normalized = normalizeSpendCategory(expense)
    return {
      ...expense,
      amount: safeAmount(expense.amount),
      normalizedCategory: normalized.category,
      normalizedConfidence: normalized.confidence,
      normalizedSource: normalized.source,
      normalizedMatchedTerm: normalized.matchedTerm,
      normalizedColor: normalized.color,
    }
  })

  const totals = {}
  const counts = {}
  const confidenceTotals = { high: 0, medium: 0, low: 0 }
  const examples = {}

  records.forEach((record) => {
    const category = record.normalizedCategory || 'Other'
    totals[category] = addMoney(totals[category] || 0, record.amount)
    counts[category] = (counts[category] || 0) + 1
    confidenceTotals[record.normalizedConfidence] = addMoney(confidenceTotals[record.normalizedConfidence], record.amount)

    if (!examples[category]) {
      examples[category] = record.category || record.note || category
    }
  })

  const total = sumMoney(Object.values(totals))
  const categories = Object.entries(totals)
    .map(([category, value]) => ({
      category,
      name: category,
      value,
      count: counts[category] || 0,
      share: total > 0 ? value / total : 0,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other,
      example: examples[category],
    }))
    .sort((a, b) => b.value - a.value)

  const count = records.length
  const lowConfidenceShare = total > 0 ? confidenceTotals.low / total : 0
  const dataConfidence =
    count === 0 ? 'none' : count < 3 || total <= 0 ? 'low' : count < 6 || lowConfidenceShare > 0.35 ? 'moderate' : 'high'

  return {
    records,
    categories,
    totals,
    counts,
    total,
    count,
    confidenceTotals,
    lowConfidenceShare,
    dataConfidence,
  }
}

export function getCategoryTotal(aggregation, category) {
  return safeAmount(aggregation?.totals?.[category])
}

export function categoryColor(category) {
  return getFinanceColor(category)
}
