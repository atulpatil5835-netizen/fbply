import { freeze } from '../internal/freeze.js'
import {
  createNotebookDraftId,
  createNotebookTimestamp,
  normalizeDraftSource,
  normalizeDraftText,
} from './contracts.js'

function freezeMetadata(metadata) {
  return freeze({ ...(metadata || {}) })
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key)
}

export function createDraftState({
  createdAt = '',
  id = '',
  metadata = {},
  revision = 0,
  source = 'notebook',
  text = '',
  updatedAt = '',
} = {}) {
  const timestamp = createdAt || createNotebookTimestamp()

  return freeze({
    id: id || createNotebookDraftId(),
    text: normalizeDraftText(text),
    source: normalizeDraftSource(source),
    revision: Math.max(Number(revision) || 0, 0),
    createdAt: timestamp,
    updatedAt: updatedAt || timestamp,
    metadata: freezeMetadata(metadata),
  })
}

export function updateDraftState(state, patch = {}) {
  const current = state || createDraftState()
  const hasTextPatch = hasOwn(patch, 'text')
  const hasSourcePatch = hasOwn(patch, 'source')
  const hasMetadataPatch = hasOwn(patch, 'metadata')

  return createDraftState({
    ...current,
    text: hasTextPatch ? normalizeDraftText(patch.text) : current.text,
    source: hasSourcePatch ? normalizeDraftSource(patch.source) : current.source,
    metadata: hasMetadataPatch ? { ...current.metadata, ...(patch.metadata || {}) } : current.metadata,
    revision: current.revision + 1,
    updatedAt: createNotebookTimestamp(),
  })
}

export function clearDraftState(state) {
  return updateDraftState(state, { text: '' })
}

export function isDraftState(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.revision === 'number',
  )
}
