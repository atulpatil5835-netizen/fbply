import { useEffect, useState } from 'react'
import { ChevronRight, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { CurrencyInput, EmptyState } from './AppPrimitives.jsx'
import { SuccessState as MoneyOSSuccessState } from '../design-system'
import { normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { slugify } from '../lib/uiHelpers'
import { trackEvent } from '../lib/analytics'
import { isLegacyProgressLayer, trackProgressComponentsViewed } from '../lib/progressLayer'

const defaultWeeklyStep = 500

function buildGoalViewModel(bucket = {}) {
  const saved = normalizeMoney(bucket.saved)
  const target = normalizeMoney(bucket.target)
  const remaining = Math.max(target - saved, 0)
  const progress = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0
  const monthlyContribution = normalizeMoney(bucket.monthlyContribution)

  return {
    ...bucket,
    title: String(bucket.name || '').trim() || 'Savings goal',
    saved,
    target,
    remaining,
    progress,
    monthlyContribution,
  }
}

function buildSuggestedNextStep(goals = []) {
  const focusGoal = goals.find((goal) => goal.remaining > 0) || goals[0]

  if (!focusGoal) {
    return {
      label: 'Create Goal',
      detail: 'Start with one future plan.',
    }
  }

  if (focusGoal.target <= 0) {
    return {
      label: 'Set a target',
      detail: `${focusGoal.title} can show progress once it has a target.`,
    }
  }

  if (goals.every((goal) => goal.target > 0 && goal.remaining <= 0)) {
    return {
      label: 'Continue current pace',
      detail: 'Your visible goals are fully saved.',
    }
  }

  if (focusGoal.monthlyContribution > 0 && focusGoal.saved > 0) {
    return {
      label: 'Continue current pace',
      detail: `${focusGoal.title} is ${focusGoal.progress}% saved.`,
    }
  }

  const weeklyStep = focusGoal.monthlyContribution > 0
    ? Math.max(Math.ceil(focusGoal.monthlyContribution / 4 / 100) * 100, 100)
    : defaultWeeklyStep

  return {
    label: `Add ${rupees(weeklyStep)} this week`,
    detail: `${focusGoal.title} needs ${rupees(focusGoal.remaining)} more.`,
  }
}

function buildSavingsOverview(buckets = []) {
  const goals = buckets.map(buildGoalViewModel)
  const saved = normalizeMoney(goals.reduce((total, goal) => total + goal.saved, 0))
  const target = normalizeMoney(goals.reduce((total, goal) => total + goal.target, 0))
  const remaining = Math.max(target - saved, 0)
  const progress = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0

  return {
    goals,
    saved,
    target,
    remaining,
    progress,
    nextStep: buildSuggestedNextStep(goals),
  }
}

export function SavingsBucketsManager({ buckets = [], addSavingsBucket, updateSavingsBucket, removeSavingsBucket }) {
  const [successMessage, setSuccessMessage] = useState('')
  const overview = buildSavingsOverview(buckets)
  const legacyProgressLayer = isLegacyProgressLayer()

  useEffect(() => {
    if (buckets.length > 0) {
      trackProgressComponentsViewed('savings', ['savings_goal_progress'])
    }
  }, [buckets.length])

  const handleAddGoal = (source = 'header') => {
    trackEvent(source === 'empty_state' ? 'empty_state_cta_clicked' : 'feature_discovery_click', {
      surface: 'planner',
      source,
      empty_state: source === 'empty_state' ? 'savings_goals' : undefined,
      feature: 'goals',
      target: 'create_goal',
    })
    addSavingsBucket?.()
    setSuccessMessage('Goal created.')
  }

  return (
    <section className="savings-manager" id="savings-goals-section">
      <div className="section-heading-row savings-goals-heading">
        <div>
          <h2>Goals</h2>
        </div>
        {buckets.length > 0 && (
          <button className="primary-button small-button" type="button" onClick={() => handleAddGoal('header')}>
            <Plus size={17} />
            Create Goal
          </button>
        )}
      </div>
      {buckets.length > 0 && (
        legacyProgressLayer ? (
          <div className="savings-progress-summary" aria-label="Savings goals progress">
            <article className="savings-overview-item savings-overview-progress">
              <span>Progress</span>
              <strong>{overview.progress}%</strong>
              <div className="bucket-progress" aria-label={`${overview.progress}% saved across goals`}>
                <span style={{ width: `${overview.progress}%` }} />
              </div>
            </article>
            <article className="savings-overview-item">
              <span>Remaining Amount</span>
              <strong>{rupees(overview.remaining)}</strong>
              <small>{rupees(overview.saved)} saved</small>
            </article>
            <article className="savings-overview-item savings-next-step">
              <span>Suggested Next Step</span>
              <strong>{overview.nextStep.label}</strong>
              <small>{overview.nextStep.detail}</small>
            </article>
          </div>
        ) : (
          <div className="savings-progress-summary v74-savings-summary" aria-label="Savings goals progress">
            <article className="v74-progress-strip v74-savings-overview">
              <div className="v74-progress-header">
                <span>Savings Progress</span>
                <strong>{overview.progress}%</strong>
              </div>
              <div className="v74-progress-track" aria-label={`${overview.progress}% saved across goals`}>
                <span className="v74-progress-fill" style={{ width: `${overview.progress}%` }} />
              </div>
              <p className="v74-progress-note">
                {rupees(overview.saved)} saved of {rupees(overview.target)} target; {rupees(overview.remaining)} remaining.
              </p>
            </article>
            <article className="v74-progress-metric">
              <span>Saved</span>
              <strong>{rupees(overview.saved)}</strong>
            </article>
            <article className="v74-progress-metric">
              <span>Target</span>
              <strong>{rupees(overview.target)}</strong>
            </article>
            <article className="v74-progress-metric">
              <span>Remaining</span>
              <strong>{rupees(overview.remaining)}</strong>
            </article>
          </div>
        )
      )}
      {successMessage && (
        <MoneyOSSuccessState
          title="Savings Goal Created"
          detail={successMessage}
          className="savings-goal-success-state"
        />
      )}
      <div className="bucket-grid">
        {buckets.length === 0 ? (
          <EmptyState
            title="Create your first savings goal"
            detail="Emergency fund, bike, vacation, laptop, or debt payoff."
            actionLabel="Create Goal"
            onAction={() => handleAddGoal('empty_state')}
            icon={PiggyBank}
          />
        ) : (
          overview.goals.map((bucket) => (
            <SavingsBucketEditor
              bucket={bucket}
              key={bucket.id}
              progressLayerActive={!legacyProgressLayer}
              updateSavingsBucket={updateSavingsBucket}
              removeSavingsBucket={removeSavingsBucket}
            />
          ))
        )}
      </div>
    </section>
  )
}

function SavingsBucketEditor({ bucket, progressLayerActive = false, updateSavingsBucket, removeSavingsBucket }) {
  return (
    <article className="bucket-editor">
      <SavingsBucketCard bucket={bucket} progressLayerActive={progressLayerActive} />
      <details className="bucket-editor-details">
        <summary>
          <span>Adjust details</span>
          <ChevronRight size={14} />
        </summary>
        <div className="bucket-editor-fields">
          <label>
            <span className="input-label">Goal name</span>
            <input
              className="plain-input"
              value={bucket.name}
              onChange={(event) => updateSavingsBucket(bucket.id, { name: event.target.value })}
            />
          </label>
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
          <button className="ghost-button bucket-remove-button" type="button" onClick={() => removeSavingsBucket(bucket.id)}>
            <Trash2 size={17} />
            Remove
          </button>
        </div>
      </details>
    </article>
  )
}

function SavingsBucketCard({ bucket, compact = false, progressLayerActive = false }) {
  const saved = normalizeMoney(bucket.saved)
  const target = normalizeMoney(bucket.target)
  const progress = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0
  const remaining = Math.max(target - saved, 0)

  return (
    <article className={`bucket-card ${compact ? 'compact' : ''} ${progressLayerActive ? 'v74-savings-goal' : ''}`}>
      <div className="bucket-card-heading">
        <div>
          <h3>{bucket.title || bucket.name || 'Savings goal'}</h3>
          <p>{progress}% saved</p>
        </div>
        <span className="bucket-progress-pill">{progress}%</span>
      </div>
      <div className="bucket-progress" aria-label={`${progress}% saved toward ${bucket.title || bucket.name || 'goal'}`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="bucket-card-metrics">
        <span>
          <small>Saved</small>
          <strong>{rupees(saved)}</strong>
        </span>
        <span>
          <small>Remaining</small>
          <strong>{rupees(remaining)}</strong>
        </span>
        <span>
          <small>Target</small>
          <strong>{rupees(target)}</strong>
        </span>
      </div>
    </article>
  )
}
