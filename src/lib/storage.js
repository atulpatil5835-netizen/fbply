let queuedStorageWrites = new Map()
let queuedStorageHandle = null
let queuedStorageMode = ''

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function writeStorageValue(key, value) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in privacy modes. The app can continue without persistence.
  }
}

function clearQueuedStorageHandle() {
  if (!queuedStorageHandle || typeof window === 'undefined') {
    queuedStorageHandle = null
    queuedStorageMode = ''
    return
  }

  if (queuedStorageMode === 'idle' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(queuedStorageHandle)
  } else {
    window.clearTimeout(queuedStorageHandle)
  }

  queuedStorageHandle = null
  queuedStorageMode = ''
}

export function flushStorageQueue() {
  if (queuedStorageWrites.size === 0) {
    clearQueuedStorageHandle()
    return
  }

  const writes = queuedStorageWrites
  queuedStorageWrites = new Map()
  clearQueuedStorageHandle()

  writes.forEach((value, key) => writeStorageValue(key, value))
}

export function safeStorageGet(key, fallback) {
  if (!canUseStorage()) {
    return fallback
  }

  try {
    return window.localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export function safeStorageSet(key, value) {
  writeStorageValue(key, value)
}

export function safeStorageSetQueued(key, value, delay = 180) {
  if (!canUseStorage()) {
    return
  }

  if (queuedStorageWrites.get(key) === value) {
    return
  }

  queuedStorageWrites.set(key, value)

  if (queuedStorageHandle || typeof window === 'undefined') {
    return
  }

  if (typeof window.requestIdleCallback === 'function') {
    queuedStorageMode = 'idle'
    queuedStorageHandle = window.requestIdleCallback(flushStorageQueue, { timeout: Math.max(delay * 4, 600) })
    return
  }

  queuedStorageMode = 'timeout'
  queuedStorageHandle = window.setTimeout(flushStorageQueue, delay)
}
