import { useState } from 'react'
import { Bike, CalendarDays, Car, ChevronRight, House, Laptop, PiggyBank, Smartphone, Sparkles } from 'lucide-react'
import { CurrencyInput } from '../components/AppPrimitives.jsx'
import { SavingsBucketsManager } from '../components/SavingsBucketsManager.jsx'
import { normalizeMoney } from '../lib/money'
import { shortRupees } from '../lib/ruleEngine'

const planCategories = [
  { label: 'Car', icon: Car },
  { label: 'Bike', icon: Bike },
  { label: 'Phone', icon: Smartphone },
  { label: 'Laptop', icon: Laptop },
  { label: 'Appliance', icon: House },
  { label: 'Custom', icon: Sparkles },
]

const timelineOptions = [
  { key: 'asap', label: 'ASAP' },
  { key: '3m', label: '3 months' },
  { key: '6m', label: '6 months' },
  { key: '12m', label: '1 year' },
  { key: 'flexible', label: 'Flexible' },
]

export default function GoalsScreen({
  plannerInput,
  setPlannerInput,
  selectedPlan,
  setSelectedPlan,
  plannerTargetAmount,
  setPlannerTargetAmount,
  plannerCurrentSavings,
  setPlannerCurrentSavings,
  plannerTimeline,
  setPlannerTimeline,
  recommendation,
  financialState,
  savingsBuckets,
  addSavingsBucket,
  updateSavingsBucket,
  removeSavingsBucket,
}) {
  const [showAdvancedGoalFields, setShowAdvancedGoalFields] = useState(false)
  const hasPlannerPrice = normalizeMoney(plannerTargetAmount) > 0
  const hasPlannerName = String(plannerInput || '').trim().length > 0
  const showOptionalGoalFields = showAdvancedGoalFields || hasPlannerName

  return (
    <section className="screen-content goals-screen">
      <div className="screen-heading goals-heading">
        <div>
          <p className="eyebrow">Savings Goals</p>
          <h1>Plan the next money move.</h1>
          <p className="section-note">Start with the purchase. Savings goals stay close when you need them.</p>
        </div>
      </div>

      <section className="buy-safely-section">
        <div className="planner-section-title">
          <div>
            <p className="eyebrow">Buy safely</p>
            <h2>Can I afford this safely?</h2>
            <p>Answer a few quick inputs. FBPly keeps the deeper math in the background.</p>
          </div>
        </div>

        <PlannerRealityCard financialState={financialState} />

        <section className="planner-goal-card goal-flow-card">
          <div className="goal-step-row">
            <span className="goal-step-index">1</span>
            <div className="goal-step-content">
              <div>
                <span className="mini-label">Goal type</span>
                <h2>What are you planning?</h2>
              </div>
              <div className="goal-type-strip" aria-label="Goal type">
                {planCategories.map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      className={selectedPlan === category.label ? 'active' : ''}
                      key={category.label}
                      type="button"
                      onClick={() => setSelectedPlan(category.label)}
                    >
                      <Icon size={15} />
                      <span>{category.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="goal-step-row">
            <span className="goal-step-index">2</span>
            <div className="goal-step-content">
              <CurrencyInput
                label="Price"
                id="planner-target-amount"
                ariaLabel="Target purchase amount"
                value={plannerTargetAmount}
                placeholder="300000"
                onChange={setPlannerTargetAmount}
              />
              <small className="field-hint">Use the expected total price. Approximate is fine.</small>
            </div>
          </div>

          {hasPlannerPrice && (
            <div className="goal-step-row">
              <span className="goal-step-index">3</span>
              <div className="goal-step-content">
                <CurrencyInput
                  label="Savings ready"
                  id="planner-current-savings"
                  ariaLabel="Current savings available"
                  value={plannerCurrentSavings}
                  placeholder="40000"
                  onChange={setPlannerCurrentSavings}
                />
                <small className="field-hint">Money already available for this purchase.</small>
              </div>
            </div>
          )}

          {hasPlannerPrice && (
            <div className="goal-step-row">
              <span className="goal-step-index">4</span>
              <div className="goal-step-content">
                <span className="input-label">Timeline</span>
                <div className="timeline-control compact-timeline-control" aria-label="Desired timeline">
                  {timelineOptions.map((option) => (
                    <button
                      className={plannerTimeline === option.key ? 'active' : ''}
                      key={option.key}
                      type="button"
                      onClick={() => setPlannerTimeline(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasPlannerPrice && (
            <div className="goal-advanced-row">
              <button
                className="ghost-button small-button"
                type="button"
                onClick={() => setShowAdvancedGoalFields((current) => !current)}
              >
                <Sparkles size={15} />
                {showOptionalGoalFields ? 'Hide optional details' : 'Optional details'}
              </button>
            </div>
          )}

          {hasPlannerPrice && showOptionalGoalFields && (
            <div className="goal-advanced-fields">
              <label>
                <span className="input-label">Goal name</span>
                <div className="input-with-icon planner-search">
                  <PiggyBank size={17} />
                  <input
                    type="text"
                    value={plannerInput}
                    placeholder="Used car, work laptop, family trip"
                    onChange={(event) => setPlannerInput(event.target.value)}
                  />
                </div>
              </label>
            </div>
          )}

          {!hasPlannerPrice && (
            <p className="goal-flow-hint">Add a price to unlock savings, timeline, and a quick affordability summary.</p>
          )}
        </section>

        <RecommendationPanel
          recommendation={recommendation}
          financialState={financialState}
        />
      </section>

      <SavingsBucketsManager
        buckets={savingsBuckets}
        addSavingsBucket={addSavingsBucket}
        updateSavingsBucket={updateSavingsBucket}
        removeSavingsBucket={removeSavingsBucket}
      />
    </section>
  )
}

function PlannerRealityCard({ financialState }) {
  const safeRoom = normalizeMoney(financialState.safeToSpend ?? financialState.breathingRoom)
  const realityRows = [
    { label: 'Income', value: financialState.income },
    { label: 'Fixed basics', value: financialState.fixedExpensesTotal || 0 },
    { label: 'EMIs', value: financialState.emiAmount || 0 },
    { label: 'Daily spends', value: financialState.monthlyVariable || 0 },
    { label: 'Safe room', value: safeRoom, highlight: true },
  ]

  return (
    <article className="planner-reality-card">
      <div className="planner-reality-heading">
        <div>
          <span className="mini-label">Money status</span>
          <h2>Your monthly room</h2>
        </div>
        <span className={`simulation-pill ${financialState.pressureTone === 'slight-pressure' ? 'warm' : financialState.pressureTone}`}>
          {financialState.pressure}
        </span>
      </div>
      <div className="planner-reality-grid">
        {realityRows.map((row) => (
          <div className={row.highlight ? 'highlight' : ''} key={row.label}>
            <span>{row.label}</span>
            <strong>{shortRupees(row.value)}</strong>
          </div>
        ))}
      </div>
    </article>
  )
}

function RecommendationPanel({ recommendation, financialState }) {
  if (!recommendation) {
    return (
      <section className="recommendation-stack">
        <article className="planner-empty-card">
          <PiggyBank size={20} />
          <div>
            <h2>Add a price to see the safe path.</h2>
            <p>FBPly checks income, bills, savings style, and timeline without asking for extra work.</p>
          </div>
        </article>
      </section>
    )
  }

  const requiredEmiValue = recommendation.financeNeeded === 0 ? 'No EMI needed' : shortRupees(recommendation.requiredEmi)
  const timelineLabel = recommendation.timelineMonths === 0 ? 'Today' : recommendation.timelineLabel
  const delayedTitle = recommendation.timelineMonths === 0 ? 'Selected path' : `Path by ${timelineLabel}`
  const confidence =
    recommendation.ownershipTone === 'good'
      ? { label: 'High', detail: 'Fits current room' }
      : recommendation.ownershipTone === 'balanced'
        ? { label: 'Medium', detail: 'Keep an eye on EMI space' }
        : { label: 'Low', detail: 'Wait or increase savings' }

  return (
    <section className="recommendation-stack">
      <article className={`planner-summary-card ${recommendation.ownershipTone}`}>
        <div className="planner-summary-heading">
          <div>
            <span className="mini-label">Smart summary</span>
            <h2>{recommendation.goalName || `${recommendation.category} purchase`}</h2>
          </div>
          <span className={`simulation-pill ${recommendation.ownershipTone}`}>
            {recommendation.ownershipStatus}
          </span>
        </div>

        <div className="planner-summary-grid">
          <div>
            <span>Monthly saving</span>
            <strong>{shortRupees(recommendation.monthlySetAside)}</strong>
          </div>
          <div>
            <span>Affordability</span>
            <strong>{requiredEmiValue}</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{confidence.label}</strong>
            <small>{confidence.detail}</small>
          </div>
        </div>

        <p>{recommendation.insight}</p>
      </article>

      <details className="planner-details-panel">
        <summary>
          <span>Planning details</span>
          <ChevronRight size={16} />
        </summary>

        <div className="planner-details-body">
          <article className="finance-structure-card">
            <div className="finance-structure-heading">
              <div>
                <span className="mini-label">{recommendation.category} structure</span>
                <h2>{recommendation.goalName || `${recommendation.category} purchase`}</h2>
              </div>
              <strong>{shortRupees(recommendation.targetAmount)}</strong>
            </div>
            <div className="finance-structure-grid">
              <div>
                <span>Down payment</span>
                <strong>{recommendation.suggestedDownpaymentLabel}</strong>
                <p>More upfront money keeps monthly pressure lower.</p>
              </div>
              <div>
                <span>May need finance</span>
                <strong>{recommendation.financeRangeLabel}</strong>
                <p>Based on the safer down payment range.</p>
              </div>
              <div>
                <span>Easy EMI zone</span>
                <strong>{recommendation.comfortableEmiLabel}</strong>
                <p>After keeping monthly safety space.</p>
              </div>
              <div>
                <span>This plan EMI</span>
                <strong>{requiredEmiValue}</strong>
                <p>Estimated with a cautious buffer.</p>
              </div>
            </div>
          </article>

          <article className="waiting-card">
            <CalendarDays size={19} />
            <p>{recommendation.waitSuggestion}</p>
          </article>

          <div className="ownership-path-grid">
            <OwnershipPathCard
              title="Immediate path"
              path={recommendation.immediatePath}
            />
            <OwnershipPathCard
              title={delayedTitle}
              path={recommendation.delayedPath}
              highlight
            />
          </div>

          <div className="guidance-grid">
            <article className="simulation-card">
              <div className="simulation-heading">
                <h2>How heavy it may feel</h2>
                <span className={`simulation-pill ${recommendation.ownershipTone}`}>
                  {recommendation.ownershipStatus}
                </span>
              </div>
              <div className="simulation-meter" aria-label={`${recommendation.downpaymentCoveragePercent}% downpayment coverage`}>
                <span style={{ width: `${Math.min(recommendation.downpaymentCoveragePercent, 100)}%` }} />
              </div>
              <div className="pressure-list">
                <span>Monthly set-aside: {shortRupees(recommendation.monthlySetAside)}</span>
                <span>Downpayment gap: {shortRupees(recommendation.downpaymentGap)}</span>
                <span>Safe space after EMI: {shortRupees(recommendation.projectedFlexAfterEmi)}</span>
                <span>Safety savings after EMI: {shortRupees(recommendation.projectedBreathingAfterEmi)}</span>
              </div>
            </article>
            <article className="guidance-card">
              <h2>Why this feels safer</h2>
              <p>{recommendation.categorySummary}</p>
              <div className="pressure-list">
                {recommendation.rationale.map((item) => (
                  <span key={item}>{item}</span>
                ))}
                <span>Current pressure: {financialState.pressure}</span>
              </div>
            </article>
          </div>
        </div>
      </details>
    </section>
  )
}

function OwnershipPathCard({ title, path, highlight = false }) {
  return (
    <article className={`ownership-path-card ${highlight ? 'highlight' : ''}`}>
      <div className="ownership-path-heading">
        <div>
          <span className="mini-label">{path.months === 0 ? 'Today' : `${path.months} months`}</span>
          <h2>{title}</h2>
        </div>
        <span className={`simulation-pill ${path.tone}`}>{path.status}</span>
      </div>
      <div className="ownership-path-values">
        <div>
          <span>Down payment</span>
          <strong>{shortRupees(path.projectedDownpayment)}</strong>
        </div>
        <div>
          <span>Finance needed</span>
          <strong>{shortRupees(path.financeNeeded)}</strong>
        </div>
        <div>
          <span>EMI idea</span>
          <strong>{path.financeNeeded === 0 ? 'None' : shortRupees(path.requiredEmi)}</strong>
        </div>
        <div>
          <span>Space after EMI</span>
          <strong>{shortRupees(path.flexAfterEmi)}</strong>
        </div>
      </div>
    </article>
  )
}
