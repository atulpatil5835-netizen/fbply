import { useEffect, useMemo, useRef, useState } from 'react'
import { Calculator, CreditCard, Divide, Percent, Receipt } from 'lucide-react'
import {
  AmountInput,
  BottomSheet,
  MoneyCard,
  StatusBadge,
  TextInput,
} from '../design-system'
import { getCurrencySymbol } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { trackEvent } from '../lib/analytics'
import {
  calculateBasicArithmetic,
  calculateEmiEstimate,
  calculateGst,
  calculatePercentage,
  calculateSplitAmount,
} from '../lib/quickTools'
import './QuickToolsSheet.css'

const QUICK_TOOLS = [
  {
    key: 'calculator',
    label: 'Calculator',
    detail: 'Basic arithmetic',
    icon: Calculator,
    tone: 'tint',
  },
  {
    key: 'gst',
    label: 'GST',
    detail: 'Add or exclude GST',
    icon: Receipt,
    tone: 'success',
  },
  {
    key: 'percentage',
    label: 'Percentage',
    detail: 'Discounts and shares',
    icon: Percent,
    tone: 'tint',
  },
  {
    key: 'emi',
    label: 'EMI',
    detail: 'Monthly estimate',
    icon: CreditCard,
    tone: 'tint',
  },
  {
    key: 'split',
    label: 'Split Calculator',
    detail: 'Amount per person',
    icon: Divide,
    tone: 'success',
  },
]

const CALCULATOR_KEYS = [
  '7',
  '8',
  '9',
  '÷',
  '4',
  '5',
  '6',
  '×',
  '1',
  '2',
  '3',
  '-',
  '0',
  '.',
  '(',
  ')',
  '+',
  'C',
  '⌫',
]

function normalizeToolKey(value) {
  return QUICK_TOOLS.some((tool) => tool.key === value) ? value : 'calculator'
}

function numberLabel(value) {
  if (value === null || typeof value === 'undefined' || !Number.isFinite(Number(value))) {
    return '0'
  }

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 4,
  }).format(Number(value))
}

function ResultCard({ label, value, detail = '' }) {
  return (
    <div className="quick-tools-result">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}

function useToolAnalytics(open, activeTool, isReady) {
  const trackedUseRef = useRef(new Set())

  useEffect(() => {
    if (!open) {
      trackedUseRef.current.clear()
      return
    }

    trackEvent('quick_tool_opened', {
      surface: 'tools',
      tool: activeTool,
    })
  }, [activeTool, open])

  useEffect(() => {
    if (!open || !isReady || trackedUseRef.current.has(activeTool)) {
      return
    }

    trackedUseRef.current.add(activeTool)
    trackEvent('quick_tool_used', {
      surface: 'tools',
      tool: activeTool,
    })
  }, [activeTool, isReady, open])
}

function useCalculatorTool() {
  const [expression, setExpression] = useState('')
  const result = useMemo(() => calculateBasicArithmetic(expression), [expression])

  function addToken(token) {
    if (token === 'C') {
      setExpression('')
      return
    }

    if (token === '⌫') {
      setExpression((current) => current.slice(0, -1))
      return
    }

    setExpression((current) => `${current}${token}`.slice(0, 80))
  }

  return {
    isReady: result.value !== null && expression.trim().length > 0 && !result.error,
    content: (
      <div className="quick-tools-panel">
        <TextInput
          label="Calculation"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          placeholder="1200 + 450 / 3"
          inputMode="decimal"
          autoComplete="off"
          error={result.error}
        />
        <ResultCard label="Result" value={numberLabel(result.value)} />
        <div className="quick-tools-keypad" aria-label="Calculator keys">
          {CALCULATOR_KEYS.map((key) => (
            <button
              className={key === 'C' || key === '⌫' ? 'quick-tools-key quick-tools-key--utility' : 'quick-tools-key'}
              type="button"
              key={key}
              onClick={() => addToken(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    ),
  }
}

function useSplitAmountTool({ currencySymbol }) {
  const [amount, setAmount] = useState('')
  const [peopleCount, setPeopleCount] = useState('')
  const result = useMemo(() => calculateSplitAmount(amount, peopleCount), [amount, peopleCount])

  return {
    isReady: result.isReady,
    content: (
      <div className="quick-tools-panel">
        <div className="quick-tools-fields">
          <AmountInput
            label="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            currencySymbol={currencySymbol}
          />
          <TextInput
            label="People"
            value={peopleCount}
            onChange={(event) => setPeopleCount(event.target.value)}
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="2"
          />
        </div>
        <ResultCard label="Per person" value={rupees(result.perPerson)} detail={`${result.peopleCount || 0} people`} />
      </div>
    ),
  }
}

function usePercentageTool({ currencySymbol }) {
  const [value, setValue] = useState('')
  const [percentage, setPercentage] = useState('')
  const result = useMemo(() => calculatePercentage(value, percentage), [percentage, value])

  return {
    isReady: result.isReady,
    content: (
      <div className="quick-tools-panel">
        <div className="quick-tools-fields">
          <AmountInput
            label="Value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            currencySymbol={currencySymbol}
          />
          <TextInput
            label="Percentage"
            value={percentage}
            onChange={(event) => setPercentage(event.target.value)}
            type="number"
            inputMode="decimal"
            placeholder="10"
          />
        </div>
        <div className="quick-tools-results-grid">
          <ResultCard label="Percentage value" value={rupees(result.percentageValue)} />
          <ResultCard label="Increased value" value={rupees(result.increasedValue)} />
          <ResultCard label="Reduced value" value={rupees(result.reducedValue)} />
        </div>
      </div>
    ),
  }
}

function useEmiTool({ currencySymbol }) {
  const [amount, setAmount] = useState('')
  const [annualInterestRate, setAnnualInterestRate] = useState('')
  const [tenureMonths, setTenureMonths] = useState('')
  const result = useMemo(
    () => calculateEmiEstimate(amount, annualInterestRate, tenureMonths),
    [amount, annualInterestRate, tenureMonths],
  )

  return {
    isReady: result.isReady,
    content: (
      <div className="quick-tools-panel">
        <div className="quick-tools-fields quick-tools-fields--three">
          <AmountInput
            label="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            currencySymbol={currencySymbol}
          />
          <TextInput
            label="Annual rate"
            value={annualInterestRate}
            onChange={(event) => setAnnualInterestRate(event.target.value)}
            type="number"
            inputMode="decimal"
            placeholder="10"
          />
          <TextInput
            label="Months"
            value={tenureMonths}
            onChange={(event) => setTenureMonths(event.target.value)}
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="12"
          />
        </div>
        <ResultCard label="Estimated EMI" value={rupees(result.emi)} detail={`${result.tenureMonths || 0} months`} />
      </div>
    ),
  }
}

function useGstTool({ currencySymbol }) {
  const [amount, setAmount] = useState('')
  const [gstRate, setGstRate] = useState('18')
  const result = useMemo(() => calculateGst(amount, gstRate), [amount, gstRate])

  return {
    isReady: result.isReady,
    content: (
      <div className="quick-tools-panel">
        <div className="quick-tools-fields">
          <AmountInput
            label="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            currencySymbol={currencySymbol}
          />
          <TextInput
            label="GST rate"
            value={gstRate}
            onChange={(event) => setGstRate(event.target.value)}
            type="number"
            inputMode="decimal"
            placeholder="18"
          />
        </div>
        <div className="quick-tools-results-grid">
          <ResultCard label="GST amount" value={rupees(result.gstAmount)} />
          <ResultCard label="Total with GST" value={rupees(result.totalWithGst)} />
          <ResultCard label="Amount excluding GST" value={rupees(result.amountExcludingGst)} />
        </div>
      </div>
    ),
  }
}

function useActiveToolPanel({ activeTool, currencySymbol }) {
  const calculatorTool = useCalculatorTool()
  const splitTool = useSplitAmountTool({ currencySymbol })
  const percentageTool = usePercentageTool({ currencySymbol })
  const emiTool = useEmiTool({ currencySymbol })
  const gstTool = useGstTool({ currencySymbol })
  const panels = {
    calculator: calculatorTool,
    split: splitTool,
    percentage: percentageTool,
    emi: emiTool,
    gst: gstTool,
  }

  return panels[activeTool] || calculatorTool
}

export default function QuickToolsSheet({ open = false, initialTool = 'calculator', onClose }) {
  const [activeTool, setActiveTool] = useState(() => normalizeToolKey(initialTool))
  const currencySymbol = getCurrencySymbol()
  const activeMeta = QUICK_TOOLS.find((tool) => tool.key === activeTool) || QUICK_TOOLS[0]
  const ActiveIcon = activeMeta.icon
  const panel = useActiveToolPanel({ activeTool, currencySymbol })

  useToolAnalytics(open, activeTool, panel.isReady)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Quick Calculators"
      description="Fast local money calculations."
      className="quick-tools-sheet"
      bodyClassName="quick-tools-sheet__body"
    >
      <section className="quick-tools-shell" aria-label="Quick calculators">
        <div className="quick-tools-tabs" role="tablist" aria-label="Quick calculators">
          {QUICK_TOOLS.map((tool) => {
            const ToolIcon = tool.icon
            const selected = activeTool === tool.key

            return (
              <button
                className={selected ? 'quick-tools-tab active' : 'quick-tools-tab'}
                type="button"
                role="tab"
                aria-selected={selected}
                key={tool.key}
                onClick={() => setActiveTool(tool.key)}
              >
                <ToolIcon size={16} aria-hidden="true" />
                <span>{tool.label}</span>
              </button>
            )
          })}
        </div>

        <MoneyCard
          title={activeMeta.label}
          detail={activeMeta.detail}
          icon={ActiveIcon}
          tone={activeMeta.tone}
          actions={<StatusBadge>{panel.isReady ? 'Ready' : 'Local'}</StatusBadge>}
          className="quick-tools-card"
        >
          {panel.content}
        </MoneyCard>
      </section>
    </BottomSheet>
  )
}
