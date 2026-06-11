const MAX_EXPRESSION_LENGTH = 80

function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const clean = String(value ?? '')
    .replace(/[,\s]/g, '')
    .replace(/[%₹$€£]/g, '')
    .trim()

  if (!clean) {
    return 0
  }

  const number = Number(clean)
  return Number.isFinite(number) ? number : 0
}

function roundValue(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return 0
  }

  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function normalizedExpression(expression = '') {
  return String(expression)
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '')
    .slice(0, MAX_EXPRESSION_LENGTH)
}

function createExpressionParser(source = '') {
  const expression = normalizedExpression(source)
  let index = 0

  function skipSpaces() {
    while (/\s/.test(expression[index])) {
      index += 1
    }
  }

  function peek() {
    skipSpaces()
    return expression[index]
  }

  function consume(char) {
    if (peek() === char) {
      index += 1
      return true
    }

    return false
  }

  function parseNumber() {
    skipSpaces()
    const start = index
    let seenDot = false

    while (index < expression.length) {
      const char = expression[index]

      if (char === '.') {
        if (seenDot) {
          break
        }

        seenDot = true
        index += 1
        continue
      }

      if (!/\d/.test(char)) {
        break
      }

      index += 1
    }

    const raw = expression.slice(start, index)
    const value = Number(raw)

    if (!raw || raw === '.' || !Number.isFinite(value)) {
      throw new Error('Enter a valid calculation.')
    }

    return value
  }

  function parseFactor() {
    skipSpaces()

    if (consume('+')) {
      return parseFactor()
    }

    if (consume('-')) {
      return -parseFactor()
    }

    if (consume('(')) {
      const value = parseExpression()

      if (!consume(')')) {
        throw new Error('Close the bracket to finish the calculation.')
      }

      return value
    }

    return parseNumber()
  }

  function parseTerm() {
    let value = parseFactor()

    while (true) {
      if (consume('*')) {
        value *= parseFactor()
        continue
      }

      if (consume('/')) {
        const divisor = parseFactor()

        if (Math.abs(divisor) < Number.EPSILON) {
          throw new Error('Cannot divide by zero.')
        }

        value /= divisor
        continue
      }

      return value
    }
  }

  function parseExpression() {
    let value = parseTerm()

    while (true) {
      if (consume('+')) {
        value += parseTerm()
        continue
      }

      if (consume('-')) {
        value -= parseTerm()
        continue
      }

      return value
    }
  }

  return {
    parse() {
      if (!expression.trim()) {
        return null
      }

      const value = parseExpression()

      if (peek() !== undefined) {
        throw new Error('Use numbers and basic operators only.')
      }

      if (!Number.isFinite(value)) {
        throw new Error('Enter a valid calculation.')
      }

      return roundValue(value, 4)
    },
  }
}

export function calculateBasicArithmetic(expression = '') {
  try {
    return {
      value: createExpressionParser(expression).parse(),
      error: '',
    }
  } catch (error) {
    return {
      value: null,
      error: error.message || 'Enter a valid calculation.',
    }
  }
}

export function calculateSplitAmount(amount, peopleCount) {
  const total = Math.max(toNumber(amount), 0)
  const people = Math.max(Math.floor(toNumber(peopleCount)), 0)

  return {
    amount: roundValue(total),
    peopleCount: people,
    perPerson: people > 0 ? roundValue(total / people) : 0,
    isReady: total > 0 && people > 0,
  }
}

export function calculatePercentage(value, percentage) {
  const base = toNumber(value)
  const rate = toNumber(percentage)
  const percentageValue = roundValue((base * rate) / 100)

  return {
    value: roundValue(base),
    percentage: roundValue(rate),
    percentageValue,
    increasedValue: roundValue(base + percentageValue),
    reducedValue: roundValue(base - percentageValue),
    isReady: base !== 0 && rate !== 0,
  }
}

export function calculateEmiEstimate(amount, annualInterestRate, tenureMonths) {
  const principal = Math.max(toNumber(amount), 0)
  const annualRate = Math.max(toNumber(annualInterestRate), 0)
  const months = Math.max(Math.floor(toNumber(tenureMonths)), 0)

  if (principal <= 0 || months <= 0) {
    return {
      amount: principal,
      annualInterestRate: annualRate,
      tenureMonths: months,
      emi: 0,
      isReady: false,
    }
  }

  const monthlyRate = annualRate / 12 / 100
  const emi = monthlyRate <= 0
    ? principal / months
    : (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1)

  return {
    amount: roundValue(principal),
    annualInterestRate: roundValue(annualRate, 3),
    tenureMonths: months,
    emi: roundValue(emi),
    isReady: true,
  }
}

export function calculateGst(amount, gstRate) {
  const base = Math.max(toNumber(amount), 0)
  const rate = Math.max(toNumber(gstRate), 0)
  const multiplier = 1 + rate / 100
  const gstAmount = roundValue((base * rate) / 100)
  const amountExcludingGst = multiplier > 0 ? roundValue(base / multiplier) : base

  return {
    amount: roundValue(base),
    gstRate: roundValue(rate, 3),
    gstAmount,
    totalWithGst: roundValue(base + gstAmount),
    amountExcludingGst,
    isReady: base > 0 && rate > 0,
  }
}
