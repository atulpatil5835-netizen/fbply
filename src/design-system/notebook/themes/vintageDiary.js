import { notebookTokens } from '../tokens.js'
import { createNotebookTheme } from '../internal/themeCssVariables.js'

export const vintageDiaryNotebookTheme = createNotebookTheme({
  id: 'vintageDiary',
  label: 'Vintage Diary',
  description: 'Aged diary paper with dark ink, warm rules, and a quiet teal accent.',
  extends: 'classic',
  colors: {
    paper: notebookTokens.paperColors.aged,
    paperSoft: '#f1dbad',
    paperEdge: '#d7b77a',
    ink: '#2b251d',
    inkMuted: '#665a49',
    inkSubtle: '#82735e',
    lines: '#d8bd87',
    linesStrong: '#b68d4c',
    margin: '#a84b3f',
    accent: notebookTokens.accentColors.teal,
    background: '#f0e2c7',
    shadow: '#3a2d1d',
    focus: '#256d5a',
    selection: '#d8eadc',
  },
})

export default vintageDiaryNotebookTheme
