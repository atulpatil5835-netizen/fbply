export function focusInvalidField(root) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  window.setTimeout(() => {
    const scope = root?.querySelector ? root : document
    const invalidField = scope.querySelector(
      '.field-invalid input, .field-invalid textarea, .field-invalid select, input.field-invalid, textarea.field-invalid, select.field-invalid, [aria-invalid="true"]',
    )

    if (!invalidField) {
      return
    }

    invalidField.scrollIntoView({ block: 'center', behavior: 'smooth' })
    if (typeof invalidField.focus === 'function') {
      invalidField.focus({ preventScroll: true })
    }
  }, 0)
}

export function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function titleCase(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1)
}
