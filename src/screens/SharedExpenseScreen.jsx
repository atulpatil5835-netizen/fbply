import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Share2, Trash2, User } from 'lucide-react'
import { CurrencyInput } from '../components/AppPrimitives.jsx'
import { EmptyState as MoneyOSEmptyState, SuccessState as MoneyOSSuccessState } from '../design-system'
import {
  displayPersonName,
  normalizePersonName,
  reconcileSharedGroup,
  resolveCurrentUserName,
  uniqueSharedPeople,
} from '../lib/financialActivity'
import { normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { focusInvalidField, slugify } from '../lib/uiHelpers'
import { trackEvent } from '../lib/analytics'
import { isLegacyProgressLayer, percentFromParts, trackProgressComponentsViewed } from '../lib/progressLayer'

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word

    if (context.measureText(next).width <= maxWidth || !current) {
      current = next
      return
    }

    lines.push(current)
    current = word
  })

  if (current) {
    lines.push(current)
  }

  const visible = lines.slice(0, maxLines)

  if (lines.length > maxLines && visible.length > 0) {
    visible[visible.length - 1] = `${visible[visible.length - 1].replace(/\.*$/, '')}...`
  }

  visible.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight)
  })

  return y + visible.length * lineHeight
}

function downloadCanvas(canvas, fileName) {
  const anchor = document.createElement('a')
  anchor.href = canvas.toDataURL('image/png')
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function isSharedSettlementComplete(settlement = {}) {
  return ['received', 'paid', 'settled'].includes(settlement.status) || normalizeMoney(settlement.remainingAmount) <= 0
}

function buildSharedSettlementProgress(group = {}) {
  const settlements = group.settlements || []
  const total = settlements.length

  if (total <= 0) {
    return null
  }

  const completed = settlements.filter(isSharedSettlementComplete).length
  const pending = Math.max(total - completed, 0)

  return {
    completed,
    pending,
    progress: percentFromParts(completed, total),
    total,
  }
}

function SharedSettlementProgress({ group = {} }) {
  const progress = buildSharedSettlementProgress(group)

  if (isLegacyProgressLayer() || !progress) {
    return null
  }

  return (
    <div className="v74-progress-strip v74-shared-progress" aria-label={`${group.name || 'Shared group'} settlement progress`}>
      <div className="v74-progress-header">
        <span>Settlement Progress</span>
        <strong>{progress.progress}%</strong>
      </div>
      <div className="v74-progress-track" aria-label={`${progress.progress}% settled`}>
        <span className="v74-progress-fill" style={{ width: `${progress.progress}%` }} />
      </div>
      <p className="v74-progress-note">
        {progress.completed} settled, {progress.pending} pending across {progress.total} participant settlement{progress.total === 1 ? '' : 's'}.
      </p>
    </div>
  )
}

function roundedCanvasRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

function buildTripSettlementSummary(group = {}) {
  const settlements = group.settlements || []
  const pending = settlements.filter((settlement) => !isSharedSettlementComplete(settlement))
  const pendingAmount = pending.reduce((total, settlement) => total + normalizeMoney(settlement.remainingAmount || settlement.amount), 0)

  if (settlements.length === 0) {
    return 'Add payments to calculate settlements'
  }

  if (pending.length === 0) {
    return 'All settlements complete'
  }

  return `${pending.length} pending · ${rupees(pendingAmount)}`
}

async function downloadTripShareCardPng(group = {}, profile = {}) {
  if (typeof document === 'undefined') {
    return false
  }

  try {
    const members = group.people || []
    const settlementSummary = buildTripSettlementSummary(group)
    const width = 1080
    const height = 720
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    const logo = await loadCanvasImage('/fbply-f-mark.png')
    const cardX = 64
    const cardWidth = width - cardX * 2

    context.fillStyle = '#F8FAFC'
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#0B1020'
    context.fillRect(0, 0, width, 188)

    if (logo) {
      context.fillStyle = '#FFFFFF'
      roundedCanvasRect(context, 64, 48, 78, 78, 20)
      context.fill()
      context.drawImage(logo, 74, 58, 58, 58)
    }

    context.fillStyle = '#FFFFFF'
    context.font = '800 40px Inter, Segoe UI, sans-serif'
    drawWrappedText(context, group.name || 'Shared trip', 164, 78, cardWidth - 120, 46, 2)
    context.fillStyle = '#94A3B8'
    context.font = '600 22px Inter, Segoe UI, sans-serif'
    context.fillText('FBPly trip share card', 164, 132)

    let y = 228
    const drawCard = (top, cardHeight) => {
      context.fillStyle = '#FFFFFF'
      context.strokeStyle = '#D8E1EF'
      context.lineWidth = 2
      roundedCanvasRect(context, cardX, top, cardWidth, cardHeight, 24)
      context.fill()
      context.stroke()
    }

    drawCard(y, 250)
    const stats = [
      ['Total Expense', rupees(group.amount || 0)],
      ['Participants', String(members.length || 0)],
      ['Settlement Summary', settlementSummary],
    ]

    stats.forEach(([label, value], index) => {
      const statY = y + 34 + index * 72
      context.fillStyle = '#64748B'
      context.font = '800 18px Inter, Segoe UI, sans-serif'
      context.fillText(label.toUpperCase(), cardX + 30, statY)
      context.fillStyle = '#0F172A'
      context.font = index === 0 ? '900 40px Inter, Segoe UI, sans-serif' : '850 28px Inter, Segoe UI, sans-serif'
      drawWrappedText(context, value, cardX + 30, statY + 34, cardWidth - 60, 34, index === 2 ? 2 : 1)
    })

    y += 286
    drawCard(y, 118)
    context.fillStyle = '#64748B'
    context.font = '800 18px Inter, Segoe UI, sans-serif'
    context.fillText('GENERATED BY FBPLY', cardX + 30, y + 42)
    context.fillStyle = '#0F172A'
    context.font = '850 24px Inter, Segoe UI, sans-serif'
    context.fillText('fbply.com', cardX + 30, y + 78)
    context.fillStyle = '#64748B'
    context.font = '700 18px Inter, Segoe UI, sans-serif'
    context.fillText(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), cardX + 30, y + 108)

    downloadCanvas(canvas, `FBPly-${slugify(group.name || 'shared-trip')}-share-card.png`)
    return true
  } catch {
    return false
  }
}

export default function SharedExpensesPanel({
  groups,
  profile,
  sharedSummary,
  addSharedGroup,
  addSharedPayment,
  markSharedSettlementReceived,
  removeSharedGroup,
  onExportTripPdf,
  variant = 'default',
}) {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState(() => resolveCurrentUserName(profile))
  const [people, setPeople] = useState('')
  const [paymentDrafts, setPaymentDrafts] = useState({})
  const [groupErrors, setGroupErrors] = useState({})
  const [paymentErrors, setPaymentErrors] = useState({})
  const [message, setMessage] = useState({ text: '', tone: 'info' })
  const currentUserName = resolveCurrentUserName(profile)
  const reconciledGroups = useMemo(
    () => groups.map((group) => reconcileSharedGroup(group, profile)),
    [groups, profile],
  )
  const groupsWithSettlementProgress = reconciledGroups.filter((group) => (group.settlements || []).length > 0).length

  useEffect(() => {
    if (groupsWithSettlementProgress > 0) {
      trackProgressComponentsViewed('shared_expenses', ['shared_expense_progress'])
    }
  }, [groupsWithSettlementProgress])

  const clearGroupError = (field) => {
    setGroupErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const paymentDraftKey = (groupId, person) => `${groupId}-${slugify(normalizePersonName(person) || 'person')}`

  const clearPaymentError = (draftKey, field) => {
    setPaymentErrors((current) => {
      const groupFields = current[draftKey]

      if (!groupFields?.[field]) {
        return current
      }

      const nextGroupFields = { ...groupFields }
      delete nextGroupFields[field]

      return {
        ...current,
        [draftKey]: nextGroupFields,
      }
    })
  }

  const focusSharedGroupName = (source = 'manual') => {
    if (source === 'empty_state') {
      trackEvent('empty_state_cta_clicked', {
        surface: 'shared_expenses',
        empty_state: 'shared_groups',
        target: 'create_trip_group',
      })
    }

    if (typeof document !== 'undefined') {
      document.getElementById('shared-group-name')?.focus()
    }
  }

  const submitGroup = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const cleanName = name.trim()
    const cleanOwnerName = ownerName.trim()
    const ownNameKey = normalizePersonName(cleanOwnerName)
    const rawPeopleList = people
      .split(',')
      .map((person) => person.trim())
      .filter(Boolean)
    const peopleList = uniqueSharedPeople(rawPeopleList)
      .filter((person) => {
        const key = normalizePersonName(person)
        return key && key !== ownNameKey && key !== 'you' && key !== 'me'
      })
    const fieldErrors = {}

    if (!cleanName) {
      fieldErrors.name = 'Name the trip, group, or shared bill.'
    }

    if (!cleanOwnerName) {
      fieldErrors.ownerName = 'Add your name so payer identity is clear.'
    }

    if (rawPeopleList.length === 0) {
      fieldErrors.people = 'Add at least one other participant.'
    } else if (peopleList.length === 0) {
      fieldErrors.people = 'Keep your name above. Add one other person here.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setGroupErrors(fieldErrors)
      setMessage({ text: 'Complete the highlighted fields to create the group.', tone: 'error' })
      focusInvalidField(form)
      return
    }

    const saved = addSharedGroup({
      name: cleanName,
      ownerName: cleanOwnerName,
      people: peopleList,
    })

    if (!saved) {
      setMessage({ text: 'Add a group name and at least one participant.', tone: 'error' })
      focusInvalidField(form)
      return
    }

    setMessage({
      text: rawPeopleList.length !== peopleList.length
        ? 'Group created. Your name stayed separate from participants.'
        : 'Group created. Add the first shared payment when it happens.',
      tone: 'success',
    })
    setName('')
    setPeople('')
    setGroupErrors({})
  }

  const updatePaymentDraft = (draftKey, patch) => {
    setPaymentDrafts((current) => ({
      ...current,
      [draftKey]: {
        ...(current[draftKey] || {}),
        ...patch,
      },
    }))
  }

  const submitPayment = (event, group, payerName) => {
    event.preventDefault()
    const form = event.currentTarget
    const draftKey = paymentDraftKey(group.id, payerName)
    const draft = paymentDrafts[draftKey] || {}
    const fieldErrors = {}
    const parsedAmount = normalizeMoney(draft.amount)
    const cleanLabel = String(draft.label || '').trim()
    const cleanPaidBy = String(payerName || currentUserName).trim()
    const cleanParticipants = uniqueSharedPeople(group.people || [])

    if (!cleanLabel) {
      fieldErrors.label = 'Add what this payment was for.'
    }

    if (!parsedAmount || parsedAmount <= 0) {
      fieldErrors.amount = 'Add a positive amount.'
    }

    if (!cleanPaidBy) {
      fieldErrors.paidBy = 'Choose who paid.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setPaymentErrors((current) => ({ ...current, [draftKey]: fieldErrors }))
      setMessage({ text: 'Complete the highlighted payment fields.', tone: 'error' })
      focusInvalidField(form)
      return
    }

    const saved = addSharedPayment(group.id, {
      label: cleanLabel,
      amount: parsedAmount,
      paidBy: cleanPaidBy,
      participants: cleanParticipants,
    })

    if (!saved) {
      setMessage({ text: 'Add what was paid, amount, and who paid.', tone: 'error' })
      focusInvalidField(form)
      return
    }

    setMessage({ text: `${cleanLabel} added to ${group.name}.`, tone: 'success' })
    setPaymentErrors((current) => ({ ...current, [draftKey]: {} }))
    setPaymentDrafts((current) => ({
      ...current,
      [draftKey]: { label: '', amount: '' },
    }))
  }

  const downloadTripShareCard = async (group) => {
    const saved = await downloadTripShareCardPng(group, profile)

    setMessage(saved
      ? { text: `${group.name} share card is ready.`, tone: 'success' }
      : { text: 'Could not prepare the share card. Please try again.', tone: 'error' })
  }

  const exportTripPdf = (group) => {
    if (!onExportTripPdf) {
      setMessage({ text: 'Open Reports to export the full trip PDF.', tone: 'info' })
      return
    }

    onExportTripPdf(group.id, group.name)
  }

  return (
    <section className={`shared-panel ${variant === 'planner' ? 'planner-shared-panel' : variant === 'activity' ? 'activity-shared-panel' : ''}`} id="shared-expenses-section">
      <div className="screen-heading compact-heading">
        <div>
          <p className="eyebrow">Shared money</p>
          <h1>{variant === 'planner' ? 'Split costs clearly.' : 'Track who paid and who owes.'}</h1>
          <p className="section-note shared-panel-note">Your name is handled separately. Add only the other people in the group.</p>
        </div>
      </div>

      <form className={`shared-form ${Object.keys(groupErrors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={submitGroup}>
        <div className="shared-identity-note">
          <User size={16} />
          <span>
            <strong>You are added automatically.</strong>
            <small>Participants should be friends, flatmates, or teammates only.</small>
          </span>
        </div>
        <label>
          <span className="input-label">Group / Trip Name *</span>
          <input
            className={`plain-input ${groupErrors.name ? 'field-invalid' : ''}`}
            id="shared-group-name"
            value={name}
            aria-invalid={groupErrors.name ? 'true' : undefined}
            onChange={(event) => {
              setName(event.target.value)
              clearGroupError('name')
            }}
            placeholder="Goa trip, flat rent"
          />
          {groupErrors.name && <small className="field-helper">{groupErrors.name}</small>}
        </label>
        <label>
          <span className="input-label">Your Name *</span>
          <input
            className={`plain-input ${groupErrors.ownerName ? 'field-invalid' : ''}`}
            id="shared-owner-name"
            value={ownerName}
            aria-invalid={groupErrors.ownerName ? 'true' : undefined}
            onChange={(event) => {
              setOwnerName(event.target.value)
              clearGroupError('ownerName')
            }}
            placeholder="Your name"
          />
          {groupErrors.ownerName && <small className="field-helper">{groupErrors.ownerName}</small>}
        </label>
        <label>
          <span className="input-label">Participants *</span>
          <input
            className={`plain-input ${groupErrors.people ? 'field-invalid' : ''}`}
            id="shared-participants"
            value={people}
            aria-invalid={groupErrors.people ? 'true' : undefined}
            onChange={(event) => {
              setPeople(event.target.value)
              clearGroupError('people')
            }}
            placeholder="Rahul, Priya, Sam"
          />
          <small className="field-hint">Separate names with commas. Do not add your own name here.</small>
          {groupErrors.people && <small className="field-helper">{groupErrors.people}</small>}
        </label>
        <button className="primary-button full" type="submit">
          Create group
        </button>
        {message.text && (
          message.tone === 'success' && !message.text.includes('PNG') ? (
            <MoneyOSSuccessState
              title={message.text}
              detail="Successfully added."
              actions={[
                {
                  label: 'Add another',
                  onClick: () => {
                    setMessage({ text: '', tone: 'info' })
                    focusSharedGroupName('success_state')
                  },
                  variant: 'primary',
                },
              ]}
              className="shared-money-success-state"
            />
          ) : (
            <p className={`form-message ${message.tone === 'error' ? 'form-message-error' : ''}`}>{message.text}</p>
          )
        )}
      </form>

      {sharedSummary?.activeGroups > 0 && (
        <div className="shared-metrics-strip" aria-label="Shared expense summary">
          <span>
            <small>You paid first</small>
            <strong>{rupees(sharedSummary.totalPaidByYou)}</strong>
          </span>
          <span>
            <small>Friends owe you</small>
            <strong>{rupees(sharedSummary.pendingRecoverable)}</strong>
          </span>
          <span>
            <small>Got back</small>
            <strong>{rupees(sharedSummary.receivedRecoveries)}</strong>
          </span>
          <span>
            <small>Month impact</small>
            <strong>{rupees(sharedSummary.netSharedImpact)}</strong>
          </span>
        </div>
      )}

      <div className="shared-list">
        {groups.length === 0 && (
          <MoneyOSEmptyState
            title="Start your first trip"
            detail="Create a group, add people, and record the first shared payment."
            icon={User}
            action={{ label: 'Create trip', onClick: () => focusSharedGroupName('empty_state') }}
          />
        )}
        {reconciledGroups.map((group) => {
          const peopleList = group.people.length > 0 ? group.people : [currentUserName]

          return (
            <article className="shared-card" key={group.id}>
              <div className="shared-card-top">
                <div>
                  <h2>{group.name}</h2>
                  <p>{peopleList.length} participants - {group.payments.length} payment{group.payments.length === 1 ? '' : 's'}</p>
                  <div className="participant-chip-row" aria-label={`${group.name} participants`}>
                    {peopleList.map((person) => (
                      <span key={person}>{displayPersonName(person, profile)}</span>
                    ))}
                  </div>
                </div>
                <div className="shared-card-actions">
                  <button className="icon-button mini-icon-button" type="button" aria-label={`Share ${group.name} card`} onClick={() => downloadTripShareCard(group)}>
                    <Share2 size={15} />
                  </button>
                  <button className="icon-button mini-icon-button" type="button" aria-label={`Export ${group.name} PDF`} onClick={() => exportTripPdf(group)}>
                    <FileText size={15} />
                  </button>
                  <button className="icon-button mini-icon-button" type="button" aria-label={`Remove ${group.name}`} onClick={() => removeSharedGroup(group.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <SharedSettlementProgress group={group} />

              <section className="participant-expense-entry" aria-label={`Add payments for ${group.name}`}>
                <div className="participant-expense-heading">
                  <span>Participant</span>
                  <span>Purpose</span>
                  <span>Amount</span>
                  <span>Add</span>
                </div>
                {peopleList.map((person) => {
                  const draftKey = paymentDraftKey(group.id, person)
                  const draft = paymentDrafts[draftKey] || {}
                  const errors = paymentErrors[draftKey] || {}
                  const displayName = displayPersonName(person, profile)

                  return (
                    <form className={`participant-expense-row ${Object.keys(errors).length > 0 ? 'form-has-errors' : ''}`} key={person} onSubmit={(event) => submitPayment(event, group, person)}>
                      <div className="participant-name-cell">
                        <span className="participant-avatar">{displayName.charAt(0).toUpperCase()}</span>
                        <span>
                          <strong>{displayName}</strong>
                          <small>Paid by {displayName}</small>
                        </span>
                      </div>
                      <label>
                        <span className="input-label">Purpose</span>
                        <input
                          className={`plain-input ${errors.label ? 'field-invalid' : ''}`}
                          value={draft.label || ''}
                          placeholder="Hotel, cab, dinner"
                          aria-invalid={errors.label ? 'true' : undefined}
                          onChange={(event) => {
                            updatePaymentDraft(draftKey, { label: event.target.value })
                            clearPaymentError(draftKey, 'label')
                          }}
                        />
                        {errors.label && <small className="field-helper">{errors.label}</small>}
                      </label>
                      <div>
                        <CurrencyInput
                          label="Amount"
                          id={`trip-payment-${slugify(group.id)}-${slugify(person)}`}
                          value={draft.amount || ''}
                          onChange={(value) => {
                            updatePaymentDraft(draftKey, { amount: value })
                            clearPaymentError(draftKey, 'amount')
                          }}
                          placeholder="1200"
                          error={errors.amount}
                        />
                      </div>
                      <button className="primary-button participant-add-button" type="submit">
                        <Plus size={15} />
                        Add
                      </button>
                      <small className="participant-split-note">Split with all participants in this group.</small>
                    </form>
                  )
                })}
              </section>

              {group.payments.length > 0 && (
                <div className="trip-payment-list">
                  {group.payments.slice(0, 4).map((payment) => (
                    <div className="trip-payment-row" key={payment.id}>
                      <span>
                        <strong>{payment.label}</strong>
                        <small>
                          {displayPersonName(payment.paidBy, profile)} paid
                          {payment.participants?.length > 0 ? ` for ${payment.participants.map((person) => displayPersonName(person, profile)).join(', ')}` : ''}
                        </small>
                      </span>
                      <b>{rupees(payment.amount)}</b>
                    </div>
                  ))}
                </div>
              )}

              <div className="shared-card-summary">
                <span>
                  <small>Total shared cost</small>
                  <strong>{rupees(group.amount)}</strong>
                </span>
                <span>
                  <small>Each person share</small>
                  <strong>{rupees(group.share)}</strong>
                </span>
                <span>
                  <small>Your share impact</small>
                  <strong>{rupees(group.cashImpact)}</strong>
                </span>
              </div>
              <div className="settlement-list">
                {group.settlements.length === 0 && (
                  <span className="settlement-empty">Add a shared payment to see who owes whom.</span>
                )}
                {group.settlements.map((item) => {
                  const isComplete = ['received', 'paid', 'settled'].includes(item.status) || item.remainingAmount <= 0
                  const label = `${displayPersonName(item.from, profile)} pays ${displayPersonName(item.to, profile)}`
                  const actionLabel = item.direction === 'incoming' ? 'Mark received' : 'Mark paid'
                  const displayAmount = item.remainingAmount || item.amount
                  const statusLabel = item.status === 'received'
                    ? 'Received'
                    : item.status === 'paid' || item.status === 'settled'
                      ? 'Paid'
                      : 'Pending'

                  return (
                    <div className={`settlement-item ${isComplete ? 'received' : ''}`} key={item.id}>
                      <span className="settlement-text">
                        {label} <strong>{rupees(displayAmount)}</strong>
                      </span>
                      {!isComplete ? (
                        <button
                          className="text-action-button"
                          type="button"
                          onClick={() => markSharedSettlementReceived(group.id, item.id)}
                        >
                          {actionLabel}
                        </button>
                      ) : (
                        <span className="settlement-status">{statusLabel}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
