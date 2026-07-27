import { notebookTokens } from '../tokens.js'
import { createNotebookTheme } from '../internal/themeCssVariables.js'

export const minimalWhiteNotebookTheme = createNotebookTheme({
  id: 'minimalWhite',
  label: 'Default Clean',
  description: 'Clean white surfaces, high-contrast ink, subtle separators, and normal typography.',
  colors: {
    paper: '#ffffff',
    paperSoft: '#f8fafc',
    paperEdge: '#e5e7eb',
    ink: notebookTokens.inkColors.strong,
    inkMuted: '#4b5563',
    inkSubtle: '#6b7280',
    lines: '#e5e7eb',
    linesStrong: '#cbd5e1',
    margin: '#9ca3af',
    accent: notebookTokens.accentColors.graphite,
    background: '#f3f4f6',
    shadow: '#111827',
    focus: '#2563eb',
    selection: '#e0f2fe',
  },
})

export default minimalWhiteNotebookTheme
