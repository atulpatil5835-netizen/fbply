import { freeze } from './freeze.js'

export const defaultNotebookTheme = 'classic'

export const notebookThemeRegistry = freeze({
  classic: {
    id: 'classic',
    label: 'Classic Notebook',
    description: 'Warm white paper, graphite ink, soft blue rules, and a red margin rule.',
  },
  brownJournal: {
    id: 'brownJournal',
    label: 'Brown Journal',
    description: 'Cream journal paper with deep brown ink and restrained earth accents.',
  },
  blueRegister: {
    id: 'blueRegister',
    label: 'Blue Register',
    description: 'Cool register paper with navy ink, crisp blue rules, and accounting-book clarity.',
  },
  minimalWhite: {
    id: 'minimalWhite',
    label: 'Minimal White',
    description: 'Clean white paper, high-contrast ink, pale rules, and a neutral accent.',
  },
  vintageDiary: {
    id: 'vintageDiary',
    label: 'Vintage Diary',
    description: 'Aged diary paper with dark ink, warm rules, and a quiet teal accent.',
  },
})

export const notebookThemeOptions = freeze(Object.values(notebookThemeRegistry))
export const notebookThemeIds = freeze(notebookThemeOptions.map((theme) => theme.id))

function compactThemeName(theme) {
  return String(theme || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function normalizeNotebookTheme(theme) {
  const themeId = typeof theme === 'string' ? theme : theme?.id

  if (notebookThemeIds.includes(themeId)) {
    return themeId
  }

  const compactThemeId = compactThemeName(themeId)
  const matchingTheme = notebookThemeOptions.find((option) => (
    compactThemeName(option.id) === compactThemeId ||
    compactThemeName(option.label) === compactThemeId
  ))

  return matchingTheme?.id || defaultNotebookTheme
}
