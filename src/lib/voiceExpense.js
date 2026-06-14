import { normalizeMoney } from './money.js'

export const voiceCategoryOptions = [
  'Food',
  'Grocery',
  'Fuel',
  'Transport',
  'Travel',
  'Shopping',
  'Subscription',
  'Bills',
  'Loan',
  'Housing',
  'Medical',
  'Entertainment',
  'Education',
  'Personal',
  'Income',
  'Refund',
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
    barah: 12,
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
    panchshe: 500,
    paachshe: 500,
    pachshe: 500,
    panchso: 500,
    paanchso: 500,
    '\u092a\u093e\u091a\u0936\u0947': 500,
    '\u092a\u093e\u0902\u091a\u0938\u094b': 500,
    atharasau: 1800,
    athrasau: 1800,
    atharahsau: 1800,
    atharashe: 1800,
    athrashe: 1800,
    barahsau: 1200,
    barashe: 1200,
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
  'kharch',
  'kharach',
  'gaye',
  'gaya',
  'hue',
  'hua',
  'li',
  'liya',
  'liye',
  'aayi',
  'aaya',
  'received',
  'mila',
  'mili',
  'today',
  'yesterday',
  'aaj',
  'aj',
  'kal',
  'parso',
  'morning',
  'night',
  'last',
  'this',
  'for',
  'on',
  'pe',
  'per',
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
  '\u0906\u091c',
  '\u0915\u0932',
  '\u0906\u091c\u091a\u093e',
  '\u0906\u091c\u091a\u0947',
  '\u0906\u091c\u091a\u0940',
  '\u091a\u0947',
  '\u091a\u093e',
  '\u091a\u0940',
  '\u0916\u0930\u094d\u091a',
  '\u0917\u092f\u0947',
  '\u0917\u092f\u093e',
  '\u0932\u0940',
  '\u0918\u0947\u0924\u0932\u0940',
  '\u092e\u093f\u0933\u093e\u0932\u0947',
])

const labelAliases = new Map(
  Object.entries({
    '\u0916\u093e\u0928\u093e': 'Food',
    '\u091c\u0947\u0935\u0923': 'Food',
    khana: 'Food',
    food: 'Food',
    lunch: 'Lunch',
    dinner: 'Dinner',
    breakfast: 'Breakfast',
    meal: 'Meal',
    tea: 'Tea',
    chai: 'Tea',
    chaha: 'Tea',
    coffee: 'Coffee',
    '\u091a\u093e\u092f': 'Tea',
    '\u091a\u0939\u093e': 'Tea',
    snack: 'Snacks',
    snacks: 'Snacks',
    nashta: 'Snacks',
    '\u0928\u093e\u0936\u094d\u0924\u093e': 'Snacks',
    grocery: 'Grocery',
    groceries: 'Grocery',
    kirana: 'Kirana',
    dmart: 'Dmart',
    'd-mart': 'Dmart',
    reliance: 'Reliance',
    fresh: 'Fresh',
    big: 'Big',
    bazaar: 'Bazaar',
    '\u0915\u093f\u0930\u093e\u0928\u093e': 'Kirana',
    zomato: 'Zomato',
    swiggy: 'Swiggy',
    milk: 'Milk',
    '\u0926\u0942\u0927': 'Milk',
    petrol: 'Petrol',
    '\u092a\u0947\u091f\u094d\u0930\u094b\u0932': 'Petrol',
    diesel: 'Diesel',
    fuel: 'Fuel',
    uber: 'Uber',
    ola: 'Ola',
    bus: 'Bus',
    cab: 'Cab',
    taxi: 'Taxi',
    auto: 'Auto',
    rickshaw: 'Rickshaw',
    metro: 'Metro',
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
    jio: 'Jio',
    airtel: 'Airtel',
    electricity: 'Electricity',
    bijli: 'Electricity',
    bill: 'Bill',
    mobile: 'Mobile',
    recharge: 'Recharge',
    netflix: 'Netflix',
    prime: 'Prime',
    spotify: 'Spotify',
    amazon: 'Amazon',
    flipkart: 'Flipkart',
    movie: 'Movie',
    cinema: 'Cinema',
    shopping: 'Shopping',
    medical: 'Medical',
    dawa: 'Medical',
    medicine: 'Medical',
    '\u0926\u0935\u093e': 'Medical',
    hotel: 'Hotel',
    trip: 'Trip',
    salary: 'Salary',
    income: 'Income',
    freelance: 'Freelance',
    bonus: 'Bonus',
    commission: 'Commission',
    refund: 'Refund',
    cashback: 'Cashback',
    reward: 'Reward',
  }),
)

const merchantRules = [
  {
    merchant: 'Swiggy',
    category: 'Food',
    aliases: ['swiggy'],
  },
  {
    merchant: 'Zomato',
    category: 'Food',
    aliases: ['zomato'],
  },
  {
    merchant: 'Uber',
    category: 'Transport',
    aliases: ['uber'],
  },
  {
    merchant: 'Ola',
    category: 'Transport',
    aliases: ['ola'],
  },
  {
    merchant: 'Amazon',
    category: 'Shopping',
    aliases: ['amazon'],
  },
  {
    merchant: 'Flipkart',
    category: 'Shopping',
    aliases: ['flipkart'],
  },
  {
    merchant: 'Netflix',
    category: 'Subscription',
    aliases: ['netflix'],
  },
  {
    merchant: 'Spotify',
    category: 'Subscription',
    aliases: ['spotify'],
  },
  {
    merchant: 'Jio',
    category: 'Bills',
    aliases: ['jio', 'jio recharge'],
  },
  {
    merchant: 'Airtel',
    category: 'Bills',
    aliases: ['airtel', 'airtel recharge'],
  },
  {
    merchant: 'Dmart',
    category: 'Grocery',
    aliases: ['dmart', 'd mart', 'd-mart'],
  },
  {
    merchant: 'Reliance Fresh',
    category: 'Grocery',
    aliases: ['reliance fresh'],
  },
  {
    merchant: 'Big Bazaar',
    category: 'Grocery',
    aliases: ['big bazaar'],
  },
]

const categoryRules = [
  {
    category: 'Fuel',
    keywords: ['petrol', 'diesel', 'fuel', 'cng', '\u092a\u0947\u091f\u094d\u0930\u094b\u0932'],
  },
  {
    category: 'Transport',
    keywords: ['uber', 'ola', 'cab', 'taxi', 'auto', 'rickshaw', 'metro', 'train', 'bus', 'transport', 'commute', 'parking', 'toll'],
  },
  {
    category: 'Food',
    keywords: ['food', 'khana', 'meal', 'lunch', 'dinner', 'breakfast', 'zomato', 'swiggy', 'restaurant', 'cafe', 'tea', 'chai', 'chaha', 'coffee', 'snack', 'snacks', 'nashta', '\u0916\u093e\u0928\u093e', '\u091c\u0947\u0935\u0923', '\u091a\u093e\u092f', '\u091a\u0939\u093e', '\u0928\u093e\u0936\u094d\u0924\u093e'],
  },
  {
    category: 'Grocery',
    keywords: ['milk', 'doodh', 'grocery', 'groceries', 'kirana', 'ration', 'vegetable', 'vegetables', 'fruit', 'fruits', 'sabji', 'bhaji', '\u0926\u0942\u0927', '\u0915\u093f\u0930\u093e\u0928\u093e', '\u092d\u093e\u091c\u0940'],
  },
  {
    category: 'Bills',
    keywords: ['bill', 'bills', 'electricity', 'bijli', 'power', 'water', 'utility', 'utilities', 'mobile', 'recharge', 'postpaid', 'prepaid', 'phone', 'gas'],
  },
  {
    category: 'Subscription',
    keywords: ['netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'internet', 'wifi', 'broadband', 'subscription', '\u0928\u0947\u091f'],
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

const incomeRules = [
  {
    category: 'Income',
    confidence: 'high',
    keywords: ['salary', 'income', 'freelance', 'bonus', 'commission'],
  },
  {
    category: 'Income',
    confidence: 'high',
    keywords: ['payment received', 'received payment', 'money received', 'payment aayi', 'payment aaya'],
  },
  {
    category: 'Income',
    confidence: 'medium',
    keywords: ['received', 'aayi', 'aaya', 'mila', 'mili'],
  },
  {
    category: 'Refund',
    confidence: 'high',
    keywords: ['refund', 'cashback', 'reward'],
  },
]

const connectorWords = new Set([
  'and',
  'aur',
  'ani',
  '\u0914\u0930',
  '\u0906\u0923\u093f',
])

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

function memoryCategoryForLabel(label, memory) {
  const key = normalizeVoiceLabelKey(label)
  const memoryItem = memory?.[key]

  if (!memoryItem?.category) {
    return null
  }

  const learningSource = String(memoryItem.learningSource || memoryItem.source || '').trim()
  const isUserDefined = ['manual', 'user', 'correction'].includes(learningSource)

  return {
    category: memoryItem.category,
    confidence: isUserDefined || memoryItem.count > 1 ? 'high' : 'medium',
    source: 'learned_merchant',
    reason: 'Learned Merchant',
    merchant: memoryItem.merchant || memoryItem.label || label,
    matchedTerm: key,
  }
}

function knownMerchantForText(text) {
  const textKey = normalizeVoiceLabelKey(text)

  if (!textKey) {
    return null
  }

  let best = null

  merchantRules.forEach((rule) => {
    rule.aliases.forEach((alias) => {
      const aliasKey = normalizeVoiceLabelKey(alias)

      if (!aliasKey || !` ${textKey} `.includes(` ${aliasKey} `)) {
        return
      }

      const score = aliasKey.split(/\s+/).length * 2 + aliasKey.length / 100

      if (!best || score > best.score) {
        best = {
          category: rule.category,
          confidence: 'high',
          source: 'known_merchant',
          reason: 'Known Merchant',
          merchant: rule.merchant,
          matchedTerm: aliasKey,
          score,
        }
      }
    })
  })

  return best
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
    return {
      category: best.category,
      confidence: 'high',
      source: 'keyword_match',
      reason: 'Keyword Match',
      matchedTerm: best.keyword,
    }
  }

  if (best.score >= 2) {
    return {
      category: best.category,
      confidence: 'medium',
      source: 'keyword_match',
      reason: 'Keyword Match',
      matchedTerm: best.keyword,
    }
  }

  return {
    category: 'Other',
    confidence: 'low',
    source: 'fallback',
    reason: 'Low Confidence',
    matchedTerm: '',
  }
}

function detectIncome(cleanTranscript, label) {
  const transcriptKey = normalizeVoiceLabelKey(cleanTranscript)
  const labelKey = normalizeVoiceLabelKey(label)
  const searchable = `${labelKey} ${transcriptKey}`.trim()
  let best = null

  incomeRules.forEach((rule) => {
    rule.keywords.forEach((keyword) => {
      const key = normalizeVoiceLabelKey(keyword)

      if (!key || !` ${searchable} `.includes(` ${key} `)) {
        return
      }

      const score = rule.confidence === 'high' ? 2 : 1
      if (!best || score > best.score) {
        best = {
          type: 'income',
          category: rule.category,
          confidence: rule.confidence,
          source: 'income_keyword',
          reason: 'Income Keyword',
          matchedTerm: key,
          score,
        }
      }
    })
  })

  return best
}

function confidenceFrom({ amountInfo, categoryConfidence, label, type = 'daily', dateInfo }) {
  const amountConfidence = amountInfo.hasDigit || amountInfo.usedMultiplier ? 'high' : 'medium'
  const labelConfidence = label ? 'high' : 'low'
  const score =
    (amountConfidence === 'high' ? 2 : 1) +
    (categoryConfidence === 'high' ? 2 : categoryConfidence === 'medium' ? 1 : 0) +
    (labelConfidence === 'high' ? 1 : 0) +
    (type === 'income' ? 1 : 0) +
    (dateInfo?.source && dateInfo.source !== 'default' ? 1 : 0)

  if (score >= 5) {
    return { confidence: 'high', amountConfidence, labelConfidence, score }
  }

  if (score >= 3) {
    return { confidence: 'medium', amountConfidence, labelConfidence, score }
  }

  return { confidence: 'low', amountConfidence, labelConfidence, score }
}

function tokenizeTranscript(value) {
  return String(value || '')
    .split(/\s+/)
    .map((raw) => ({ raw, clean: cleanToken(raw) }))
    .filter((item) => item.clean)
}

function amountSequencesFromTokens(tokens) {
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

  return sequences
    .map((sequence) => ({ ...sequence, ...parseNumberTokens(sequence.tokens) }))
    .filter((sequence) => sequence.amount > 0)
}

function isLabelToken(token) {
  return Boolean(token) && !fillerWords.has(token) && !connectorWords.has(token) && !isNumberToken(token)
}

function labelSignalScore(tokens) {
  const label = titleCase(tokens.filter(isLabelToken).join(' '))

  if (!label) {
    return 0
  }

  const category = categoryFromRules(label, label)
  const income = detectIncome(label, label)

  return (category.category !== 'Other' ? 2 : 0) + (income ? 2 : 0) + (tokens.length > 0 ? 1 : 0)
}

function labelFromCandidateTokens(tokens) {
  const labelTokens = tokens.filter(isLabelToken)

  if (labelTokens.length === 0) {
    return ''
  }

  const exactAlias = labelTokens.map((token) => labelAliases.get(token)).find(Boolean)
  if (exactAlias && labelTokens.length === 1) {
    return exactAlias
  }

  return titleCase(labelTokens.join(' '))
}

function labelFromAmountContext(tokens, amountStart, amountEnd) {
  const beforeTokens = tokens.slice(0, amountStart).map((item) => item.clean)
  const afterTokens = tokens.slice(amountEnd + 1).map((item) => item.clean)
  const beforeScore = labelSignalScore(beforeTokens)
  const afterScore = labelSignalScore(afterTokens)

  if (beforeScore > 0 && beforeScore >= afterScore) {
    return labelFromCandidateTokens(beforeTokens)
  }

  if (afterScore > 0) {
    return labelFromCandidateTokens(afterTokens)
  }

  return labelFromCandidateTokens([...beforeTokens, ...afterTokens])
}

function isoDateWithOffset(offsetDays) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function detectVoiceDate(transcript) {
  const key = normalizeVoiceLabelKey(transcript)

  if (/\blast night\b/.test(key)) {
    return {
      date: isoDateWithOffset(-1),
      dateLabel: 'Last night',
      dateConfidence: 'medium',
      source: 'last_night',
    }
  }

  if (/\bthis morning\b/.test(key)) {
    return {
      date: isoDateWithOffset(0),
      dateLabel: 'This morning',
      dateConfidence: 'high',
      source: 'this_morning',
    }
  }

  if (/\b(today|aaj|aj)\b/.test(key) || key.includes('\u0906\u091c')) {
    return {
      date: isoDateWithOffset(0),
      dateLabel: 'Today',
      dateConfidence: 'high',
      source: 'today',
    }
  }

  if (/\b(yesterday|kal)\b/.test(key) || key.includes('\u0915\u0932')) {
    return {
      date: isoDateWithOffset(-1),
      dateLabel: 'Yesterday',
      dateConfidence: 'medium',
      source: 'yesterday',
    }
  }

  if (/\b(parso|parva)\b/.test(key)) {
    return {
      date: isoDateWithOffset(-2),
      dateLabel: 'Parso',
      dateConfidence: 'low',
      source: 'parso',
    }
  }

  return {
    date: isoDateWithOffset(0),
    dateLabel: 'Today',
    dateConfidence: 'low',
    source: 'default',
  }
}

function splitVoiceClauses(transcript) {
  return String(transcript || '')
    .replace(/[;,]+/g, ' | ')
    .replace(/\s+(?:and|aur|ani|\u0914\u0930|\u0906\u0923\u093f)\s+/giu, ' | ')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseClauseEntries(clause, memory, dateInfo, fullTranscript) {
  const tokens = tokenizeTranscript(clause)

  if (tokens.length === 0) {
    return []
  }

  const amountSequences = amountSequencesFromTokens(tokens)

  return amountSequences
    .map((amountSequence, index) => {
      const previousSequence = amountSequences[index - 1]
      const nextSequence = amountSequences[index + 1]
      const contextStart = previousSequence ? previousSequence.end + 1 : 0
      const contextEnd = nextSequence ? nextSequence.start - 1 : tokens.length - 1
      const contextTokens = tokens.slice(contextStart, contextEnd + 1)
      const localAmountStart = amountSequence.start - contextStart
      const localAmountEnd = amountSequence.end - contextStart
      const label = labelFromAmountContext(contextTokens, localAmountStart, localAmountEnd)

      if (!label) {
        return null
      }

      const clauseText = contextTokens.map((item) => item.raw).join(' ') || clause
      const memoryCategory = memoryCategoryForLabel(label, memory)
      const merchantMatch = knownMerchantForText(`${label} ${clauseText}`)
      const incomeMatch = detectIncome(`${clauseText} ${fullTranscript}`, label)
      const categoryMatch = incomeMatch
        ? {
            category: incomeMatch.category,
            confidence: incomeMatch.confidence,
            source: incomeMatch.source,
            reason: incomeMatch.reason,
            matchedTerm: incomeMatch.matchedTerm,
          }
        : memoryCategory || merchantMatch || categoryFromRules(label, clauseText)
      const type = incomeMatch ? 'income' : 'daily'
      const confidenceInfo = confidenceFrom({
        amountInfo: amountSequence,
        categoryConfidence: categoryMatch.confidence,
        label,
        type,
        dateInfo,
      })

      const parsedEntry = {
        transcript: normalizeDigits(clauseText).trim(),
        fullTranscript: normalizeDigits(fullTranscript).trim(),
        amount: normalizeMoney(amountSequence.amount),
        label,
        category: categoryMatch.category,
        categoryConfidence: categoryMatch.confidence,
        confidence: confidenceInfo.confidence,
        confidenceScore: confidenceInfo.score,
        amountConfidence: confidenceInfo.amountConfidence,
        labelConfidence: confidenceInfo.labelConfidence,
        source: categoryMatch.source,
        categoryReason: categoryMatch.reason,
        matchedTerm: categoryMatch.matchedTerm,
        merchant: categoryMatch.merchant || merchantMatch?.merchant || '',
        type,
        date: dateInfo.date,
        dateLabel: dateInfo.dateLabel,
        dateConfidence: dateInfo.dateConfidence,
        canQuickSave: confidenceInfo.confidence === 'high' && categoryMatch.category !== 'Other',
      }

      return applyVoiceAmountConfidence(parsedEntry)
    })
    .filter(Boolean)
}

export function applyVoiceAmountConfidence(entry = {}) {
  if (!entry || entry.amountConfidence !== 'low') {
    return entry
  }

  return {
    ...entry,
    amount: 0,
    canQuickSave: false,
  }
}

function parseSimpleDescriptionAmount(transcript, memory, dateInfo, fullTranscript) {
  const match = String(transcript || '').trim().match(/^(.+?)\s+(\d+(?:\.\d{1,2})?)$/i)

  if (!match) {
    return null
  }

  const label = titleCase(match[1].trim())
  const amount = normalizeMoney(match[2])

  if (!label || amount <= 0) {
    return null
  }

  const memoryCategory = memoryCategoryForLabel(label, memory)
  const merchantMatch = knownMerchantForText(label)
  const incomeMatch = detectIncome(`${label} ${fullTranscript}`, label)
  const categoryMatch = incomeMatch
    ? {
        category: incomeMatch.category,
        confidence: incomeMatch.confidence,
        source: incomeMatch.source,
        reason: incomeMatch.reason,
        matchedTerm: incomeMatch.matchedTerm,
      }
    : memoryCategory || merchantMatch || categoryFromRules(label, label)
  const type = incomeMatch ? 'income' : 'daily'
  const confidenceInfo = confidenceFrom({
    amountInfo: { amount, hasDigit: true, usedMultiplier: false },
    categoryConfidence: categoryMatch.confidence,
    label,
    type,
    dateInfo,
  })

  return applyVoiceAmountConfidence({
    transcript: normalizeDigits(match[0]).trim(),
    fullTranscript: normalizeDigits(fullTranscript).trim(),
    amount,
    label,
    category: categoryMatch.category,
    categoryConfidence: categoryMatch.confidence,
    confidence: confidenceInfo.confidence,
    confidenceScore: confidenceInfo.score,
    amountConfidence: confidenceInfo.amountConfidence,
    labelConfidence: confidenceInfo.labelConfidence,
    source: categoryMatch.source,
    categoryReason: categoryMatch.reason,
    matchedTerm: categoryMatch.matchedTerm,
    merchant: categoryMatch.merchant || merchantMatch?.merchant || '',
    type,
    date: dateInfo.date,
    dateLabel: dateInfo.dateLabel,
    dateConfidence: dateInfo.dateConfidence,
    canQuickSave: confidenceInfo.confidence === 'high' && categoryMatch.category !== 'Other',
  })
}

export function parseVoiceExpenseEntries(transcript, memory = {}) {
  const cleanTranscript = normalizeDigits(transcript || '').trim()

  if (!cleanTranscript) {
    return []
  }

  const dateInfo = detectVoiceDate(cleanTranscript)
  const clauseEntries = splitVoiceClauses(cleanTranscript)
    .flatMap((clause) => parseClauseEntries(clause, memory, dateInfo, cleanTranscript))

  if (clauseEntries.length > 0) {
    return clauseEntries
  }

  const clauseEntriesFromFull = parseClauseEntries(cleanTranscript, memory, dateInfo, cleanTranscript)

  if (clauseEntriesFromFull.length > 0) {
    return clauseEntriesFromFull
  }

  const simpleEntry = parseSimpleDescriptionAmount(cleanTranscript, memory, dateInfo, cleanTranscript)

  return simpleEntry ? [simpleEntry] : []
}

export function parseVoiceExpense(transcript, memory = {}) {
  const entries = parseVoiceExpenseEntries(transcript, memory)

  if (entries.length === 0) {
    return null
  }

  const best = entries
    .slice()
    .sort((a, b) => {
      if (a.canQuickSave !== b.canQuickSave) {
        return a.canQuickSave ? -1 : 1
      }

      return (b.confidenceScore || 0) - (a.confidenceScore || 0)
    })[0]

  const label = best?.label || ''
  if (!label) {
    return null
  }

  return {
    ...best,
    entries,
    isMultiEntry: entries.length > 1,
  }
}

export function learnVoiceExpense(memory, draft, options = {}) {
  const labelKey = normalizeVoiceLabelKey(draft?.label)
  const category = String(draft?.category || '').trim()

  if (!labelKey || !category) {
    return memory || {}
  }

  const current = memory?.[labelKey] || {}
  const merchant = String(draft?.merchant || current.merchant || draft?.label || '').trim()
  const learningSource = String(options.learningSource || draft?.learningSource || current.learningSource || 'user').trim()

  return {
    ...(memory || {}),
    [labelKey]: {
      label: draft.label,
      merchant,
      category,
      amount: normalizeMoney(draft.amount || current.amount || 0),
      count: Number(current.count || 0) + 1,
      confidence: ['manual', 'user', 'correction'].includes(learningSource) ? 'high' : current.confidence || 'medium',
      learningSource,
      categoryReason: 'Learned Merchant',
      updatedAt: new Date().toISOString(),
    },
  }
}
