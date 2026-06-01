import { useMemo, useState } from 'react'
import { CalendarDays, Pause, Play, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput } from './AppPrimitives.jsx'
import {
  nextScheduleDate,
  recurringFrequencies,
  recurringTypes,
} from '../lib/recurringSchedule'
import { normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'

function defaultForm() {
  const today = new Date()

  return {
    id: '',
    name: '',
    amount: '',
    type: 'Subscription',
    direction: 'outgoing',
    frequency: 'monthly',
    dueDay: today.getDate(),
    startDate: today.toISOString().slice(0, 10),
    note: '',
    paused: false,
  }
}

function displayFrequency(value) {
  return String(value || 'monthly').charAt(0).toUpperCase() + String(value || 'monthly').slice(1)
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Next'
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function directionForType(type, currentDirection) {
  if (type === 'Salary') {
    return 'incoming'
  }

  if (currentDirection === 'incoming' || currentDirection === 'outgoing') {
    return currentDirection
  }

  return 'outgoing'
}

export default function RecurringScheduleManager({
  schedules = [],
  addSchedule,
  updateSchedule,
  removeSchedule,
  toggleSchedule,
}) {
  const [form, setForm] = useState(defaultForm)
  const [formError, setFormError] = useState('')
  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => nextScheduleDate(a).getTime() - nextScheduleDate(b).getTime()),
    [schedules],
  )
  const isEditing = Boolean(form.id)

  const patchForm = (patch) => {
    setForm((current) => ({ ...current, ...patch }))
    setFormError('')
  }

  const resetForm = () => {
    setForm(defaultForm())
    setFormError('')
  }

  const saveSchedule = (event) => {
    event.preventDefault()
    const name = String(form.name || form.type).trim()
    const amount = normalizeMoney(form.amount)

    if (!name) {
      setFormError('Add a name.')
      return
    }

    const payload = {
      ...form,
      name,
      amount,
      direction: directionForType(form.type, form.direction),
      dueDay: Math.min(Math.max(Number(form.dueDay || 1), 1), 31),
    }

    if (isEditing) {
      updateSchedule(form.id, payload)
    } else {
      addSchedule(payload)
    }

    resetForm()
  }

  return (
    <section className="recurring-manager settings-commitments">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Recurring</p>
          <h2>Future schedules</h2>
        </div>
      </div>

      <form className="recurring-form" onSubmit={saveSchedule}>
        <div className="recurring-form-grid">
          <label>
            <span className="input-label">Type</span>
            <select
              className="month-select"
              value={form.type}
              onChange={(event) => {
                const type = event.target.value
                patchForm({
                  type,
                  name: form.name || type,
                  direction: directionForType(type, form.direction),
                })
              }}
            >
              {recurringTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="input-label">Name</span>
            <input
              className="plain-input"
              type="text"
              value={form.name}
              placeholder="Netflix, Rent, LIC..."
              onChange={(event) => patchForm({ name: event.target.value })}
            />
          </label>
          <CurrencyInput
            label="Amount"
            id={isEditing ? `recurring-amount-${form.id}` : 'recurring-amount-new'}
            value={form.amount}
            onChange={(value) => patchForm({ amount: value })}
          />
          <label>
            <span className="input-label">Direction</span>
            <select
              className="month-select"
              value={form.direction}
              onChange={(event) => patchForm({ direction: event.target.value })}
            >
              <option value="outgoing">Outflow</option>
              <option value="incoming">Inflow</option>
            </select>
          </label>
          <label>
            <span className="input-label">Frequency</span>
            <select
              className="month-select"
              value={form.frequency}
              onChange={(event) => patchForm({ frequency: event.target.value })}
            >
              {recurringFrequencies.map((frequency) => (
                <option key={frequency} value={frequency}>{displayFrequency(frequency)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="input-label">Due day</span>
            <input
              className="plain-input"
              type="number"
              min="1"
              max="31"
              inputMode="numeric"
              value={form.dueDay}
              onChange={(event) => patchForm({ dueDay: event.target.value })}
            />
          </label>
          <label>
            <span className="input-label">Start date</span>
            <input
              className="plain-input"
              type="date"
              value={form.startDate}
              onChange={(event) => patchForm({ startDate: event.target.value })}
            />
          </label>
        </div>
        <div className="recurring-form-actions">
          <button className="primary-button" type="submit">
            <Plus size={17} />
            {isEditing ? 'Save' : 'Add'}
          </button>
          {isEditing && (
            <button className="ghost-button" type="button" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
        {formError && <p className="form-message form-message-error">{formError}</p>}
      </form>

      {sortedSchedules.length > 0 && (
        <div className="recurring-list">
          {sortedSchedules.map((schedule) => (
            <article className={`recurring-row ${schedule.paused ? 'paused' : ''}`} key={schedule.id}>
              <span className="soft-icon">
                <CalendarDays size={17} />
              </span>
              <button
                className="recurring-row-main"
                type="button"
                aria-label={`Edit ${schedule.name}`}
                onClick={() => setForm({
                  ...schedule,
                  amount: String(schedule.amount || ''),
                })}
              >
                <strong>{schedule.name}</strong>
                <small>
                  {schedule.direction === 'incoming' ? 'Inflow' : 'Outflow'} · {displayFrequency(schedule.frequency)} · {formatDate(nextScheduleDate(schedule))}
                </small>
              </button>
              <span className={schedule.direction === 'incoming' ? 'recurring-amount incoming' : 'recurring-amount outgoing'}>
                {rupees(schedule.amount)}
              </span>
              <button
                className="icon-button"
                type="button"
                aria-label={schedule.paused ? `Resume ${schedule.name}` : `Pause ${schedule.name}`}
                onClick={() => toggleSchedule(schedule.id)}
              >
                {schedule.paused ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={`Delete ${schedule.name}`}
                onClick={() => removeSchedule(schedule.id)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
