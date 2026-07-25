import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, ChevronRight, Sparkles, X } from 'lucide-react'
import { isMotionReduced, motionTokens, useReducedMotion } from './motion.js'
import { cx, renderIcon } from './utils.js'
import './money-os.css'

function IconFrame({ icon, tone = 'default' }) {
  if (!icon) {
    return null
  }

  return (
    <span className={cx('mos-icon-frame', tone !== 'default' && `mos-icon-frame--${tone}`)} aria-hidden="true">
      {renderIcon(icon, { size: 18 })}
    </span>
  )
}

function cardTone(tone) {
  return tone && tone !== 'neutral' ? `mos-card--${tone}` : null
}

function clampNumberRevealDuration(value) {
  const duration = Number(value ?? motionTokens.duration.numberReveal)

  if (!Number.isFinite(duration)) {
    return motionTokens.duration.numberReveal
  }

  return Math.min(
    Math.max(duration, motionTokens.numberReveal.minDuration),
    motionTokens.numberReveal.maxDuration,
  )
}

function cleanMotionDelay(value) {
  const delay = Number(value ?? motionTokens.delay.none)

  return Number.isFinite(delay) ? Math.max(delay, motionTokens.delay.none) : motionTokens.delay.none
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3)
}

function parseRevealText(value) {
  const text = String(value ?? '')
  const match = text.match(/-?\d[\d,]*(?:\.\d+)?/)

  if (!match) {
    return { text, canAnimate: false }
  }

  const numberText = match[0]
  const target = Number(numberText.replace(/,/g, ''))

  if (!Number.isFinite(target) || target === 0) {
    return { text, canAnimate: false }
  }

  const decimalText = numberText.split('.')[1] || ''
  const fractionDigits = decimalText.length

  return {
    text,
    canAnimate: true,
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + numberText.length),
    target,
    fractionDigits,
    formatter: new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }),
  }
}

function formatRevealText(parts, amount) {
  const normalizedAmount = parts.fractionDigits > 0 ? amount : Math.round(amount)

  return `${parts.prefix}${parts.formatter.format(normalizedAmount)}${parts.suffix}`
}

export function AnimatedNumber({
  as: Element = 'span',
  value,
  duration = motionTokens.duration.numberReveal,
  delay = motionTokens.delay.numberReveal,
  className = '',
  reveal = true,
  ...props
}) {
  const currentText = String(value ?? '')
  const [initialParts] = useState(() => parseRevealText(currentText))
  const reducedMotion = useReducedMotion()
  const currentParts = useMemo(() => parseRevealText(currentText), [currentText])
  const [displayText, setDisplayText] = useState(() => {
    return reveal && initialParts.canAnimate && !isMotionReduced()
      ? formatRevealText(initialParts, 0)
      : currentText
  })
  const [isRevealing, setIsRevealing] = useState(false)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    const valueChangedAfterMount = currentText !== initialParts.text

    if (!reveal || reducedMotion || !initialParts.canAnimate || valueChangedAfterMount || hasAnimatedRef.current) {
      hasAnimatedRef.current = true
      setIsRevealing(false)
      setDisplayText(currentText)
      return undefined
    }

    let frameId = 0
    let delayId = 0
    const durationMs = clampNumberRevealDuration(duration)
    const delayMs = cleanMotionDelay(delay)

    const startReveal = () => {
      const startedAt = performance.now()
      setIsRevealing(true)

      const tick = (now) => {
        const progress = Math.min((now - startedAt) / durationMs, 1)
        const nextAmount = initialParts.target * easeOutCubic(progress)

        setDisplayText(formatRevealText(initialParts, nextAmount))

        if (progress < 1) {
          frameId = window.requestAnimationFrame(tick)
          return
        }

        hasAnimatedRef.current = true
        setIsRevealing(false)
        setDisplayText(initialParts.text)
      }

      frameId = window.requestAnimationFrame(tick)
    }

    delayId = window.setTimeout(startReveal, delayMs)

    return () => {
      window.clearTimeout(delayId)

      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [currentText, delay, duration, initialParts, reducedMotion, reveal])

  return (
    <Element
      className={cx('fbply-animated-number', className)}
      data-revealing={isRevealing ? 'true' : undefined}
      aria-label={currentParts.canAnimate ? currentText : undefined}
      {...props}
    >
      {displayText}
    </Element>
  )
}

export function MoneyOSProvider({ as: Element = 'div', children, className = '', ...props }) {
  return (
    <Element className={cx('money-os money-os-theme mos-surface', className)} {...props}>
      {children}
    </Element>
  )
}

export function FLoader({
  as: Element = 'div',
  label = 'Loading',
  size = 'md',
  fullPage = false,
  inline = false,
  className = '',
  ...props
}) {
  return (
    <Element
      className={cx(
        'money-os mos-loader',
        size !== 'md' && `mos-loader--${size}`,
        fullPage && 'mos-loader--page',
        inline && 'mos-loader--inline',
        className,
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      <span className="mos-loader__network" aria-hidden="true">
        <span className="mos-loader__mark">
          <img src="/fbply-f-mark.png" alt="" decoding="async" />
        </span>
        <span className="mos-loader__orbit mos-loader__orbit--one">
          <span />
        </span>
        <span className="mos-loader__orbit mos-loader__orbit--two">
          <span />
        </span>
        <span className="mos-loader__orbit mos-loader__orbit--three">
          <span />
        </span>
      </span>
      {label !== null && <span className="mos-loader__label">{label}</span>}
    </Element>
  )
}

export function MoneyCard({
  as: Element = 'section',
  eyebrow = '',
  title = '',
  detail = '',
  meta = '',
  icon = null,
  tone = 'neutral',
  elevated = false,
  interactive = false,
  actions = null,
  footer = null,
  children,
  className = '',
  ...props
}) {
  const titleId = useId()

  return (
    <Element
      className={cx(
        'money-os mos-card',
        cardTone(tone),
        elevated && 'mos-card--elevated',
        interactive && 'mos-card--interactive',
        className,
      )}
      aria-labelledby={title ? titleId : undefined}
      {...props}
    >
      {(title || detail || eyebrow || meta || icon || actions) && (
        <div className="mos-card__header">
          <IconFrame icon={icon} tone={tone} />
          <div className="mos-card__copy">
            {eyebrow && <span className="mos-eyebrow">{eyebrow}</span>}
            {title && <h3 id={titleId}>{title}</h3>}
            {detail && <p className="mos-card__detail">{detail}</p>}
          </div>
          {(meta || actions) && (
            <div className="mos-card__actions">
              {meta && <span className="mos-card__meta">{meta}</span>}
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
      {footer && <div className="mos-card__footer">{footer}</div>}
    </Element>
  )
}

export function StatCard({
  label,
  value,
  detail = '',
  trend = '',
  icon = null,
  tone = 'neutral',
  animatedValue = false,
  className = '',
  ...props
}) {
  return (
    <MoneyCard
      className={cx('mos-stat-card', className)}
      title={label}
      detail={detail}
      icon={icon}
      tone={tone}
      {...props}
    >
      {animatedValue ? (
        <AnimatedNumber as="strong" className="mos-stat-card__value" value={value} />
      ) : (
        <strong className="mos-stat-card__value">{value}</strong>
      )}
      {trend && <span className="mos-stat-card__trend">{trend}</span>}
    </MoneyCard>
  )
}

export function ActionCard({
  title,
  detail = '',
  actionLabel = 'Open',
  icon = null,
  tone = 'neutral',
  href = '',
  onClick,
  disabled = false,
  children,
  className = '',
  ...props
}) {
  const Element = href ? 'a' : 'div'
  const actionProps = href
    ? { href, 'aria-disabled': disabled || undefined }
    : { role: 'button', tabIndex: disabled ? -1 : 0, 'aria-disabled': disabled || undefined }

  function handleClick(event) {
    if (disabled) {
      event.preventDefault()
      return
    }

    if (onClick) {
      onClick(event)
    }
  }

  function handleKeyDown(event) {
    if (disabled || href) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick(event)
    }
  }

  return (
    <MoneyCard
      as={Element}
      className={cx('mos-action-card', className)}
      title={title}
      detail={detail}
      icon={icon}
      tone={tone}
      interactive={!disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...actionProps}
      {...props}
    >
      {children}
      <span className="mos-action-card__cue">
        {actionLabel}
        <ChevronRight size={16} aria-hidden="true" />
      </span>
    </MoneyCard>
  )
}

export function InsightCard({
  title,
  insight,
  detail = '',
  icon = Sparkles,
  tone = 'tint',
  actions = null,
  children,
  className = '',
  ...props
}) {
  return (
    <MoneyCard
      className={cx('mos-insight-card', className)}
      title={title}
      detail={detail}
      icon={icon}
      tone={tone}
      actions={actions}
      {...props}
    >
      {insight && <div className="mos-insight-card__body">{insight}</div>}
      {children}
    </MoneyCard>
  )
}

export function TimelineCard({
  title,
  detail = '',
  items = [],
  icon = null,
  tone = 'neutral',
  children,
  className = '',
  ...props
}) {
  return (
    <MoneyCard
      className={cx('mos-timeline-card', className)}
      title={title}
      detail={detail}
      icon={icon}
      tone={tone}
      {...props}
    >
      {items.length > 0 && (
        <ol className="mos-timeline-card__list">
          {items.map((item, index) => (
            <li
              className="mos-timeline-card__item"
              data-tone={item.tone || 'default'}
              key={item.id || `${item.title || 'item'}-${index}`}
            >
              <span className="mos-timeline-card__marker" aria-hidden="true" />
              <div className="mos-timeline-card__copy">
                <strong>{item.title}</strong>
                {item.detail && <p>{item.detail}</p>}
                {item.meta && <span className="mos-timeline-card__meta">{item.meta}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {children}
    </MoneyCard>
  )
}

export function StatusBadge({ children, tone = 'neutral', icon = null, className = '', ...props }) {
  return (
    <span
      className={cx('money-os mos-badge', tone !== 'neutral' && `mos-badge--${tone}`, className)}
      {...props}
    >
      {renderIcon(icon, { size: 14 })}
      {children}
    </span>
  )
}

export const PrimaryButton = forwardRef(function PrimaryButton(
  {
    children,
    icon = null,
    trailingIcon = null,
    loading = false,
    loadingLabel = 'Working',
    size = 'md',
    className = '',
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      className={cx('money-os mos-button mos-button--primary', size !== 'md' && `mos-button--${size}`, className)}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      ref={ref}
      {...props}
    >
      {loading ? <FLoader as="span" label="" size="xs" inline /> : renderIcon(icon, { size: 17 })}
      <span>{loading ? loadingLabel : children}</span>
      {!loading && renderIcon(trailingIcon, { size: 17 })}
    </button>
  )
})

export const SecondaryButton = forwardRef(function SecondaryButton(
  {
    children,
    icon = null,
    trailingIcon = null,
    loading = false,
    loadingLabel = 'Working',
    size = 'md',
    className = '',
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      className={cx('money-os mos-button mos-button--secondary', size !== 'md' && `mos-button--${size}`, className)}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      ref={ref}
      {...props}
    >
      {loading ? <FLoader as="span" label="" size="xs" inline /> : renderIcon(icon, { size: 17 })}
      <span>{loading ? loadingLabel : children}</span>
      {!loading && renderIcon(trailingIcon, { size: 17 })}
    </button>
  )
})

export function BottomSheet({
  open,
  onClose,
  title = '',
  description = '',
  children,
  footer = null,
  labelledBy = '',
  className = '',
  bodyClassName = '',
}) {
  const generatedTitleId = useId()
  const titleId = labelledBy || generatedTitleId
  const sheetRef = useRef(null)

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const focusFrame = window.requestAnimationFrame(() => {
      const focusable = sheetRef.current?.querySelector(
        '.mos-sheet__body [data-autofocus="true"], .mos-sheet__body button:not(:disabled), .mos-sheet__body [href], .mos-sheet__body input:not(:disabled), .mos-sheet__body select:not(:disabled), .mos-sheet__body textarea:not(:disabled), .mos-sheet__body [tabindex]:not([tabindex="-1"])',
      )

      if (focusable && !sheetRef.current?.contains(document.activeElement)) {
        focusable.focus()
      }
    })

    function handleKeyDown(event) {
      if (event.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="money-os mos-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={sheetRef}
        className={cx('mos-sheet', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mos-sheet__header">
          <div className="mos-sheet__title">
            {title && <h2 id={titleId}>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {onClose && (
            <button className="mos-sheet__close" type="button" aria-label="Close" onClick={onClose}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </header>
        <div className={cx('mos-sheet__body', bodyClassName)}>{children}</div>
        {footer && <footer className="mos-sheet__footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}

export function EmptyState({
  title,
  detail = '',
  icon = Sparkles,
  action = null,
  secondaryAction = null,
  children,
  className = '',
  ...props
}) {
  return (
    <div className={cx('money-os mos-state mos-empty-state', className)} {...props}>
      <span className="mos-state__visual" aria-hidden="true">
        {renderIcon(icon, { size: 22 })}
      </span>
      <div>
        <h3>{title}</h3>
        {detail && <p>{detail}</p>}
      </div>
      {children}
      {(action || secondaryAction) && (
        <div className="mos-state__actions">
          {secondaryAction && <SecondaryButton onClick={secondaryAction.onClick}>{secondaryAction.label}</SecondaryButton>}
          {action && <PrimaryButton onClick={action.onClick}>{action.label}</PrimaryButton>}
        </div>
      )}
    </div>
  )
}

export function SuccessState({
  title = 'Success',
  detail = '',
  icon = CheckCircle2,
  actions = [],
  onUndo,
  onAddAnother,
  undoLabel = 'Undo',
  addAnotherLabel = 'Add another',
  children,
  className = '',
  ...props
}) {
  const resolvedActions = actions.length > 0
    ? actions
    : [
        onUndo && { label: undoLabel, onClick: onUndo, variant: 'secondary' },
        onAddAnother && { label: addAnotherLabel, onClick: onAddAnother, variant: 'primary' },
      ].filter(Boolean)

  return (
    <div className={cx('money-os mos-state mos-success-state', className)} {...props}>
      <span className="mos-state__visual" aria-hidden="true">
        {renderIcon(icon, { size: 24 })}
      </span>
      <div>
        <h3>{title}</h3>
        {detail && <p>{detail}</p>}
      </div>
      {children}
      {resolvedActions.length > 0 && (
        <div className="mos-state__actions">
          {resolvedActions.map((action) => {
            const Button = action.variant === 'primary' ? PrimaryButton : SecondaryButton

            return (
              <Button key={action.label} onClick={action.onClick}>
                {action.label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SectionHeader({
  eyebrow = '',
  title,
  detail = '',
  actions = null,
  className = '',
  ...props
}) {
  return (
    <header className={cx('money-os mos-section-header', className)} {...props}>
      <div className="mos-section-header__copy">
        {eyebrow && <span className="mos-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {actions && <div className="mos-section-header__actions">{actions}</div>}
    </header>
  )
}

export function PageHeader({
  eyebrow = '',
  title,
  detail = '',
  actions = null,
  className = '',
  ...props
}) {
  return (
    <header className={cx('money-os mos-page-header', className)} {...props}>
      <div className="mos-page-header__copy">
        {eyebrow && <span className="mos-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {detail && <p>{detail}</p>}
      </div>
      {actions && <div className="mos-page-header__actions">{actions}</div>}
    </header>
  )
}
