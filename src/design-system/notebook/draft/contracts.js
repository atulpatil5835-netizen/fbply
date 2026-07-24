import { freeze } from '../internal/freeze.js'

let draftIdCounter = 0

export const notebookDraftSessionStatus = freeze({
  active: 'active',
  destroyed: 'destroyed',
})

export const notebookDraftSource = freeze({
  notebook: 'notebook',
  manual: 'manual',
  voice: 'voice',
  ocr: 'ocr',
  scanner: 'scanner',
  template: 'template',
  quickAction: 'quickAction',
  smartSuggestion: 'smartSuggestion',
  receiptImport: 'receiptImport',
  ai: 'ai',
  unknown: 'unknown',
})

export const notebookIntentStatus = freeze({
  unresolved: 'unresolved',
  skipped: 'skipped',
  blocked: 'blocked',
  resolved: 'resolved',
  failed: 'failed',
})

export const notebookIntentConfidence = freeze({
  none: 'none',
  low: 'low',
  medium: 'medium',
  high: 'high',
})

export const notebookValidationSeverity = freeze({
  info: 'info',
  warning: 'warning',
  error: 'error',
})

export function createNotebookDraftId(prefix = 'draft') {
  draftIdCounter += 1

  return `${prefix}-${Date.now().toString(36)}-${draftIdCounter.toString(36)}`
}

export function createNotebookTimestamp() {
  return new Date().toISOString()
}

export function normalizeDraftText(text = '') {
  return String(text ?? '')
}

export function normalizeDraftSource(source = notebookDraftSource.notebook) {
  return Object.values(notebookDraftSource).includes(source) ? source : notebookDraftSource.unknown
}
