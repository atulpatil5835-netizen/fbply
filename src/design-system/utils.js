import { createElement, isValidElement } from 'react'

export function cx(...parts) {
  return parts
    .flat()
    .filter(Boolean)
    .join(' ')
}

export function renderIcon(icon, props = {}) {
  if (!icon) {
    return null
  }

  if (isValidElement(icon)) {
    return icon
  }

  if (typeof icon === 'function' || (typeof icon === 'object' && icon.$$typeof)) {
    const Icon = icon
    return createElement(Icon, { 'aria-hidden': 'true', focusable: 'false', ...props })
  }

  return icon
}
