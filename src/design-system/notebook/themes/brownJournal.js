import { notebookTokens } from '../tokens.js'
import { createNotebookTheme } from '../internal/themeCssVariables.js'

export const brownJournalNotebookTheme = createNotebookTheme({
  id: 'brownJournal',
  label: 'Brown Journal',
  description: 'Cream journal paper with deep brown ink and restrained earth accents.',
  extends: 'classic',
  colors: {
    paper: '#f9f1e2',
    paperSoft: '#f2e2c8',
    paperEdge: '#dbc3a0',
    ink: '#2d2117',
    inkMuted: '#66513f',
    inkSubtle: '#8a7766',
    lines: '#dcc6a8',
    linesStrong: '#b99468',
    margin: '#a75d3a',
    accent: notebookTokens.accentColors.brown,
    background: '#efe3d0',
    shadow: '#3b2a1c',
    focus: '#8a5a2b',
    selection: '#ead7b8',
  },
})

export default brownJournalNotebookTheme
