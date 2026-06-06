import { forwardRef, useId } from 'react'
import { cx } from './utils.js'
import './money-os.css'

function describedBy(helperId, errorId, helper, error) {
  return [
    helper ? helperId : '',
    error ? errorId : '',
  ].filter(Boolean).join(' ') || undefined
}

function fieldIds(id, prefix) {
  return {
    inputId: id,
    helperId: `${prefix}-helper`,
    errorId: `${prefix}-error`,
  }
}

function FieldShell({
  label,
  inputId,
  helperId,
  errorId,
  helper = '',
  error = '',
  children,
  className = '',
}) {
  return (
    <div className={cx('money-os mos-field', error && 'mos-field--invalid', className)}>
      {label && (
        <label className="mos-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {children}
      {helper && (
        <small className="mos-field__helper" id={helperId}>
          {helper}
        </small>
      )}
      {error && (
        <small className="mos-field__error" id={errorId}>
          {error}
        </small>
      )}
    </div>
  )
}

export const AmountInput = forwardRef(function AmountInput(
  {
    id,
    label = 'Amount',
    helper = '',
    error = '',
    currencySymbol = 'Rs',
    inputMode = 'decimal',
    min = '0',
    placeholder = '0',
    className = '',
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const ids = fieldIds(id || `mos-amount-${generatedId}`, `mos-amount-${generatedId}`)

  return (
    <FieldShell label={label} inputId={ids.inputId} helperId={ids.helperId} errorId={ids.errorId} helper={helper} error={error} className={className}>
      <div className="mos-field__control">
        <span className="mos-field__prefix">{currencySymbol}</span>
        <input
          id={ids.inputId}
          ref={ref}
          type="number"
          inputMode={inputMode}
          min={min}
          placeholder={placeholder}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(ids.helperId, ids.errorId, helper, error)}
          {...props}
        />
      </div>
    </FieldShell>
  )
})

export const TextInput = forwardRef(function TextInput(
  {
    id,
    label,
    helper = '',
    error = '',
    type = 'text',
    placeholder = '',
    className = '',
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const ids = fieldIds(id || `mos-text-${generatedId}`, `mos-text-${generatedId}`)

  return (
    <FieldShell label={label} inputId={ids.inputId} helperId={ids.helperId} errorId={ids.errorId} helper={helper} error={error} className={className}>
      <input
        id={ids.inputId}
        ref={ref}
        type={type}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(ids.helperId, ids.errorId, helper, error)}
        {...props}
      />
    </FieldShell>
  )
})

function optionValue(option) {
  return typeof option === 'string' ? option : option.value ?? option.label
}

function optionLabel(option) {
  return typeof option === 'string' ? option : option.label ?? option.value
}

export const CategorySelector = forwardRef(function CategorySelector(
  {
    id,
    label = 'Category',
    options = [],
    helper = '',
    error = '',
    placeholder = 'Select category',
    className = '',
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const ids = fieldIds(id || `mos-category-${generatedId}`, `mos-category-${generatedId}`)

  return (
    <FieldShell label={label} inputId={ids.inputId} helperId={ids.helperId} errorId={ids.errorId} helper={helper} error={error} className={className}>
      <select
        id={ids.inputId}
        ref={ref}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(ids.helperId, ids.errorId, helper, error)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option value={optionValue(option)} key={optionValue(option)}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </FieldShell>
  )
})

export const DateSelector = forwardRef(function DateSelector(
  {
    id,
    label = 'Date',
    helper = '',
    error = '',
    className = '',
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const ids = fieldIds(id || `mos-date-${generatedId}`, `mos-date-${generatedId}`)

  return (
    <FieldShell label={label} inputId={ids.inputId} helperId={ids.helperId} errorId={ids.errorId} helper={helper} error={error} className={className}>
      <input
        id={ids.inputId}
        ref={ref}
        type="date"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(ids.helperId, ids.errorId, helper, error)}
        {...props}
      />
    </FieldShell>
  )
})

export const NotesInput = forwardRef(function NotesInput(
  {
    id,
    label = 'Notes',
    helper = '',
    error = '',
    placeholder = '',
    rows = 4,
    className = '',
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const ids = fieldIds(id || `mos-notes-${generatedId}`, `mos-notes-${generatedId}`)

  return (
    <FieldShell label={label} inputId={ids.inputId} helperId={ids.helperId} errorId={ids.errorId} helper={helper} error={error} className={className}>
      <textarea
        id={ids.inputId}
        ref={ref}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(ids.helperId, ids.errorId, helper, error)}
        {...props}
      />
    </FieldShell>
  )
})
