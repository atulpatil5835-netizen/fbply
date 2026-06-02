import { useMemo, useState } from 'react'
import { Trash2, User } from 'lucide-react'
import { CurrencyInput, EmptyState } from '../components/AppPrimitives.jsx'
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

export default function SharedExpensesPanel({
  groups,
  profile,
  sharedSummary,
  addSharedGroup,
  addSharedPayment,
  markSharedSettlementReceived,
  removeSharedGroup,
  variant = 'default',
}) {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState(() => resolveCurrentUserName(profile))
  const [people, setPeople] = useState('')
  const [purpose, setPurpose] = useState('')
  const [paymentDrafts, setPaymentDrafts] = useState({})
  const [groupErrors, setGroupErrors] = useState({})
  const [paymentErrors, setPaymentErrors] = useState({})
  const [message, setMessage] = useState({ text: '', tone: 'info' })
  const currentUserName = resolveCurrentUserName(profile)
  const reconciledGroups = useMemo(
    () => groups.map((group) => reconcileSharedGroup(group, profile)),
    [groups, profile],
  )

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

  const clearPaymentError = (groupId, field) => {
    setPaymentErrors((current) => {
      const groupFields = current[groupId]

      if (!groupFields?.[field]) {
        return current
      }

      const nextGroupFields = { ...groupFields }
      delete nextGroupFields[field]

      return {
        ...current,
        [groupId]: nextGroupFields,
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
      purpose,
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
    setPurpose('')
    setGroupErrors({})
  }

  const updatePaymentDraft = (groupId, patch) => {
    setPaymentDrafts((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] || {}),
        ...patch,
      },
    }))
  }

  const submitPayment = (event, group) => {
    event.preventDefault()
    const form = event.currentTarget
    const draft = paymentDrafts[group.id] || {}
    const fieldErrors = {}
    const parsedAmount = normalizeMoney(draft.amount)
    const cleanLabel = String(draft.label || '').trim()
    const cleanPaidBy = String(draft.paidBy || currentUserName).trim()
    const participantText = String(draft.participants ?? group.people.map((person) => displayPersonName(person, profile)).join(', '))
    const cleanParticipants = uniqueSharedPeople(
      participantText
        .split(',')
        .map((person) => person.trim())
        .filter(Boolean),
    )

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
      setPaymentErrors((current) => ({ ...current, [group.id]: fieldErrors }))
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
    setPaymentErrors((current) => ({ ...current, [group.id]: {} }))
    setPaymentDrafts((current) => ({
      ...current,
      [group.id]: { label: '', amount: '', paidBy: '', participants: '' },
    }))
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
        <label>
          <span className="input-label">Expense / Purpose</span>
          <input
            className="plain-input"
            id="shared-purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Hotel, rent, dinner, fuel"
          />
        </label>
        <button className="primary-button full" type="submit">
          Create group
        </button>
        {message.text && <p className={`form-message ${message.tone === 'error' ? 'form-message-error' : ''}`}>{message.text}</p>}
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
          <EmptyState
            title="Split your first trip expense"
            detail="Create a group, add people, then record the first payment when it happens."
            actionLabel="Create trip group"
            onAction={() => focusSharedGroupName('empty_state')}
            icon={User}
          />
        )}
        {reconciledGroups.map((group) => {
          const draft = paymentDrafts[group.id] || {}
          const payerOptions = group.people.length > 0 ? group.people : [currentUserName]
          const selectedTripPayer = draft.paidBy || currentUserName

          return (
            <article className="shared-card" key={group.id}>
              <div className="shared-card-top">
                <div>
                  <h2>{group.name}</h2>
                  <p>{group.purpose || 'Shared expenses'}</p>
                  <small>{group.people.map((person) => displayPersonName(person, profile)).join(', ')}</small>
                </div>
                <button className="icon-button" type="button" aria-label={`Remove ${group.name}`} onClick={() => removeSharedGroup(group.id)}>
                  <Trash2 size={16} />
                </button>
              </div>

              <form className={`trip-payment-form ${Object.keys(paymentErrors[group.id] || {}).length > 0 ? 'form-has-errors' : ''}`} onSubmit={(event) => submitPayment(event, group)}>
                <label>
                  <span className="input-label">Expense / Purpose</span>
                  <input
                    className={`plain-input ${paymentErrors[group.id]?.label ? 'field-invalid' : ''}`}
                    value={draft.label || ''}
                    placeholder={group.purpose || 'Hotel, petrol, dinner'}
                    aria-invalid={paymentErrors[group.id]?.label ? 'true' : undefined}
                    onChange={(event) => {
                      updatePaymentDraft(group.id, { label: event.target.value })
                      clearPaymentError(group.id, 'label')
                    }}
                  />
                  {paymentErrors[group.id]?.label && <small className="field-helper">{paymentErrors[group.id].label}</small>}
                </label>
                <div>
                  <CurrencyInput
                    label="Amount"
                    id={`trip-payment-${slugify(group.id)}`}
                    value={draft.amount || ''}
                    onChange={(value) => {
                      updatePaymentDraft(group.id, { amount: value })
                      clearPaymentError(group.id, 'amount')
                    }}
                    placeholder="1200"
                    error={paymentErrors[group.id]?.amount}
                  />
                </div>
                <label>
                  <span className="input-label">Paid by</span>
                  <select
                    className={`month-select stable-select ${paymentErrors[group.id]?.paidBy ? 'field-invalid' : ''}`}
                    value={selectedTripPayer}
                    aria-invalid={paymentErrors[group.id]?.paidBy ? 'true' : undefined}
                    onChange={(event) => {
                      updatePaymentDraft(group.id, { paidBy: event.target.value })
                      clearPaymentError(group.id, 'paidBy')
                    }}
                  >
                    {payerOptions.map((person) => (
                      <option key={person} value={person}>
                        {displayPersonName(person, profile)}
                      </option>
                    ))}
                  </select>
                  <small className="field-hint">Choose the person who paid first.</small>
                  {paymentErrors[group.id]?.paidBy && <small className="field-helper">{paymentErrors[group.id].paidBy}</small>}
                </label>
                <label>
                  <span className="input-label">Participants</span>
                  <input
                    className="plain-input"
                    value={draft.participants ?? group.people.map((person) => displayPersonName(person, profile)).join(', ')}
                    placeholder="You, Rahul, Priya"
                    onChange={(event) => updatePaymentDraft(group.id, { participants: event.target.value })}
                  />
                  <small className="field-hint">Use commas for who joined this payment.</small>
                </label>
                <button className="ghost-button" type="submit">
                  Add shared payment
                </button>
              </form>

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
                  const isSettled = item.status === 'received'
                  const isPaid = item.status === 'paid'
                  const isIncoming = item.direction === 'incoming'
                  const isOutgoing = item.direction === 'outgoing'
                  const label = isIncoming
                    ? `${displayPersonName(item.from, profile)} pays you`
                    : isOutgoing
                      ? `You pay ${displayPersonName(item.to, profile)}`
                      : `${displayPersonName(item.from, profile)} pays ${displayPersonName(item.to, profile)}`
                  const actionLabel = isOutgoing ? 'Mark paid' : 'Mark received'
                  const displayAmount = item.remainingAmount || item.amount

                  return (
                    <div className={`settlement-item ${isSettled || isPaid ? 'received' : ''}`} key={item.id}>
                      <span className="settlement-text">
                        {label} <strong>{rupees(displayAmount)}</strong>
                      </span>
                      {isIncoming || isOutgoing ? (
                        <button
                          className="text-action-button"
                          type="button"
                          disabled={isSettled || isPaid}
                          onClick={() => markSharedSettlementReceived(group.id, item.id)}
                        >
                          {actionLabel}
                        </button>
                      ) : (
                        <span className="settlement-status">Pending</span>
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
