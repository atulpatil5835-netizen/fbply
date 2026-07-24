import { notebookTokens } from '../tokens.js'
import { createNotebookTheme } from '../internal/themeCssVariables.js'

export const classicNotebookTheme = createNotebookTheme({
  id: 'classic',
  label: 'Classic Notebook',
  description: 'Warm white paper, graphite ink, soft blue rules, and a red margin rule.',
  colors: {
    paper: notebookTokens.paperColors.white,
    paperSoft: notebookTokens.paperColors.warm,
    paperEdge: '#efe4cf',
    ink: notebookTokens.inkColors.primary,
    inkMuted: notebookTokens.inkColors.muted,
    inkSubtle: notebookTokens.inkColors.subtle,
    lines: notebookTokens.ruledLineColors.regular,
    linesStrong: notebookTokens.ruledLineColors.strong,
    margin: notebookTokens.ruledLineColors.margin,
    accent: notebookTokens.accentColors.blue,
    background: '#f5f7fb',
    shadow: '#334155',
    focus: '#2563eb',
    selection: '#dbeafe',
  },
})

export default classicNotebookTheme
