import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calculator, CreditCard, Divide, GripHorizontal, Maximize2, Palette, Percent, Receipt, Settings, X } from 'lucide-react'
import {
  AmountInput,
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
    detail: 'Add or total quickly',
    icon: Calculator,
  },
  {
    key: 'gst',
    label: 'GST',
    detail: 'Tax included or extra',
    icon: Receipt,
  },
  {
    key: 'percentage',
    label: 'Percent',
    detail: 'Discounts and shares',
    icon: Percent,
  },
  {
    key: 'split',
    label: 'Split',
    detail: 'Divide a bill',
    icon: Divide,
  },
  {
    key: 'emi',
    label: 'EMI',
    detail: 'Monthly estimate',
    icon: CreditCard,
  },
]

const QUICK_TOOL_THEMES = [
  { key: 'white', label: 'White', swatch: '#ffffff' },
  { key: 'rose', label: 'Rose', swatch: '#f9a8d4' },
  { key: 'ink', label: 'Ink', swatch: '#111827' },
  { key: 'mint', label: 'Mint', swatch: '#99f6e4' },
]

const QUICK_TOOLS_THEME_STORAGE_KEY = 'fbply.quickTools.theme'
const FLOATING_WINDOW_MIN_WIDTH = 320
const FLOATING_WINDOW_MIN_HEIGHT = 360

const CALCULATOR_KEYS = [
  'C',
  'Del',
  '(',
  ')',
  '7',
  '8',
  '9',
  '/',
  '4',
  '5',
  '6',
  '*',
  '1',
  '2',
  '3',
  '-',
  '0',
  '00',
  '.',
  '+',
]

function calculatorKeyClassName(key) {
  const keyType = key === 'C' || key === 'Del'
    ? 'utility'
    : ['+', '-', '*', '/', '(', ')'].includes(key)
      ? 'operator'
      : ''

  return ['quick-tools-key', keyType ? `quick-tools-key--${keyType}` : ''].filter(Boolean).join(' ')
}

function calculatorKeyAriaLabel(key) {
  if (key === 'C') {
    return 'Clear calculation'
  }

  if (key === 'Del') {
    return 'Delete last character'
  }

  if (key === '*') {
    return 'Multiply'
  }

  if (key === '/') {
    return 'Divide'
  }

  return key
}

function normalizeToolKey(value) {
  return QUICK_TOOLS.some((tool) => tool.key === value) ? value : 'calculator'
}

function normalizeInitialTool(value) {
  return value === 'hub' ? null : normalizeToolKey(value)
}

function normalizeThemeKey(value) {
  if (value === 'paper') {
    return 'white'
  }

  return QUICK_TOOL_THEMES.some((theme) => theme.key === value) ? value : QUICK_TOOL_THEMES[0].key
}

function getStoredToolTheme() {
  if (typeof window === 'undefined') {
    return QUICK_TOOL_THEMES[0].key
  }

  try {
    return normalizeThemeKey(window.localStorage.getItem(QUICK_TOOLS_THEME_STORAGE_KEY))
  } catch {
    return QUICK_TOOL_THEMES[0].key
  }
}

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 760 }
  }

  return {
    width: window.innerWidth || 1024,
    height: window.innerHeight || 760,
  }
}

function clampFloatingWindowState(state) {
  const viewport = getViewportSize()
  const maxWidth = Math.max(FLOATING_WINDOW_MIN_WIDTH, viewport.width - 24)
  const maxHeight = Math.max(FLOATING_WINDOW_MIN_HEIGHT, viewport.height - 96)
  const width = Math.min(Math.max(state.width, FLOATING_WINDOW_MIN_WIDTH), maxWidth)
  const height = Math.min(Math.max(state.height, FLOATING_WINDOW_MIN_HEIGHT), maxHeight)
  const x = Math.min(Math.max(state.x, 12), Math.max(12, viewport.width - width - 12))
  const y = Math.min(Math.max(state.y, 82), Math.max(82, viewport.height - height - 12))

  return { x, y, width, height }
}

function getDefaultFloatingWindowState() {
  const viewport = getViewportSize()
  const width = Math.min(430, Math.max(FLOATING_WINDOW_MIN_WIDTH, viewport.width - 24))
  const height = Math.min(560, Math.max(FLOATING_WINDOW_MIN_HEIGHT, viewport.height - 128))
  const x = viewport.width > 720 ? viewport.width - width - 24 : 12

  return clampFloatingWindowState({
    x,
    y: viewport.width > 720 ? 104 : 132,
    width,
    height,
  })
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

    if (!activeTool) {
      return
    }

    trackEvent('quick_tool_opened', {
      surface: 'tools',
      tool: activeTool,
    })
  }, [activeTool, open])

  useEffect(() => {
    if (!open || !activeTool || !isReady || trackedUseRef.current.has(activeTool)) {
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

    if (token === 'Del') {
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
              className={calculatorKeyClassName(key)}
              type="button"
              key={key}
              onClick={() => addToken(key)}
              aria-label={calculatorKeyAriaLabel(key)}
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

export default function QuickToolsSheet({ open = false, initialTool = 'calculator', requestId = 0, onClose }) {
  const incomingActiveTool = normalizeInitialTool(initialTool)
  const [activeToolState, setActiveToolState] = useState(() => ({
    initialTool,
    requestId,
    tool: incomingActiveTool,
  }))
  const [drawerState, setDrawerState] = useState(() => ({
    requestId,
    open: initialTool === 'hub',
  }))
  const [showThemeSettings, setShowThemeSettings] = useState(false)
  const [toolTheme, setToolTheme] = useState(getStoredToolTheme)
  const [windowState, setWindowState] = useState(getDefaultFloatingWindowState)
  const isCurrentActiveToolRequest = activeToolState.initialTool === initialTool && activeToolState.requestId === requestId
  const drawerOpen = drawerState.requestId === requestId ? drawerState.open : initialTool === 'hub'
  const activeTool = isCurrentActiveToolRequest
    ? activeToolState.tool
    : incomingActiveTool || activeToolState.tool
  const currencySymbol = getCurrencySymbol()
  const panel = useActiveToolPanel({ activeTool: activeTool || 'calculator', currencySymbol })
  const activeMeta = QUICK_TOOLS.find((tool) => tool.key === activeTool)
  const ActiveIcon = activeMeta?.icon || Calculator

  useToolAnalytics(open, activeTool, panel.isReady)

  const selectActiveTool = useCallback((tool) => {
    setActiveToolState({
      initialTool,
      requestId,
      tool,
    })
  }, [initialTool, requestId])

  const openFloatingTool = useCallback((tool) => {
    selectActiveTool(tool)
    setShowThemeSettings(false)
    setDrawerState({
      requestId,
      open: false,
    })
  }, [requestId, selectActiveTool])

  const closeDrawer = useCallback(() => {
    setShowThemeSettings(false)
    setDrawerState({
      requestId,
      open: false,
    })
  }, [requestId])

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined
    }

    const handleResize = () => setWindowState((current) => clampFloatingWindowState(current))
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [open])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(QUICK_TOOLS_THEME_STORAGE_KEY, toolTheme)
    } catch {
      // Local preferences are optional; the tools still work if storage is blocked.
    }
  }, [toolTheme])

  const beginWindowMove = useCallback((event) => {
    if (event.button !== undefined && event.button !== 0) {
      return
    }

    if (event.target?.closest?.('button, input, select, textarea, a')) {
      return
    }

    event.preventDefault()

    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const startState = windowState

    event.currentTarget.setPointerCapture?.(pointerId)

    const handleMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }

      const nextState = {
        ...startState,
        x: startState.x + moveEvent.clientX - startX,
        y: startState.y + moveEvent.clientY - startY,
      }

      setWindowState(clampFloatingWindowState(nextState))
    }

    const stopMove = () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', stopMove)
      document.removeEventListener('pointercancel', stopMove)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', stopMove)
    document.addEventListener('pointercancel', stopMove)
  }, [windowState])

  const beginWindowResize = useCallback((event) => {
    if (event.button !== undefined && event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const startState = windowState

    event.currentTarget.setPointerCapture?.(pointerId)

    const handleResize = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return
      }

      const nextState = {
        ...startState,
        width: startState.width + moveEvent.clientX - startX,
        height: startState.height + moveEvent.clientY - startY,
      }

      setWindowState(clampFloatingWindowState(nextState))
    }

    const stopResize = () => {
      document.removeEventListener('pointermove', handleResize)
      document.removeEventListener('pointerup', stopResize)
      document.removeEventListener('pointercancel', stopResize)
    }

    document.addEventListener('pointermove', handleResize)
    document.addEventListener('pointerup', stopResize)
    document.addEventListener('pointercancel', stopResize)
  }, [windowState])

  if (!open) {
    return null
  }

  return (
    <div
      className="quick-tools-floating-layer"
      data-drawer-open={drawerOpen ? 'true' : 'false'}
      data-tool-theme={toolTheme}
    >
      <div className="quick-tools-soft-blur" aria-hidden="true" />

      <section
        className={drawerOpen ? 'quick-tools-floating-hub is-open' : 'quick-tools-floating-hub'}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
        aria-label="Calculation tools"
      >
        <div className="quick-tools-drawer-header">
          <span>
            <Calculator size={16} />
            Tools
          </span>
          <button className="quick-tools-icon-action" type="button" aria-label="Close tools drawer" title="Close tools" onClick={closeDrawer}>
            <X size={18} />
          </button>
        </div>
        <div className="quick-tools-tabs" aria-label="Calculation tools">
            {QUICK_TOOLS.map((tool) => {
              const ToolIcon = tool.icon
              const selected = activeTool === tool.key

              return (
                <button
                  className={selected ? 'quick-tools-tab active' : 'quick-tools-tab'}
                  type="button"
                  aria-pressed={selected}
                  title={tool.label}
                  key={tool.key}
                  onClick={() => openFloatingTool(tool.key)}
                >
                  <span className="quick-tools-tab__icon" aria-hidden="true">
                    <ToolIcon size={17} />
                  </span>
                  <span className="quick-tools-tab__copy">
                    <strong>{tool.label}</strong>
                    <small>{tool.detail}</small>
                  </span>
                </button>
              )
            })}
          <button
            className={showThemeSettings ? 'quick-tools-tab quick-tools-tab--settings active' : 'quick-tools-tab quick-tools-tab--settings'}
            type="button"
            aria-expanded={showThemeSettings}
            onClick={() => setShowThemeSettings((current) => !current)}
          >
            <span className="quick-tools-tab__icon" aria-hidden="true">
              <Settings size={17} />
            </span>
            <span className="quick-tools-tab__copy">
              <strong>Theme</strong>
              <small>Change tool window color</small>
            </span>
          </button>
        </div>

        {showThemeSettings && (
          <div className="quick-tools-theme-panel" role="radiogroup" aria-label="Tool theme">
            <span className="quick-tools-theme-label">
              <Palette size={14} />
              Tool theme
            </span>
            <div className="quick-tools-theme-row">
              {QUICK_TOOL_THEMES.map((theme) => (
                <button
                  className={theme.key === toolTheme ? 'quick-tools-theme-button active' : 'quick-tools-theme-button'}
                  type="button"
                  role="radio"
                  aria-checked={theme.key === toolTheme}
                  key={theme.key}
                  onClick={() => setToolTheme(theme.key)}
                >
                  <span style={{ background: theme.swatch }} aria-hidden="true" />
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {activeMeta && (
        <section
          className="quick-tools-floating-window"
          aria-label={`${activeMeta.label} tool`}
          style={{
            left: `${windowState.x}px`,
            top: `${windowState.y}px`,
            width: `${windowState.width}px`,
            height: `${windowState.height}px`,
          }}
        >
          <div className="quick-tools-window-header" onPointerDown={beginWindowMove}>
            <span className="quick-tools-window-grip" aria-hidden="true">
              <GripHorizontal size={16} />
            </span>
            <span className="quick-tools-window-icon" aria-hidden="true">
              <ActiveIcon size={17} />
            </span>
            <span className="quick-tools-window-title">
              <strong>{activeMeta.label}</strong>
              <small>{activeMeta.detail}</small>
            </span>
            <StatusBadge>{panel.isReady ? 'Ready' : 'Local'}</StatusBadge>
            <button
              className="quick-tools-icon-action"
              type="button"
              aria-label={`Close ${activeMeta.label}`}
              title="Close window"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>
          <div className="quick-tools-window-body">
            {panel.content}
          </div>
          <button
            className="quick-tools-resize-handle"
            type="button"
            aria-label="Resize tool window"
            title="Resize"
            onPointerDown={beginWindowResize}
          >
            <Maximize2 size={15} />
          </button>
        </section>
      )}
    </div>
  )
}
