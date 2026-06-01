import { PiggyBank, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput, EmptyState } from './AppPrimitives.jsx'
import { normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { slugify } from '../lib/uiHelpers'

export function SavingsBucketsManager({ buckets, addSavingsBucket, updateSavingsBucket, removeSavingsBucket }) {
  return (
    <section className="savings-manager">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Savings goals</p>
          <h2>Small goals, clearer comfort.</h2>
          <p className="section-note">Emergency fund, bike savings, laptop goal, or anything you want to protect.</p>
        </div>
        <button className="ghost-button small-button" type="button" onClick={addSavingsBucket}>
          <Plus size={17} />
          Add goal
        </button>
      </div>
      <div className="bucket-grid">
        {buckets.length === 0 ? (
          <EmptyState
            title="Give your next plan a place"
            detail="A small savings goal makes progress visible without adding pressure."
            actionLabel="Add goal"
            onAction={addSavingsBucket}
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
    </article>
  )
}

function SavingsBucketCard({ bucket, compact = false }) {
  const saved = normalizeMoney(bucket.saved)
  const target = normalizeMoney(bucket.target)
  const progress = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0

  return (
    <article className={`bucket-card ${compact ? 'compact' : ''}`}>
      <div>
        <h3>{bucket.name || 'Savings goal'}</h3>
        <p>{rupees(saved)} saved of {rupees(target)}</p>
      </div>
      <strong>{progress}%</strong>
      <div className="bucket-progress" aria-label={`${progress}% saved`}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </article>
  )
}
