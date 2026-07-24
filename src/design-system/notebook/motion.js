import { freeze } from './internal/freeze.js'

export const notebookMotion = freeze({
  paper: { duration: '220ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  write: { duration: '180ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  ink: { duration: '180ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  page: { duration: '260ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  line: { duration: '180ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  hover: { duration: '150ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  focus: { duration: '120ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  fade: { duration: '160ms', easing: 'cubic-bezier(0.2, 0, 0, 1)' },
})

export const notebookMotionCssVariables = freeze({
  '--nb-motion-paper': `${notebookMotion.paper.duration} ${notebookMotion.paper.easing}`,
  '--nb-motion-write': `${notebookMotion.write.duration} ${notebookMotion.write.easing}`,
  '--nb-motion-ink': `${notebookMotion.ink.duration} ${notebookMotion.ink.easing}`,
  '--nb-motion-page': `${notebookMotion.page.duration} ${notebookMotion.page.easing}`,
  '--nb-motion-line': `${notebookMotion.line.duration} ${notebookMotion.line.easing}`,
  '--nb-motion-hover': `${notebookMotion.hover.duration} ${notebookMotion.hover.easing}`,
  '--nb-motion-focus': `${notebookMotion.focus.duration} ${notebookMotion.focus.easing}`,
  '--nb-motion-fade': `${notebookMotion.fade.duration} ${notebookMotion.fade.easing}`,
})

export const notebookMotionIntents = freeze({
  paper: 'Notebook surface entrance or elevation changes.',
  write: 'Ink or text reveal timing for future notebook writing effects.',
  page: 'Future page-to-page transitions.',
  hover: 'Pointer affordance for interactive paper primitives.',
  focus: 'Keyboard focus affordance.',
  fade: 'Low-risk opacity transitions for future overlays.',
})
