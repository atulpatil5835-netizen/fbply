import { useEffect, useState } from 'react'
import { motionCssVariables, motionTokens } from './motionTokens.js'

export { motionCssVariables, motionTokens }

export function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(motionTokens.reducedMotion.mediaQuery).matches
}

export function isMotionReduced() {
  if (prefersReducedMotion()) {
    return true
  }

  return typeof document !== 'undefined' &&
    document.documentElement.classList.contains('fbply-legacy-motion')
}

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(isMotionReduced)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const query = window.matchMedia(motionTokens.reducedMotion.mediaQuery)
    const updateReducedMotion = () => setReducedMotion(isMotionReduced())

    updateReducedMotion()

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', updateReducedMotion)
      return () => query.removeEventListener('change', updateReducedMotion)
    }

    query.addListener(updateReducedMotion)
    return () => query.removeListener(updateReducedMotion)
  }, [])

  return reducedMotion
}
