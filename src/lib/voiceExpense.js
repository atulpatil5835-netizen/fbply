import { normalizeMoney } from './money.js'

export const voiceLanguageOptions = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'mr-IN', label: 'Marathi' },
]

export const voiceCategoryOptions = [
  'Food',
  'Grocery',
  'Fuel',
  'Travel',
  'Shopping',
  'Subscription',
  'Loan',
  'Housing',
  'Medical',
  'Entertainment',
  'Education',
  'Personal',
  'Other',
]

const digitMap = {
  '\u0966': '0',
  '\u0967': '1',
  '\u0968': '2',
  '\u0969': '3',
  '\u096a': '4',
  '\u096b': '5',
  '\u096c': '6',
  '\u096d': '7',
  '\u096e': '8',
  '\u096f': '9',
}

const numberWords = new Map(
  Object.entries({
    zero: 0,
    shunya: 0,
    '\u0936\u0942\u0928\u094d\u092f': 0,
    one: 1,
    ek: 1,
    eka: 1,
    '\u090f\u0915': 1,
    two: 2,
    do: 2,
    don: 2,
    '\u0926\u094b': 2,
    '\u0926\u094b\u0928': 2,
    three: 3,
    teen: 3,
    tin: 3,
    '\u0924\u0940\u0928': 3,
    four: 4,
    chaar: 4,
    char: 4,
    '\u091a\u093e\u0930': 4,
    five: 5,
    paanch: 5,
    panch: 5,
    pach: 5,
    '\u092a\u093e\u0901\u091a': 5,
    '\u092a\u093e\u0902\u091a': 5,
    '\u092a\u093e\u091a': 5,
    six: 6,
    chhe: 6,
    che: 6,
    saha: 6,
    '\u091b\u0939': 6,
    '\u091b': 6,
    '\u0938\u0939\u093e': 6,
    seven: 7,
    saat: 7,
    '\u0938\u093e\u0924': 7,
    eight: 8,
    aath: 8,
    '\u0906\u0920': 8,
    nine: 9,
    nau: 9,
    '\u0928\u094c': 9,
    '\u0928\u090a': 9,
    ten: 10,
    das: 10,
    dus: 10,
    daha: 10,
    '\u0926\u0938': 10,
    '\u0926\u0939\u093e': 10,
    eleven: 11,
    gyarah: 11,
    akra: 11,
    '\u0917\u094d\u092f\u093e\u0930\u0939': 11,
    '\u0905\u0915\u0930\u093e': 11,
    twelve: 12,
    bara: 12,
    '\u092c\u093e\u0930\u0939': 12,
    '\u092c\u093e\u0930\u093e': 12,
    thirteen: 13,
    tera: 13,
    '\u0924\u0947\u0930\u093e': 13,
    fourteen: 14,
    chaudah: 14,
    chauda: 14,
    '\u091a\u094c\u0926\u0939': 14,
    '\u091a\u094c\u0926\u093e': 14,
    fifteen: 15,
    pandrah: 15,
    pandhra: 15,
    '\u092a\u0902\u0926\u094d\u0930\u0939': 15,
    '\u092a\u0902\u0927\u0930\u093e': 15,
    sixteen: 16,
    solah: 16,
    sola: 16,
    '\u0938\u094b\u0932\u0939': 16,
    '\u0938\u094b\u0933\u093e': 16,
    seventeen: 17,
    satrah: 17,
    satra: 17,
    '\u0938\u0924\u094d\u0930\u0939': 17,
    '\u0938\u0924\u0930\u093e': 17,
    eighteen: 18,
    atharah: 18,
    athra: 18,
    '\u0905\u0920\u093e\u0930\u0939': 18,
    '\u0905\u0920\u0930\u093e': 18,
    nineteen: 19,
    unnis: 19,
    ekonis: 19,
    '\u0909\u0928\u094d\u0928\u0940\u0938': 19,
    '\u090f\u0915\u094b\u0923\u0940\u0938': 19,
    twenty: 20,
    bees: 20,
    vees: 20,
    '\u092c\u0940\u0938': 20,
    '\u0935\u0940\u0938': 20,
    thirty: 30,
    tees: 30,
    tis: 30,
    '\u0924\u0940\u0938': 30,
    forty: 40,
    chalis: 40,
    chalice: 40,
    '\u091a\u093e\u0932\u0940\u0938': 40,
    '\u091a\u093e\u0933\u0940\u0938': 40,
    fifty: 50,
    pachas: 50,
    pannas: 50,
    '\u092a\u091a\u093e\u0938': 50,
    '\u092a\u0928\u094d\u0928\u093e\u0938': 50,
    sixty: 60,
    saath: 60,
    sath: 60,
    '\u0938\u093e\u0920': 60,
    seventy: 70,
    sattar: 70,
    '\u0938\u0924\u094d\u0924\u0930': 70,
    eighty: 80,
    assi: 80,
    ainshi: 80,
    '\u0905\u0938\u094d\u0938\u0940': 80,
    '\u0910\u0902\u0936\u0940': 80,
    ninety: 90,
    nabbe: 90,
    navvad: 90,
    '\u0928\u092c\u094d\u092c\u0947': 90,
    '\u0928\u0935\u094d\u0935\u0926': 90,
  }),
)

const multipliers = new Map(
  Object.entries({
    hundred: 100,
    sau: 100,
    she: 100,
    shambhar: 100,
    '\u0938\u094c': 100,
    '\u0936\u0947': 100,
    '\u0936\u0902\u092d\u0930': 100,
    thousand: 1000,
    hazar: 1000,
    hazaar: 1000,
    '\u0939\u091c\u093e\u0930': 1000,
    '\u0939\u095b\u093e\u0930': 1000,
    lakh: 100000,
    lac: 100000,
    '\u0932\u093e\u0916': 100000,
  }),
)

const fillerWords = new Set([
  'rs',
  'inr',
  'rupee',
  'rupees',
  'rupaye',
  'rupaya',
  '\u0930\u0941\u092a\u092f\u0947',
  '\u0930\u0941\u092a\u092f\u093e',
  '\u0930\u0941',
  'paid',
  'pay',
  'spent',
  'expense',
  'for',
  'on',
  'ka',
  'ke',
  'ki',
  'ko',
  'se',
  'ne',
  'la',
  'madhe',
  '\u0915\u093e',
  '\u0915\u0947',
  '\u0915\u0940',
  '\u0915\u094b',
  '\u0938\u0947',
  '\u0928\u0947',
  '\u0932\u093e',
  '\u091a\u0947',
  '\u091a\u093e',
  '\u091a\u0940',
  '\u0916\u0930\u094d\u091a',
])

const labelAliases = new Map(
  Object.entries({
    '\u0916\u093e\u0928\u093e': 'Food',
    '\u091c\u0947\u0935\u0923': 'Food',
    khana: 'Food',
    food: 'Food',
    zomato: 'Zomato',
    swiggy: 'Swiggy',
    milk: 'Milk',
    '\u0926\u0942\u0927': 'Milk',
    petrol: 'Petrol',
    '\u092a\u0947\u091f\u094d\u0930\u094b\u0932': 'Petrol',
    diesel: 'Diesel',
    fuel: 'Fuel',
    rent: 'Rent',
    bhade: 'Rent',
    kiraya: 'Rent',
    '\u092d\u093e\u0921\u0947': 'Rent',
    '\u092d\u093e\u0921\u0902': 'Rent',
    '\u0915\u093f\u0930\u093e\u092f\u093e': 'Rent',
    emi: 'EMI',
    loan: 'Loan',
    internet: 'Internet',
    wifi: 'Internet',
    broadband: 'Internet',
    '\u0928\u0947\u091f': 'Internet',
    netflix: 'Netflix',
    prime: 'Prime',
    shopping: 'Shopping',
    medical: 'Medical',
    dawa: 'Medical',
    medicine: 'Medical',
    '\u0926\u0935\u093e': 'Medical',
    hotel: 'Hotel',
    trip: 'Trip',
  }),
)

const categoryRules = [
  {
    category: 'Fuel',
    keywords: ['petrol', 'diesel', 'fuel', 'cng', '\u092a\u0947\u091f\u094d\u0930\u094b\u0932'],
  },
  {
    category: 'Food',
    keywords: ['food', 'khana', 'zomato', 'swiggy', 'restaurant', 'tea', 'coffee', '\u0916\u093e\u0928\u093e', '\u091c\u0947\u0935\u0923'],
  },
  {
    category: 'Grocery',
    keywords: ['milk', 'doodh', 'grocery', 'groceries', 'kirana', 'ration', 'vegetable', 'vegetables', '\u0926\u0942\u0927', '\u0915\u093f\u0930\u093e\u0928\u093e'],
  },
  {
    category: 'Subscription',
    keywords: ['netflix', 'prime', 'hotstar', 'spotify', 'internet', 'wifi', 'broadband', 'subscription', 'recharge', '\u0928\u0947\u091f'],
  },
  {
    category: 'Loan',
    keywords: ['emi', 'loan', 'installment', 'instalment', 'finance', 'credit'],
  },
  {
    category: 'Housing',
    keywords: ['rent', 'house', 'home', 'flat', 'kiraya', 'bhade', '\u092d\u093e\u0921\u0947', '\u092d\u093e\u0921\u0902', '\u0915\u093f\u0930\u093e\u092f\u093e'],
  },
  {
    category: 'Travel',
    keywords: ['trip', 'hotel', 'cab', 'ola', 'uber', 'train', 'bus', 'flight', 'travel', 'parking'],
  },
  {
    category: 'Shopping',
    keywords: ['shopping', 'amazon', 'flipkart', 'myntra', 'clothes', 'dress', 'shoes'],
  },
  {
    category: 'Medical',
    keywords: ['medical', 'medicine', 'doctor', 'hospital', 'pharmacy', 'dawa', '\u0926\u0935\u093e'],
  },
  {
    category: 'Entertainment',
    keywords: ['movie', 'cinema', 'game', 'entertainment', 'party'],
  },
  {
    category: 'Education',
    keywords: ['school', 'college', 'course', 'book', 'books', 'fees', 'tuition'],
  },
]

function normalizeDigits(value) {
  return String(value).replace(/[\u0966-\u096f]/g, (digit) => digitMap[digit] || digit)
}

function cleanToken(token) {
  return normalizeDigits(token)
    .toLowerCase()
    .replace(/[\u20b9,]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}.]+/gu, '')
    .replace(/^(rs|inr|rupees?)/, '')
    .replace(/(rs|inr|rupees?)$/, '')
}

function isCompactNumber(token) {
  return /^\d+(?:\.\d{1,2})?(?:k|l|lac|lakh)?$/.test(token)
}

function isNumberToken(token) {
  return isCompactNumber(token) || numberWords.has(token) || multipliers.has(token)
}

function tokenValue(token) {
  if (/^\d+(?:\.\d{1,2})?$/.test(token)) {
    return Number(token)
  }

  const compactMatch = token.match(/^(\d+(?:\.\d{1,2})?)(k|l|lac|lakh)$/)
  if (compactMatch) {
    const value = Number(compactMatch[1])
    const suffix = compactMatch[2]
    return value * (suffix === 'k' ? 1000 : 100000)
  }

  return numberWords.get(token)
}

function parseNumberTokens(tokens) {
  let total = 0
  let current = 0
  let usedMultiplier = false

  tokens.forEach((token) => {
    const compactValue = tokenValue(token)

    if (Number.isFinite(compactValue)) {
      current += compactValue
      return
    }

    const multiplier = multipliers.get(token)

    if (multiplier) {
      usedMultiplier = true
      current = Math.max(current, 1) * multiplier
      if (multiplier >= 1000) {
        total += current
        current = 0
      }
    }
  })

  return {
    amount: normalizeMoney(total + current),
    usedMultiplier,
    hasDigit: tokens.some((token) => /^\d/.test(token)),
  }
}

function titleCase(value) {
  const cleanValue = String(value || '').trim()
  if (!cleanValue) {
    return ''
  }

  return cleanValue
    .split(/\s+/)
    .map((part) => {
      const alias = labelAliases.get(part)
      if (alias) {
        return alias
      }

      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

export function normalizeVoiceLabelKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function labelFromTokens(tokens, amountStart, amountEnd) {
  const labelTokens = tokens
    .filter((item, index) => index < amountStart || index > amountEnd)
    .map((item) => item.clean)
    .filter((token) => token && !fillerWords.has(token))

  if (labelTokens.length === 0) {
    return ''
  }

  const exactAlias = labelTokens.map((token) => labelAliases.get(token)).find(Boolean)
  if (exactAlias && labelTokens.length === 1) {
    return exactAlias
  }

  return titleCase(labelTokens.join(' '))
}

function memoryCategoryForLabel(label, memory) {
  const key = normalizeVoiceLabelKey(label)
  const memoryItem = memory?.[key]

  if (!memoryItem?.category) {
    return null
  }

  return {
    category: memoryItem.category,
    confidence: memoryItem.count > 1 ? 'high' : 'medium',
    source: 'memory',
  }
}

function categoryFromRules(label, cleanTranscript) {
  const labelKey = normalizeVoiceLabelKey(label)
  const transcriptKey = normalizeVoiceLabelKey(cleanTranscript)
  const tokenSet = new Set(labelKey.split(/\s+/).filter(Boolean))
  let best = { category: 'Other', score: 0, keyword: '' }

  categoryRules.forEach((rule) => {
    rule.keywords.forEach((keyword) => {
      const key = normalizeVoiceLabelKey(cleanToken(keyword))

      if (!key) {
        return
      }

      let score = 0

      if (labelKey === key || tokenSet.has(key)) {
        score = 4
      } else if (labelKey.includes(key) && key.length > 2) {
        score = 3
      } else if (transcriptKey.includes(key) && key.length > 2) {
        score = 2
      }

      if (score > best.score) {
        best = { category: rule.category, score, keyword: key }
      }
    })
  })

  if (best.score >= 4) {
    return { category: best.category, confidence: 'high', source: best.keyword }
  }

  if (best.score >= 2) {
    return { category: best.category, confidence: 'medium', source: best.keyword }
  }

  return { category: 'Other', confidence: 'low', source: 'fallback' }
}

function confidenceFrom({ amountInfo, categoryConfidence, label }) {
  const amountConfidence = amountInfo.hasDigit || amountInfo.usedMultiplier ? 'high' : 'medium'
  const labelConfidence = label ? 'high' : 'low'
  const score =
    (amountConfidence === 'high' ? 2 : 1) +
    (categoryConfidence === 'high' ? 2 : categoryConfidence === 'medium' ? 1 : 0) +
    (labelConfidence === 'high' ? 1 : 0)

  if (score >= 5) {
    return { confidence: 'high', amountConfidence, labelConfidence, score }
  }

  if (score >= 3) {
    return { confidence: 'medium', amountConfidence, labelConfidence, score }
  }

  return { confidence: 'review', amountConfidence, labelConfidence, score }
}

export function parseVoiceExpense(transcript, memory = {}) {
  const cleanTranscript = normalizeDigits(transcript || '').trim()
  const tokens = cleanTranscript
    .split(/\s+/)
    .map((raw) => ({ raw, clean: cleanToken(raw) }))
    .filter((item) => item.clean)

  if (tokens.length === 0) {
    return null
  }

  const sequences = []
  let current = []
  let start = 0

  tokens.forEach((item, index) => {
    if (isNumberToken(item.clean)) {
      if (current.length === 0) {
        start = index
      }
      current.push(item.clean)
      return
    }

    if (current.length > 0) {
      sequences.push({ start, end: index - 1, tokens: current })
      current = []
    }
  })

  if (current.length > 0) {
    sequences.push({ start, end: tokens.length - 1, tokens: current })
  }

  const amountSequence = sequences
    .map((sequence) => ({ ...sequence, ...parseNumberTokens(sequence.tokens) }))
    .filter((sequence) => sequence.amount > 0)
    .at(-1)

  if (!amountSequence) {
    return null
  }

  const label = labelFromTokens(tokens, amountSequence.start, amountSequence.end)
  if (!label) {
    return null
  }

  const memoryCategory = memoryCategoryForLabel(label, memory)
  const categoryMatch = memoryCategory || categoryFromRules(label, cleanTranscript)
  const confidenceInfo = confidenceFrom({
    amountInfo: amountSequence,
    categoryConfidence: categoryMatch.confidence,
    label,
  })

  return {
    transcript: cleanTranscript,
    amount: Math.round(amountSequence.amount),
    label,
    category: categoryMatch.category,
    categoryConfidence: categoryMatch.confidence,
    confidence: confidenceInfo.confidence,
    confidenceScore: confidenceInfo.score,
    source: categoryMatch.source,
    canQuickSave: confidenceInfo.confidence === 'high' && categoryMatch.category !== 'Other',
  }
}

export function learnVoiceExpense(memory, draft) {
  const labelKey = normalizeVoiceLabelKey(draft?.label)
  const category = String(draft?.category || '').trim()

  if (!labelKey || !category) {
    return memory || {}
  }

  const current = memory?.[labelKey] || {}

  return {
    ...(memory || {}),
    [labelKey]: {
      label: draft.label,
      category,
      amount: normalizeMoney(draft.amount || current.amount || 0),
      count: Number(current.count || 0) + 1,
      updatedAt: new Date().toISOString(),
    },
  }
}
