import { freeze } from './internal/freeze.js'

export const defaultNotebookRenderTarget = 'screen'

export const notebookRenderTargets = freeze({
  screen: {
    id: 'screen',
    label: 'Screen',
    status: 'current-css-target',
    constraints: ['responsive', 'interactive', 'accessible-focus'],
  },
  print: {
    id: 'print',
    label: 'Print',
    status: 'future-contract',
    constraints: ['paged-output', 'ink-safe-contrast', 'paper-size-aware'],
  },
  pdf: {
    id: 'pdf',
    label: 'PDF',
    status: 'future-contract',
    constraints: ['deterministic-layout', 'font-fallback-safe', 'export-safe'],
  },
  image: {
    id: 'image',
    label: 'Image',
    status: 'future-contract',
    constraints: ['fixed-canvas', 'high-resolution', 'background-explicit'],
  },
  export: {
    id: 'export',
    label: 'Exports',
    status: 'future-contract',
    constraints: ['data-model-first', 'renderer-agnostic', 'offline-safe'],
  },
})

export const notebookRenderTargetIds = freeze(Object.keys(notebookRenderTargets))

export function normalizeNotebookRenderTarget(target) {
  const targetId = typeof target === 'string' ? target : target?.id

  return notebookRenderTargetIds.includes(targetId) ? targetId : defaultNotebookRenderTarget
}

export const notebookRendererContract = freeze({
  model: 'Notebook primitives should be renderer-agnostic before any PDF, print, image, or export renderer is implemented.',
  requiredInputs: ['theme', 'tokens', 'typographyRole', 'renderTarget', 'contentModel'],
  forbiddenCoupling: ['Supabase queries', 'route state', 'analytics events', 'business calculations'],
})
