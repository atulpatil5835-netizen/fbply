import {
  CartesianGrid,
  Cell,
  Line,
  LineChart as TrendLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getFinanceColor } from '../lib/financeColors'
import { normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'

function safeChartAmount(value) {
  return normalizeMoney(value)
}

function cleanCompactNumber(value) {
  return Number(value.toFixed(value >= 10 ? 0 : 1)).toString()
}

function compactRupees(value) {
  const amount = safeChartAmount(value)
  const symbol = rupees(1).replace(/[0-9,.\s-]/g, '') || 'Rs'

  if (amount >= 10000000) {
    return `${symbol}${cleanCompactNumber(amount / 10000000)}Cr`
  }

  if (amount >= 100000) {
    return `${symbol}${cleanCompactNumber(amount / 100000)}L`
  }

  if (amount >= 1000) {
    return `${symbol}${cleanCompactNumber(amount / 1000)}K`
  }

  return rupees(amount)
}

function ChartEmptyState({ message }) {
  return (
    <div className="report-empty-chart">
      <span className="report-empty-chart-mark" aria-hidden="true" />
      <strong>Not enough activity yet</strong>
      <p>{message}</p>
    </div>
  )
}

export default function ReportCharts({
  visibleBreakdown = [],
  selectedCategory,
  setActiveCategory,
  mixBreakdown = [],
  focusedCategory,
  breakdownTotal = 0,
  trendData = [],
}) {
  return (
    <>
      <article className="chart-card report-mix-card">
        <h2>Spending mix</h2>
        {visibleBreakdown.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={visibleBreakdown}
                  cx="50%"
                  cy="50%"
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={64}
                  paddingAngle={4}
                  isAnimationActive
                  animationDuration={420}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {visibleBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => rupees(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend-grid compact-legend">
              <button
                className={selectedCategory === 'all' ? 'active' : ''}
                type="button"
                onClick={() => setActiveCategory('all')}
              >
                <i style={{ backgroundColor: getFinanceColor('Other') }} />
                All
              </button>
              {mixBreakdown.slice(0, 8).map((item) => (
                <button
                  className={selectedCategory === item.name ? 'active' : ''}
                  key={item.name}
                  type="button"
                  onClick={() => setActiveCategory((current) => (current === item.name ? 'all' : item.name))}
                >
                  <i style={{ backgroundColor: item.color }} />
                  {item.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <ChartEmptyState message="Add spending, settlements, or money-book entries to view the mix." />
        )}
        {focusedCategory && (
          <div className="category-focus-card">
            <span>Category focus</span>
            <strong>{focusedCategory.name}</strong>
            <p>{rupees(focusedCategory.value)} tracked, about {Math.round((safeChartAmount(focusedCategory.value) / Math.max(breakdownTotal, 1)) * 100)}% of the mix.</p>
          </div>
        )}
      </article>

      <article className="chart-card report-trend-card">
        <h2>Spending trend</h2>
        <p>
          {trendData.length > 1
            ? 'Built from your dated money moves this month.'
            : 'Add more entries to see a clearer trend.'}
        </p>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={148}>
            <TrendLineChart data={trendData} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="var(--chart-axis)"
                tick={{ fontSize: 11 }}
                tickFormatter={compactRupees}
                width={52}
              />
              <RechartsTooltip formatter={(value) => rupees(value)} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-trend)"
                strokeWidth={3}
                dot={trendData.length <= 6}
                isAnimationActive
                animationDuration={460}
              />
            </TrendLineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="Add transactions to view trends." />
        )}
      </article>
    </>
  )
}
