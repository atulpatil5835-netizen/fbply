import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Coffee,
  CreditCard,
  HelpCircle,
  Pencil,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingBag,
  Utensils,
  Wallet,
} from 'lucide-react'
import { getCurrencySymbol, normalizeMoney } from '../lib/money'
import { rupees, shortRupees } from '../lib/ruleEngine'
import {
  buildUniversalQuickAddSuggestions,
  createMoneyInboxDraft,
  createMoneyInboxDraftFromParsedIntent,
  isMoneyInboxEnabled,
  moneyInboxConfidence,
  moneyInboxIntentTypes,
  moneyInboxKinds,
  moneyInboxSources,
  parseBulkMoneyInboxLines,
  parseUniversalMoneyInboxInput,
} from '../lib/moneyInbox'

const iconMap = {
  car: Car,
  coffee: Coffee,
  creditCard: CreditCard,
  piggyBank: PiggyBank,
  plane: Plane,
  receipt: Receipt,
  shoppingBag: ShoppingBag,
  utensils: Utensils,
  wallet: Wallet,
}

const captureKinds = [
  { kind: moneyInboxKinds.expense, label: 'Expense' },
  { kind: moneyInboxKinds.income, label: 'Income' },
  { kind: moneyInboxKinds.borrow, label: 'Borrow' },
  { kind: moneyInboxKinds.lend, label: 'Lend' },
  { kind: moneyInboxKinds.transfer, label: 'Save to goal' },
  { kind: moneyInboxKinds.split, label: 'Split' },
]

const intentChoices = [
  { kind: moneyInboxKinds.expense, label: 'Expense' },
  { kind: moneyInboxKinds.income, label: 'Income' },
  { kind: moneyInboxKinds.borrow, label: 'Borrow' },
  { kind: moneyInboxKinds.lend, label: 'Lend' },
  { kind: moneyInboxKinds.transfer, label: 'Save to goal' },
]

const intentLabels = {
  [moneyInboxKinds.expense]: 'Expense',
  [moneyInboxKinds.income]: 'Income',
  [moneyInboxKinds.borrow]: 'Borrow',
  [moneyInboxKinds.lend]: 'Lend',
  [moneyInboxKinds.transfer]: 'Save to goal',
  [moneyInboxKinds.split]: 'Split',
  [moneyInboxIntentTypes.unknown]: 'Needs type',
}

function templateAmount(template = {}) {
  if (normalizeMoney(template.amount) <= 0) {
    return ''
  }

  return shortRupees(template.amount)
}

function suggestionAriaLabel(suggestion = {}) {
  const amount = templateAmount(suggestion)
  return amount ? `Use ${suggestion.label} ${amount}` : `Use ${suggestion.label}`
}

function suggestionElementId(suggestion = {}, index = 0) {
  const safeId = String(suggestion.id || index).replace(/[^a-z0-9_-]/gi, '-')
  return `money-inbox-suggestion-${index}-${safeId}`
}

function kindNeedsName(kind) {
  return kind === moneyInboxKinds.expense || kind === moneyInboxKinds.split
}

function kindNeedsPerson(kind) {
  return kind === moneyInboxKinds.borrow || kind === moneyInboxKinds.lend
}

function kindNeedsAmount(kind) {
  return kind !== moneyInboxKinds.split
}

function draftSummary(draft = {}) {
  if (!draft) {
    return ''
  }

  const amount = normalizeMoney(draft.amount) > 0 ? rupees(draft.amount) : ''
  const label = draft.person || draft.label || draft.kind

  return `${label}${amount ? ` ${amount}` : ''} ready to review.`
}

function confidenceCopy(parsed = {}) {
  if (parsed.confidence === moneyInboxConfidence.high) {
    return 'High confidence'
  }

  if (parsed.confidence === moneyInboxConfidence.medium) {
    return 'Confirm type'
  }

  return 'Needs review'
}

function reviewCanContinue(parsed = {}, selectedKind = '') {
  const kind = selectedKind || parsed.detectedType
  const hasKnownKind = kind && kind !== moneyInboxIntentTypes.unknown
  const hasConfirmedKind = parsed.confidence === moneyInboxConfidence.high || Boolean(selectedKind)

  return hasKnownKind && hasConfirmedKind && normalizeMoney(parsed.detectedAmount) > 0 && Boolean(parsed.detectedTitle || parsed.detectedPerson)
}

export default function MoneyInboxQuickCapture({
  expenses = [],
  profile = {},
  moneyBookEntries = [],
  savingsBuckets = [],
  sharedGroups = [],
  onPrepareDraft,
}) {
  const [quickText, setQuickText] = useState('')
  const [selectedKind, setSelectedKind] = useState('')
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0)
  const [kind, setKind] = useState(moneyInboxKinds.expense)
  const [label, setLabel] = useState('')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [preparedDraft, setPreparedDraft] = useState(null)
  const inputRef = useRef(null)

  const moneyInboxContext = useMemo(
    () => ({
      expenses,
      profile,
      moneyBookEntries,
      savingsBuckets,
      sharedGroups,
    }),
    [expenses, moneyBookEntries, profile, savingsBuckets, sharedGroups],
  )

  const parsedIntent = useMemo(
    () => parseUniversalMoneyInboxInput(quickText, moneyInboxContext),
    [moneyInboxContext, quickText],
  )

  const suggestions = useMemo(
    () => buildUniversalQuickAddSuggestions(quickText, moneyInboxContext),
    [moneyInboxContext, quickText],
  )

  const bulkDrafts = useMemo(() => parseBulkMoneyInboxLines(bulkText), [bulkText])
  const effectiveReviewKind = selectedKind || parsedIntent.detectedType
  const canContinueReview = reviewCanContinue(parsedIntent, selectedKind)
  const shouldAskForIntent = Boolean(quickText.trim()) && parsedIntent.confidence !== moneyInboxConfidence.high
  const unresolvedFields = parsedIntent.unknownFields.filter((field) => field !== 'type' || !selectedKind)
  const safeHighlightedSuggestionIndex = suggestions.length > 0
    ? Math.min(highlightedSuggestionIndex, suggestions.length - 1)
    : 0
  const activeDescendant = suggestions[safeHighlightedSuggestionIndex]?.id
    ? suggestionElementId(suggestions[safeHighlightedSuggestionIndex], safeHighlightedSuggestionIndex)
    : undefined

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  if (!isMoneyInboxEnabled()) {
    return null
  }

  const prepareDraft = (draftInput) => {
    const draft = createMoneyInboxDraft(draftInput)
    setPreparedDraft(draft)
    onPrepareDraft?.(draft)
  }

  const applySuggestion = (suggestion) => {
    setQuickText(suggestion.fillText)
    setSelectedKind(suggestion.kind)
    setPreparedDraft(null)
    setHighlightedSuggestionIndex(0)
    inputRef.current?.focus({ preventScroll: true })
  }

  const continueReview = () => {
    if (!canContinueReview) {
      return
    }

    const draft = createMoneyInboxDraftFromParsedIntent(parsedIntent, selectedKind || parsedIntent.detectedType)
    setPreparedDraft(draft)
    onPrepareDraft?.(draft)
  }

  const prepareManualDraft = () => {
    prepareDraft({
      kind,
      source: moneyInboxSources.manual,
      label,
      category: kind === moneyInboxKinds.expense ? label || 'Other' : '',
      person,
      amount,
      note,
    })
  }

  const onUniversalKeyDown = (event) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault()
      setHighlightedSuggestionIndex((current) => (current + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault()
      setHighlightedSuggestionIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
      return
    }

    if (event.key === 'Escape') {
      if (quickText) {
        event.preventDefault()
        setQuickText('')
        setSelectedKind('')
        setPreparedDraft(null)
        setHighlightedSuggestionIndex(0)
      }

      return
    }

    if (event.key !== 'Enter') {
      return
    }

    const highlightedSuggestion = suggestions[safeHighlightedSuggestionIndex]
    const normalizedSuggestion = String(highlightedSuggestion?.fillText || '').trim().toLowerCase()
    const normalizedInput = String(quickText || '').trim().toLowerCase()

    event.preventDefault()

    if (highlightedSuggestion && normalizedSuggestion && normalizedSuggestion !== normalizedInput) {
      applySuggestion(highlightedSuggestion)
      return
    }

    continueReview()
  }

  const manualLabel = kindNeedsPerson(kind) ? person : label
  const manualReady = kind === moneyInboxKinds.split
    ? Boolean(String(manualLabel || '').trim())
    : normalizeMoney(amount) > 0 && (!kindNeedsName(kind) || String(label || '').trim()) && (!kindNeedsPerson(kind) || String(person || '').trim())

  return (
    <section className="money-inbox-capture" aria-labelledby="money-inbox-capture-title">
      <div className="money-inbox-capture-header">
        <div>
          <p className="eyebrow">Money Inbox</p>
          <h3 id="money-inbox-capture-title">Universal quick add</h3>
        </div>
        {preparedDraft && (
          <span className="money-inbox-live" role="status" aria-live="polite">
            {draftSummary(preparedDraft)}
          </span>
        )}
      </div>

      <div className="money-inbox-universal">
        <label htmlFor="money-inbox-universal-input">
          <span className="input-label">Type anything</span>
          <span className="money-inbox-universal-input-shell">
            <Receipt size={18} aria-hidden="true" />
            <input
              id="money-inbox-universal-input"
              ref={inputRef}
              type="text"
              value={quickText}
              placeholder="Tea 20, Salary 50000, Save 1000"
              autoComplete="off"
              role="combobox"
              aria-controls="money-inbox-suggestions"
              aria-expanded={suggestions.length > 0}
              aria-activedescendant={activeDescendant}
              onChange={(event) => {
                setQuickText(event.target.value)
                setSelectedKind('')
                setPreparedDraft(null)
                setHighlightedSuggestionIndex(0)
              }}
              onKeyDown={onUniversalKeyDown}
            />
            <span className="money-inbox-key-hint" aria-hidden="true">Enter</span>
          </span>
        </label>

        {suggestions.length > 0 && (
          <div className="money-inbox-suggestion-list" id="money-inbox-suggestions" role="listbox" aria-label="Recent suggestions">
            {suggestions.map((suggestion, index) => {
              const Icon = iconMap[suggestion.iconKey] || Receipt
              const isActive = index === safeHighlightedSuggestionIndex
              const amountLabel = templateAmount(suggestion)

              return (
                <button
                  id={suggestionElementId(suggestion, index)}
                  className={`money-inbox-suggestion ${isActive ? 'active' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  aria-label={suggestionAriaLabel(suggestion)}
                  key={suggestion.id}
                  onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                  onClick={() => applySuggestion(suggestion)}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{suggestion.label}</span>
                  {amountLabel && <strong>{amountLabel}</strong>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {quickText.trim() && (
        <article className={`money-inbox-review-card money-inbox-review-card--${effectiveReviewKind}`} aria-label="Quick add review">
          <div className="money-inbox-review-head">
            <span className={`money-inbox-intent-badge money-inbox-intent-badge--${effectiveReviewKind}`}>
              {effectiveReviewKind === moneyInboxIntentTypes.unknown ? <HelpCircle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              {intentLabels[effectiveReviewKind] || 'Review'}
            </span>
            <span className={`money-inbox-confidence money-inbox-confidence--${parsedIntent.confidence}`}>
              {confidenceCopy(parsedIntent)}
            </span>
          </div>

          <dl className="money-inbox-review-grid">
            <div>
              <dt>Title</dt>
              <dd>{parsedIntent.detectedTitle || parsedIntent.detectedPerson || 'Unknown'}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{normalizeMoney(parsedIntent.detectedAmount) > 0 ? rupees(parsedIntent.detectedAmount) : 'Needed'}</dd>
            </div>
            {parsedIntent.detectedPerson && (
              <div>
                <dt>Person</dt>
                <dd>{parsedIntent.detectedPerson}</dd>
              </div>
            )}
            {effectiveReviewKind === moneyInboxKinds.expense && (
              <div>
                <dt>Category</dt>
                <dd>{parsedIntent.category || 'Suggested'}</dd>
              </div>
            )}
            {unresolvedFields.length > 0 && (
              <div>
                <dt>Unknown</dt>
                <dd>{unresolvedFields.join(', ')}</dd>
              </div>
            )}
          </dl>

          {shouldAskForIntent && (
            <div className="money-inbox-choice-row" aria-label="Choose money type">
              {intentChoices.map((choice) => (
                <button
                  className={selectedKind === choice.kind ? 'active' : ''}
                  type="button"
                  key={choice.kind}
                  onClick={() => setSelectedKind(choice.kind)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          )}

          <div className="money-inbox-review-actions">
            <button className="money-inbox-edit-button" type="button" onClick={() => inputRef.current?.focus({ preventScroll: true })}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
            <button className="primary-button money-inbox-continue-button" type="button" disabled={!canContinueReview} onClick={continueReview}>
              Continue
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </article>
      )}

      <details className="money-inbox-secondary-capture">
        <summary>
          <span>More capture options</span>
        </summary>

        <div className="money-inbox-kind-row" role="tablist" aria-label="Capture type">
          {captureKinds.map((item) => (
            <button
              className={kind === item.kind ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={kind === item.kind}
              key={item.kind}
              onClick={() => setKind(item.kind)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="money-inbox-manual-grid">
          {kindNeedsName(kind) && (
            <label>
              <span className="input-label">{kind === moneyInboxKinds.split ? 'Group or bill' : 'Name'}</span>
              <input
                className="plain-input"
                type="text"
                value={label}
                placeholder={kind === moneyInboxKinds.split ? 'Trip dinner' : 'Tea, fuel, groceries'}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
          )}

          {kindNeedsPerson(kind) && (
            <label>
              <span className="input-label">Person</span>
              <input
                className="plain-input"
                type="text"
                value={person}
                placeholder="Rahul, Priya..."
                onChange={(event) => setPerson(event.target.value)}
              />
            </label>
          )}

          {kindNeedsAmount(kind) && (
            <label>
              <span className="input-label">Amount</span>
              <span className="money-inbox-amount-input">
                <span aria-hidden="true">{getCurrencySymbol()}</span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={amount}
                  placeholder="120"
                  aria-label="Inbox amount"
                  onChange={(event) => setAmount(event.target.value)}
                />
              </span>
            </label>
          )}

          <label className="money-inbox-note-field">
            <span className="input-label">Note</span>
            <input
              className="plain-input"
              type="text"
              value={note}
              placeholder="Optional"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <button className="primary-button money-inbox-prepare-button" type="button" disabled={!manualReady} onClick={prepareManualDraft}>
            Prepare
          </button>
        </div>

        <details className="money-inbox-bulk">
          <summary>
            <span>Bulk capture</span>
          </summary>
          <label>
            <span className="input-label">Paste lines</span>
            <textarea
              className="plain-input"
              rows={3}
              value={bulkText}
              placeholder={'Tea 20\nFuel 500'}
              onChange={(event) => setBulkText(event.target.value)}
            />
          </label>
          {bulkDrafts.length > 0 && (
            <div className="money-inbox-bulk-preview" aria-label="Bulk capture preview">
              {bulkDrafts.map((draft) => (
                <button
                  type="button"
                  key={draft.id}
                  disabled={normalizeMoney(draft.amount) <= 0}
                  onClick={() => prepareDraft(draft)}
                >
                  <span>{draft.label}</span>
                  <strong>{templateAmount(draft) || 'Add amount'}</strong>
                </button>
              ))}
            </div>
          )}
        </details>
      </details>
    </section>
  )
}
