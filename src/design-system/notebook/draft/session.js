import { freeze } from '../internal/freeze.js'
import { notebookDraftSessionStatus } from './contracts.js'
import { clearDraftState, createDraftState, updateDraftState } from './state.js'

function assertSessionActive(destroyed) {
  if (destroyed) {
    throw new Error('Notebook draft session has been destroyed.')
  }
}

export function createDraftSession({
  initialState,
  initialText = '',
  metadata = {},
  source = 'notebook',
} = {}) {
  let destroyed = false
  let state = createDraftState(initialState || { metadata, source, text: initialText })

  const session = {
    id: state.id,
    get status() {
      return destroyed ? notebookDraftSessionStatus.destroyed : notebookDraftSessionStatus.active
    },
    getSnapshot() {
      return destroyed ? null : state
    },
    updateText(text) {
      assertSessionActive(destroyed)
      state = updateDraftState(state, { text })
      return state
    },
    patch(patch = {}) {
      assertSessionActive(destroyed)
      state = updateDraftState(state, patch)
      return state
    },
    clear() {
      assertSessionActive(destroyed)
      state = clearDraftState(state)
      return state
    },
    destroy() {
      destroyed = true
      state = null
      return null
    },
  }

  return freeze(session)
}
