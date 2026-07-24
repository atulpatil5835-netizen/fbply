import { freeze } from '../internal/freeze.js'
import { createNotebookDraftId, notebookIntentStatus, normalizeDraftSource } from './contracts.js'
import { createIntentResult } from './intent.js'

export function createIntentAdapter({
  id = '',
  label = '',
  load = null,
  resolve = null,
  source = 'unknown',
  supports = () => false,
} = {}) {
  return freeze({
    id: id || createNotebookDraftId('adapter'),
    label,
    source: normalizeDraftSource(source),
    load,
    supports,
    resolve,
  })
}

export async function resolveIntentWithAdapter(adapter, draftState, context) {
  const loadedAdapter = adapter?.load ? await adapter.load() : adapter

  if (!loadedAdapter?.supports?.(draftState, context)) {
    return createIntentResult({
      context,
      reason: 'adapter_not_supported',
      status: notebookIntentStatus.skipped,
    })
  }

  if (!loadedAdapter.resolve) {
    return createIntentResult({
      context,
      reason: 'adapter_not_implemented',
      status: notebookIntentStatus.skipped,
    })
  }

  return loadedAdapter.resolve(draftState, context)
}
