import { forwardRef, useId } from 'react'
import { cx } from '../utils.js'
import {
  NotebookContainer,
  NotebookFooter,
  NotebookHandwritingAccent,
  NotebookPaper,
  NotebookText,
} from './components.jsx'

function labelledById(id, title, fallbackId) {
  return title ? id || fallbackId : undefined
}

export function NotebookShellHeader({
  as: Element = 'header',
  className = '',
  datePlaceholder = 'Today',
  dateTime,
  subtitle = '',
  title = 'Notebook',
  titleAs: TitleElement = 'h1',
  titleId = '',
  ...props
}) {
  const generatedTitleId = useId()
  const resolvedTitleId = labelledById(titleId, title, `nb-shell-title-${generatedTitleId}`)
  const DateElement = dateTime ? 'time' : 'span'

  return (
    <Element className={cx('nb-shell-header', className)} aria-labelledby={resolvedTitleId} {...props}>
      <div className="nb-shell-header__copy">
        {title && (
          <TitleElement className="nb-shell-header__title nb-type-title" id={resolvedTitleId}>
            {title}
          </TitleElement>
        )}
        {subtitle && (
          <NotebookText as="p" className="nb-shell-header__subtitle" variant="body">
            {subtitle}
          </NotebookText>
        )}
      </div>
      {datePlaceholder && (
        <div className="nb-shell-header__date" aria-label="Notebook date">
          <span className="nb-type-caption">Date</span>
          <DateElement className="nb-type-date" dateTime={dateTime}>
            {datePlaceholder}
          </DateElement>
        </div>
      )}
    </Element>
  )
}

export function NotebookShellEmptyPrompt({
  as: Element = 'p',
  children = "Write today's first expense.",
  className = '',
  ...props
}) {
  if (!children) {
    return null
  }

  return (
    <Element className={cx('nb-shell-empty-prompt', className)} {...props}>
      <NotebookHandwritingAccent>{children}</NotebookHandwritingAccent>
    </Element>
  )
}

export function NotebookWritingArea({
  as: Element = 'div',
  children,
  className = '',
  emptyPrompt = "Write today's first expense.",
  label = 'Notebook writing area',
  ...props
}) {
  const hasChildren = children !== null && typeof children !== 'undefined'

  return (
    <Element className={cx('nb-shell-writing-area', className)} role="region" aria-label={label} {...props}>
      {hasChildren ? children : <NotebookShellEmptyPrompt>{emptyPrompt}</NotebookShellEmptyPrompt>}
    </Element>
  )
}

export const NotebookShell = forwardRef(function NotebookShell(
  {
    as: Element = 'section',
    children,
    className = '',
    datePlaceholder = 'Today',
    dateTime,
    emptyPrompt = "Write today's first expense.",
    footer = 'Notebook ready',
    footerActions = null,
    subtitle = '',
    theme,
    themeVariables,
    title = 'Notebook',
    titleId = '',
    width = 'wide',
    writingAreaLabel = 'Notebook writing area',
    ...props
  },
  ref,
) {
  const generatedTitleId = useId()
  const resolvedTitleId = labelledById(titleId, title, `nb-shell-${generatedTitleId}`)

  return (
    <NotebookContainer
      as={Element}
      className={cx('nb-shell', className)}
      ref={ref}
      theme={theme}
      themeVariables={themeVariables}
      width={width}
      aria-labelledby={resolvedTitleId}
      {...props}
    >
      <NotebookPaper className="nb-shell__paper" margin ruled theme={theme} themeVariables={themeVariables}>
        <NotebookShellHeader
          datePlaceholder={datePlaceholder}
          dateTime={dateTime}
          subtitle={subtitle}
          title={title}
          titleId={resolvedTitleId}
        />
        <NotebookWritingArea emptyPrompt={emptyPrompt} label={writingAreaLabel}>
          {children}
        </NotebookWritingArea>
        <NotebookFooter className="nb-shell-footer" actions={footerActions} meta={footer} />
      </NotebookPaper>
    </NotebookContainer>
  )
})
