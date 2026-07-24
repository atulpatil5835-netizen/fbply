import { notebookTokens } from '../tokens.js'
import { createNotebookTheme } from '../internal/themeCssVariables.js'

export const blueRegisterNotebookTheme = createNotebookTheme({
  id: 'blueRegister',
  label: 'Blue Register',
  description: 'Cool register paper with navy ink, crisp blue rules, and accounting-book clarity.',
  extends: 'classic',
  colors: {
    paper: notebookTokens.paperColors.blue,
    paperSoft: '#edf6ff',
    paperEdge: '#c7ddf7',
    ink: '#10233f',
    inkMuted: '#475d7a',
    inkSubtle: '#71839b',
    lines: '#b7d5f8',
    linesStrong: '#7db2eb',
    margin: '#dc5f5f',
    accent: '#1d4ed8',
    background: '#e9f2ff',
    shadow: '#12325f',
    focus: '#1d4ed8',
    selection: '#dbeafe',
  },
})

export default blueRegisterNotebookTheme
