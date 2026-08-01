const reportCodes = {
  'expense-history': 'EXP',
  'money-book': 'MBK',
  monthly: 'MON',
  trip: 'TRIP',
  settlement: 'SET',
  statement: 'STM',
}

const reportNames = {
  'expense-history': 'Expense History Report',
  'money-book': 'Borrow/Lend Report',
  monthly: 'Monthly Budget Report',
  trip: 'Trip Report',
  settlement: 'Settlement Report',
  statement: 'Statement Analysis Report',
}

export function reportTypeCode(type) {
  return reportCodes[type] || 'RPT'
}

export function reportTypeName(type) {
  return reportNames[type] || 'Financial Report'
}

export function createReportId(type, period = '') {
  const cleanPeriod = String(period || new Date().toISOString().slice(0, 7)).replace(/[^0-9]/g, '').slice(0, 6)
  const sequence = String(Date.now() % 1000000).padStart(6, '0')

  return `FBP-${reportTypeCode(type)}-${cleanPeriod || '000000'}-${sequence}`
}

export function createReportHistoryEntry({
  type = 'monthly',
  template = 'standard',
  profile = {},
  period = '',
  currency = '',
  reportId = '',
  payload = {},
} = {}) {
  const id = reportId || createReportId(type, period)
  const now = new Date().toISOString()

  return {
    id,
    reportId: id,
    type,
    name: reportTypeName(type),
    template,
    generatedAt: now,
    currency: currency || profile.currency || 'INR',
    period: period || new Date().toISOString().slice(0, 7),
    preparedFor: profile.name || profile.email || 'FBPly user',
    payload,
  }
}

export function normalizeReportHistory(items = []) {
  return Array.isArray(items)
    ? items
      .map((item) => ({
        id: String(item.id || item.reportId || ''),
        reportId: String(item.reportId || item.id || ''),
        type: item.type || 'monthly',
        name: item.name || reportTypeName(item.type),
        template: item.template || 'standard',
        generatedAt: item.generatedAt || new Date().toISOString(),
        currency: item.currency || 'INR',
        period: item.period || '',
        preparedFor: item.preparedFor || 'FBPly user',
        payload: item.payload || {},
      }))
      .filter((item) => item.id && item.reportId)
      .slice(0, 20)
    : []
}
