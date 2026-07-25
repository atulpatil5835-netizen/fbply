import { defaultMoneyOSTheme, getMoneyOSThemeExperience, normalizeMoneyOSTheme } from './tokens.js'

export const fbplyExportBrand = Object.freeze({
  header: 'FBPLY ❤️',
  footer: 'fbply.com',
})

export const notebookExportLayouts = Object.freeze({
  card: Object.freeze({
    id: 'card',
    label: 'Notebook card',
    useCase: 'small-export',
    maxSections: 3,
  }),
  multipage: Object.freeze({
    id: 'multipage',
    label: 'Notebook pages',
    useCase: 'large-export',
    pageBreakStrategy: 'section',
  }),
})

export function getNotebookExportPresentation(theme = defaultMoneyOSTheme) {
  const themeId = normalizeMoneyOSTheme(theme)
  const themeTokens = getMoneyOSThemeExperience(themeId)

  return Object.freeze({
    brand: fbplyExportBrand,
    themeId,
    theme: themeTokens,
    personality: themeTokens.personality,
    exportStyle: themeTokens.exportStyle,
    rhythm: themeTokens.rhythm,
    layouts: notebookExportLayouts,
    exportMode: themeTokens.exportMode,
    header: Object.freeze({
      text: fbplyExportBrand.header,
      typographyRole: 'meta',
    }),
    footer: Object.freeze({
      text: fbplyExportBrand.footer,
      typographyRole: 'caption',
    }),
    card: Object.freeze({
      output: themeTokens.exportMode.singlePage,
      background: themeTokens.paper,
      border: themeTokens.borders,
      ink: themeTokens.ink,
      accent: themeTokens.accent,
      texture: themeTokens.texture.exports,
      style: themeTokens.exportStyle,
      typographyRole: 'body',
    }),
    multipage: Object.freeze({
      output: themeTokens.exportMode.multiPage,
      background: themeTokens.paper,
      lineColor: themeTokens.lines,
      headerText: fbplyExportBrand.header,
      footerText: fbplyExportBrand.footer,
      texture: themeTokens.texture.exports,
      style: themeTokens.exportStyle,
      pageBreakStrategy: notebookExportLayouts.multipage.pageBreakStrategy,
    }),
  })
}

export function getNotebookExportCssVariables(theme = defaultMoneyOSTheme) {
  const presentation = getNotebookExportPresentation(theme)

  return Object.freeze({
    '--export-paper': presentation.theme.paper,
    '--export-ink': presentation.theme.ink,
    '--export-line': presentation.theme.lines,
    '--export-accent': presentation.theme.accent,
    '--export-border': presentation.theme.borders,
    '--export-card': presentation.theme.cards,
    '--export-style': presentation.exportStyle,
    '--export-line-height': presentation.rhythm.lineHeight,
    '--export-section-spacing': presentation.rhythm.sectionSpacing,
    '--export-divider-thickness': presentation.rhythm.dividerThickness,
  })
}
