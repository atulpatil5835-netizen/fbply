import { freeze } from '../internal/freeze.js'
import {
  createNotebookDraftId,
  createNotebookTimestamp,
  notebookIntentConfidence,
  notebookIntentStatus,
  normalizeDraftSource,
} from './contracts.js'

export function createIntentContext({
  capabilities = [],
  metadata = {},
  renderTarget = 'screen',
  source = 'notebook',
  timestamp = '',
} = {}) {
  return freeze({
    source: normalizeDraftSource(source),
    renderTarget,
    capabilities: freeze([...capabilities]),
    metadata: freeze({ ...(metadata || {}) }),
    timestamp: timestamp || createNotebookTimestamp(),
  })
}

export function createDraftIntent({
  confidence = notebookIntentConfidence.none,
  context = createIntentContext(),
  id = '',
  metadata = {},
  payload = null,
  source = 'notebook',
  type = 'unknown',
} = {}) {
  return freeze({
    id: id || createNotebookDraftId('intent'),
    type: String(type || 'unknown'),
    source: normalizeDraftSource(source),
    confidence: Object.values(notebookIntentConfidence).includes(confidence)
      ? confidence
      : notebookIntentConfidence.none,
    payload,
    metadata: freeze({ ...(metadata || {}) }),
    context,
  })
}

export function createIntentResult({
  context = createIntentContext(),
  intent = null,
  issues = [],
  metadata = {},
  reason = '',
  status = notebookIntentStatus.unresolved,
} = {}) {
  return freeze({
    status: Object.values(notebookIntentStatus).includes(status)
      ? status
      : notebookIntentStatus.unresolved,
    reason,
    intent,
    issues: freeze([...issues]),
    metadata: freeze({ ...(metadata || {}) }),
    context,
  })
}
