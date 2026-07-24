import { freeze } from './internal/freeze.js'

export const notebookFontStacks = freeze({
  readable: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  amount: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  handwriting: '"Segoe Print", "Bradley Hand ITC", "Comic Sans MS", cursive',
})

export const notebookFontStrategy = freeze({
  firstPaint: 'system-first',
  readableFont: {
    stack: notebookFontStacks.readable,
    loading: 'no-runtime-loader',
    fallback: 'system-ui',
  },
  amountFont: {
    stack: notebookFontStacks.amount,
    loading: 'no-runtime-loader',
    numericFeature: 'tabular-nums',
    restriction: 'Never use handwriting fonts for financial values.',
  },
  handwritingFont: {
    stack: notebookFontStacks.handwriting,
    loading: 'optional-css-only',
    fallback: 'cursive',
    usage: 'Accent notes only.',
  },
})
