import { forwardRef, useId } from 'react'
import { cx } from '../utils.js'
import { getNotebookTypographyClass } from './typography.js'
import { normalizeNotebookTheme } from './themes.js'

function notebookStyle(themeVariables, style) {
  if (!themeVariables) {
    return style
  }

  return {
    ...themeVariables,
    ...style,
  }
}

function labelledById(id, title, fallbackId) {
  return title ? id || fallbackId : undefined
}

export const NotebookContainer = forwardRef(function NotebookContainer(
  {
    as: Element = 'div',
    children,
    className = '',
    theme,
    themeVariables,
    width = 'default',
    style,
    ...props
  },
  ref,
) {
  return (
    <Element
      className={cx(
        'notebook-system nb-container',
        width !== 'default' && `nb-container--${width}`,
        className,
      )}
      data-notebook-theme={theme ? normalizeNotebookTheme(theme) : undefined}
      ref={ref}
      style={notebookStyle(themeVariables, style)}
      {...props}
    >
      {children}
    </Element>
  )
})

export const NotebookPaper = forwardRef(function NotebookPaper(
  {
    as: Element = 'section',
    children,
    className = '',
    density = 'comfortable',
    elevated = false,
    interactive = false,
    margin = false,
    motion = 'none',
    ruled = true,
    theme,
    themeVariables,
    style,
    ...props
  },
  ref,
) {
  return (
    <Element
      className={cx(
        'notebook-system nb-paper',
        density !== 'comfortable' && `nb-paper--${density}`,
        elevated && 'nb-paper--elevated',
        interactive && 'nb-paper--interactive',
        margin && 'nb-paper--margin',
        ruled && 'nb-paper--ruled',
        className,
      )}
      data-motion={motion !== 'none' ? motion : undefined}
      data-notebook-theme={theme ? normalizeNotebookTheme(theme) : undefined}
      ref={ref}
      style={notebookStyle(themeVariables, style)}
      {...props}
    >
      {children}
    </Element>
  )
})

export const NotebookPage = forwardRef(function NotebookPage(
  {
    as: Element = 'article',
    children,
    className = '',
    margin = true,
    motion = 'none',
    ruled = true,
    ...props
  },
  ref,
) {
  return (
    <NotebookPaper
      as={Element}
      className={cx('nb-page', className)}
      margin={margin}
      motion={motion}
      ref={ref}
      ruled={ruled}
      {...props}
    >
      {children}
    </NotebookPaper>
  )
})

export function NotebookHeader({
  actions = null,
  as: Element = 'header',
  children,
  className = '',
  date = '',
  dateTime,
  eyebrow = '',
  meta = '',
  title = '',
  titleAs: TitleElement = 'h1',
  titleId = '',
  ...props
}) {
  const generatedTitleId = useId()
  const resolvedTitleId = labelledById(titleId, title, `nb-header-${generatedTitleId}`)

  return (
    <Element className={cx('nb-header', className)} aria-labelledby={resolvedTitleId} {...props}>
      <div className="nb-header__copy">
        {eyebrow && <span className="nb-eyebrow">{eyebrow}</span>}
        {title && (
          <TitleElement className="nb-header__title nb-type-title" id={resolvedTitleId}>
            {title}
          </TitleElement>
        )}
        {(date || meta) && (
          <div className="nb-header__meta">
            {date && (
              <time className="nb-type-date" dateTime={dateTime}>
                {date}
              </time>
            )}
            {meta && <span className="nb-type-caption">{meta}</span>}
          </div>
        )}
      </div>
      {actions && <div className="nb-header__actions">{actions}</div>}
      {children}
    </Element>
  )
}

export function NotebookSection({
  actions = null,
  as: Element = 'section',
  caption = '',
  children,
  className = '',
  title = '',
  titleAs: TitleElement = 'h2',
  titleId = '',
  ...props
}) {
  const generatedTitleId = useId()
  const resolvedTitleId = labelledById(titleId, title, `nb-section-${generatedTitleId}`)

  return (
    <Element className={cx('nb-section', className)} aria-labelledby={resolvedTitleId} {...props}>
      {(title || caption || actions) && (
        <header className="nb-section__header">
          <div className="nb-section__copy">
            {title && (
              <TitleElement className="nb-section__title nb-type-heading" id={resolvedTitleId}>
                {title}
              </TitleElement>
            )}
            {caption && <p className="nb-section__caption nb-type-caption">{caption}</p>}
          </div>
          {actions && <div className="nb-section__actions">{actions}</div>}
        </header>
      )}
      {children}
    </Element>
  )
}

export function NotebookLine({
  actions = null,
  amount = false,
  as: Element = 'div',
  children,
  className = '',
  label = '',
  meta = '',
  motion = 'none',
  value = '',
  ...props
}) {
  const hasChildren = children !== null && typeof children !== 'undefined'
  const hasValue = value !== null && typeof value !== 'undefined' && value !== ''

  return (
    <Element
      className={cx('nb-line', amount && 'nb-line--amount', className)}
      data-motion={motion !== 'none' ? motion : undefined}
      {...props}
    >
      {(label || meta) && (
        <span className="nb-line__label">
          {label && <span>{label}</span>}
          {meta && <small>{meta}</small>}
        </span>
      )}
      {hasChildren || hasValue ? (
        <span className={cx('nb-line__value', amount && 'nb-type-amount')}>{hasChildren ? children : value}</span>
      ) : null}
      {actions && <span className="nb-line__actions">{actions}</span>}
    </Element>
  )
}

export function NotebookDivider({ children, className = '', ...props }) {
  return (
    <div className={cx('nb-divider', className)} role="separator" {...props}>
      {children && <span>{children}</span>}
    </div>
  )
}

export function NotebookFooter({
  actions = null,
  as: Element = 'footer',
  children,
  className = '',
  meta = '',
  ...props
}) {
  return (
    <Element className={cx('nb-footer', className)} {...props}>
      <div className="nb-footer__copy">
        {children}
        {meta && <span className="nb-type-caption">{meta}</span>}
      </div>
      {actions && <div className="nb-footer__actions">{actions}</div>}
    </Element>
  )
}

export function NotebookText({
  as: Element = 'p',
  children,
  className = '',
  variant = 'body',
  ...props
}) {
  return (
    <Element className={cx(getNotebookTypographyClass(variant), className)} {...props}>
      {children}
    </Element>
  )
}

export function NotebookAmount({
  as: Element = 'span',
  children,
  className = '',
  tone = 'default',
  ...props
}) {
  return (
    <Element className={cx('nb-amount nb-type-amount', tone !== 'default' && `nb-amount--${tone}`, className)} {...props}>
      {children}
    </Element>
  )
}

export function NotebookHandwritingAccent({
  as: Element = 'span',
  children,
  className = '',
  ...props
}) {
  return (
    <Element className={cx('nb-type-handwriting', className)} {...props}>
      {children}
    </Element>
  )
}
