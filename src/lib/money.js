const PAISE_PER_RUPEE = 100
const supportedCurrencies = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD'])
const currencyLocales = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AED: 'en-AE',
  AUD: 'en-AU',
  CAD: 'en-CA',
}
let activeCurrency = 'INR'

export function normalizeCurrency(value) {
  const currency = String(value || '').trim().toUpperCase()
  return supportedCurrencies.has(currency) ? currency : 'INR'
}

export function setActiveCurrency(value) {
  activeCurrency = normalizeCurrency(value)
}

export function getActiveCurrency() {
  return activeCurrency
}

export function getCurrencySymbol(value = activeCurrency) {
  const currency = normalizeCurrency(value)
  return new Intl.NumberFormat(currencyLocales[currency] || 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(0)
    .replace(/[0-9,.\s-]/g, '')
}

function parseMoney(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const clean = String(value ?? '')
    .replace(/[₹,\s]/g, '')
    .replace(/rs\.?|inr/gi, '')
    .trim()

  if (!clean) {
    return 0
  }

  const amount = Number(clean)
  return Number.isFinite(amount) ? amount : 0
}

export function toPaise(value, { allowNegative = false } = {}) {
  const amount = parseMoney(value)
  const paise = Math.round(amount * PAISE_PER_RUPEE)

  if (!Number.isFinite(paise)) {
    return 0
  }

  return allowNegative ? paise : Math.max(paise, 0)
}

export function fromPaise(paise) {
  const amount = Number(paise)
  return Number.isFinite(amount) ? amount / PAISE_PER_RUPEE : 0
}

export function normalizeMoney(value, options = {}) {
  return fromPaise(toPaise(value, options))
}

export function addMoney(...values) {
  return fromPaise(values.reduce((total, value) => total + toPaise(value), 0))
}

export function subtractMoney(value, ...deductions) {
  const result = deductions.reduce((total, item) => total - toPaise(item), toPaise(value))
  return fromPaise(Math.max(result, 0))
}

export function multiplyMoney(value, factor) {
  const multiplier = Number(factor)

  if (!Number.isFinite(multiplier)) {
    return 0
  }

  return fromPaise(Math.round(toPaise(value) * multiplier))
}

export function divideMoney(value, divisor) {
  const cleanDivisor = Number(divisor)

  if (!Number.isFinite(cleanDivisor) || cleanDivisor <= 0) {
    return 0
  }

  return fromPaise(Math.round(toPaise(value) / cleanDivisor))
}

export function sumMoney(values = [], getter = (item) => item) {
  return fromPaise(values.reduce((total, item) => total + toPaise(getter(item)), 0))
}

export function allocateMoney(value, parts) {
  const count = Math.max(Math.floor(Number(parts || 0)), 0)

  if (count <= 0) {
    return []
  }

  const totalPaise = toPaise(value)
  const base = Math.floor(totalPaise / count)
  let remainder = totalPaise - base * count

  return Array.from({ length: count }, () => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return fromPaise(base + extra)
  })
}

export function formatRupees(value) {
  const amount = normalizeMoney(value, { allowNegative: true })
  const hasPaise = Math.abs(toPaise(amount, { allowNegative: true })) % PAISE_PER_RUPEE !== 0
  const currency = normalizeCurrency(activeCurrency)

  return new Intl.NumberFormat(currencyLocales[currency] || 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(amount)
}
