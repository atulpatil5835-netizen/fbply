import { trackEvent } from './analytics'

export function isLegacyProgressLayer() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_PROGRESS_LAYER__)
}

export function clampProgressPercent(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return 0
  }

  return Math.max(0, Math.min(Math.round(numericValue), 100))
}

export function percentFromParts(completed, total) {
  const safeTotal = Number(total) || 0

  if (safeTotal <= 0) {
    return 0
  }

  return clampProgressPercent(((Number(completed) || 0) / safeTotal) * 100)
}

export function trackProgressComponentsViewed(surface, components = []) {
  const visibleComponents = components.filter(Boolean)

  if (isLegacyProgressLayer() || visibleComponents.length === 0) {
    return
  }

  trackEvent('progress_components_viewed', {
    surface,
    component_count: visibleComponents.length,
    component_names: visibleComponents.join(','),
  })
}
