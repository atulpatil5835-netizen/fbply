import { forwardRef, useId, useRef } from 'react'
import { cx } from '../utils.js'
import { NotebookShell } from './shell.jsx'

function assignRef(ref, value) {
  if (!ref) {
    return
  }

  if (typeof ref === 'function') {
    ref(value)
    return
  }

  ref.current = value
}

function combineIds(...ids) {
  return ids.filter(Boolean).join(' ') || undefined
}

export function NotebookCursor({
  as: Element = 'span',
  children = 'Native text cursor active. Use arrow keys to move through the writing area.',
  className = '',
  id,
  ...props
}) {
  return (
    <Element className={cx('nb-sr-only nb-cursor-hint', className)} id={id} {...props}>
      {children}
    </Element>
  )
}

export const NotebookInputSurface = forwardRef(function NotebookInputSurface(
  {
    autoCapitalize = 'sentences',
    className = '',
    defaultValue = '',
    inputMode = 'text',
    label = 'Notebook writing input',
    placeholder = "Write today's first expense.",
    spellCheck = true,
    wrap = 'soft',
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref,
) {
  return (
    <textarea
      aria-describedby={ariaDescribedBy}
      aria-label={label}
      autoCapitalize={autoCapitalize}
      className={cx('nb-input-surface nb-type-body', className)}
      defaultValue={defaultValue}
      inputMode={inputMode}
      placeholder={placeholder}
      ref={ref}
      spellCheck={spellCheck}
      wrap={wrap}
      {...props}
    />
  )
})

export const NotebookLineRenderer = forwardRef(function NotebookLineRenderer(
  {
    as: Element = 'div',
    children,
    className = '',
    inputRef,
    onClick,
    ...props
  },
  ref,
) {
  function focusInputSurface(event) {
    if (onClick) {
      onClick(event)
    }

    if (event.defaultPrevented) {
      return
    }

    if (event.target === event.currentTarget) {
      inputRef?.current?.focus()
    }
  }

  return (
    <Element
      className={cx('nb-line-renderer', className)}
      onClick={focusInputSurface}
      ref={ref}
      {...props}
    >
      {children}
    </Element>
  )
})

export const NotebookInteraction = forwardRef(function NotebookInteraction(
  {
    className = '',
    cursorHint = 'Native text cursor active. Use arrow keys to move through the writing area.',
    cursorHintId = '',
    defaultValue = '',
    inputClassName = '',
    inputId,
    inputLabel = 'Notebook writing input',
    inputName,
    inputProps = {},
    lineRendererClassName = '',
    placeholder = "Write today's first expense.",
    writingAreaLabel = 'Notebook writing area',
    ...shellProps
  },
  ref,
) {
  const inputRef = useRef(null)
  const generatedHintId = useId()
  const resolvedCursorHintId = cursorHintId || `nb-cursor-${generatedHintId}`
  const resolvedInputProps = { ...inputProps }
  const inputAriaDescribedBy = resolvedInputProps['aria-describedby']

  delete resolvedInputProps['aria-describedby']
  delete resolvedInputProps.defaultValue
  delete resolvedInputProps.onChange
  delete resolvedInputProps.onInput
  delete resolvedInputProps.value

  function setInputRef(node) {
    inputRef.current = node
    assignRef(ref, node)
  }

  return (
    <NotebookShell className={cx('nb-interaction', className)} writingAreaLabel={writingAreaLabel} {...shellProps}>
      <NotebookLineRenderer className={lineRendererClassName} inputRef={inputRef}>
        <NotebookCursor id={resolvedCursorHintId}>{cursorHint}</NotebookCursor>
        <NotebookInputSurface
          aria-describedby={combineIds(resolvedCursorHintId, inputAriaDescribedBy)}
          className={inputClassName}
          defaultValue={defaultValue}
          id={inputId}
          label={inputLabel}
          name={inputName}
          placeholder={placeholder}
          ref={setInputRef}
          {...resolvedInputProps}
        />
      </NotebookLineRenderer>
    </NotebookShell>
  )
})
