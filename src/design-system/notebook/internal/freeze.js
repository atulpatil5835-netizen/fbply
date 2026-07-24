export function freeze(value) {
  if (!value || typeof value !== 'object') {
    return value
  }

  Object.values(value).forEach((entry) => freeze(entry))
  return Object.freeze(value)
}
