import { freeze } from '../internal/freeze.js'
import { createNotebookDraftId, notebookValidationSeverity } from './contracts.js'

export function createDraftValidationIssue({
  code = 'notebook.validation.info',
  message = '',
  severity = notebookValidationSeverity.info,
} = {}) {
  return freeze({
    code,
    message,
    severity: Object.values(notebookValidationSeverity).includes(severity)
      ? severity
      : notebookValidationSeverity.info,
  })
}

export function createDraftValidationResult({
  issues = [],
  valid = true,
} = {}) {
  const normalizedIssues = issues.map((issue) => (
    issue?.code ? issue : createDraftValidationIssue(issue)
  ))

  return freeze({
    valid: Boolean(valid) && normalizedIssues.every((issue) => issue.severity !== notebookValidationSeverity.error),
    issues: freeze(normalizedIssues),
  })
}

export function createDraftValidator({
  id = '',
  label = '',
  validate = () => createDraftValidationResult(),
} = {}) {
  return freeze({
    id: id || createNotebookDraftId('validator'),
    label,
    validate,
  })
}

export function runDraftValidators(validators = [], draftState, context) {
  const results = validators.map((validator) => (
    validator.validate(draftState, context)
  ))
  const issues = results.flatMap((result) => result?.issues || [])

  return createDraftValidationResult({
    valid: results.every((result) => result?.valid !== false),
    issues,
  })
}
