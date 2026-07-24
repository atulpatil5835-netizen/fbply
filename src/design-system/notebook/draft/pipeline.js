import { freeze } from '../internal/freeze.js'
import { createNotebookDraftId, notebookIntentStatus } from './contracts.js'
import { resolveIntentWithAdapter } from './adapter.js'
import { createIntentContext, createIntentResult } from './intent.js'
import { runDraftValidators } from './validator.js'

export function createDraftPipeline({
  adapters = [],
  id = '',
  validators = [],
} = {}) {
  const pipeline = {
    id: id || createNotebookDraftId('pipeline'),
    adapters: freeze([...adapters]),
    validators: freeze([...validators]),
    run(draftState, context = {}) {
      return runDraftPipeline(pipeline, draftState, context)
    },
  }

  return freeze(pipeline)
}

export async function runDraftPipeline(pipeline, draftState, context = {}) {
  const intentContext = createIntentContext(context)
  const validation = runDraftValidators(pipeline?.validators || [], draftState, intentContext)

  if (!validation.valid) {
    return createIntentResult({
      context: intentContext,
      issues: validation.issues,
      reason: 'draft_validation_blocked',
      status: notebookIntentStatus.blocked,
    })
  }

  for (const adapter of pipeline?.adapters || []) {
    const result = await resolveIntentWithAdapter(adapter, draftState, intentContext)

    if (result.status === notebookIntentStatus.resolved || result.status === notebookIntentStatus.failed) {
      return result
    }
  }

  return createIntentResult({
    context: intentContext,
    reason: 'no_intent_resolved',
    status: notebookIntentStatus.unresolved,
  })
}
