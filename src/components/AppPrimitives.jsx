import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles } from 'lucide-react'
import { getCurrencySymbol } from '../lib/money'
import { slugify } from '../lib/uiHelpers.js'

export function EmptyState({ title, detail, actionLabel, onAction, icon: Icon = Sparkles }) {
  return (
    <div className="empty-state">
      <span className="empty-visual" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        {actionLabel && onAction && (
          <button className="ghost-button small-button empty-state-action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export function AppModal({ children, onClose, labelledBy, sheetClassName = 'editor-sheet', backdropClassName = 'editor-sheet-backdrop' }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div className={backdropClassName} role="presentation" onClick={onClose}>
      <section
        className={sheetClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>,
    document.body,
  )
}

export function BrandMark({ size = 'default' }) {
  return (
    <span className={`brand-mark ${size}`} aria-hidden="true">
      <img src="/fbply-f-mark.png" alt="" decoding="async" />
    </span>
  )
}

export function HeaderLogo() {
  return (
    <div className="header-logo">
      <BrandMark />
      <span>FBPly</span>
    </div>
  )
}

export function CurrencyInput({ label, value, onChange, placeholder = '0', id = slugify(label), ariaLabel = label, error = '' }) {
  return (
    <>
      <label className="input-label" htmlFor={id}>
        {label}
      </label>
      <div className={`currency-input ${error ? 'field-invalid' : ''}`}>
        <span>{getCurrencySymbol()}</span>
        <input
          id={id}
          min="0"
          type="number"
          aria-label={ariaLabel}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error && <small className="field-helper">{error}</small>}
    </>
  )
}
