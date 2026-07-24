import { freeze } from './internal/freeze.js'
import {
  defaultNotebookTheme,
  normalizeNotebookTheme,
  notebookThemeIds,
  notebookThemeOptions,
  notebookThemeRegistry,
} from './internal/themeRegistry.js'
import {
  createNotebookTheme,
  extendNotebookTheme,
  getNotebookThemeCssVariables,
  notebookThemeColorKeys,
} from './internal/themeCssVariables.js'

const notebookThemeLoaders = freeze({
  classic: () => import('./themes/classic.js').then((module) => module.default),
  brownJournal: () => import('./themes/brownJournal.js').then((module) => module.default),
  blueRegister: () => import('./themes/blueRegister.js').then((module) => module.default),
  minimalWhite: () => import('./themes/minimalWhite.js').then((module) => module.default),
  vintageDiary: () => import('./themes/vintageDiary.js').then((module) => module.default),
})

export {
  createNotebookTheme,
  defaultNotebookTheme,
  extendNotebookTheme,
  getNotebookThemeCssVariables,
  normalizeNotebookTheme,
  notebookThemeColorKeys,
  notebookThemeIds,
  notebookThemeOptions,
  notebookThemeRegistry,
}

export function getNotebookThemeLoader(theme = defaultNotebookTheme) {
  return notebookThemeLoaders[normalizeNotebookTheme(theme)]
}

export async function loadNotebookTheme(theme = defaultNotebookTheme) {
  return getNotebookThemeLoader(theme)()
}

export async function loadNotebookThemeCssVariables(theme = defaultNotebookTheme) {
  return getNotebookThemeCssVariables(await loadNotebookTheme(theme))
}
