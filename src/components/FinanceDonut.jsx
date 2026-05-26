import { useMemo } from 'react'

const EMPTY_ENTRIES = []

function buildConicGradient(entries) {
  const total = entries.reduce((sum, entry) => sum + Number(entry.value || 0), 0)
  let cursor = 0

  if (total <= 0) {
    return 'conic-gradient(rgba(148, 163, 184, 0.24) 0deg 360deg)'
  }

  const stops = entries.flatMap((entry) => {
    const start = cursor
    const end = cursor + (Number(entry.value || 0) / total) * 360
    const separatorStart = Math.max(end - 0.8, start)
    cursor = end

    if (entries.length < 2 || end - start < 3) {
      return [`${entry.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`]
    }

    return [
      `${entry.color} ${start.toFixed(2)}deg ${separatorStart.toFixed(2)}deg`,
      `rgba(248, 250, 252, 0.72) ${separatorStart.toFixed(2)}deg ${end.toFixed(2)}deg`,
    ]
  })

  return `conic-gradient(${stops.join(', ')})`
}

export default function FinanceDonut({ chart, action = null }) {
  const chartEntries = chart?.entries || EMPTY_ENTRIES
  const entries = useMemo(
    () => chartEntries.filter((entry) => Number(entry.value || 0) > 0),
    [chartEntries],
  )
  const gradient = useMemo(() => buildConicGradient(entries), [entries])
  const hasEntries = entries.length > 0

  return (
    <article className={`finance-donut-card ${chart?.tone === 'matte' ? 'matte' : ''}`}>
      <div className="finance-donut-heading">
        <div>
          <h2>{chart.title}</h2>
          <p>{chart.subtitle}</p>
        </div>
        <div className="finance-donut-actions">
          <strong>{chart.totalLabel}</strong>
          {action}
        </div>
      </div>
      <div className="finance-donut-body">
        <div className="finance-donut" style={{ background: gradient }}>
          <div>
            <span>Total</span>
            <strong>{chart.totalLabel}</strong>
          </div>
        </div>
        <div className="finance-donut-legend">
          {hasEntries ? (
            entries.slice(0, 6).map((entry) => (
              <span key={entry.name}>
                <i style={{ background: entry.color }} />
                {entry.name}
              </span>
            ))
          ) : (
            <p>More saved data will make this chart useful.</p>
          )}
        </div>
      </div>
    </article>
  )
}
