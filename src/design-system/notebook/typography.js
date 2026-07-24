import { freeze } from './internal/freeze.js'
export { notebookFontStacks } from './fonts.js'

export const notebookTypographyRoles = freeze({
  heading: {
    label: 'Notebook Heading',
    className: 'nb-type-heading',
    usage: 'Section and group headings inside notebook surfaces.',
  },
  title: {
    label: 'Notebook Title',
    className: 'nb-type-title',
    usage: 'Page-level notebook titles.',
  },
  date: {
    label: 'Notebook Date',
    className: 'nb-type-date',
    usage: 'Dates, periods, and ledger metadata with tabular numbers.',
  },
  body: {
    label: 'Notebook Body',
    className: 'nb-type-body',
    usage: 'Readable paragraph and row text.',
  },
  caption: {
    label: 'Notebook Caption',
    className: 'nb-type-caption',
    usage: 'Secondary notes, labels, helper text, and annotations.',
  },
  amount: {
    label: 'Amount Typography',
    className: 'nb-type-amount',
    usage: 'Financial values. Always uses readable tabular numerals, never handwriting.',
  },
  tabular: {
    label: 'Tabular Numbers',
    className: 'nb-type-tabular',
    usage: 'Dates, counters, and aligned numeric metadata.',
  },
  handwritingAccent: {
    label: 'Handwriting Accent',
    className: 'nb-type-handwriting',
    usage: 'Small expressive notes only. Do not use for financial values.',
  },
})

export const notebookTypographyClassNames = freeze(
  Object.fromEntries(Object.entries(notebookTypographyRoles).map(([role, value]) => [role, value.className])),
)

export function getNotebookTypographyClass(role = 'body') {
  return notebookTypographyClassNames[role] || notebookTypographyClassNames.body
}
