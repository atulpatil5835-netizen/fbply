import { useState } from 'react'
import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput, EmptyState } from './AppPrimitives.jsx'
import { SuccessState as MoneyOSSuccessState } from '../design-system'
import { normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { slugify } from '../lib/uiHelpers'
import { trackEvent } from '../lib/analytics'

export function SavingsBucketsManager({ buckets, addSavingsBucket, updateSavingsBucket, removeSavingsBucket }) {
  const [successMessage, setSuccessMessage] = useState('')

  const handleAddGoal = (source = 'header') => {
    trackEvent(source === 'empty_state' ? 'empty_state_cta_clicked' : 'feature_discovery_click', {
      surface: 'planner',
      source,
      empty_state: source === 'empty_state' ? 'savings_goals' : undefined,
      feature: 'goals',
      target: 'create_goal',
    })
    addSavingsBucket?.()
    setSuccessMessage('Savings goal created.')
  }

  return (
    <section className="savings-manager" id="savings-goals-section">
      <div className="section-heading-row">
        <div>
          <h2>Goals</h2>
        </div>
        {buckets.length > 0 && (
          <button className="ghost-button small-button" type="button" onClick={() => handleAddGoal('header')}>
            <Plus size={17} />
            Create Goal
          </button>
        )}
      </div>
      {successMessage && (
        <MoneyOSSuccessState
          title="Savings Goal Created"
          detail={`${successMessage} Successfully added.`}
          actions={[
            {
              label: 'Add another',
              onClick: () => handleAddGoal('success_state'),
              variant: 'primary',
            },
          ]}
          className="savings-goal-success-state"
        />
      )}
      <div className="bucket-grid">
        {buckets.length === 0 ? (
          <EmptyState
            title="No goals yet"
            detail="Start with one protected target."
            actionLabel="Create Goal"
            onAction={() => handleAddGoal('empty_state')}
            icon={PiggyBank}
          />
        ) : (
          buckets.map((bucket) => (
            <SavingsBucketEditor
              bucket={bucket}
              key={bucket.id}
              updateSavingsBucket={updateSavingsBucket}
              removeSavingsBucket={removeSavingsBucket}
            />
          ))
        )}
      </div>
    </section>
  )
}

function SavingsBucketEditor({ bucket, updateSavingsBucket, removeSavingsBucket }) {
  return (
    <article className="bucket-editor">
      <SavingsBucketCard bucket={bucket} />
      <details className="bucket-editor-details">
        <summary>Edit</summary>
        <div className="bucket-editor-fields">
          <input
            className="plain-input"
            value={bucket.name}
            onChange={(event) => updateSavingsBucket(bucket.id, { name: event.target.value })}
          />
          <CurrencyInput
            label="Saved"
            id={`bucket-saved-${slugify(bucket.id)}`}
            value={bucket.saved}
            onChange={(value) => updateSavingsBucket(bucket.id, { saved: normalizeMoney(value) })}
          />
          <CurrencyInput
            label="Target"
            id={`bucket-target-${slugify(bucket.id)}`}
            value={bucket.target}
            onChange={(value) => updateSavingsBucket(bucket.id, { target: normalizeMoney(value) })}
          />
          <div className="bucket-recurring-grid">
            <div className="bucket-recurring-amount">
              <CurrencyInput
                label="Monthly add"
                id={`bucket-monthly-${slugify(bucket.id)}`}
                value={bucket.monthlyContribution || ''}
                onChange={(value) => updateSavingsBucket(bucket.id, { monthlyContribution: normalizeMoney(value) })}
              />
            </div>
            <label>
              <span className="input-label">Due day</span>
              <input
                className="plain-input"
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={bucket.dueDay || ''}
                placeholder="1"
                onChange={(event) => updateSavingsBucket(bucket.id, { dueDay: Number(event.target.value || 0) || undefined })}
              />
            </label>
          </div>
          <label>
            <span className="input-label">Deadline</span>
            <input
              className="plain-input"
              type="date"
              value={bucket.deadline || ''}
              onChange={(event) => updateSavingsBucket(bucket.id, { deadline: event.target.value })}
            />
          </label>
          <button className="ghost-button" type="button" onClick={() => removeSavingsBucket(bucket.id)}>
            <Trash2 size={17} />
            Remove
          </button>
        </div>
      </details>
    </article>
  )
}

function SavingsBucketCard({ bucket, compact = false }) {
  const saved = normalizeMoney(bucket.saved)
  const target = normalizeMoney(bucket.target)
  const progress = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0
  const remaining = Math.max(target - saved, 0)
  const monthlyContribution = normalizeMoney(bucket.monthlyContribution) || (remaining > 0 ? Math.ceil(remaining / 6) : 0)

  return (
    <article className={`bucket-card ${compact ? 'compact' : ''}`}>
      <div>
        <h3>{bucket.name || 'Savings goal'}</h3>
        <p>{progress}% complete</p>
      </div>
      <div className="bucket-progress" aria-label={`${progress}% saved`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="bucket-card-metrics">
        <span>
          <small>Remaining</small>
          <strong>{rupees(remaining)}</strong>
        </span>
        <span>
          <small>Monthly</small>
          <strong>{monthlyContribution > 0 ? rupees(monthlyContribution) : 'Set'}</strong>
        </span>
      </div>
    </article>
  )
}
