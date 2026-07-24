import { freeze } from './freeze.js'

export const notebookThemeColorKeys = freeze([
  'paper',
  'paperSoft',
  'paperEdge',
  'ink',
  'inkMuted',
  'inkSubtle',
  'lines',
  'linesStrong',
  'margin',
  'accent',
  'background',
  'shadow',
  'focus',
  'selection',
])

export function createNotebookTheme(theme) {
  return freeze({
    id: theme.id,
    label: theme.label,
    description: theme.description,
    extends: theme.extends || null,
    colors: notebookThemeColorKeys.reduce((colors, key) => ({
      ...colors,
      [key]: theme.colors[key],
    }), {}),
  })
}

export function extendNotebookTheme(baseTheme, extension) {
  return createNotebookTheme({
    ...baseTheme,
    ...extension,
    colors: {
      ...baseTheme.colors,
      ...extension.colors,
    },
    extends: extension.extends || baseTheme.id,
  })
}

export function getNotebookThemeCssVariables(theme) {
  const colors = theme?.colors || {}

  return {
    '--nb-paper': colors.paper,
    '--nb-paper-soft': colors.paperSoft,
    '--nb-paper-edge': colors.paperEdge,
    '--nb-ink': colors.ink,
    '--nb-ink-muted': colors.inkMuted,
    '--nb-ink-subtle': colors.inkSubtle,
    '--nb-lines': colors.lines,
    '--nb-lines-strong': colors.linesStrong,
    '--nb-margin-line': colors.margin,
    '--nb-accent': colors.accent,
    '--nb-background': colors.background,
    '--nb-shadow-color': colors.shadow,
    '--nb-focus': colors.focus,
    '--nb-selection': colors.selection,
  }
}
