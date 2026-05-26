export function safeStorageGet(key, fallback) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback
  }

  try {
    return window.localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export function safeStorageSet(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in privacy modes. The app can continue without persistence.
  }
}
