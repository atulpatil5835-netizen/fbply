import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  CircleAlert,
  EyeOff,
  HeartPulse,
  LayoutDashboard,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  MoneyCard,
  MoneyOSProvider,
  SecondaryButton,
  SectionHeader,
  StatCard,
  StatusBadge,
} from '../design-system'
import { getProductHealthSummary } from '../lib/analytics'

function pluralize(value, singular, plural = `${singular}s`) {
  return Number(value || 0) === 1 ? singular : plural
}

function formatUpdatedAt(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Just now'
  }

  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function badgeTone(count) {
  if (count > 3) {
    return 'success'
  }

  if (count > 0) {
    return 'warning'
  }

  return 'neutral'
}

function HealthMetricList({ items = [], emptyLabel = 'No signal yet' }) {
  if (items.length === 0) {
    return <p className="product-health-empty">{emptyLabel}</p>
  }

  return (
    <div className="product-health-list">
      {items.map((item) => (
        <div className="product-health-row" key={item.event || item.title || item.label}>
          <div>
            <strong>{item.label || item.title}</strong>
            {item.group && <span>{item.group}</span>}
            {item.detail && <span>{item.detail}</span>}
          </div>
          {'count' in item && <StatusBadge tone={badgeTone(item.count)}>{item.count}</StatusBadge>}
          {'active' in item && (
            <StatusBadge tone={item.active ? 'success' : 'warning'}>
              {item.value}
            </StatusBadge>
          )}
          {item.tone && <StatusBadge tone={item.tone}>{item.tone}</StatusBadge>}
        </div>
      ))}
    </div>
  )
}

export default function ProductHealthDashboard() {
  const [summary, setSummary] = useState(() => getProductHealthSummary())
  const refreshedAt = formatUpdatedAt(summary.generatedAt)
  const creationCount = useMemo(
    () => [
      summary.eventCounts.expense_created || 0,
      summary.eventCounts.income_created || 0,
      summary.eventCounts.goal_created || 0,
      summary.eventCounts.borrow_created || 0,
      summary.eventCounts.shared_group_created || 0,
    ].reduce((total, value) => total + value, 0),
    [summary.eventCounts],
  )

  const refresh = useCallback(() => setSummary(getProductHealthSummary()), [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const timer = window.setInterval(refresh, 15000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return (
    <MoneyOSProvider as="section" className="product-health-dashboard" aria-label="Founder product health dashboard">
      <div className="product-health-header">
        <SectionHeader
          eyebrow="Founder only"
          title="Product Health"
          detail="Privacy-safe behavior signal from the local analytics event stream."
        />
        <SecondaryButton size="sm" icon={RefreshCw} onClick={refresh}>
          Refresh
        </SecondaryButton>
      </div>

      <div className="product-health-meta">
        <StatusBadge tone="success" icon={Activity}>{summary.totalEvents} events</StatusBadge>
        <StatusBadge tone="neutral">Updated {refreshedAt}</StatusBadge>
        <StatusBadge tone="neutral">v{summary.appVersion}</StatusBadge>
      </div>

      <div className="product-health-summary-grid">
        <StatCard
          label="App Usage"
          value={summary.appOpens}
          detail={`${summary.activeDays} active ${pluralize(summary.activeDays, 'day')}`}
          trend={summary.appOpenDays > 1 ? 'multi-day signal' : 'early signal'}
          icon={Activity}
          tone="tint"
        />
        <StatCard
          label="Home Action"
          value={`${summary.rates.nextActionClickRate}%`}
          detail={`${summary.eventCounts.next_action_clicked || 0} next action clicks`}
          trend="recommendation pull"
          icon={Target}
          tone="success"
        />
        <StatCard
          label="Add Hub"
          value={`${summary.rates.addHubSelectionRate}%`}
          detail={`${summary.eventCounts.add_hub_opened || 0} hub opens`}
          trend={`${summary.rates.creationPerHubOpenRate}% creation rate`}
          icon={LayoutDashboard}
          tone="warning"
        />
        <StatCard
          label="Creation"
          value={creationCount}
          detail="expenses, income, goals, people"
          trend="engagement actions"
          icon={HeartPulse}
          tone="success"
        />
        <StatCard
          label="Reports"
          value={`${summary.rates.reportGenerationRate}%`}
          detail={`${summary.eventCounts.report_generated || 0} generated`}
          trend={`${summary.rates.statementCompletionRate}% statement completion`}
          icon={BarChart3}
          tone="tint"
        />
      </div>

      <div className="product-health-grid">
        <MoneyCard
          title="What users do most"
          detail="Top behavior events in the current sample."
          icon={TrendingUp}
          tone="success"
        >
          <HealthMetricList items={summary.topActions} />
        </MoneyCard>

        <MoneyCard
          title="Ignored features"
          detail="Tracked areas with no signal yet."
          icon={EyeOff}
          tone="warning"
        >
          <HealthMetricList items={summary.ignoredFeatures} />
        </MoneyCard>

        <MoneyCard
          title="Engagement creators"
          detail="Actions most likely to show committed use."
          icon={HeartPulse}
          tone="tint"
        >
          <HealthMetricList items={summary.engagementActions} />
        </MoneyCard>

        <MoneyCard
          title="Retention signals"
          detail="Repeat behavior worth watching."
          icon={Activity}
          tone="neutral"
        >
          <HealthMetricList items={summary.retentionSignals} />
        </MoneyCard>
      </div>

      <MoneyCard
        className="product-health-investment-card"
        title="Investment areas"
        detail="Evidence-based product direction notes."
        icon={CircleAlert}
        tone="neutral"
      >
        <HealthMetricList items={summary.investmentAreas} />
      </MoneyCard>
    </MoneyOSProvider>
  )
}
