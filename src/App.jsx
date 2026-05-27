import { Component, lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bike,
  CalendarDays,
  Car,
  ChartPie,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  House,
  Laptop,
  LogOut,
  LockKeyhole,
  Mail,
  Mic,
  Moon,
  MoreVertical,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  Popcorn,
  Receipt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Target,
  User,
  Utensils,
  Wallet,
  X,
} from 'lucide-react'
import {
  buildInsights,
  buildRecommendation,
  calculateFinancialState,
  normalizeCommitments,
  rupees,
  shortRupees,
} from './lib/ruleEngine'
import { aggregateExpenses, categoryColor, getCategoryTotal, normalizeSpendCategory } from './lib/categoryIntelligence'
import { hasSupabaseAnonKey, isSupabaseReady, supabase } from './lib/supabaseClient'
import { buildAdvancedReport } from './lib/reportInsights'
import {
  buildFixedExpenseDistribution,
  buildFlexibleSpendingDistribution,
  getGreeting,
  getProfileBalanceMessage,
} from './lib/financeVisuals'
import { buildFinancialHealthScore, buildSmartHomeInsights } from './lib/homeIntelligence'
import { buildUnifiedFinanceEngine } from './lib/financeEngine'
import {
  buildCashflowTimeline,
  buildMonthlyComparison,
  buildRelatedTransactionGroups,
  buildSmartReminders,
} from './lib/financeIntelligence'
import { getFinanceColor } from './lib/financeColors'
import {
  createSharedPayment,
  displayPersonName,
  normalizePersonName,
  reconcileSharedGroup,
  resolveCurrentUserName,
} from './lib/financialActivity'
import { flushStorageQueue, safeStorageGet, safeStorageSet, safeStorageSetQueued } from './lib/storage'
import {
  learnVoiceExpense,
  parseVoiceExpense as parseSpokenExpense,
  voiceCategoryOptions,
  voiceLanguageOptions,
} from './lib/voiceExpense'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import CategoryPicker from './components/CategoryPicker.jsx'
import FinanceDonut from './components/FinanceDonut.jsx'

const ReportsScreen = lazy(() => import('./components/ReportsScreen.jsx'))

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.22, ease: 'easeOut' },
}

const HISTORY_GROUP_BATCH_SIZE = 12

const expenseCategories = [
  { label: 'Food', icon: Utensils, tone: 'cyan' },
  { label: 'Grocery', icon: Receipt, tone: 'green' },
  { label: 'Fuel', icon: Car, tone: 'orange' },
  { label: 'Shopping', icon: ShoppingBag, tone: 'blue' },
  { label: 'Loan', icon: CreditCard, tone: 'green' },
  { label: 'Housing', icon: House, tone: 'blue' },
  { label: 'Travel', icon: Plane, tone: 'orange' },
  { label: 'Medical', icon: CheckCircle2, tone: 'green' },
  { label: 'Entertainment', icon: Popcorn, tone: 'orange' },
  { label: 'Subscription', icon: Receipt, tone: 'blue' },
  { label: 'Personal', icon: User, tone: 'cyan' },
  { label: 'Other', icon: Plus, tone: 'cyan' },
  { label: 'Custom', icon: Plus, tone: 'cyan' },
]

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

const supportEmail = 'contact@fbply.com'

const navItems = [
  { key: 'home', label: 'Today', icon: House },
  { key: 'history', label: 'Activity', icon: CalendarDays },
  { key: 'add', label: 'Add', icon: Plus, isAdd: true },
  { key: 'planner', label: 'Goals', icon: Target },
  { key: 'reports', label: 'Insights', icon: ChartPie },
]

const fixedExpenseSuggestions = ['Rent', 'Electricity', 'Internet', 'Petrol', 'Shopping', 'Food', 'Subscription']

const emiSuggestions = ['Bike EMI', 'Car EMI', 'Phone EMI', 'Education loan', 'Personal loan']

const legalPages = {
  '/privacy': {
    eyebrow: 'Privacy Policy',
    title: 'Privacy Policy',
    summary: 'This page explains what FBPly may process and how users stay in control of their data.',
    sections: [
      {
        title: 'Data FBPly Uses',
        body: [
          'FBPly uses the information you enter, such as income, expenses, commitments, savings buckets, shared expenses, planner inputs, and reviewed statement data.',
          'Demo or sample entries are treated as user-controlled local data and can be edited or removed at any time.',
        ],
      },
      {
        title: 'Bank Statement Uploads',
        body: [
          'Uploaded statements are processed for review and reporting. Raw files and PDF passwords are not saved permanently by default.',
          'Statement totals are based only on readable rows. Users should review detected dates, categories, and money-in or money-out direction before using them.',
        ],
      },
      {
        title: 'Cookies And Local Storage',
        body: [
          'FBPly may use localStorage to remember setup status, cookie consent, theme, and locally saved app data.',
          'If advertising is enabled later, Google AdSense and related partners may use cookies or similar technologies to show and measure ads.',
        ],
      },
      {
        title: 'Third-Party Ads',
        body: [
          'FBPly may display third-party ads, including Google AdSense. Ad partners may process device, cookie, and usage information under their own policies.',
          'Users can manage browser cookie settings and ad personalization controls through their browser or Google account settings.',
        ],
      },
      {
        title: 'User Rights And Contact',
        body: [
          'Users may choose not to upload statements, may edit reviewed data, and may clear local browser data from their device.',
          `For privacy questions, contact ${supportEmail}.`,
        ],
      },
    ],
  },
  '/terms': {
    eyebrow: 'Terms',
    title: 'Terms of Service and Disclaimer',
    summary: 'These terms explain acceptable use, limits, and the role of FBPly as a personal planning tool.',
    sections: [
      {
        title: 'Acceptance Of Terms',
        body: [
          'By using FBPly, you agree to use it for lawful personal financial tracking, planning, and review.',
          'If you do not agree with these terms, do not use the app.',
        ],
      },
      {
        title: 'No Professional Advice',
        body: [
          'FBPly is not a bank, financial institution, investment advisor, tax advisor, or legal advisor.',
          'Reports, planner outputs, comfort labels, and statement summaries are estimates based on provided or detected data. They are not professional advice.',
        ],
      },
      {
        title: 'User Responsibility',
        body: [
          'You are responsible for checking data accuracy before making financial decisions.',
          'Any estimate is calculated only from saved or reviewed data available inside the app.',
        ],
      },
      {
        title: 'Limitation Of Liability',
        body: [
          'FBPly does not guarantee financial outcomes, savings results, loan eligibility, purchase affordability, or statement parsing accuracy.',
          'Use the app as a support tool, not as the only basis for important money decisions.',
        ],
      },
    ],
  },
  '/disclaimer': {
    eyebrow: 'Disclaimer',
    title: 'Disclaimer',
    summary: 'FBPly gives personal finance clarity from user-provided and reviewed data, not professional advice.',
    sections: [
      {
        title: 'Personal Planning Only',
        body: [
          'FBPly is designed for personal money visibility, expense tracking, purchase planning, and monthly reports.',
          'It does not provide banking, investment, tax, legal, or lending services.',
        ],
      },
      {
        title: 'Accuracy Depends On Data',
        body: [
          'Outputs are only as accurate as the data entered, imported, reviewed, and categorized by the user.',
          'Statement parsing can miss or misread rows when bank PDF or CSV formats are unclear.',
        ],
      },
    ],
  },
  '/about': {
    eyebrow: 'About',
    title: 'About FBPly',
    summary: 'FBPly helps users understand monthly spending, commitments, shared expenses, and purchase planning in a simple way.',
    sections: [
      {
        title: 'Purpose',
        body: [
          'FBPly is a personal financial clarity app. It helps users see what is committed, what is flexible, and how a planned purchase may affect the month.',
          'The app focuses on simple guidance from saved data, not on promises or aggressive recommendations.',
        ],
      },
      {
        title: 'Contact',
        body: [
          `For product, support, or privacy questions, contact ${supportEmail}.`,
        ],
      },
    ],
  },
  '/contact': {
    eyebrow: 'Contact',
    title: 'Contact Us',
    summary: 'Use the email below for support, privacy, product, or general questions.',
    sections: [
      {
        title: 'Contact',
        body: [
          `Email ${supportEmail} for product, support, privacy, or general questions.`,
          'Please avoid sending sensitive bank passwords or full statement files by email.',
        ],
      },
    ],
    contact: true,
  },
}

const emptyProfile = {
  name: '',
  email: '',
  income: 0,
  savingsPreference: 'balanced',
  commitments: [],
}

const walkthroughSteps = [
  {
    tab: 'home',
    title: 'Today keeps money simple.',
    detail: 'Check safe spending, add a money move, and see today activity in one place.',
  },
  {
    tab: 'home',
    title: 'Add from the plus button.',
    detail: 'Expense, income, transfer, and borrow/lend actions now open from the centre button.',
  },
  {
    tab: 'planner',
    title: 'Goals help you buy safely.',
    detail: 'Enter a target purchase and FBPly estimates a calmer path from your saved numbers.',
  },
  {
    tab: 'reports',
    title: 'Insights stay simple.',
    detail: 'Short money notes appear first, with charts only where they help.',
  },
  {
    tab: 'history',
    title: 'Activity is your timeline.',
    detail: 'Spent, earned, shifted, and borrow/lend entries stay readable together.',
  },
  {
    tab: 'home',
    title: 'Settings moved up top.',
    detail: 'Use the avatar/settings button for income, fixed payments, preferences, and sign out.',
  },
]

function createCommitment(name = 'New commitment', amount = 0) {
  return {
    id: `commitment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    amount,
    dueDay: 1,
    recurrence: 'monthly',
  }
}

function createBucket(name = 'New bucket', saved = 0, target = 10000) {
  return {
    id: `bucket-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    saved,
    target,
    monthlyContribution: 0,
    dueDay: 1,
    deadline: '',
  }
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function currentMonthKey() {
  return todayDateKey().slice(0, 7)
}

function dateMonthKey(date) {
  const clean = String(date || '').slice(0, 7)
  return /^\d{4}-\d{2}$/.test(clean) ? clean : currentMonthKey()
}

function shiftMonthKey(monthKey, offset) {
  const clean = dateMonthKey(`${monthKey || currentMonthKey()}-01`)
  const date = new Date(`${clean}-01T00:00:00`)
  date.setMonth(date.getMonth() + offset)
  return date.toISOString().slice(0, 7)
}

function formatMonthLabel(monthKey) {
  const parsed = new Date(`${monthKey}-01T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return 'This Month'
  }

  const current = currentMonthKey()
  const previous = new Date()
  previous.setMonth(previous.getMonth() - 1)
  const previousKey = previous.toISOString().slice(0, 7)

  if (monthKey === current) {
    return 'This Month'
  }

  if (monthKey === previousKey) {
    return 'Last Month'
  }

  return parsed.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function normalizeMoneyBookEntries(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => {
      const kind = entry.kind === 'taken' || entry.type === 'taken' ? 'taken' : 'given'
      const date = String(entry.date || entry.createdAt || todayDateKey()).slice(0, 10)
      const status = entry.status === 'settled' || entry.status === 'completed' ? 'settled' : 'pending'
      const dueDate = String(entry.dueDate || entry.due || '').slice(0, 10)

      return {
        id: entry.id || `money-book-${date}-${index}`,
        kind,
        person: String(entry.person || entry.name || '').trim(),
        amount: Number(entry.amount || 0),
        date,
        note: String(entry.note || '').trim(),
        interest: Number(entry.interest || entry.vyaj || 0),
        status,
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : '',
        createdAt: entry.createdAt || `${date}T12:00:00`,
        updatedAt: entry.updatedAt || entry.createdAt || `${date}T12:00:00`,
        settledAt: status === 'settled' ? entry.settledAt || entry.completedAt || `${date}T20:00:00` : '',
      }
    })
    .filter((entry) => entry.person || entry.amount > 0)
}

function createMoneyBookEntry(entry) {
  const now = new Date().toISOString()
  const date = String(entry.date || todayDateKey()).slice(0, 10)

  return {
    id: entry.id || `money-book-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: entry.kind === 'taken' ? 'taken' : 'given',
    person: String(entry.person || '').trim(),
    amount: Number(entry.amount || 0),
    date,
    note: String(entry.note || '').trim(),
    interest: Number(entry.interest || 0),
    status: entry.status === 'settled' ? 'settled' : 'pending',
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(entry.dueDate || '').slice(0, 10))
      ? String(entry.dueDate).slice(0, 10)
      : '',
    createdAt: entry.createdAt || now,
    updatedAt: now,
    settledAt: entry.status === 'settled' ? entry.settledAt || now : '',
  }
}

function buildMonthOptions({ expenses = [], sharedGroups = [], moneyBookEntries = [] } = {}) {
  const keys = new Set()
  const current = new Date(`${currentMonthKey()}-01T00:00:00`)

  for (let index = 0; index < 12; index += 1) {
    const cursor = new Date(current)
    cursor.setMonth(current.getMonth() - index)
    keys.add(cursor.toISOString().slice(0, 7))
  }

  expenses.forEach((expense) => {
    if (expense.date || expense.createdAt) {
      keys.add(dateMonthKey(expense.date || expense.createdAt))
    }
  })

  sharedGroups.forEach((group) => {
    if (group.date) {
      keys.add(dateMonthKey(group.date))
    }

    ;(group.payments || []).forEach((payment) => keys.add(dateMonthKey(payment.date || group.date)))
    ;(group.settlements || []).forEach((settlement) => {
      if (settlement.receivedAt) {
        keys.add(dateMonthKey(settlement.receivedAt))
      }
    })
  })

  moneyBookEntries.forEach((entry) => {
    if (entry.date) {
      keys.add(dateMonthKey(entry.date))
    }

    if (entry.settledAt) {
      keys.add(dateMonthKey(entry.settledAt))
    }
  })

  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ key, label: formatMonthLabel(key) }))
}

function uniqueSharedPeople(people = []) {
  const seen = new Set()
  return people
    .map((person) => String(person || '').trim())
    .filter(Boolean)
    .filter((person) => {
      const key = normalizePersonName(person)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
}

function createSharedGroup({ name, amount, paidBy, people, profile }) {
  const id = `shared-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const currentUserName = resolveCurrentUserName(profile)
  const members = uniqueSharedPeople([currentUserName, ...(people || [])])
  const initialAmount = Number(amount || 0)
  const initialPaidBy = String(paidBy || currentUserName).trim()
  const payments = initialAmount > 0
    ? [createSharedPayment({
        label: name || 'Shared payment',
        amount: initialAmount,
        paidBy: initialPaidBy,
      })]
    : []

  return {
    id,
    name: String(name || 'Shared trip').trim() || 'Shared trip',
    people: members,
    date: new Date().toISOString().slice(0, 10),
    payments,
    settlements: [],
  }
}

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(safeStorageGet(key, JSON.stringify(fallback)))
  } catch {
    return fallback
  }
}

function parseVoiceExpense(transcript, memory) {
  return parseSpokenExpense(transcript, memory)
}

function buildQuickExpenseChips(expenses, voiceMemory) {
  const memory = expenses.reduce((map, expense) => {
    const label = expense.category
    const current = map.get(label) || { label, category: label, count: 0, amount: 0 }
    map.set(label, {
      label,
      category: current.category || label,
      count: current.count + 1,
      amount: Number(expense.amount || current.amount || 0),
    })
    return map
  }, new Map())

  Object.values(voiceMemory || {}).forEach((item) => {
    if (!item?.label) {
      return
    }

    const current = memory.get(item.label) || {
      label: item.label,
      category: item.category,
      count: 0,
      amount: 0,
    }

    memory.set(item.label, {
      ...current,
      category: item.category || current.category,
      count: current.count + Number(item.count || 0),
      amount: Number(item.amount || current.amount || 0),
    })
  })

  ;[
    { label: 'Petrol', category: 'Fuel', amount: 500 },
    { label: 'Pet care', category: 'Personal', amount: 800 },
    { label: 'Food', category: 'Food', amount: 300 },
    { label: 'Milk', category: 'Grocery', amount: 60 },
    { label: 'Netflix', category: 'Subscription', amount: 199 },
    { label: 'EMI', category: 'Loan', amount: 5000 },
    { label: 'Rent', category: 'Housing', amount: 10000 },
  ].forEach((item) => {
    if (!memory.has(item.label)) {
      memory.set(item.label, { ...item, count: 0 })
    }
  })

  return Array.from(memory.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

function buildSafeToSpend(state) {
  const protectedAmount = state.reserveTarget
  const comfortablyUsable = Math.max(Math.round((state.flexibility - protectedAmount) * 0.5), 0)
  const flexibilityLevel =
    state.pressureTone === 'comfortable' ? 'Open' : state.pressureTone === 'balanced' ? 'Steady' : 'Careful'

  return {
    comfortablyUsable,
    protectedAmount,
    pressure: state.pressure,
    flexibilityLevel,
  }
}

function buildCalmSummaries(expenses, state, buckets) {
  const spending = aggregateExpenses(expenses)
  const foodTotal = getCategoryTotal(spending, 'Food') + getCategoryTotal(spending, 'Grocery')
  const shoppingTotal = getCategoryTotal(spending, 'Shopping')
  const bucketProgress = buckets.reduce((total, bucket) => total + Number(bucket.saved || 0), 0)

  if (spending.count === 0) {
    return [
      'Current spending history is still limited, so summaries will stay simple for now.',
      'Add a few expenses to make food, travel, and shopping patterns clearer.',
      bucketProgress > 0
        ? 'Savings buckets are slowly building a clearer cushion.'
        : 'Starting one small savings bucket can make future plans feel easier.',
    ]
  }

  return [
    foodTotal > state.income * 0.08
      ? 'Food spending is a little more visible this month, but still easy to track.'
      : foodTotal > 0
        ? 'Food and grocery spending is visible and readable this month.'
        : 'No food or grocery entries are visible yet.',
    shoppingTotal > state.income * 0.08
      ? 'Shopping activity is noticeable. A short pause may protect flexibility.'
      : shoppingTotal > 0
        ? 'Shopping activity is staying light overall.'
        : 'No shopping entries are visible in the current data.',
    bucketProgress > 0
      ? 'Savings buckets are slowly building a clearer cushion.'
      : 'Starting one small savings bucket can make future plans feel easier.',
  ]
}

function buildWhatChangedInsights(expenses, state) {
  const spending = aggregateExpenses(expenses)
  const travelTotal = getCategoryTotal(spending, 'Travel')
  const shoppingTotal = getCategoryTotal(spending, 'Shopping')

  return [
    travelTotal > 0
      ? `Travel-related expenses, including fuel-like labels, are around ${rupees(travelTotal)} this month.`
      : spending.count >= 3
        ? 'No travel-related entries are visible in the current data.'
        : 'More entries may improve travel and fuel pattern visibility.',
    shoppingTotal > 0
      ? `Shopping activity is currently around ${rupees(shoppingTotal)}.`
      : 'No shopping entries are currently visible.',
    state.flexibility > state.reserveTarget
      ? 'Current flexibility remains above the protected buffer.'
      : 'Flexibility is close to the protected buffer, so lighter choices may feel better.',
  ]
}

function buildEmergencyCushion(buckets, state) {
  const emergencyBucket = buckets.find((bucket) => bucket.name.toLowerCase().includes('emergency'))
  const saved = Number(emergencyBucket?.saved || 0)
  const dailyNeed = Math.max(state.committed / 30, 1)
  const days = Math.round(saved / dailyNeed)
  const label =
    days >= 45 ? 'Emergency stability looks steady.' : days >= 15 ? 'Emergency stability is forming.' : 'Emergency cushion is still early.'

  return {
    saved,
    days,
    label,
  }
}

function buildDailyMoneyStatus(state, safeToSpend) {
  const safeAmount = Number(safeToSpend?.comfortablyUsable || 0)

  if (!Number(state.income || 0)) {
    return {
      title: 'Add income to see your safe spending.',
      detail: 'Once income is added, FBPly can guide the month more clearly.',
      tone: 'learning',
    }
  }

  if (state.pressureTone === 'slight-pressure') {
    return {
      title: 'This month feels slightly tight.',
      detail: safeAmount > 0
        ? `${rupees(safeAmount)} still looks usable with care.`
        : 'Keep today light and protect the basics first.',
      tone: 'tight',
    }
  }

  if (state.pressureTone === 'warm') {
    return {
      title: 'Go a little easy this week.',
      detail: safeAmount > 0
        ? `${rupees(safeAmount)} is safer for flexible spends right now.`
        : 'A small pause can keep the month comfortable.',
      tone: 'careful',
    }
  }

  if (state.pressureTone === 'balanced') {
    return {
      title: "You're still in a safe zone.",
      detail: 'Normal spending looks okay, just keep tracking small spends.',
      tone: 'steady',
    }
  }

  return {
    title: "You're doing good this month.",
    detail: 'You have healthy spending room today.',
    tone: 'good',
  }
}

function buildSingleTodayInsight({ smartHomeInsights = [], whatChangedInsights = [], calmSummaries = [], financialState }) {
  const firstSmart = smartHomeInsights.find((insight) => insight?.title || insight?.detail)

  if (firstSmart) {
    return {
      title: firstSmart.title || 'Money note',
      detail: firstSmart.detail || firstSmart.kicker || 'Your money picture is getting clearer.',
      tone: firstSmart.tone || 'balanced',
    }
  }

  const simpleDetail = whatChangedInsights[0] || calmSummaries[0]

  if (simpleDetail) {
    return {
      title: 'Small money note',
      detail: simpleDetail,
      tone: financialState?.pressureTone || 'balanced',
    }
  }

  return {
    title: 'Start tracking to unlock smarter notes.',
    detail: 'Add a few expenses and FBPly will keep the insights short and useful.',
    tone: 'learning',
  }
}

function formatActivityTime(value) {
  const parsed = new Date(value || Date.now())

  if (Number.isNaN(parsed.getTime())) {
    return 'Now'
  }

  return parsed.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildTrackedDayCount(expenses = []) {
  return new Set(
    expenses
      .map((expense) => String(expense.date || expense.createdAt || '').slice(0, 10))
      .filter(Boolean),
  ).size
}

function activityVerb(transaction = {}) {
  if (transaction.tone === 'incoming') {
    return 'Earned'
  }

  if (transaction.tone === 'outgoing') {
    return 'Spent'
  }

  if (transaction.tone === 'transfer') {
    return 'Shifted'
  }

  if (transaction.impactType === 'goal') {
    return 'Planned'
  }

  return 'Tracked'
}

function App() {
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname || '/',
  )
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => safeStorageGet('fbply-onboarding-complete', 'false') === 'true')
  const [hasCompletedSetup, setHasCompletedSetup] = useState(() => safeStorageGet('fbply-setup-complete', 'false') === 'true')
  const [phase, setPhase] = useState(() =>
    typeof window !== 'undefined' && typeof window.setTimeout === 'function' ? 'splash' : 'welcome',
  )
  const [activeTab, setActiveTab] = useState('home')
  const [profile, setProfile] = useState(() => (hasCompletedSetup ? readStoredJson('fbply-profile', emptyProfile) : emptyProfile))
  const [expenses, setExpenses] = useState(() => (hasCompletedSetup ? readStoredJson('fbply-expenses', []) : []))
  const [savingsBuckets, setSavingsBuckets] = useState(() => (hasCompletedSetup ? readStoredJson('fbply-savings-buckets', []) : []))
  const [sharedGroups, setSharedGroups] = useState(() => (hasCompletedSetup ? readStoredJson('fbply-shared-groups', []) : []))
  const [moneyBookEntries, setMoneyBookEntries] = useState(() =>
    hasCompletedSetup ? normalizeMoneyBookEntries(readStoredJson('fbply-money-book', [])) : [],
  )
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => currentMonthKey())
  const expenseMode = 'daily'
  const [selectedCategory, setSelectedCategory] = useState('Food')
  const [customExpenseName, setCustomExpenseName] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [expenseError, setExpenseError] = useState('')
  const [expenseFieldErrors, setExpenseFieldErrors] = useState({})
  const [voiceDraft, setVoiceDraft] = useState(null)
  const [voiceStatus, setVoiceStatus] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN')
  const [quickSaveMode, setQuickSaveMode] = useState(() => safeStorageGet('fbply-voice-quick-save', 'false') === 'true')
  const [voiceMemory, setVoiceMemory] = useState(() => readStoredJson('fbply-voice-memory', {}))
  const [lastVoiceSave, setLastVoiceSave] = useState(null)
  const [addSheetMode, setAddSheetMode] = useState(null)
  const [plannerInput, setPlannerInput] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('Car')
  const [plannerTargetAmount, setPlannerTargetAmount] = useState('')
  const [plannerCurrentSavings, setPlannerCurrentSavings] = useState('')
  const [plannerTimeline, setPlannerTimeline] = useState('6m')
  const [theme, setTheme] = useState(() => safeStorageGet('fbply-theme', 'light'))
  const lowEnergyMode = false
  const [walkthroughStep, setWalkthroughStep] = useState(() =>
    safeStorageGet('fbply-walkthrough-complete', 'false') === 'true' ? -1 : 0,
  )
  const [authMessage, setAuthMessage] = useState('')
  const [authUser, setAuthUser] = useState(null)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isSessionChecking, setIsSessionChecking] = useState(() => isSupabaseReady)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [exportUnlockUntil, setExportUnlockUntil] = useState(() => Number(safeStorageGet('fbply-export-unlock-until', '0')))
  const [rewardedExport, setRewardedExport] = useState({ open: false, status: 'idle', progress: 0 })
  const recognitionRef = useRef(null)
  const rewardTimerRef = useRef(null)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname || '/')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const pageTitle = legalPages[currentPath]?.title
    document.title = pageTitle ? `FBPly | ${pageTitle}` : 'FBPly | Today'
  }, [currentPath])

  useEffect(() => {
    if (phase !== 'splash') {
      return undefined
    }

    const scheduleTransition =
      typeof window.setTimeout === 'function'
        ? (callback) => window.setTimeout(callback, 1600)
        : (callback) => {
            Promise.resolve().then(callback)
            return null
          }
    const timer = scheduleTransition(() => {
      if (!hasSeenOnboarding) {
        setPhase('welcome')
        return
      }

      setPhase(hasCompletedSetup && !isSupabaseReady ? 'app' : 'auth')
    })
    return () => {
      if (timer && typeof window.clearTimeout === 'function') {
        window.clearTimeout(timer)
      }
    }
  }, [hasCompletedSetup, hasSeenOnboarding, phase])

  useEffect(() => {
    const platform = typeof window !== 'undefined' ? window.Capacitor?.getPlatform?.() : ''
    document.documentElement.dataset.platform = platform || 'web'
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase, activeTab, currentPath])

  useEffect(() => {
    safeStorageSet('fbply-theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    safeStorageSet('fbply-low-energy', 'false')
    safeStorageSet('fbply-haptics', 'false')
    safeStorageSet('fbply-touch-sounds', 'false')
    document.documentElement.dataset.energy = 'full'
  }, [])

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushStorageQueue()
      }
    }

    window.addEventListener('pagehide', flushStorageQueue)
    document.addEventListener('visibilitychange', flushWhenHidden)

    return () => {
      flushStorageQueue()
      window.removeEventListener('pagehide', flushStorageQueue)
      document.removeEventListener('visibilitychange', flushWhenHidden)
    }
  }, [])

  useEffect(() => {
    safeStorageSet('fbply-onboarding-complete', String(hasSeenOnboarding))
  }, [hasSeenOnboarding])

  useEffect(() => {
    safeStorageSet('fbply-setup-complete', String(hasCompletedSetup))
  }, [hasCompletedSetup])

  useEffect(() => {
    safeStorageSetQueued('fbply-profile', JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    safeStorageSetQueued('fbply-expenses', JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    safeStorageSetQueued('fbply-savings-buckets', JSON.stringify(savingsBuckets))
  }, [savingsBuckets])

  useEffect(() => {
    safeStorageSetQueued('fbply-shared-groups', JSON.stringify(sharedGroups))
  }, [sharedGroups])

  useEffect(() => {
    safeStorageSetQueued('fbply-money-book', JSON.stringify(moneyBookEntries))
  }, [moneyBookEntries])

  useEffect(() => {
    safeStorageSet('fbply-voice-quick-save', quickSaveMode)
  }, [quickSaveMode])

  useEffect(() => {
    safeStorageSetQueued('fbply-voice-memory', JSON.stringify(voiceMemory))
  }, [voiceMemory])

  useEffect(() => {
    safeStorageSet('fbply-export-unlock-until', String(exportUnlockUntil))
  }, [exportUnlockUntil])

  useEffect(() => {
    return () => {
      if (rewardTimerRef.current) {
        window.clearInterval(rewardTimerRef.current)
      }
    }
  }, [])

  const applyAuthUser = useCallback((user) => {
    if (!user) {
      setAuthUser(null)
      return
    }

    setAuthUser(user)
    setProfile((current) => ({
      ...current,
      name: user.user_metadata?.name || user.user_metadata?.full_name || current.name,
      email: user.email || current.email,
    }))
  }, [])

  useEffect(() => {
    if (!isSupabaseReady) {
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return
      }

      const user = data.session?.user || null
      applyAuthUser(user)
      setIsSessionChecking(false)

      if (user) {
        setPhase(hasCompletedSetup ? 'app' : 'setup')
      }
    }).catch(() => {
      if (isMounted) {
        setIsSessionChecking(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      applyAuthUser(session?.user || null)

      if (event === 'SIGNED_IN') {
        setAuthMessage('')
        setPhase((currentPhase) => (currentPhase === 'auth' ? (hasCompletedSetup ? 'app' : 'setup') : currentPhase))
      }

      if (event === 'SIGNED_OUT') {
        setPhase('auth')
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [applyAuthUser, hasCompletedSetup])

  const financialActivity = useMemo(
    () => buildUnifiedFinanceEngine({
      expenses,
      moneyBookEntries,
      monthKey: currentMonthKey(),
      profile,
      savingsBuckets,
      sharedGroups,
      planner: {
        label: plannerInput,
        selectedPlan,
        targetAmount: plannerTargetAmount,
        currentSavings: plannerCurrentSavings,
        timeline: plannerTimeline,
      },
    }),
    [
      expenses,
      moneyBookEntries,
      plannerCurrentSavings,
      plannerInput,
      plannerTargetAmount,
      plannerTimeline,
      profile,
      savingsBuckets,
      selectedPlan,
      sharedGroups,
    ],
  )
  const selectedMonthActivity = useMemo(
    () => buildUnifiedFinanceEngine({
      expenses,
      moneyBookEntries,
      monthKey: selectedMonthKey,
      profile,
      savingsBuckets,
      sharedGroups,
      planner: {
        label: plannerInput,
        selectedPlan,
        targetAmount: plannerTargetAmount,
        currentSavings: plannerCurrentSavings,
        timeline: plannerTimeline,
      },
    }),
    [
      expenses,
      moneyBookEntries,
      plannerCurrentSavings,
      plannerInput,
      plannerTargetAmount,
      plannerTimeline,
      profile,
      savingsBuckets,
      selectedMonthKey,
      selectedPlan,
      sharedGroups,
    ],
  )
  const previousSelectedMonthKey = useMemo(() => shiftMonthKey(selectedMonthKey, -1), [selectedMonthKey])
  const previousMonthActivity = useMemo(
    () => buildUnifiedFinanceEngine({
      expenses,
      moneyBookEntries,
      monthKey: previousSelectedMonthKey,
      profile,
      savingsBuckets,
      sharedGroups,
      planner: {
        label: plannerInput,
        selectedPlan,
        targetAmount: plannerTargetAmount,
        currentSavings: plannerCurrentSavings,
        timeline: plannerTimeline,
      },
    }),
    [
      expenses,
      moneyBookEntries,
      plannerCurrentSavings,
      plannerInput,
      plannerTargetAmount,
      plannerTimeline,
      previousSelectedMonthKey,
      profile,
      savingsBuckets,
      selectedPlan,
      sharedGroups,
    ],
  )
  const monthOptions = useMemo(
    () => buildMonthOptions({ expenses, sharedGroups, moneyBookEntries }),
    [expenses, moneyBookEntries, sharedGroups],
  )
  const financialEntries = financialActivity.entries
  const sharedSummary = financialActivity.summary
  const historyGroups = selectedMonthActivity.historyGroups
  const transactionSummary = selectedMonthActivity.transactionSummary
  const moneyBookSummary = selectedMonthActivity.moneyBookSummary
  const selectedFinancialEntries = selectedMonthActivity.entries
  const selectedSharedSummary = selectedMonthActivity.summary
  const financialState = useMemo(() => calculateFinancialState(profile, financialEntries), [financialEntries, profile])
  const selectedFinancialState = useMemo(
    () => calculateFinancialState(profile, selectedFinancialEntries),
    [profile, selectedFinancialEntries],
  )
  const insights = useMemo(() => buildInsights(financialState, financialEntries), [financialEntries, financialState])
  const safeToSpend = useMemo(() => buildSafeToSpend(financialState), [financialState])
  const fixedDistribution = useMemo(() => buildFixedExpenseDistribution(profile), [profile])
  const flexibleDistribution = useMemo(
    () => buildFlexibleSpendingDistribution(financialEntries, financialState),
    [financialEntries, financialState],
  )
  const quickExpenseChips = useMemo(() => buildQuickExpenseChips(expenses, voiceMemory), [expenses, voiceMemory])
  const calmSummaries = useMemo(
    () => buildCalmSummaries(financialEntries, financialState, savingsBuckets),
    [financialEntries, financialState, savingsBuckets],
  )
  const whatChangedInsights = useMemo(
    () => buildWhatChangedInsights(financialEntries, financialState),
    [financialEntries, financialState],
  )
  const emergencyCushion = useMemo(
    () => buildEmergencyCushion(savingsBuckets, financialState),
    [savingsBuckets, financialState],
  )
  const planningCategory = selectedPlan
  const recommendation = useMemo(
    () => {
      if (!Number(plannerTargetAmount || 0)) {
        return null
      }

      return buildRecommendation(planningCategory, profile, financialState, {
        label: plannerInput,
        targetAmount: plannerTargetAmount,
        currentSavings: plannerCurrentSavings,
        timeline: plannerTimeline,
      })
    },
    [financialState, plannerCurrentSavings, plannerInput, plannerTargetAmount, plannerTimeline, planningCategory, profile],
  )
  const smartHomeInsights = useMemo(
    () => buildSmartHomeInsights({
      expenses: financialEntries,
      financialState,
      savingsBuckets,
      recommendation,
    }),
    [financialEntries, financialState, recommendation, savingsBuckets],
  )
  const smartReminders = useMemo(
    () => buildSmartReminders({
      profile,
      savingsBuckets,
      moneyBookSummary: financialActivity.moneyBookSummary,
      recommendation,
      monthKey: financialActivity.monthKey,
    }),
    [financialActivity.moneyBookSummary, financialActivity.monthKey, profile, recommendation, savingsBuckets],
  )
  const financialHealth = useMemo(
    () => buildFinancialHealthScore({
      expenses: financialEntries,
      financialState,
      savingsBuckets,
      recommendation,
      moneyBookSummary: financialActivity.moneyBookSummary,
    }),
    [financialActivity.moneyBookSummary, financialEntries, financialState, recommendation, savingsBuckets],
  )
  const selectedCashflowTimeline = useMemo(
    () => buildCashflowTimeline(selectedMonthActivity.transactions),
    [selectedMonthActivity.transactions],
  )
  const selectedMonthlyComparison = useMemo(
    () => buildMonthlyComparison({
      current: selectedMonthActivity.transactionSummary,
      previous: previousMonthActivity.transactionSummary,
    }),
    [previousMonthActivity.transactionSummary, selectedMonthActivity.transactionSummary],
  )
  const selectedExpenseBreakdown = useMemo(
    () => buildExpenseBreakdown(selectedFinancialEntries, profile),
    [profile, selectedFinancialEntries],
  )
  const selectedAdvancedReport = useMemo(
    () =>
      buildAdvancedReport({
        expenseBreakdown: selectedExpenseBreakdown,
        expenses: selectedFinancialEntries,
        financialState: selectedFinancialState,
        insights,
        profile,
        recommendation,
        savingsBuckets,
        sharedSummary: selectedSharedSummary,
        moneyBookSummary,
      }),
    [
      insights,
      moneyBookSummary,
      profile,
      recommendation,
      savingsBuckets,
      selectedExpenseBreakdown,
      selectedFinancialEntries,
      selectedFinancialState,
      selectedSharedSummary,
    ],
  )

  const handleEmailAuth = useCallback(async ({ mode, email, password, name }) => {
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanName = String(name || '').trim()

    setAuthMessage('')

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthMessage('Add a valid email address to continue.')
      return
    }

    if (!password || password.length < 6) {
      setAuthMessage('Use a password with at least 6 characters.')
      return
    }

    if (!isSupabaseReady) {
      setAuthMessage(
        hasSupabaseAnonKey
          ? 'Secure sign-in could not start. Please try again in a moment.'
          : 'Secure cloud sign-in is not active here, so FBPly will continue locally on this device.',
      )
      setProfile((current) => ({
        ...current,
        name: cleanName || current.name,
        email: cleanEmail,
      }))
      setPhase(hasCompletedSetup ? 'app' : 'setup')
      return
    }

    setIsAuthBusy(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName || cleanEmail.split('@')[0],
            },
          },
        })

        if (error) {
          setAuthMessage(error.message || 'Sign up could not finish. Please try again.')
          return
        }

        if (data.session?.user) {
          applyAuthUser(data.session.user)
          setPhase(hasCompletedSetup ? 'app' : 'setup')
          return
        }

        setAuthMessage('Account created. Please confirm your email, then log in.')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        setAuthMessage(error.message || 'Login could not finish. Please try again.')
        return
      }

      applyAuthUser(data.user)
      setPhase(hasCompletedSetup ? 'app' : 'setup')
    } finally {
      setIsAuthBusy(false)
    }
  }, [applyAuthUser, hasCompletedSetup])

  const handleSignOut = useCallback(async () => {
    setAuthMessage('')

    if (isSupabaseReady) {
      await supabase.auth.signOut().catch(() => null)
    }

    setAuthUser(null)
    setPhase('auth')
  }, [])

  const updateCommitment = useCallback((id, patch) => {
    setProfile((current) => ({
      ...current,
      commitments: normalizeCommitments(current).map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }, [])

  const addCommitment = useCallback(() => {
    setProfile((current) => ({
      ...current,
      commitments: [...normalizeCommitments(current), createCommitment('New commitment', 0)],
    }))
  }, [])

  const removeCommitment = useCallback((id) => {
    setProfile((current) => ({
      ...current,
      commitments: normalizeCommitments(current).filter((item) => item.id !== id),
    }))
  }, [])

  const clearExpenseFieldError = useCallback((field) => {
    setExpenseFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const saveExpenseRecord = useCallback(({ label, category, amount, note = '', type = expenseMode, source = 'manual' }) => {
    const parsedAmount = Number(amount)
    const categoryName = String(category || '').trim()
    const labelName = String(label || categoryName || '').trim()
    const fieldErrors = {}

    setExpenseError('')

    if (!parsedAmount || parsedAmount <= 0) {
      fieldErrors.amount = 'Add a positive amount.'
    }

    if (!categoryName) {
      fieldErrors.category = 'Choose a category.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setExpenseFieldErrors(fieldErrors)
      setExpenseError('Check the highlighted fields before saving.')
      return false
    }

    if (parsedAmount > 999999999) {
      setExpenseFieldErrors({ amount: 'This amount looks unusually high.' })
      setExpenseError('That amount looks unusually high. Please check it once.')
      return false
    }

    const newExpense = {
      id: Date.now(),
      label: labelName,
      category: categoryName || 'Other',
      amount: parsedAmount,
      note: note || `${labelName} ${type} entry`,
      type,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      source,
    }

    setExpenseFieldErrors({})
    setExpenses((current) => [newExpense, ...current])
    return newExpense
  }, [expenseMode])

  const addExpense = useCallback((event) => {
    event.preventDefault()
    const trimmedCustomName = customExpenseName.trim()

    const categoryName = selectedCategory === 'Custom' ? 'Other' : selectedCategory
    const saved = saveExpenseRecord({
      label: trimmedCustomName,
      category: categoryName,
      amount: expenseAmount,
      note: expenseNote,
      type: expenseMode,
    })

    if (!saved) {
      return false
    }

    setExpenseAmount('')
    setExpenseNote('')
    setCustomExpenseName('')
    setExpenseFieldErrors({})
    return saved
  }, [customExpenseName, expenseAmount, expenseMode, expenseNote, saveExpenseRecord, selectedCategory])

  const saveVoiceDraft = useCallback((draft, options = {}) => {
    if (!draft) {
      return false
    }

    const label = String(draft.label || draft.category || '').trim()
    const saved = saveExpenseRecord({
      label,
      category: draft.category,
      amount: draft.amount,
      note: label ? `${label} - Voice: ${draft.transcript}` : `Voice entry: ${draft.transcript}`,
      type: 'daily',
      source: 'voice',
    })

    if (!saved) {
      return false
    }

    setVoiceMemory((current) => learnVoiceExpense(current, draft))
    setLastVoiceSave({ expense: saved, draft })
    setVoiceDraft(null)
    setVoiceStatus(
      options.auto
        ? `Quick saved ${label || draft.category}. Undo is available below.`
        : 'Saved. You can add another whenever you are ready.',
    )
    return true
  }, [saveExpenseRecord])

  const confirmVoiceExpense = useCallback(() => {
    saveVoiceDraft(voiceDraft)
  }, [saveVoiceDraft, voiceDraft])

  const updateVoiceDraft = useCallback((patch) => {
    setVoiceDraft((current) => (current ? { ...current, ...patch } : current))
  }, [])

  const clearVoiceDraft = useCallback(() => {
    setVoiceDraft(null)
    setVoiceStatus('Voice draft cleared. You can try again or add it manually.')
  }, [])

  const useVoiceDraftInForm = useCallback(() => {
    if (!voiceDraft) {
      return
    }

    const knownCategory = expenseCategories.find(
      (category) => category.label.toLowerCase() === String(voiceDraft.category || '').toLowerCase(),
    )
    setSelectedCategory(knownCategory ? knownCategory.label : 'Custom')
    setCustomExpenseName(voiceDraft.label || '')
    setExpenseAmount(String(voiceDraft.amount || ''))
    setExpenseNote(`${voiceDraft.label} - ${voiceDraft.transcript}`)
    setVoiceDraft(null)
    setVoiceStatus('Moved to the form. Adjust anything and save when it looks right.')
  }, [voiceDraft])

  const undoVoiceSave = useCallback(() => {
    if (!lastVoiceSave?.expense?.id) {
      return
    }

    setExpenses((current) => current.filter((expense) => expense.id !== lastVoiceSave.expense.id))
    setVoiceDraft(lastVoiceSave.draft)
    setVoiceStatus('Last voice save undone. You can edit it before saving again.')
    setLastVoiceSave(null)
  }, [lastVoiceSave])

  const addSharedGroup = useCallback((group) => {
    const members = uniqueSharedPeople([
      resolveCurrentUserName(profile),
      ...(group.people || []),
    ])
    const groupName = String(group.name || '').trim()

    if (!groupName || members.length < 2) {
      return false
    }

    setSharedGroups((current) => [
      createSharedGroup({
        name: groupName,
        people: members,
        profile,
      }),
      ...current,
    ])
    return true
  }, [profile])

  const addSharedPayment = useCallback((groupId, payment) => {
    const label = String(payment.label || '').trim()
    const paidBy = String(payment.paidBy || '').trim()
    const amount = Number(payment.amount || 0)

    if (!label || !paidBy || !amount || amount <= 0) {
      return false
    }

    setSharedGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              payments: [
                createSharedPayment({
                  label,
                  paidBy,
                  amount,
                }),
                ...(group.payments || []),
              ],
            }
          : group,
      ),
    )
    return true
  }, [])

  const markSharedSettlementReceived = useCallback((groupId, settlementId) => {
    setSharedGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) {
          return group
        }

        const reconciled = reconcileSharedGroup(group, profile)
        const settlement = reconciled.settlements.find((item) => item.id === settlementId)

        if (!settlement) {
          return group
        }

        const status = settlement.direction === 'outgoing' ? 'paid' : 'received'
        const receivedSettlement = {
          ...settlement,
          settledAmount: settlement.amount,
          remainingAmount: 0,
          status,
          receivedAt: new Date().toISOString(),
        }
        const savedSettlements = group.settlements || []
        const hasSettlement = savedSettlements.some((item) => item.id === settlementId)

        return {
          ...group,
          settlements: hasSettlement
            ? savedSettlements.map((item) => (item.id === settlementId ? receivedSettlement : item))
            : [...savedSettlements, receivedSettlement],
        }
      }),
    )
  }, [profile])

  const saveMoneyBookEntry = useCallback((entry) => {
    const saved = createMoneyBookEntry(entry)

    if (!saved.person || !saved.amount || saved.amount <= 0) {
      return false
    }

    setMoneyBookEntries((current) => {
      const exists = current.some((item) => item.id === saved.id)

      if (exists) {
        return current.map((item) => (item.id === saved.id ? { ...item, ...saved, createdAt: item.createdAt || saved.createdAt } : item))
      }

      return [saved, ...current]
    })
    return true
  }, [])

  const toggleMoneyBookSettlement = useCallback((id) => {
    setMoneyBookEntries((current) =>
      current.map((entry) => {
        if (entry.id !== id) {
          return entry
        }

        const isSettled = entry.status === 'settled'

        return {
          ...entry,
          status: isSettled ? 'pending' : 'settled',
          settledAt: isSettled ? '' : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const deleteMoneyBookEntry = useCallback((id) => {
    setMoneyBookEntries((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const removeSharedGroup = useCallback((id) => {
    setSharedGroups((current) => current.filter((group) => group.id !== id))
  }, [])

  const addSavingsBucket = useCallback(() => {
    setSavingsBuckets((current) => [createBucket('New bucket', 0, 10000), ...current])
  }, [])

  const openAddSheet = useCallback((mode = 'menu') => {
    setAddSheetMode(mode)
  }, [])

  const closeAddSheet = useCallback(() => {
    setAddSheetMode(null)
  }, [])

  const updateSavingsBucket = useCallback((id, patch) => {
    setSavingsBuckets((current) =>
      current.map((bucket) => (bucket.id === id ? { ...bucket, ...patch } : bucket)),
    )
  }, [])

  const removeSavingsBucket = useCallback((id) => {
    setSavingsBuckets((current) => current.filter((bucket) => bucket.id !== id))
  }, [])

  const applyQuickExpense = useCallback((chip) => {
    const targetCategory = chip.category || chip.label
    const knownCategory = expenseCategories.find(
      (category) => category.label.toLowerCase() === String(targetCategory).toLowerCase(),
    )
    setSelectedCategory(knownCategory ? knownCategory.label : 'Custom')
    setCustomExpenseName(chip.label)
    setExpenseAmount(chip.amount ? String(chip.amount) : '')
    setExpenseNote(chip.label)
    setExpenseError('')
    setExpenseFieldErrors({})
  }, [])

  const editExpense = useCallback((expense) => {
    const knownCategory = expenseCategories.find(
      (category) => category.label.toLowerCase() === String(expense.category || '').toLowerCase(),
    )

    setExpenses((current) => current.filter((item) => item.id !== expense.id))
    setSelectedCategory(knownCategory ? knownCategory.label : 'Custom')
    setCustomExpenseName(expense.label || expense.category || '')
    setExpenseAmount(String(expense.amount || ''))
    setExpenseNote(expense.note || '')
    setExpenseError('')
    setExpenseFieldErrors({})
    setActiveTab('home')
    openAddSheet('expense')
    setVoiceStatus('Loaded the recent entry for editing. Review and save it again.')
  }, [openAddSheet])

  const startVoiceExpense = useCallback(() => {
    if (typeof window === 'undefined') {
      setVoiceStatus('Voice entry is not available here. You can still use quick add.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setVoiceStatus('Voice entry is not available on this device browser. Quick add is ready below.')
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const recognition = new SpeechRecognition()
    recognition.lang = voiceLanguage
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    setIsListening(true)
    setVoiceDraft(null)
    setVoiceStatus('Listening. Review once before saving.')

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      const parsed = parseVoiceExpense(transcript, voiceMemory)

      if (!parsed) {
        setVoiceDraft(null)
        setVoiceStatus('I could not find a clear amount. Please try again or use quick add.')
        return
      }

      if (quickSaveMode && parsed.canQuickSave) {
        saveVoiceDraft(parsed, { auto: true })
        return
      }

      setVoiceDraft(parsed)
      setVoiceStatus(
        parsed.confidence === 'high'
          ? 'Looks clear. Review once or save directly.'
          : 'Please review the label, amount, and category before saving.',
      )
    }

    recognition.onerror = () => {
      setVoiceStatus('Voice entry paused. You can try again or type it in.')
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.start()
  }, [quickSaveMode, saveVoiceDraft, voiceLanguage, voiceMemory])

  const stopVoiceExpense = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    setIsListening(false)
    setVoiceStatus('Voice entry stopped. You can retry whenever it feels easy.')
  }, [])

  const downloadPdf = useCallback(async () => {
    if (isExportingPdf) {
      return
    }

    setPdfError('')
    setIsExportingPdf(true)

    try {
      const reportData = {
        advancedReport: selectedAdvancedReport,
        expenseBreakdown: selectedExpenseBreakdown,
        expenses: selectedFinancialEntries,
        financialState: selectedFinancialState,
        insights,
        profile,
        recommendation,
        savingsBuckets,
        sharedSummary: selectedSharedSummary,
        moneyBookSummary,
      }
      const { isNativeMobileApp, sharePdfBlob } = await import('./lib/nativeFileShare')

      if (isNativeMobileApp()) {
        const { createMonthlyReportPdfBlob } = await import('./lib/reportPdf')
        const blob = await createMonthlyReportPdfBlob(reportData)
        await sharePdfBlob(blob, 'FBPly-financial-report.pdf')
      } else {
        const { generateMonthlyReportPdf } = await import('./lib/reportPdf')
        await generateMonthlyReportPdf(reportData)
      }
    } catch {
      setPdfError('The report could not be prepared. Please try again in a moment.')
    } finally {
      setIsExportingPdf(false)
    }
  }, [
    insights,
    isExportingPdf,
    moneyBookSummary,
    profile,
    recommendation,
    savingsBuckets,
    selectedAdvancedReport,
    selectedExpenseBreakdown,
    selectedFinancialEntries,
    selectedFinancialState,
    selectedSharedSummary,
  ])

  const closeRewardedExport = useCallback(() => {
    if (rewardTimerRef.current) {
      window.clearInterval(rewardTimerRef.current)
      rewardTimerRef.current = null
    }

    setRewardedExport({ open: false, status: 'idle', progress: 0 })
  }, [])

  const startRewardedExport = useCallback(() => {
    if (rewardedExport.status === 'watching') {
      return
    }

    if (rewardTimerRef.current) {
      window.clearInterval(rewardTimerRef.current)
    }

    const duration = 6500
    const startedAt = Date.now()
    setRewardedExport({ open: true, status: 'watching', progress: 4 })

    rewardTimerRef.current = window.setInterval(() => {
      const progress = Math.min(Math.round(((Date.now() - startedAt) / duration) * 100), 100)
      setRewardedExport({ open: true, status: progress >= 100 ? 'unlocked' : 'watching', progress })

      if (progress >= 100) {
        window.clearInterval(rewardTimerRef.current)
        rewardTimerRef.current = null
        const unlockedUntil = Date.now() + 15 * 60 * 1000
        setExportUnlockUntil(unlockedUntil)
        window.setTimeout(() => {
          setRewardedExport({ open: false, status: 'idle', progress: 0 })
          downloadPdf()
        }, 450)
      }
    }, 250)
  }, [downloadPdf, rewardedExport.status])

  const requestPdfExport = useCallback(() => {
    if (isExportingPdf) {
      return
    }

    if (exportUnlockUntil > Date.now()) {
      downloadPdf()
      return
    }

    setPdfError('')
    setRewardedExport({ open: true, status: 'ready', progress: 0 })
  }, [downloadPdf, exportUnlockUntil, isExportingPdf])

  const exportCsv = useCallback(async () => {
    const header = 'date,direction,impact_type,category,title,amount,source_module,note'
    const rows = selectedMonthActivity.transactions.map((item) =>
      [
        item.date,
        item.direction,
        item.impactType,
        item.category,
        item.title,
        item.amount,
        item.sourceModule,
        item.note,
      ].map(csvCell).join(','),
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })

    try {
      const { isNativeMobileApp, shareBlob } = await import('./lib/nativeFileShare')

      if (isNativeMobileApp()) {
        await shareBlob(blob, `FBPly-history-${selectedMonthKey}.csv`, {
          title: 'FBPly history CSV',
          text: 'Your FBPly financial history export is ready.',
          dialogTitle: 'Save or share CSV',
        })
        return
      }
    } catch {
      setPdfError('The CSV could not be prepared. Please try again in a moment.')
      return
    }

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `FBPly-history-${selectedMonthKey}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [selectedMonthActivity.transactions, selectedMonthKey])

  const legalPage = legalPages[currentPath]

  if (legalPage) {
    return (
      <div className="app-root" data-theme={theme} data-energy="full">
        <ThemeChoice theme={theme} setTheme={setTheme} />
        <LegalPage page={legalPage} />
        <CookieConsentBanner />
      </div>
    )
  }

  return (
    <div className="app-root" data-theme={theme} data-energy={lowEnergyMode ? 'low' : 'full'}>
      <ThemeChoice theme={theme} setTheme={setTheme} />
      <OfflineBanner isOnline={isOnline} />
      <RewardedExportModal
        rewardState={rewardedExport}
        onStart={startRewardedExport}
        onClose={closeRewardedExport}
      />
      <AnimatePresence mode="wait">
        {phase === 'splash' && (
          <SplashScreen
            key="splash"
            onDone={() => setPhase(hasCompletedSetup && !isSupabaseReady ? 'app' : hasSeenOnboarding ? 'auth' : 'welcome')}
          />
        )}
        {phase === 'welcome' && (
          <WelcomeScreen
            key="welcome"
            onStart={() => {
              setHasSeenOnboarding(true)
              setPhase('auth')
            }}
          />
        )}
        {phase === 'auth' && (
          isSessionChecking ? (
            <AuthFallback key="auth-loading" />
          ) : (
            <AuthScreen
              key="auth"
              authMessage={authMessage}
              isAuthBusy={isAuthBusy}
              onEmailAuth={handleEmailAuth}
            />
          )
        )}
        {phase === 'setup' && (
          <SetupScreen
            key="setup"
            profile={profile}
            setProfile={setProfile}
            onComplete={() => {
              setHasCompletedSetup(true)
              setActiveTab('home')
              setPhase('app')
            }}
          />
        )}
        {phase === 'app' && (
          <AppErrorBoundary resetKey={`${activeTab}-${selectedMonthKey}`}>
            <MainApp
              key="app"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              profile={profile}
              setProfile={setProfile}
              authUser={authUser}
              onSignOut={handleSignOut}
              addSheetMode={addSheetMode}
              openAddSheet={openAddSheet}
              closeAddSheet={closeAddSheet}
              financialState={financialState}
              insights={insights}
              smartHomeInsights={smartHomeInsights}
              smartReminders={smartReminders}
              financialHealth={financialHealth}
              safeToSpend={safeToSpend}
              fixedDistribution={fixedDistribution}
              flexibleDistribution={flexibleDistribution}
              calmSummaries={calmSummaries}
              whatChangedInsights={whatChangedInsights}
              emergencyCushion={emergencyCushion}
              savingsBuckets={savingsBuckets}
              lowEnergyMode={lowEnergyMode}
              advancedReport={selectedAdvancedReport}
              reportExpenseBreakdown={selectedExpenseBreakdown}
              reportFinancialState={selectedFinancialState}
              reportTransactions={selectedMonthActivity.transactions}
              reportTransactionSummary={selectedMonthActivity.transactionSummary}
              monthlyComparison={selectedMonthlyComparison}
              todayTransactions={financialActivity.transactions}
              expenses={expenses}
              historyGroups={historyGroups}
              transactionSummary={transactionSummary}
              cashflowTimeline={selectedCashflowTimeline}
              moneyBookEntries={moneyBookEntries}
              moneyBookSummary={moneyBookSummary}
              saveMoneyBookEntry={saveMoneyBookEntry}
              toggleMoneyBookSettlement={toggleMoneyBookSettlement}
              deleteMoneyBookEntry={deleteMoneyBookEntry}
              selectedMonthKey={selectedMonthKey}
              setSelectedMonthKey={setSelectedMonthKey}
              monthOptions={monthOptions}
              sharedSummary={sharedSummary}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              customExpenseName={customExpenseName}
              setCustomExpenseName={setCustomExpenseName}
              expenseAmount={expenseAmount}
              setExpenseAmount={setExpenseAmount}
              expenseNote={expenseNote}
              setExpenseNote={setExpenseNote}
              expenseError={expenseError}
              expenseFieldErrors={expenseFieldErrors}
              clearExpenseFieldError={clearExpenseFieldError}
              addExpense={addExpense}
              voiceDraft={voiceDraft}
              voiceStatus={voiceStatus}
              isListening={isListening}
              voiceLanguage={voiceLanguage}
              setVoiceLanguage={setVoiceLanguage}
              quickSaveMode={quickSaveMode}
              setQuickSaveMode={setQuickSaveMode}
              startVoiceExpense={startVoiceExpense}
              stopVoiceExpense={stopVoiceExpense}
              confirmVoiceExpense={confirmVoiceExpense}
              updateVoiceDraft={updateVoiceDraft}
              clearVoiceDraft={clearVoiceDraft}
              useVoiceDraftInForm={useVoiceDraftInForm}
              undoVoiceSave={undoVoiceSave}
              lastVoiceSave={lastVoiceSave}
              quickExpenseChips={quickExpenseChips}
              applyQuickExpense={applyQuickExpense}
              editExpense={editExpense}
              sharedGroups={sharedGroups}
              addSharedGroup={addSharedGroup}
              addSharedPayment={addSharedPayment}
              markSharedSettlementReceived={markSharedSettlementReceived}
              removeSharedGroup={removeSharedGroup}
              plannerInput={plannerInput}
              setPlannerInput={setPlannerInput}
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
              plannerTargetAmount={plannerTargetAmount}
              setPlannerTargetAmount={setPlannerTargetAmount}
              plannerCurrentSavings={plannerCurrentSavings}
              setPlannerCurrentSavings={setPlannerCurrentSavings}
              plannerTimeline={plannerTimeline}
              setPlannerTimeline={setPlannerTimeline}
              recommendation={recommendation}
              downloadPdf={requestPdfExport}
              exportCsv={exportCsv}
              isExportingPdf={isExportingPdf}
              pdfError={pdfError}
              updateCommitment={updateCommitment}
              addCommitment={addCommitment}
              removeCommitment={removeCommitment}
              addSavingsBucket={addSavingsBucket}
              updateSavingsBucket={updateSavingsBucket}
              removeSavingsBucket={removeSavingsBucket}
            />
          </AppErrorBoundary>
        )}
      </AnimatePresence>
      {phase === 'app' && hasCompletedSetup && walkthroughStep >= 0 && (
        <WalkthroughOverlay
          step={walkthroughSteps[walkthroughStep]}
          current={walkthroughStep + 1}
          total={walkthroughSteps.length}
          onNext={() => {
            if (walkthroughStep >= walkthroughSteps.length - 1) {
              safeStorageSet('fbply-walkthrough-complete', 'true')
              setWalkthroughStep(-1)
              return
            }

            const nextStep = walkthroughStep + 1
            const nextTab = walkthroughSteps[nextStep]?.tab
            if (nextTab) {
              setActiveTab(nextTab)
            }
            setWalkthroughStep(nextStep)
          }}
          onSkip={() => {
            safeStorageSet('fbply-walkthrough-complete', 'true')
            setWalkthroughStep(-1)
          }}
        />
      )}
      <CookieConsentBanner />
    </div>
  )
}

function OfflineBanner({ isOnline }) {
  if (isOnline) {
    return null
  }

  return (
    <div className="offline-banner" role="status">
      You are offline. FBPly will keep this demo session available on this device.
    </div>
  )
}

function LegalPage({ page }) {
  const legalContactItems = [
    {
      title: 'Contact',
      body: 'Product and general inquiries.',
    },
    {
      title: 'Support',
      body: 'Help with app access, saved data, reports, or account questions.',
    },
    {
      title: 'Privacy inquiries',
      body: 'Questions about data handling, local storage, or statement review.',
    },
  ]

  return (
    <main className="legal-page-shell">
      <section className="legal-page-card">
        <HeaderLogo />
        <div className="legal-page-hero">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.summary}</p>
        </div>
        <div className="legal-section-list">
          {page.sections.map((section) => (
            <article className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>
          ))}
        </div>
        <section className="legal-contact-panel" aria-label="Official FBPly contact">
          {legalContactItems.map((item) => (
            <article key={item.title}>
              <span>{item.title}</span>
              <p>{item.body}</p>
            </article>
          ))}
          <a className="legal-contact-link" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </section>
        <a className="legal-back-link" href="/">
          Back to FBPly
        </a>
      </section>
    </main>
  )
}

function CookieConsentBanner() {
  const [accepted, setAccepted] = useState(() => safeStorageGet('fbply-cookie-consent', 'false') === 'true')

  if (accepted) {
    return null
  }

  return (
    <section className="cookie-consent" role="dialog" aria-label="Cookie notice">
      <div>
        <strong>Cookie notice</strong>
        <p>FBPly uses local storage for app preferences. If ads are enabled later, third-party ad partners may use cookies.</p>
      </div>
      <button
        type="button"
        onClick={() => {
          safeStorageSet('fbply-cookie-consent', 'true')
          setAccepted(true)
        }}
      >
        Accept
      </button>
    </section>
  )
}

function SplashScreen({ onDone }) {
  return (
    <motion.main className="splash-screen" {...fadeUp}>
      <span className="splash-progress" aria-hidden="true" onAnimationEnd={onDone} />
      <div className="brand-orbit" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="splash-brand-card">
        <BrandMark size="hero" />
        <strong>FBPly</strong>
      </div>
      <div className="coin-loader" role="status" aria-label="Loading FBPly">
        <div className="coin" aria-hidden="true">
          <span>₹</span>
        </div>
        <p>Spend Smarter. Feel Better.</p>
        <button className="splash-skip-button" type="button" onClick={onDone}>
          Continue
        </button>
      </div>
    </motion.main>
  )
}

function WelcomeScreen({ onStart }) {
  return (
    <motion.main className="entry-screen" {...fadeUp}>
      <div className="entry-shell welcome-shell">
        <HeaderLogo />
        <section className="welcome-card">
          <div className="welcome-icon">
            <PiggyBank size={28} />
          </div>
          <div className="welcome-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
        <section className="entry-copy">
          <p className="eyebrow">Welcome to FBPly</p>
          <h1>Let's build a clear monthly money picture.</h1>
          <p className="welcome-copy">
            Start with a few numbers. FBPly uses them to show simple, honest guidance.
          </p>
        </section>
        <button className="primary-button full" type="button" onClick={onStart}>
          Start
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.main>
  )
}

function AuthFallback() {
  return (
    <motion.main className="entry-screen" {...fadeUp}>
      <div className="entry-shell auth-shell">
        <HeaderLogo />
        <section className="entry-copy skeleton-text-group">
          <span className="skeleton-line short" />
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
        </section>
        <div className="auth-card skeleton-auth-card" aria-label="Loading login form">
          <span className="skeleton-option" />
          <span className="skeleton-line short" />
          <span className="skeleton-block" />
          <span className="skeleton-line short" />
          <span className="skeleton-block" />
          <span className="skeleton-option" />
        </div>
      </div>
    </motion.main>
  )
}

function AuthScreen({ authMessage, isAuthBusy, onEmailAuth }) {
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const isSignup = authMode === 'signup'

  const submitAuth = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    onEmailAuth({
      mode: authMode,
      email: form.querySelector('#email')?.value || email,
      password: form.querySelector('#password')?.value || '',
      name: form.querySelector('#name')?.value || name,
    })
  }

  return (
    <motion.main className="entry-screen" {...fadeUp}>
      <div className="entry-shell auth-shell">
        <HeaderLogo />
        <section className="entry-copy">
          <p className="eyebrow">{isSignup ? 'Create your space' : 'Welcome back'}</p>
          <h1>Plan purchases with clearer numbers.</h1>
        </section>
        <form className="auth-card" onSubmit={submitAuth}>
          <div className="auth-mode-toggle" aria-label="Authentication mode">
            <button
              className={authMode === 'login' ? 'active' : ''}
              type="button"
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'signup' ? 'active' : ''}
              type="button"
              onClick={() => setAuthMode('signup')}
            >
              Sign up
            </button>
          </div>
          {isSignup && (
            <>
              <label className="input-label" htmlFor="name">
                Name
              </label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  id="name"
                  type="text"
                  value={name}
                  placeholder="Your name"
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </>
          )}
          <label className="input-label" htmlFor="email">
            Email
          </label>
          <div className="input-with-icon">
            <Mail size={18} />
            <input
              id="email"
              type="email"
              value={email}
              placeholder="you@example.com"
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <label className="input-label" htmlFor="password">
            Password
          </label>
          <div className="input-with-icon">
            <LockKeyhole size={18} />
            <input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>
          <button className="primary-button full" type="submit" disabled={isAuthBusy}>
            {isAuthBusy ? 'Please wait...' : isSignup ? 'Create account' : 'Email login'}
          </button>
          <p className="subtle-note auth-trust-note">Private by design. Your finance data stays yours.</p>
          {authMessage && <p className="form-message">{authMessage}</p>}
        </form>
      </div>
    </motion.main>
  )
}

function SetupScreen({ profile, setProfile, onComplete }) {
  const commitments = normalizeCommitments(profile)
  const isEmiName = (name) => /\b(emi|loan|installment|instalment|finance|bnpl)\b/i.test(String(name || ''))
  const fixedCommitments = commitments.filter((item) => !isEmiName(item.name))
  const emiCommitments = commitments.filter((item) => isEmiName(item.name))
  const [setupError, setSetupError] = useState('')
  const [step, setStep] = useState(0)
  const [fixedName, setFixedName] = useState('')
  const [fixedAmount, setFixedAmount] = useState('')
  const [emiName, setEmiName] = useState('')
  const [emiAmount, setEmiAmount] = useState('')
  const totalSteps = 6
  const activeStep = Math.min(step + 1, totalSteps)

  const upsertSetupCommitment = (name, amount) => {
    const cleanName = String(name || '').trim()
    const parsedAmount = Number(amount || 0)

    if (!cleanName || !parsedAmount || parsedAmount <= 0) {
      setSetupError('Add a name and amount to save this monthly item.')
      return false
    }

    setProfile((current) => {
      const existing = normalizeCommitments(current)
      const matchName = cleanName.toLowerCase()
      const hasItem = existing.some((item) => item.name.toLowerCase() === matchName)
      const nextItem = { id: `setup-${slugify(cleanName)}`, name: cleanName, amount: parsedAmount }
      const commitments = hasItem
        ? existing.map((item) =>
            item.name.toLowerCase() === matchName ? { ...item, name: cleanName, amount: parsedAmount } : item,
          )
        : [...existing, nextItem]

      return { ...current, commitments }
    })
    setSetupError('')
    return true
  }

  const removeSetupCommitment = (id) => {
    setProfile((current) => ({
      ...current,
      commitments: normalizeCommitments(current).filter((item) => item.id !== id),
    }))
  }

  const addFixedExpense = () => {
    if (upsertSetupCommitment(fixedName, fixedAmount)) {
      setFixedName('')
      setFixedAmount('')
    }
  }

  const addEmi = () => {
    if (upsertSetupCommitment(emiName || 'Existing EMI', emiAmount)) {
      setEmiName('')
      setEmiAmount('')
    }
  }

  const goNext = () => {
    if (step === 1 && !Number(profile.income || 0)) {
      setSetupError('Add your monthly income to build a useful financial picture.')
      return
    }

    setSetupError('')
    setStep((current) => Math.min(current + 1, totalSteps - 1))
  }

  const goBack = () => {
    setSetupError('')
    setStep((current) => Math.max(current - 1, 0))
  }

  const finishSetup = () => {
    if (!Number(profile.income || 0)) {
      setSetupError('Add your monthly income to build a useful financial picture.')
      setStep(1)
      return
    }

    setProfile((current) => ({
      ...current,
      commitments: normalizeCommitments(current).filter((item) => item.name && Number(item.amount || 0) > 0),
    }))
    setSetupError('')
    onComplete()
  }

  const renderStep = () => {
    if (step === 0) {
      return (
        <section className="setup-flow-card welcome-step-card">
          <div className="welcome-icon">
            <PiggyBank size={28} />
          </div>
          <div>
            <p className="eyebrow">Welcome to FBPly</p>
            <h1>Let's understand your month.</h1>
            <p>Answer one question at a time. FBPly builds your dashboard from your real numbers.</p>
          </div>
        </section>
      )
    }

    if (step === 1) {
      return (
        <section className="setup-flow-card">
          <p className="eyebrow">Question {activeStep - 1}</p>
          <h1>What is your monthly income?</h1>
          <p className="setup-soft-copy">Use your usual take-home amount. Approximate is okay.</p>
          <CurrencyInput
            label="Monthly Income"
            value={profile.income || ''}
            onChange={(value) => setProfile((current) => ({ ...current, income: Number(value) }))}
          />
        </section>
      )
    }

    if (step === 2) {
      return (
        <section className="setup-flow-card">
          <p className="eyebrow">Question {activeStep - 1}</p>
          <h1>What are your fixed monthly expenses?</h1>
          <p className="setup-soft-copy">Tap a suggestion or add your own. Keep only regular monthly items here.</p>
          <div className="setup-chip-grid" aria-label="Fixed expense suggestions">
            {fixedExpenseSuggestions.map((suggestion) => (
              <button
                className={`setup-chip ${fixedName === suggestion ? 'active' : ''}`}
                key={suggestion}
                type="button"
                onClick={() => setFixedName(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="setup-mini-form">
            <input
              className="plain-input"
              value={fixedName}
              placeholder="Custom name"
              onChange={(event) => setFixedName(event.target.value)}
            />
            <CurrencyInput label="Amount" id="setup-fixed-amount" value={fixedAmount} onChange={setFixedAmount} />
            <button className="ghost-button" type="button" onClick={addFixedExpense}>
              <Plus size={17} />
              Add item
            </button>
          </div>
          <SetupCommitmentList items={fixedCommitments} onRemove={removeSetupCommitment} />
        </section>
      )
    }

    if (step === 3) {
      return (
        <section className="setup-flow-card">
          <p className="eyebrow">Question {activeStep - 1}</p>
          <h1>Do you currently pay any EMI?</h1>
          <p className="setup-soft-copy">Add only active monthly EMIs or loans. You can skip this if there are none.</p>
          <div className="setup-chip-grid" aria-label="EMI suggestions">
            {emiSuggestions.map((suggestion) => (
              <button
                className={`setup-chip ${emiName === suggestion ? 'active' : ''}`}
                key={suggestion}
                type="button"
                onClick={() => setEmiName(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="setup-mini-form">
            <input
              className="plain-input"
              value={emiName}
              placeholder="EMI name"
              onChange={(event) => setEmiName(event.target.value)}
            />
            <CurrencyInput label="Amount" id="setup-emi-amount" value={emiAmount} onChange={setEmiAmount} />
            <button className="ghost-button" type="button" onClick={addEmi}>
              <Plus size={17} />
              Add EMI
            </button>
          </div>
          <SetupCommitmentList items={emiCommitments} onRemove={removeSetupCommitment} emptyText="No EMI added." />
        </section>
      )
    }

    if (step === 4) {
      return (
        <section className="setup-flow-card">
          <p className="eyebrow">Question {activeStep - 1}</p>
          <h1>How careful should planner guidance be?</h1>
          <p className="setup-soft-copy">This controls how conservative purchase planning feels.</p>
          <div className="preference-grid">
            {['safe', 'balanced', 'flexible'].map((preference) => (
              <button
                className={`preference-card ${profile.savingsPreference === preference ? 'active' : ''}`}
                key={preference}
                type="button"
                onClick={() => setProfile((current) => ({ ...current, savingsPreference: preference }))}
              >
                <CheckCircle2 size={18} />
                <span>{titleCase(preference)}</span>
              </button>
            ))}
          </div>
        </section>
      )
    }

    return (
      <section className="setup-flow-card">
        <p className="eyebrow">Ready</p>
        <h1>Your dashboard is ready.</h1>
        <p className="setup-soft-copy">FBPly will use these numbers in Today, Activity, Goals, Insights, and Settings.</p>
        <div className="setup-review-grid">
          <div>
            <span>Income</span>
            <strong>{rupees(profile.income)}</strong>
          </div>
          <div>
            <span>Fixed items</span>
            <strong>{fixedCommitments.length}</strong>
          </div>
          <div>
            <span>EMIs</span>
            <strong>{emiCommitments.length}</strong>
          </div>
          <div>
            <span>Preference</span>
            <strong>{titleCase(profile.savingsPreference)}</strong>
          </div>
        </div>
      </section>
    )
  }

  return (
    <motion.main className="setup-page" {...fadeUp}>
      <div className="setup-shell">
        <HeaderLogo />
        <div className="setup-progress" aria-label={`Setup step ${activeStep} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span className={index <= step ? 'active' : ''} key={index} />
          ))}
        </div>
        {renderStep()}
        <div className="setup-nav-row">
          {step > 0 ? (
            <button className="ghost-button" type="button" onClick={goBack}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step >= totalSteps - 1 ? (
            <button className="primary-button" type="button" onClick={finishSetup}>
              Enter FBPly
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={goNext}>
              {step === 0 ? 'Begin' : 'Continue'}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
        {setupError && <p className="form-message setup-error">{setupError}</p>}
      </div>
    </motion.main>
  )
}

function SetupCommitmentList({ items, onRemove, emptyText = 'No fixed item added yet.' }) {
  if (items.length === 0) {
    return <p className="setup-list-empty">{emptyText}</p>
  }

  return (
    <div className="setup-selected-list">
      {items.map((item) => (
        <span key={item.id}>
          <b>{item.name}</b>
          <em>{rupees(item.amount)}</em>
          <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}>
            <Trash2 size={14} />
          </button>
        </span>
      ))}
    </div>
  )
}

function commitmentIconForName(name) {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('rent') || lowerName.includes('home')) {
    return House
  }

  if (lowerName.includes('emi') || lowerName.includes('loan')) {
    return CreditCard
  }

  if (lowerName.includes('food')) {
    return Utensils
  }

  if (lowerName.includes('family') || lowerName.includes('support')) {
    return Wallet
  }

  return Receipt
}

function CommitmentsEditor({ commitments, updateCommitment, addCommitment, removeCommitment }) {
  return (
    <div className="commitment-list">
      {commitments.length === 0 && (
        <p className="section-note">No regular payments added yet. Add only what feels useful right now.</p>
      )}

      {commitments.map((item, index) => {
        const Icon = commitmentIconForName(item.name)

        return (
          <article className="commitment-row" key={item.id}>
            <span className="soft-icon">
              <Icon size={18} />
            </span>
            <label>
              <span>Commitment {index + 1}</span>
              <input
                className="plain-input"
                type="text"
                value={item.name}
                placeholder="Rent, Bike EMI, SIP..."
                onChange={(event) => updateCommitment(item.id, { name: event.target.value })}
              />
            </label>
            <div className="commitment-amount">
              <CurrencyInput
                label="Amount"
                id={`commitment-amount-${slugify(item.id)}`}
                ariaLabel={`Amount for ${item.name || `commitment ${index + 1}`}`}
                value={item.amount}
                onChange={(value) => updateCommitment(item.id, { amount: Number(value) })}
              />
            </div>
            <label className="commitment-due-day">
              <span>Due day</span>
              <input
                className="plain-input"
                type="number"
                min="1"
                max="31"
                inputMode="numeric"
                value={item.dueDay || ''}
                placeholder="1"
                onChange={(event) => updateCommitment(item.id, { dueDay: Number(event.target.value || 0) || undefined })}
              />
            </label>
            <button
              className="icon-button"
              type="button"
              aria-label={`Remove ${item.name || 'commitment'}`}
              onClick={() => removeCommitment(item.id)}
            >
              <Trash2 size={17} />
            </button>
          </article>
        )
      })}

      <button className="ghost-button commitment-add" type="button" onClick={addCommitment}>
        <Plus size={18} />
        Add Regular Payment
      </button>
    </div>
  )
}

function MainApp(props) {
  const {
    activeTab,
    setActiveTab,
    profile,
    setProfile,
    authUser,
    onSignOut,
    addSheetMode,
    openAddSheet,
    closeAddSheet,
    financialState,
    insights,
    smartHomeInsights,
    smartReminders,
    financialHealth,
    safeToSpend,
    fixedDistribution,
    flexibleDistribution,
    calmSummaries,
    whatChangedInsights,
    emergencyCushion,
    savingsBuckets,
    lowEnergyMode,
    advancedReport,
    reportExpenseBreakdown,
    reportFinancialState,
    reportTransactions,
    reportTransactionSummary,
    monthlyComparison,
    todayTransactions,
    expenses,
    historyGroups,
    transactionSummary,
    cashflowTimeline,
    moneyBookEntries,
    moneyBookSummary,
    saveMoneyBookEntry,
    toggleMoneyBookSettlement,
    deleteMoneyBookEntry,
    selectedMonthKey,
    setSelectedMonthKey,
    monthOptions,
    sharedSummary,
    selectedCategory,
    setSelectedCategory,
    customExpenseName,
    setCustomExpenseName,
    expenseAmount,
    setExpenseAmount,
    expenseNote,
    setExpenseNote,
    expenseError,
    expenseFieldErrors,
    clearExpenseFieldError,
    addExpense,
    voiceDraft,
    voiceStatus,
    isListening,
    voiceLanguage,
    setVoiceLanguage,
    quickSaveMode,
    setQuickSaveMode,
    startVoiceExpense,
    stopVoiceExpense,
    confirmVoiceExpense,
    updateVoiceDraft,
    clearVoiceDraft,
    useVoiceDraftInForm,
    undoVoiceSave,
    lastVoiceSave,
    quickExpenseChips,
    applyQuickExpense,
    editExpense,
    sharedGroups,
    addSharedGroup,
    addSharedPayment,
    markSharedSettlementReceived,
    removeSharedGroup,
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
    downloadPdf,
    exportCsv,
    isExportingPdf,
    pdfError,
    updateCommitment,
    addCommitment,
    removeCommitment,
    addSavingsBucket,
    updateSavingsBucket,
    removeSavingsBucket,
  } = props
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <motion.div className="app-shell" {...fadeUp}>
      <div className="app-brand-chip" aria-label="FBPly">
        <BrandMark size="tiny" />
        <span>FBPly</span>
      </div>
      <button
        className="top-settings-button"
        type="button"
        aria-label="Open profile and settings"
        onClick={() => setIsSettingsOpen(true)}
      >
        <User size={18} />
      </button>
      <main className="screen-panel">
        {activeTab === 'home' && (
          <HomeScreen
            profile={profile}
            financialState={financialState}
            insights={insights}
            smartHomeInsights={smartHomeInsights}
            smartReminders={smartReminders}
            financialHealth={financialHealth}
            safeToSpend={safeToSpend}
            calmSummaries={calmSummaries}
            whatChangedInsights={whatChangedInsights}
            emergencyCushion={emergencyCushion}
            savingsBuckets={savingsBuckets}
            todayTransactions={todayTransactions}
            expenses={expenses}
            selectedPlan={selectedPlan}
            plannerInput={plannerInput}
            plannerTargetAmount={plannerTargetAmount}
            plannerCurrentSavings={plannerCurrentSavings}
            plannerTimeline={plannerTimeline}
            recommendation={recommendation}
            lowEnergyMode={lowEnergyMode}
            setActiveTab={setActiveTab}
            openAddSheet={openAddSheet}
            downloadPdf={downloadPdf}
            isExportingPdf={isExportingPdf}
            pdfError={pdfError}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            groups={historyGroups}
            summary={transactionSummary}
            cashflowTimeline={cashflowTimeline}
            expenses={expenses}
            moneyBookEntries={moneyBookEntries}
            moneyBookSummary={moneyBookSummary}
            onSaveMoneyBookEntry={saveMoneyBookEntry}
            onToggleMoneyBookSettlement={toggleMoneyBookSettlement}
            onDeleteMoneyBookEntry={deleteMoneyBookEntry}
            selectedMonthKey={selectedMonthKey}
            setSelectedMonthKey={setSelectedMonthKey}
            monthOptions={monthOptions}
            onEditExpense={editExpense}
            setActiveTab={setActiveTab}
            openAddSheet={openAddSheet}
          />
        )}
        {activeTab === 'planner' && (
          <PlannerScreen
            plannerInput={plannerInput}
            setPlannerInput={setPlannerInput}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            plannerTargetAmount={plannerTargetAmount}
            setPlannerTargetAmount={setPlannerTargetAmount}
            plannerCurrentSavings={plannerCurrentSavings}
            setPlannerCurrentSavings={setPlannerCurrentSavings}
            plannerTimeline={plannerTimeline}
            setPlannerTimeline={setPlannerTimeline}
            recommendation={recommendation}
            financialState={financialState}
            profile={profile}
            sharedSummary={sharedSummary}
            sharedGroups={sharedGroups}
            addSharedGroup={addSharedGroup}
            addSharedPayment={addSharedPayment}
            markSharedSettlementReceived={markSharedSettlementReceived}
            removeSharedGroup={removeSharedGroup}
          />
        )}
        {activeTab === 'reports' && (
          <Suspense fallback={<ReportsFallback />}>
            <ReportsScreen
              advancedReport={advancedReport}
              expenseBreakdown={reportExpenseBreakdown}
              financialState={reportFinancialState}
              reportTransactions={reportTransactions}
              transactionSummary={reportTransactionSummary}
              monthlyComparison={monthlyComparison}
              downloadPdf={downloadPdf}
              exportCsv={exportCsv}
              isExportingPdf={isExportingPdf}
              selectedMonthKey={selectedMonthKey}
              setSelectedMonthKey={setSelectedMonthKey}
              monthOptions={monthOptions}
            />
            {pdfError && <p className="form-message">{pdfError}</p>}
          </Suspense>
        )}
        {activeTab === 'profile' && (
          <ProfileScreen
            profile={profile}
            setProfile={setProfile}
            authUser={authUser}
            onSignOut={onSignOut}
            financialState={financialState}
            fixedDistribution={fixedDistribution}
            flexibleDistribution={flexibleDistribution}
            updateCommitment={updateCommitment}
            addCommitment={addCommitment}
            removeCommitment={removeCommitment}
            savingsBuckets={savingsBuckets}
            addSavingsBucket={addSavingsBucket}
            updateSavingsBucket={updateSavingsBucket}
            removeSavingsBucket={removeSavingsBucket}
            voiceDraft={voiceDraft}
            voiceStatus={voiceStatus}
            isListening={isListening}
            voiceLanguage={voiceLanguage}
            setVoiceLanguage={setVoiceLanguage}
            quickSaveMode={quickSaveMode}
            setQuickSaveMode={setQuickSaveMode}
            startVoiceExpense={startVoiceExpense}
            stopVoiceExpense={stopVoiceExpense}
            confirmVoiceExpense={confirmVoiceExpense}
            updateVoiceDraft={updateVoiceDraft}
            clearVoiceDraft={clearVoiceDraft}
            useVoiceDraftInForm={useVoiceDraftInForm}
            undoVoiceSave={undoVoiceSave}
            lastVoiceSave={lastVoiceSave}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            customExpenseName={customExpenseName}
            setCustomExpenseName={setCustomExpenseName}
            expenseAmount={expenseAmount}
            setExpenseAmount={setExpenseAmount}
            expenseNote={expenseNote}
            setExpenseNote={setExpenseNote}
            expenseError={expenseError}
            expenseFieldErrors={expenseFieldErrors}
            clearExpenseFieldError={clearExpenseFieldError}
            addExpense={addExpense}
            quickExpenseChips={quickExpenseChips}
            applyQuickExpense={applyQuickExpense}
          />
        )}
      </main>
      {addSheetMode && (
        <QuickAddSheet
          mode={addSheetMode}
          setMode={openAddSheet}
          onClose={closeAddSheet}
          profile={profile}
          setProfile={setProfile}
          savingsBuckets={savingsBuckets}
          addSavingsBucket={addSavingsBucket}
          updateSavingsBucket={updateSavingsBucket}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          customExpenseName={customExpenseName}
          setCustomExpenseName={setCustomExpenseName}
          expenseAmount={expenseAmount}
          setExpenseAmount={setExpenseAmount}
          expenseNote={expenseNote}
          setExpenseNote={setExpenseNote}
          expenseError={expenseError}
          expenseFieldErrors={expenseFieldErrors}
          clearExpenseFieldError={clearExpenseFieldError}
          addExpense={addExpense}
          quickExpenseChips={quickExpenseChips}
          applyQuickExpense={applyQuickExpense}
          voiceDraft={voiceDraft}
          voiceStatus={voiceStatus}
          isListening={isListening}
          voiceLanguage={voiceLanguage}
          setVoiceLanguage={setVoiceLanguage}
          quickSaveMode={quickSaveMode}
          setQuickSaveMode={setQuickSaveMode}
          startVoiceExpense={startVoiceExpense}
          stopVoiceExpense={stopVoiceExpense}
          confirmVoiceExpense={confirmVoiceExpense}
          updateVoiceDraft={updateVoiceDraft}
          clearVoiceDraft={clearVoiceDraft}
          useVoiceDraftInForm={useVoiceDraftInForm}
          undoVoiceSave={undoVoiceSave}
          lastVoiceSave={lastVoiceSave}
          saveMoneyBookEntry={saveMoneyBookEntry}
          setActiveTab={setActiveTab}
        />
      )}
      {isSettingsOpen && (
        <SettingsSheet
          authUser={authUser}
          profile={profile}
          setProfile={setProfile}
          onClose={() => setIsSettingsOpen(false)}
          onSignOut={onSignOut}
          financialState={financialState}
          fixedDistribution={fixedDistribution}
          flexibleDistribution={flexibleDistribution}
          updateCommitment={updateCommitment}
          addCommitment={addCommitment}
          removeCommitment={removeCommitment}
        />
      )}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} openAddSheet={openAddSheet} />
    </motion.div>
  )
}

function ThemeChoice({ theme, setTheme }) {
  const isDark = theme === 'dark'

  return (
    <button
      className={`theme-choice ${isDark ? 'dark' : 'light'}`}
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Light mode' : 'Dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          {isDark ? <Moon size={13} /> : <Sun size={13} />}
        </span>
      </span>
    </button>
  )
}

function ReportsFallback() {
  return (
    <section className="screen-content reports-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Insights</p>
          <h1>Preparing your money notes</h1>
        </div>
      </div>
      <article className="chart-card skeleton-card" />
      <article className="chart-card skeleton-card" />
      <article className="chart-card skeleton-card" />
    </section>
  )
}

function EmptyState({ title, detail, actionLabel, onAction, icon: Icon = Sparkles }) {
  return (
    <div className="empty-state">
      <span className="empty-visual" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        {actionLabel && onAction && (
          <button className="ghost-button small-button empty-state-action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="screen-panel">
        <section className="screen-content">
          <div className="empty-state app-error-state" role="alert">
            <span className="empty-visual" aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <div>
              <strong>This view needs a quick refresh</strong>
              <p>Your saved finance data is still intact. Switch tabs or reload if this view does not recover.</p>
              <button className="ghost-button small-button empty-state-action" type="button" onClick={() => window.location.reload()}>
                Refresh FBPly
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }
}

function AppModal({ children, onClose, labelledBy, sheetClassName = 'editor-sheet', backdropClassName = 'editor-sheet-backdrop' }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div className={backdropClassName} role="presentation" onClick={onClose}>
      <section
        className={sheetClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>,
    document.body,
  )
}

function RewardedExportModal({ rewardState, onStart, onClose }) {
  if (!rewardState.open) {
    return null
  }

  const isWatching = rewardState.status === 'watching'
  const isUnlocked = rewardState.status === 'unlocked'

  return (
    <div className="rewarded-backdrop" role="presentation">
      <section className="rewarded-card" role="dialog" aria-modal="true" aria-labelledby="rewarded-export-title">
        <div className="rewarded-icon">
          <Download size={22} />
        </div>
        <div>
          <p className="eyebrow">Report export</p>
          <h2 id="rewarded-export-title">Watch a short ad to unlock this export.</h2>
          <p>
            Export stays optional. Planning, expense entry, voice add, and navigation remain available without ads.
          </p>
        </div>
        <div className="reward-progress" aria-label={`${rewardState.progress}% export unlock progress`}>
          <span style={{ width: `${Math.min(rewardState.progress, 100)}%` }} />
        </div>
        <div className="reward-status-row">
          <span>{isUnlocked ? 'Unlocked. Preparing report...' : isWatching ? 'Thanks. Unlocking export...' : 'PDF export unlock'}</span>
          <strong>{Math.min(rewardState.progress, 100)}%</strong>
        </div>
        <div className="reward-actions">
          <button className="primary-button" type="button" onClick={onStart} disabled={isWatching || isUnlocked}>
            {isWatching ? 'Watching...' : isUnlocked ? 'Unlocked' : 'Watch short ad'}
          </button>
          <button className="ghost-button" type="button" onClick={onClose} disabled={isUnlocked}>
            Not now
          </button>
        </div>
      </section>
    </div>
  )
}

function WalkthroughOverlay({ step, current, total, onNext, onSkip }) {
  if (!step) {
    return null
  }

  const isLast = current === total

  return (
    <section className="walkthrough-overlay" aria-label="FBPly walkthrough">
      <div className="walkthrough-card">
        <div>
          <p className="eyebrow">Quick guide {current}/{total}</p>
          <h2>{step.title}</h2>
          <p>{step.detail}</p>
        </div>
        <div className="walkthrough-actions">
          <button className="ghost-button" type="button" onClick={onSkip}>
            Skip
          </button>
          <button className="primary-button" type="button" onClick={onNext}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </section>
  )
}

function QuickAddSheet({
  mode,
  setMode,
  onClose,
  profile,
  setProfile,
  savingsBuckets,
  addSavingsBucket,
  updateSavingsBucket,
  selectedCategory,
  setSelectedCategory,
  customExpenseName,
  setCustomExpenseName,
  expenseAmount,
  setExpenseAmount,
  expenseNote,
  setExpenseNote,
  expenseError,
  expenseFieldErrors,
  clearExpenseFieldError,
  addExpense,
  quickExpenseChips,
  applyQuickExpense,
  voiceDraft,
  voiceStatus,
  isListening,
  voiceLanguage,
  setVoiceLanguage,
  quickSaveMode,
  setQuickSaveMode,
  startVoiceExpense,
  stopVoiceExpense,
  confirmVoiceExpense,
  updateVoiceDraft,
  clearVoiceDraft,
  useVoiceDraftInForm,
  undoVoiceSave,
  lastVoiceSave,
  saveMoneyBookEntry,
  setActiveTab,
}) {
  const title = {
    menu: 'Add money move',
    expense: 'Add expense',
    income: 'Add income',
    transfer: 'Move to goal',
    borrow: 'Borrow or lend',
  }[mode] || 'Add money move'

  return (
    <AppModal onClose={onClose} labelledBy="quick-add-title" sheetClassName="editor-sheet quick-add-sheet">
      <div className="editor-sheet-header">
        <div>
          <p className="eyebrow">Quick add</p>
          <h2 id="quick-add-title">{title}</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close quick add" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      {mode !== 'menu' && (
        <button className="text-action-button quick-add-back" type="button" onClick={() => setMode('menu')}>
          Back to options
        </button>
      )}

      <div className="editor-sheet-body quick-add-body">
        {mode === 'menu' && (
          <div className="quick-add-options">
            <button type="button" onClick={() => setMode('expense')}>
              <span className="soft-icon"><Receipt size={18} /></span>
              <span>
                <strong>Expense</strong>
                <small>Food, petrol, bill, shopping</small>
              </span>
            </button>
            <button type="button" onClick={() => setMode('income')}>
              <span className="soft-icon"><Wallet size={18} /></span>
              <span>
                <strong>Income</strong>
                <small>Update monthly income</small>
              </span>
            </button>
            <button type="button" onClick={() => setMode('transfer')}>
              <span className="soft-icon"><PiggyBank size={18} /></span>
              <span>
                <strong>Transfer</strong>
                <small>Move money to a goal</small>
              </span>
            </button>
            <button type="button" onClick={() => setMode('borrow')}>
              <span className="soft-icon"><CreditCard size={18} /></span>
              <span>
                <strong>Borrow / lend</strong>
                <small>Track simple udhar</small>
              </span>
            </button>
          </div>
        )}

        {mode === 'expense' && (
          <QuickExpenseEntry
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            customExpenseName={customExpenseName}
            setCustomExpenseName={setCustomExpenseName}
            expenseAmount={expenseAmount}
            setExpenseAmount={setExpenseAmount}
            expenseNote={expenseNote}
            setExpenseNote={setExpenseNote}
            expenseError={expenseError}
            expenseFieldErrors={expenseFieldErrors}
            clearExpenseFieldError={clearExpenseFieldError}
            addExpense={addExpense}
            quickExpenseChips={quickExpenseChips}
            applyQuickExpense={applyQuickExpense}
            onSaved={onClose}
            voiceDraft={voiceDraft}
            voiceStatus={voiceStatus}
            isListening={isListening}
            voiceLanguage={voiceLanguage}
            setVoiceLanguage={setVoiceLanguage}
            quickSaveMode={quickSaveMode}
            setQuickSaveMode={setQuickSaveMode}
            startVoiceExpense={startVoiceExpense}
            stopVoiceExpense={stopVoiceExpense}
            confirmVoiceExpense={confirmVoiceExpense}
            updateVoiceDraft={updateVoiceDraft}
            clearVoiceDraft={clearVoiceDraft}
            useVoiceDraftInForm={useVoiceDraftInForm}
            undoVoiceSave={undoVoiceSave}
            lastVoiceSave={lastVoiceSave}
          />
        )}

        {mode === 'income' && (
          <QuickIncomeEntry profile={profile} setProfile={setProfile} onSaved={onClose} />
        )}

        {mode === 'transfer' && (
          <QuickTransferEntry
            savingsBuckets={savingsBuckets}
            addSavingsBucket={addSavingsBucket}
            updateSavingsBucket={updateSavingsBucket}
            onSaved={onClose}
            setActiveTab={setActiveTab}
          />
        )}

        {mode === 'borrow' && (
          <QuickBorrowLendEntry saveMoneyBookEntry={saveMoneyBookEntry} onSaved={onClose} />
        )}
      </div>
    </AppModal>
  )
}

function QuickExpenseEntry({
  selectedCategory,
  setSelectedCategory,
  customExpenseName,
  setCustomExpenseName,
  expenseAmount,
  setExpenseAmount,
  expenseNote,
  setExpenseNote,
  expenseError,
  expenseFieldErrors = {},
  clearExpenseFieldError,
  addExpense,
  quickExpenseChips,
  applyQuickExpense,
  onSaved,
  voiceDraft,
  voiceStatus,
  isListening,
  voiceLanguage,
  setVoiceLanguage,
  quickSaveMode,
  setQuickSaveMode,
  startVoiceExpense,
  stopVoiceExpense,
  confirmVoiceExpense,
  updateVoiceDraft,
  clearVoiceDraft,
  useVoiceDraftInForm,
  undoVoiceSave,
  lastVoiceSave,
}) {
  const clearField = (field) => {
    if (clearExpenseFieldError) {
      clearExpenseFieldError(field)
    }
  }

  return (
    <form className={`quick-expense-form ${Object.keys(expenseFieldErrors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={(event) => {
      const saved = addExpense(event)

      if (saved) {
        onSaved()
      }
    }}>
      <div className="quick-chip-row compact-quick-row">
        {quickExpenseChips.slice(0, 6).map((chip) => (
          <button key={chip.label} type="button" onClick={() => {
            applyQuickExpense(chip)
            clearField('amount')
            clearField('category')
          }}>
            {chip.label}
            {chip.amount > 0 && <span>{shortRupees(chip.amount)}</span>}
          </button>
        ))}
      </div>

      <CurrencyInput
        label="Amount"
        id="quick-expense-amount"
        value={expenseAmount}
        placeholder="120"
        onChange={(value) => {
          setExpenseAmount(value)
          clearField('amount')
        }}
        error={expenseFieldErrors.amount}
      />

      <CategoryPicker
        categories={expenseCategories}
        customExpenseName={customExpenseName}
        quickExpenseChips={quickExpenseChips}
        selectedCategory={selectedCategory}
        setCustomExpenseName={(value) => {
          setCustomExpenseName(value)
          clearField('category')
        }}
        setSelectedCategory={(value) => {
          setSelectedCategory(value)
          if (value !== 'Custom') {
            setCustomExpenseName('')
          }
          clearField('category')
        }}
        error={expenseFieldErrors.category}
      />

      <label>
        <span className="input-label">Note</span>
        <input
          className="plain-input"
          type="text"
          value={expenseNote}
          placeholder="Optional, like tea near office"
          onChange={(event) => setExpenseNote(event.target.value)}
        />
      </label>

      <VoiceExpenseBox
        voiceDraft={voiceDraft}
        voiceStatus={voiceStatus}
        isListening={isListening}
        voiceLanguage={voiceLanguage}
        setVoiceLanguage={setVoiceLanguage}
        quickSaveMode={quickSaveMode}
        setQuickSaveMode={setQuickSaveMode}
        startVoiceExpense={startVoiceExpense}
        stopVoiceExpense={stopVoiceExpense}
        confirmVoiceExpense={confirmVoiceExpense}
        updateVoiceDraft={updateVoiceDraft}
        clearVoiceDraft={clearVoiceDraft}
        useVoiceDraftInForm={useVoiceDraftInForm}
        undoVoiceSave={undoVoiceSave}
        lastVoiceSave={lastVoiceSave}
      />

      <button className="primary-button full" type="submit">
        Save expense
      </button>
      {expenseError && <p className="form-message">{expenseError}</p>}
    </form>
  )
}

function QuickIncomeEntry({ profile, setProfile, onSaved }) {
  const [incomeAmount, setIncomeAmount] = useState(profile.income ? String(profile.income) : '')
  const [error, setError] = useState('')

  return (
    <form className="quick-expense-form" onSubmit={(event) => {
      event.preventDefault()
      const parsed = Number(incomeAmount || 0)

      if (!parsed || parsed <= 0) {
        setError('Add a valid income amount.')
        return
      }

      setProfile((current) => ({ ...current, income: parsed }))
      onSaved()
    }}>
      <CurrencyInput
        label="Monthly income"
        id="quick-income-amount"
        value={incomeAmount}
        placeholder="50000"
        onChange={(value) => {
          setIncomeAmount(value)
          setError('')
        }}
        error={error}
      />
      <p className="quick-form-note">This updates your monthly income used for safe spending.</p>
      <button className="primary-button full" type="submit">
        Save income
      </button>
    </form>
  )
}

function QuickTransferEntry({ savingsBuckets = [], addSavingsBucket, updateSavingsBucket, onSaved, setActiveTab }) {
  const [bucketId, setBucketId] = useState(savingsBuckets[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const selectedBucket = savingsBuckets.find((bucket) => bucket.id === bucketId)

  if (savingsBuckets.length === 0) {
    return (
      <div className="quick-transfer-empty">
        <EmptyState
          title="Create one goal first"
          detail="A goal gives this transfer a clear place."
          actionLabel="Create goal"
          onAction={() => {
            addSavingsBucket()
            setActiveTab('planner')
            onSaved()
          }}
          icon={PiggyBank}
        />
      </div>
    )
  }

  return (
    <form className="quick-expense-form" onSubmit={(event) => {
      event.preventDefault()
      const parsed = Number(amount || 0)

      if (!selectedBucket) {
        setError('Choose a goal.')
        return
      }

      if (!parsed || parsed <= 0) {
        setError('Add a valid amount.')
        return
      }

      updateSavingsBucket(selectedBucket.id, {
        saved: Number(selectedBucket.saved || 0) + parsed,
      })
      onSaved()
    }}>
      <label>
        <span className="input-label">Goal</span>
        <select className="month-select" value={bucketId} onChange={(event) => {
          setBucketId(event.target.value)
          setError('')
        }}>
          {savingsBuckets.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>
              {bucket.name || 'Goal'}
            </option>
          ))}
        </select>
      </label>
      <CurrencyInput
        label="Amount to move"
        id="quick-transfer-amount"
        value={amount}
        placeholder="1000"
        onChange={(value) => {
          setAmount(value)
          setError('')
        }}
        error={error}
      />
      <p className="quick-form-note">This updates the saved amount for your goal.</p>
      <button className="primary-button full" type="submit">
        Move to goal
      </button>
    </form>
  )
}

function QuickBorrowLendEntry({ saveMoneyBookEntry, onSaved }) {
  const [kind, setKind] = useState('given')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  return (
    <form className="quick-expense-form" onSubmit={(event) => {
      event.preventDefault()
      const saved = saveMoneyBookEntry({
        kind,
        person,
        amount,
        date: todayDateKey(),
        note,
      })

      if (!saved) {
        setError('Add person and amount to save this entry.')
        return
      }

      onSaved()
    }}>
      <div className="segmented-control quick-kind-toggle" aria-label="Borrow or lend type">
        <button className={kind === 'given' ? 'active' : ''} type="button" onClick={() => setKind('given')}>
          I gave
        </button>
        <button className={kind === 'taken' ? 'active' : ''} type="button" onClick={() => setKind('taken')}>
          I took
        </button>
      </div>
      <label>
        <span className="input-label">Person</span>
        <input
          className="plain-input"
          type="text"
          value={person}
          placeholder="Rahul, Priya..."
          onChange={(event) => {
            setPerson(event.target.value)
            setError('')
          }}
        />
      </label>
      <CurrencyInput
        label="Amount"
        id="quick-borrow-amount"
        value={amount}
        placeholder="500"
        onChange={(value) => {
          setAmount(value)
          setError('')
        }}
      />
      <label>
        <span className="input-label">Note</span>
        <input
          className="plain-input"
          type="text"
          value={note}
          placeholder="Optional"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button className="primary-button full" type="submit">
        Save entry
      </button>
      {error && <p className="form-message">{error}</p>}
    </form>
  )
}

function SettingsSheet({
  authUser,
  profile,
  setProfile,
  onClose,
  onSignOut,
  financialState,
  fixedDistribution,
  flexibleDistribution,
  updateCommitment,
  addCommitment,
  removeCommitment,
}) {
  const commitments = normalizeCommitments(profile)
  const balanceMessage = getProfileBalanceMessage(financialState)

  return (
    <AppModal onClose={onClose} labelledBy="settings-title" sheetClassName="editor-sheet settings-sheet">
      <div className="editor-sheet-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2 id="settings-title">Profile and money setup</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close settings" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <div className="editor-sheet-body settings-body">
        <div className="profile-menu-account settings-account">
          <BrandMark size="small" />
          <div>
            <span className="mini-label">Signed in as</span>
            <strong>{authUser?.email || profile.email || 'Local profile'}</strong>
            <p>{balanceMessage}</p>
          </div>
        </div>

        <label className="input-label" htmlFor="settings-name">
          Name
        </label>
        <input
          className="plain-input"
          id="settings-name"
          type="text"
          value={profile.name}
          placeholder="Your name"
          onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
        />
        <CurrencyInput
          label="Monthly income"
          id="settings-income"
          value={profile.income}
          onChange={(value) => setProfile((current) => ({ ...current, income: Number(value) }))}
        />

        <div className="profile-menu-section">
          <span className="input-label">Planning style</span>
          <div className="preference-grid compact-preference-grid">
            {['safe', 'balanced', 'flexible'].map((preference) => (
              <button
                className={`preference-card ${profile.savingsPreference === preference ? 'active' : ''}`}
                key={preference}
                type="button"
                onClick={() => setProfile((current) => ({ ...current, savingsPreference: preference }))}
              >
                <CheckCircle2 size={16} />
                <span>{titleCase(preference)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-donut-grid">
          <FinanceDonut chart={fixedDistribution} />
          <FinanceDonut chart={flexibleDistribution} />
        </div>

        <section className="settings-commitments">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Fixed payments</p>
              <h2>Monthly basics</h2>
            </div>
          </div>
          <CommitmentsEditor
            commitments={commitments}
            updateCommitment={updateCommitment}
            addCommitment={addCommitment}
            removeCommitment={removeCommitment}
          />
        </section>
      </div>

      <div className="editor-sheet-footer profile-menu-footer">
        <button
          className="sign-out-button"
          type="button"
          onClick={() => {
            onClose()
            onSignOut()
          }}
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </AppModal>
  )
}

function HomeScreen({
  profile,
  financialState,
  smartHomeInsights,
  safeToSpend,
  calmSummaries,
  whatChangedInsights,
  todayTransactions = [],
  expenses = [],
  setActiveTab,
  openAddSheet,
}) {
  const status = buildDailyMoneyStatus(financialState, safeToSpend)
  const todayKey = todayDateKey()
  const todayFeed = useMemo(
    () => todayTransactions
      .filter((transaction) => transaction.date === todayKey)
      .filter((transaction) => transaction.sourceModule !== 'Planner')
      .slice(0, 6),
    [todayKey, todayTransactions],
  )
  const insight = buildSingleTodayInsight({
    smartHomeInsights,
    whatChangedInsights,
    calmSummaries,
    financialState,
  })
  const trackedDays = buildTrackedDayCount(expenses)

  return (
    <section className={`screen-content today-screen today-${status.tone}`}>
      <div className="today-greeting">
        <div>
          <p className="eyebrow">{getGreeting(profile.name)}</p>
          <h1>{status.title}</h1>
          <p>{status.detail}</p>
        </div>
      </div>

      <article className="today-safe-card">
        <div>
          <span className="mini-label">Safe to spend</span>
          <strong>{rupees(safeToSpend.comfortablyUsable)}</strong>
          <p>{rupees(financialState.flexibility)} left after saved activity this month.</p>
        </div>
        <span className={`today-status-pill ${financialState.pressureTone === 'slight-pressure' ? 'warm' : financialState.pressureTone}`}>
          {financialState.pressure}
        </span>
      </article>

      <div className="today-quick-actions" aria-label="Quick actions">
        <button type="button" onClick={() => openAddSheet('expense')}>
          <Receipt size={18} />
          <span>Add expense</span>
        </button>
        <button type="button" onClick={() => openAddSheet('income')}>
          <Wallet size={18} />
          <span>Add income</span>
        </button>
        <button type="button" onClick={() => setActiveTab('planner')}>
          <Target size={18} />
          <span>Create goal</span>
        </button>
      </div>

      <section className="today-feed-section" aria-label="Today activity">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Money activity</h2>
          </div>
          <span>{todayFeed.length} move{todayFeed.length === 1 ? '' : 's'}</span>
        </div>
        {todayFeed.length === 0 ? (
          <EmptyState
            title="Start adding expenses"
            detail="Your daily money feed will appear here instantly."
            actionLabel="Add expense"
            onAction={() => openAddSheet('expense')}
            icon={Receipt}
          />
        ) : (
          <div className="today-feed-list">
            {todayFeed.map((transaction) => (
              <article className={`today-feed-item ${transaction.tone}`} key={transaction.id}>
                <span className="today-feed-icon" style={{ color: transaction.color }}>
                  <HistoryItemIcon transaction={transaction} />
                </span>
                <div>
                  <strong>{transaction.tone === 'incoming' ? '+' : transaction.tone === 'outgoing' ? '-' : ''}{rupees(transaction.amount)}</strong>
                  <p>{transaction.title || transaction.category}</p>
                  {transaction.note && <small>{transaction.note}</small>}
                </div>
                <time dateTime={transaction.dateTime || transaction.date}>{formatActivityTime(transaction.dateTime)}</time>
              </article>
            ))}
          </div>
        )}
      </section>

      <article className={`today-insight-card ${insight.tone}`}>
        <span className="soft-icon">
          <Sparkles size={17} />
        </span>
        <div>
          <p className="eyebrow">One insight</p>
          <h2>{insight.title}</h2>
          <p>{insight.detail}</p>
        </div>
      </article>

      <div className="today-habit-strip">
        <span>{trackedDays > 0 ? `You tracked expenses for ${trackedDays} day${trackedDays === 1 ? '' : 's'}.` : 'Track today to build a simple money habit.'}</span>
        <span>{rupees(safeToSpend.protectedAmount)} kept as safety savings.</span>
      </div>
    </section>
  )
}

function MonthSelector({ selectedMonthKey, setSelectedMonthKey, monthOptions = [] }) {
  return (
    <label className="month-selector">
      <span>Month</span>
      <select
        aria-label="Month selector"
        value={selectedMonthKey}
        onChange={(event) => setSelectedMonthKey(event.target.value)}
      >
        {monthOptions.map((month) => (
          <option key={month.key} value={month.key}>
            {month.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function moneyBookEntryDue(entry = {}) {
  return Number(entry.amount || 0) + Number(entry.interest || 0)
}

function HistoryScreen({
  groups = [],
  summary = {},
  cashflowTimeline = [],
  expenses = [],
  moneyBookSummary = {},
  onSaveMoneyBookEntry,
  onToggleMoneyBookSettlement,
  onDeleteMoneyBookEntry,
  selectedMonthKey,
  setSelectedMonthKey,
  monthOptions,
  onEditExpense,
  openAddSheet,
}) {
  const [moneyBookModalEntry, setMoneyBookModalEntry] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [historyWindow, setHistoryWindow] = useState({ key: '', count: HISTORY_GROUP_BATCH_SIZE })
  const deferredGroups = useDeferredValue(groups)
  const historyWindowKey = `${selectedMonthKey}-${deferredGroups.length}`
  const visibleGroupCount = historyWindow.key === historyWindowKey ? historyWindow.count : HISTORY_GROUP_BATCH_SIZE
  const visibleGroups = useMemo(
    () => deferredGroups.slice(0, visibleGroupCount),
    [deferredGroups, visibleGroupCount],
  )
  const hasMoreHistory = visibleGroupCount < deferredGroups.length
  const hasHistory = deferredGroups.some((group) => group.items.length > 0)
  const expensesById = useMemo(
    () => new Map(expenses.map((expense) => [String(expense.id), expense])),
    [expenses],
  )
  const relatedGroupsByDate = useMemo(
    () => new Map(visibleGroups.map((group) => [group.date, buildRelatedTransactionGroups(group.items)])),
    [visibleGroups],
  )

  const getExpenseEditHandler = useCallback((transaction) => {
    if (!transaction.meta?.expenseId || !onEditExpense) {
      return null
    }

    return () => {
      const expense = expensesById.get(String(transaction.meta.expenseId))

      if (expense) {
        onEditExpense(expense)
      }
    }
  }, [expensesById, onEditExpense])
  const toggleRelatedGroup = useCallback((key) => {
    setExpandedGroups((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }, [])
  const closeMoneyBookModal = useCallback(() => setMoneyBookModalEntry(null), [])
  const saveMoneyBookFromModal = useCallback((entry) => {
    const saved = onSaveMoneyBookEntry?.(entry)

    if (saved) {
      closeMoneyBookModal()
    }

    return saved
  }, [closeMoneyBookModal, onSaveMoneyBookEntry])

  return (
    <section className="screen-content history-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Your money timeline</h1>
        </div>
        <MonthSelector
          monthOptions={monthOptions}
          selectedMonthKey={selectedMonthKey}
          setSelectedMonthKey={setSelectedMonthKey}
        />
      </div>

      <MoneyBookPanel
        summary={moneyBookSummary}
        onAdd={() => setMoneyBookModalEntry({ kind: 'given', date: todayDateKey() })}
        onEdit={(entry) => setMoneyBookModalEntry(entry)}
        onToggleSettled={onToggleMoneyBookSettlement}
        onDelete={onDeleteMoneyBookEntry}
      />

      <CashflowStrip events={cashflowTimeline} />

      <section className="history-summary-grid" aria-label="Financial activity summary">
        <HistorySummaryCard label="Earned" value={summary.incoming} tone="incoming" />
        <HistorySummaryCard label="Spent" value={summary.outgoing} tone="outgoing" />
        <HistorySummaryCard label="Shifted" value={summary.transfers} tone="transfer" />
      </section>

      <section className="history-feed" aria-label="Unified financial activity timeline">
        {!hasHistory ? (
          <EmptyState
            title="Start adding expenses"
            detail="Add an expense, income, transfer, or udhar entry and it will appear here automatically."
            actionLabel="Add expense"
            onAction={() => openAddSheet('expense')}
            icon={CalendarDays}
          />
        ) : visibleGroups.map((group) => {
          const relatedNodes = relatedGroupsByDate.get(group.date) || []

          return (
            <article className="history-day-group" key={group.date}>
              <div className="history-day-heading">
                <div>
                  <span>{group.label}</span>
                  <strong>{group.items.length} move{group.items.length === 1 ? '' : 's'}</strong>
                </div>
                <small>{group.outgoing > 0 ? `${shortRupees(group.outgoing)} out` : `${shortRupees(group.incoming)} in`}</small>
              </div>
              <div className="history-item-list">
                {relatedNodes.map((node) => (
                  node.kind === 'group' ? (
                    <MemoHistoryRelatedGroup
                      group={node}
                      isOpen={Boolean(expandedGroups[node.key])}
                      key={node.key}
                      onToggle={() => toggleRelatedGroup(node.key)}
                      getExpenseEditHandler={getExpenseEditHandler}
                    />
                  ) : (
                    <MemoHistoryItem
                      transaction={node.transaction}
                      key={node.key}
                      onEditExpense={getExpenseEditHandler(node.transaction)}
                    />
                  )
                ))}
              </div>
            </article>
          )
        })}
        {hasMoreHistory && (
          <button
            className="history-load-more"
            type="button"
            onClick={() => {
              setHistoryWindow((current) => {
                const currentCount = current.key === historyWindowKey ? current.count : HISTORY_GROUP_BATCH_SIZE
                return {
                  key: historyWindowKey,
                  count: currentCount + HISTORY_GROUP_BATCH_SIZE,
                }
              })
            }}
          >
            Show more activity
            <span>{Math.max(deferredGroups.length - visibleGroupCount, 0)} date groups left</span>
          </button>
        )}
      </section>

      {moneyBookModalEntry && (
        <MoneyBookEntryModal
          entry={moneyBookModalEntry}
          onClose={closeMoneyBookModal}
          onSave={saveMoneyBookFromModal}
        />
      )}
    </section>
  )
}

function CashflowStrip({ events = [] }) {
  if (events.length === 0) {
    return (
      <section className="cashflow-strip empty" aria-label="Monthly cashflow timeline">
        <div>
          <p className="eyebrow">Money flow</p>
          <h2>No money moves yet</h2>
        </div>
        <span>Empty</span>
      </section>
    )
  }

  return (
    <section className="cashflow-strip" aria-label="Monthly cashflow timeline">
      <div className="cashflow-strip-header">
        <div>
          <p className="eyebrow">Money flow</p>
          <h2>This month in short</h2>
        </div>
        <span>{events.length} flow{events.length === 1 ? '' : 's'}</span>
      </div>
      <div className="cashflow-event-row">
        {events.map((event) => (
          <article className={`cashflow-event ${event.tone}`} key={event.id}>
            <span className="cashflow-dot" style={{ backgroundColor: event.color }} />
            <small>{event.label}</small>
            <strong>{event.tone === 'incoming' ? '+' : event.tone === 'outgoing' ? '-' : ''}{shortRupees(event.amount)}</strong>
            <p>{event.title}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function HistoryRelatedGroup({ group, isOpen, onToggle, getExpenseEditHandler }) {
  const amountPrefix = group.tone === 'incoming' ? '+' : group.tone === 'outgoing' ? '-' : ''

  return (
    <div className={`history-related-group ${group.tone}`}>
      <button className="history-related-header" type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span className="history-related-chevron">
          <ChevronRight size={15} />
        </span>
        <div>
          <strong>{group.title}</strong>
          <small>{group.detail}</small>
        </div>
        <b>{amountPrefix}{shortRupees(group.amount)}</b>
      </button>
      {isOpen && (
        <div className="history-related-items">
          {group.items.map((transaction) => (
            <MemoHistoryItem
              transaction={transaction}
              key={transaction.id}
              onEditExpense={getExpenseEditHandler(transaction)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MoneyBookPanel({ summary = {}, onAdd, onEdit, onToggleSettled, onDelete }) {
  const entries = summary.visibleEntries || []
  const hasEntries = entries.length > 0

  return (
    <section className="money-book-panel" aria-label="Money Book">
      <div className="money-book-header">
        <div>
          <p className="eyebrow">Money Book</p>
          <h2>Borrow & lend</h2>
        </div>
        <button className="primary-button small-button" type="button" onClick={onAdd}>
          <Plus size={15} />
          Add Entry
        </button>
      </div>

      <div className="money-book-summary-grid">
        <HistorySummaryCard label="You Gave" value={summary.totalGiven} tone="outgoing" />
        <HistorySummaryCard label="To Receive" value={summary.needToReceive} tone="incoming" />
        <HistorySummaryCard label="Borrowed" value={summary.totalBorrowed} tone="incoming" />
        <article className="history-summary-card transfer">
          <span>Pending</span>
          <strong>{shortRupees(summary.pendingSettlements || 0)}</strong>
          <small>{summary.pendingCount || 0} open</small>
        </article>
      </div>

      {!hasEntries ? (
        <button className="money-book-empty" type="button" onClick={onAdd}>
          <span className="soft-icon">
            <Wallet size={17} />
          </span>
          <span>
            <strong>Track udhar without mental load.</strong>
            <small>Add money given or taken. Activity and insights update automatically.</small>
          </span>
        </button>
      ) : (
        <div className="money-book-entry-list">
          {entries.slice(0, 5).map((entry) => (
            <MoneyBookEntryCard
              entry={entry}
              key={entry.id}
              onEdit={() => onEdit(entry)}
              onToggleSettled={() => onToggleSettled(entry.id)}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function MoneyBookEntryCard({ entry, onEdit, onToggleSettled, onDelete }) {
  const isSettled = entry.status === 'settled'
  const isGiven = entry.kind === 'given'
  const due = moneyBookEntryDue(entry)

  return (
    <article className={`money-book-entry ${isSettled ? 'settled' : 'pending'} ${isGiven ? 'given' : 'taken'}`}>
      <div className="money-book-entry-main">
        <span className="money-book-direction">{isGiven ? 'Given' : 'Taken'}</span>
        <strong>{entry.person}</strong>
        <p>{entry.note || (isGiven ? 'Money to receive' : 'Money to repay')}</p>
      </div>
      <div className="money-book-entry-amount">
        <strong>{isGiven ? '-' : '+'}{rupees(entry.amount)}</strong>
        {entry.interest > 0 && <span>Vyaj {rupees(entry.interest)}</span>}
        <small>{isSettled ? 'Settled' : `${rupees(due)} pending${entry.dueDate ? ` by ${entry.dueDate}` : ''}`}</small>
      </div>
      <div className="money-book-entry-actions">
        <button className="text-action-button" type="button" onClick={onToggleSettled}>
          {isSettled ? 'Reopen' : 'Settle'}
        </button>
        <button className="icon-button mini-icon-button" type="button" aria-label={`Edit ${entry.person}`} onClick={onEdit}>
          <Pencil size={14} />
        </button>
        <button className="icon-button mini-icon-button" type="button" aria-label={`Delete ${entry.person}`} onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}

function MoneyBookEntryModal({ entry = {}, onClose, onSave }) {
  const [kind, setKind] = useState(entry.kind === 'taken' ? 'taken' : 'given')
  const [person, setPerson] = useState(entry.person || '')
  const [amount, setAmount] = useState(entry.amount ? String(entry.amount) : '')
  const [date, setDate] = useState(entry.date || todayDateKey())
  const [dueDate, setDueDate] = useState(entry.dueDate || '')
  const [note, setNote] = useState(entry.note || '')
  const [interest, setInterest] = useState(entry.interest ? String(entry.interest) : '')
  const [errors, setErrors] = useState({})

  const clearError = useCallback((field) => {
    setErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const submitEntry = useCallback((event) => {
    event.preventDefault()

    const fieldErrors = {}
    const parsedAmount = Number(amount || 0)
    const parsedInterest = Number(interest || 0)

    if (!String(person || '').trim()) {
      fieldErrors.person = 'Add a person name.'
    }

    if (!parsedAmount || parsedAmount <= 0) {
      fieldErrors.amount = 'Add a positive amount.'
    }

    if (!date) {
      fieldErrors.date = 'Choose a date.'
    }

    if (parsedInterest < 0) {
      fieldErrors.interest = 'Interest cannot be negative.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    const saved = onSave({
      ...entry,
      kind,
      person,
      amount: parsedAmount,
      date,
      dueDate,
      note,
      interest: parsedInterest,
      status: entry.status || 'pending',
      settledAt: entry.settledAt || '',
    })

    if (!saved) {
      setErrors({ form: 'Check the highlighted fields before saving.' })
    }
  }, [amount, date, dueDate, entry, interest, kind, note, onSave, person])

  return (
    <AppModal onClose={onClose} labelledBy="money-book-entry-title" sheetClassName="editor-sheet money-book-modal">
      <form className={`money-book-form ${Object.keys(errors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={submitEntry}>
        <div className="editor-sheet-header">
          <div>
            <p className="eyebrow">Money Book</p>
            <h2 id="money-book-entry-title">{entry.id ? 'Edit udhar entry' : 'Add udhar entry'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close money book form" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="segmented-control money-book-kind-toggle" aria-label="Money book entry type">
          <button className={kind === 'given' ? 'active' : ''} type="button" onClick={() => setKind('given')}>
            Given
          </button>
          <button className={kind === 'taken' ? 'active' : ''} type="button" onClick={() => setKind('taken')}>
            Taken
          </button>
        </div>

        <div className="editor-sheet-body money-book-form-body">
          <label>
            <span className="input-label">Person Name</span>
            <input
              className={`plain-input ${errors.person ? 'field-invalid' : ''}`}
              type="text"
              value={person}
              placeholder="Rahul, Priya, Sam"
              onChange={(event) => {
                setPerson(event.target.value)
                clearError('person')
              }}
            />
            {errors.person && <small className="field-helper">{errors.person}</small>}
          </label>

          <CurrencyInput
            label="Amount"
            id="money-book-amount"
            value={amount}
            onChange={(value) => {
              setAmount(value)
              clearError('amount')
            }}
            error={errors.amount}
          />

          <label>
            <span className="input-label">Date</span>
            <input
              className={`plain-input ${errors.date ? 'field-invalid' : ''}`}
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                clearError('date')
              }}
            />
            {errors.date && <small className="field-helper">{errors.date}</small>}
          </label>

          <CurrencyInput
            label="Interest / Vyaj"
            id="money-book-interest"
            value={interest}
            onChange={(value) => {
              setInterest(value)
              clearError('interest')
            }}
            error={errors.interest}
          />

          <label>
            <span className="input-label">Due Date</span>
            <input
              className="plain-input"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>

          <label>
            <span className="input-label">Note</span>
            <input
              className="plain-input"
              type="text"
              value={note}
              placeholder="Optional"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          {errors.form && <p className="form-message">{errors.form}</p>}
        </div>

        <div className="editor-sheet-footer money-book-form-actions">
          <button className="ghost-button full" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button full" type="submit">
            Save
          </button>
        </div>
      </form>
    </AppModal>
  )
}

function HistorySummaryCard({ label, value = 0, tone }) {
  return (
    <article className={`history-summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{shortRupees(value)}</strong>
    </article>
  )
}

function HistoryItemIcon({ transaction }) {
  if (transaction.sourceModule === 'Money Book') {
    return <Wallet size={17} />
  }

  if (transaction.sourceModule === 'Shared') {
    return <User size={17} />
  }

  if (transaction.sourceModule === 'Goals' || transaction.category === 'Savings') {
    return <PiggyBank size={17} />
  }

  if (transaction.sourceModule === 'Planner' || transaction.category === 'Planner') {
    return <Target size={17} />
  }

  if (transaction.source === 'commitment') {
    return <CreditCard size={17} />
  }

  if (transaction.tone === 'incoming') {
    return <Wallet size={17} />
  }

  return <Receipt size={17} />
}

function HistoryItem({ transaction, onEditExpense }) {
  const amountPrefix = transaction.tone === 'incoming' ? '+' : transaction.tone === 'outgoing' ? '-' : ''

  return (
    <div className={`history-item ${transaction.tone}`}>
      <span className="history-item-icon" style={{ color: transaction.color }}>
        <HistoryItemIcon transaction={transaction} />
      </span>
      <div className="history-item-main">
        <div>
          <strong>{transaction.title}</strong>
          <span>{activityVerb(transaction)}</span>
        </div>
        <p>{transaction.category}{transaction.note ? ` - ${transaction.note}` : ''}</p>
      </div>
      <div className="history-item-amount">
        <strong>{amountPrefix}{rupees(transaction.amount)}</strong>
        <span>{formatActivityTime(transaction.dateTime)}</span>
        {onEditExpense && (
          <button className="text-action-button history-edit-button" type="button" onClick={onEditExpense}>
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

const MemoHistoryRelatedGroup = memo(HistoryRelatedGroup)
const MemoHistoryItem = memo(HistoryItem)

function VoiceExpenseBox({
  voiceDraft,
  voiceStatus,
  isListening,
  voiceLanguage,
  setVoiceLanguage,
  quickSaveMode,
  setQuickSaveMode,
  startVoiceExpense,
  stopVoiceExpense,
  confirmVoiceExpense,
  updateVoiceDraft,
  clearVoiceDraft,
  useVoiceDraftInForm,
  undoVoiceSave,
  lastVoiceSave,
}) {
  const categoryChoices = Array.from(
    new Set([
      ...(voiceDraft?.category ? [voiceDraft.category] : []),
      ...voiceCategoryOptions,
      ...expenseCategories.map((category) => category.label),
    ]),
  )
  const hasVoicePanel = isListening || voiceDraft || voiceStatus || lastVoiceSave

  return (
    <section className="voice-box voice-compact">
      <div className="voice-compact-bar">
        <button
          className={`voice-mic-button ${isListening ? 'listening' : ''}`}
          type="button"
          onClick={isListening ? stopVoiceExpense : startVoiceExpense}
          aria-label={isListening ? 'Stop voice entry' : 'Start voice entry'}
        >
          {isListening ? <Square size={17} /> : <Mic size={18} />}
          <span>{isListening ? 'Listening' : 'Voice'}</span>
        </button>
        <button
          className={`quick-save-toggle ${quickSaveMode ? 'active' : ''}`}
          type="button"
          onClick={() => setQuickSaveMode((current) => !current)}
          aria-pressed={quickSaveMode}
        >
          Quick save
          <span />
        </button>
      </div>

      {hasVoicePanel && (
        <div className="voice-mini-sheet">
          <div className="voice-language-row" aria-label="Voice language">
            {voiceLanguageOptions.map((option) => (
              <button
                className={voiceLanguage === option.code ? 'active' : ''}
                key={option.code}
                type="button"
                onClick={() => setVoiceLanguage(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="voice-state-line">
            {isListening && <span className="listening-dot" aria-label="Listening" />}
            {voiceStatus && <p className="voice-status">{voiceStatus}</p>}
          </div>
      {lastVoiceSave && (
        <div className="voice-undo-row">
          <span>Last voice entry saved.</span>
          <button type="button" onClick={undoVoiceSave}>
            Undo
          </button>
        </div>
      )}
      {voiceDraft && (
        <article className="voice-draft compact-voice-draft">
          <div className="voice-draft-fields">
            <label>
              Expense
              <input
                className="plain-input"
                type="text"
                value={voiceDraft.label || ''}
                onChange={(event) => updateVoiceDraft({ label: event.target.value })}
              />
            </label>
            <label>
              Amount
              <span className="voice-amount-input">
                ₹
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={voiceDraft.amount || ''}
                  onChange={(event) => updateVoiceDraft({ amount: event.target.value })}
                />
              </span>
            </label>
            <label>
              Category
              <select
                className="month-select"
                value={voiceDraft.category || 'Other'}
                onChange={(event) => updateVoiceDraft({ category: event.target.value })}
              >
                {categoryChoices.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="voice-draft-meta">
            <span className={`confidence-pill ${voiceDraft.confidence || 'review'}`}>
              {voiceDraft.confidence === 'high' ? 'Clear match' : 'Review once'}
            </span>
            <p>{voiceDraft.transcript}</p>
          </div>
          <div className="mini-action-row">
            <button className="primary-button" type="button" onClick={confirmVoiceExpense}>
              Save
            </button>
            <button className="ghost-button" type="button" onClick={useVoiceDraftInForm}>
              Edit
            </button>
            <button className="ghost-button" type="button" onClick={clearVoiceDraft}>
              Cancel
            </button>
          </div>
        </article>
      )}
        </div>
      )}
    </section>
  )
}

function SharedExpensesPanel({
  groups,
  profile,
  sharedSummary,
  addSharedGroup,
  addSharedPayment,
  markSharedSettlementReceived,
  removeSharedGroup,
  variant = 'default',
}) {
  const [name, setName] = useState('')
  const [people, setPeople] = useState('')
  const [paymentDrafts, setPaymentDrafts] = useState({})
  const [message, setMessage] = useState('')
  const currentUserName = resolveCurrentUserName(profile)
  const reconciledGroups = useMemo(
    () => groups.map((group) => reconcileSharedGroup(group, profile)),
    [groups, profile],
  )
  const focusSharedGroupName = () => {
    if (typeof document !== 'undefined') {
      document.getElementById('shared-group-name')?.focus()
    }
  }

  const submitGroup = (event) => {
    event.preventDefault()
    const peopleList = people
      .split(',')
      .map((person) => person.trim())
      .filter(Boolean)

    const saved = addSharedGroup({
      name,
      people: peopleList,
    })

    if (!saved) {
      setMessage('Add a group name and at least one participant.')
      return
    }

    setMessage('Shared group created. Add payments as costs happen.')
    setName('')
    setPeople('')
  }

  const updatePaymentDraft = (groupId, patch) => {
    setPaymentDrafts((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] || {}),
        ...patch,
      },
    }))
  }

  const submitPayment = (event, group) => {
    event.preventDefault()
    const draft = paymentDrafts[group.id] || {}
    const saved = addSharedPayment(group.id, {
      label: draft.label,
      amount: Number(draft.amount),
      paidBy: draft.paidBy || currentUserName,
    })

    if (!saved) {
      setMessage('Add what was paid, amount, and who paid.')
      return
    }

    setMessage(`${draft.label || 'Payment'} added to ${group.name}.`)
    setPaymentDrafts((current) => ({
      ...current,
      [group.id]: { label: '', amount: '', paidBy: '' },
    }))
  }

  return (
    <section className={`shared-panel ${variant === 'planner' ? 'planner-shared-panel' : ''}`}>
      <div className="screen-heading compact-heading">
        <div>
          <p className="eyebrow">Shared expenses</p>
          <h1>{variant === 'planner' ? 'Split trip expenses with friends.' : 'Track who paid and who owes.'}</h1>
          <p className="section-note shared-panel-note">Manage group costs, participants, payments, and settlements in one place.</p>
        </div>
      </div>

      <form className="shared-form" onSubmit={submitGroup}>
        <label>
          <span className="input-label">Shared group name</span>
          <input
            className="plain-input"
            id="shared-group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Goa trip, office lunch"
          />
        </label>
        <label>
          <span className="input-label">Participants</span>
          <input className="plain-input" value={people} onChange={(event) => setPeople(event.target.value)} placeholder="Rahul, Priya, Sam" />
        </label>
        <button className="primary-button full" type="submit">
          Create shared group
        </button>
        {message && <p className="form-message">{message}</p>}
      </form>

      {sharedSummary?.activeGroups > 0 && (
        <div className="shared-metrics-strip" aria-label="Shared expense summary">
          <span>
            <small>You paid upfront</small>
            <strong>{rupees(sharedSummary.totalPaidByYou)}</strong>
          </span>
          <span>
            <small>Friends owe you</small>
            <strong>{rupees(sharedSummary.pendingRecoverable)}</strong>
          </span>
          <span>
            <small>Received back</small>
            <strong>{rupees(sharedSummary.receivedRecoveries)}</strong>
          </span>
          <span>
            <small>Net monthly impact</small>
            <strong>{rupees(sharedSummary.netSharedImpact)}</strong>
          </span>
        </div>
      )}

      <div className="shared-list">
        {groups.length === 0 && (
          <EmptyState
            title="Split costs without confusion"
            detail="Add a group, participants, and payments. FBPly will show who owes whom."
            actionLabel="Create a group"
            onAction={focusSharedGroupName}
            icon={User}
          />
        )}
        {reconciledGroups.map((group) => {
          const draft = paymentDrafts[group.id] || {}
          const payerOptions = group.people.length > 0 ? group.people : [currentUserName]
          const selectedTripPayer = draft.paidBy || currentUserName

          return (
            <article className="shared-card" key={group.id}>
              <div className="shared-card-top">
                <div>
                  <h2>{group.name}</h2>
                  <p>{group.people.map((person) => displayPersonName(person, profile)).join(', ')}</p>
                </div>
                <button className="icon-button" type="button" aria-label={`Remove ${group.name}`} onClick={() => removeSharedGroup(group.id)}>
                  <Trash2 size={16} />
                </button>
              </div>

              <form className="trip-payment-form" onSubmit={(event) => submitPayment(event, group)}>
                <label>
                  <span className="input-label">What was paid?</span>
                  <input
                    className="plain-input"
                    value={draft.label || ''}
                    placeholder="Hotel, petrol, dinner"
                    onChange={(event) => updatePaymentDraft(group.id, { label: event.target.value })}
                  />
                </label>
                <div>
                  <CurrencyInput
                    label="Amount"
                    id={`trip-payment-${slugify(group.id)}`}
                    value={draft.amount || ''}
                    onChange={(value) => updatePaymentDraft(group.id, { amount: value })}
                    placeholder="1200"
                  />
                </div>
                <label>
                  <span className="input-label">Who paid?</span>
                  <select
                    className="month-select stable-select"
                    value={selectedTripPayer}
                    onChange={(event) => updatePaymentDraft(group.id, { paidBy: event.target.value })}
                  >
                    {payerOptions.map((person) => (
                      <option key={person} value={person}>
                        {displayPersonName(person, profile)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="ghost-button" type="submit">
                  Add shared payment
                </button>
              </form>

              {group.payments.length > 0 && (
                <div className="trip-payment-list">
                  {group.payments.slice(0, 4).map((payment) => (
                    <div className="trip-payment-row" key={payment.id}>
                      <span>
                        <strong>{payment.label}</strong>
                        <small>{displayPersonName(payment.paidBy, profile)} paid</small>
                      </span>
                      <b>{rupees(payment.amount)}</b>
                    </div>
                  ))}
                </div>
              )}

              <div className="shared-card-summary">
                <span>
                  <small>Total shared cost</small>
                  <strong>{rupees(group.amount)}</strong>
                </span>
                <span>
                  <small>Each person share</small>
                  <strong>{rupees(group.share)}</strong>
                </span>
                <span>
                  <small>Your current impact</small>
                  <strong>{rupees(group.cashImpact)}</strong>
                </span>
              </div>
              <div className="settlement-list">
                {group.settlements.length === 0 && (
                  <span className="settlement-empty">Add a shared payment to see who owes whom.</span>
                )}
                {group.settlements.map((item) => {
                  const isSettled = item.status === 'received'
                  const isPaid = item.status === 'paid'
                  const isIncoming = item.direction === 'incoming'
                  const isOutgoing = item.direction === 'outgoing'
                  const label = isIncoming
                    ? `${displayPersonName(item.from, profile)} owes you`
                    : isOutgoing
                      ? `You owe ${displayPersonName(item.to, profile)}`
                      : `${displayPersonName(item.from, profile)} owes ${displayPersonName(item.to, profile)}`
                  const actionLabel = isOutgoing ? 'Paid' : 'Received'
                  const displayAmount = item.remainingAmount || item.amount

                  return (
                    <div className={`settlement-item ${isSettled || isPaid ? 'received' : ''}`} key={item.id}>
                      <span className="settlement-text">
                        {label} <strong>{rupees(displayAmount)}</strong>
                      </span>
                      {isIncoming || isOutgoing ? (
                        <button
                          className="text-action-button"
                          type="button"
                          disabled={isSettled || isPaid}
                          onClick={() => markSharedSettlementReceived(group.id, item.id)}
                        >
                          {actionLabel}
                        </button>
                      ) : (
                        <span className="settlement-status">Pending</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PlannerScreen({
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
  profile,
  sharedSummary,
  sharedGroups,
  addSharedGroup,
  addSharedPayment,
  markSharedSettlementReceived,
  removeSharedGroup,
}) {
  return (
    <section className="screen-content goals-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Goals</p>
          <h1>Buy safely, without monthly stress.</h1>
        </div>
      </div>

      <PlannerRealityCard financialState={financialState} />

      <div className="planner-section-title">
        <div>
          <h2>What are you planning?</h2>
          <p>Pick a rough type. FBPly keeps the calculation behind the scenes.</p>
        </div>
      </div>

      <div className="plan-grid purchase-type-grid">
        {planCategories.map((category) => {
          const Icon = category.icon
          return (
            <button
              className={selectedPlan === category.label ? 'active' : ''}
              key={category.label}
              type="button"
              onClick={() => setSelectedPlan(category.label)}
            >
              <Icon size={21} />
              <span>{category.label}</span>
            </button>
          )
        })}
      </div>

      <section className="planner-goal-card">
        <div className="input-with-icon planner-search">
          <PiggyBank size={18} />
          <input
            type="text"
            value={plannerInput}
            placeholder="Optional name, like used car or work laptop"
            onChange={(event) => setPlannerInput(event.target.value)}
          />
        </div>
        <div className="planner-field-grid">
          <CurrencyInput
            label="Price"
            id="planner-target-amount"
            ariaLabel="Target purchase amount"
            value={plannerTargetAmount}
            placeholder="300000"
            onChange={setPlannerTargetAmount}
          />
          <CurrencyInput
            label="Savings ready"
            id="planner-current-savings"
            ariaLabel="Current savings available"
            value={plannerCurrentSavings}
            placeholder="40000"
            onChange={setPlannerCurrentSavings}
          />
        </div>
        <div>
          <span className="input-label">When do you want it?</span>
          <div className="timeline-control" aria-label="Desired timeline">
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
      </section>

      <RecommendationPanel
        recommendation={recommendation}
        financialState={financialState}
      />

      <SharedExpensesPanel
        groups={sharedGroups}
        profile={profile}
        sharedSummary={sharedSummary}
        addSharedGroup={addSharedGroup}
        addSharedPayment={addSharedPayment}
        markSharedSettlementReceived={markSharedSettlementReceived}
        removeSharedGroup={removeSharedGroup}
        variant="planner"
      />
    </section>
  )
}

function PlannerRealityCard({ financialState }) {
  const realityRows = [
    { label: 'Income', value: financialState.income },
    { label: 'Fixed basics', value: financialState.fixedExpensesTotal || 0 },
    { label: 'EMIs', value: financialState.emiAmount || 0 },
    { label: 'Daily spends', value: financialState.monthlyVariable || 0 },
    { label: 'Safe space left', value: financialState.flexibility || 0, highlight: true },
  ]

  return (
    <article className="planner-reality-card">
      <div className="planner-reality-heading">
        <div>
          <span className="mini-label">Money status</span>
          <h2>Can you afford this safely?</h2>
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
            <h2>Add a price to see a safe path.</h2>
            <p>FBPly checks your income, fixed payments, savings style, and timeline quietly.</p>
          </div>
        </article>
      </section>
    )
  }

  const requiredEmiValue = recommendation.financeNeeded === 0 ? 'No EMI needed' : shortRupees(recommendation.requiredEmi)
  const timelineLabel = recommendation.timelineMonths === 0 ? 'Today' : recommendation.timelineLabel
  const delayedTitle = recommendation.timelineMonths === 0 ? 'Selected path' : `Path by ${timelineLabel}`

  return (
    <section className="recommendation-stack">
      <article className="top-insight-card">
        <PiggyBank size={19} />
        <p>{recommendation.insight}</p>
      </article>

      <article className="finance-structure-card">
        <div className="finance-structure-heading">
          <div>
            <span className="mini-label">{recommendation.category} planning structure</span>
            <h2>{recommendation.goalName || `${recommendation.category} purchase`}</h2>
          </div>
          <strong>{shortRupees(recommendation.targetAmount)}</strong>
        </div>
        <div className="finance-structure-grid">
          <div>
            <span>Suggested down payment</span>
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
            <p>After keeping some monthly safety space.</p>
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

function ProfileScreen({
  profile,
  setProfile,
  authUser,
  onSignOut,
  financialState,
  fixedDistribution,
  flexibleDistribution,
  updateCommitment,
  addCommitment,
  removeCommitment,
  savingsBuckets,
  addSavingsBucket,
  updateSavingsBucket,
  removeSavingsBucket,
  voiceDraft,
  voiceStatus,
  isListening,
  voiceLanguage,
  setVoiceLanguage,
  quickSaveMode,
  setQuickSaveMode,
  startVoiceExpense,
  stopVoiceExpense,
  confirmVoiceExpense,
  updateVoiceDraft,
  clearVoiceDraft,
  useVoiceDraftInForm,
  undoVoiceSave,
  lastVoiceSave,
  selectedCategory,
  setSelectedCategory,
  customExpenseName,
  setCustomExpenseName,
  expenseAmount,
  setExpenseAmount,
  expenseNote,
  setExpenseNote,
  expenseError,
  expenseFieldErrors,
  clearExpenseFieldError,
  addExpense,
  quickExpenseChips,
  applyQuickExpense,
}) {
  const commitments = normalizeCommitments(profile)
  const greeting = getGreeting(profile.name)
  const balanceMessage = getProfileBalanceMessage(financialState)
  const [isCommitmentEditorOpen, setIsCommitmentEditorOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  return (
    <section className="screen-content">
      <div className="screen-heading compact-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>Your financial context</h1>
        </div>
        <button
          className="profile-menu-trigger"
          type="button"
          aria-label="Open profile menu"
          onClick={() => setIsProfileMenuOpen(true)}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <article className="profile-hero-card">
        <div>
          <span className="mini-label">Finance profile</span>
          <h2>{greeting}</h2>
          <p>{balanceMessage}</p>
        </div>
        <span className={`simulation-pill ${financialState.pressureTone === 'slight-pressure' ? 'warm' : financialState.pressureTone}`}>
          {financialState.pressure}
        </span>
      </article>

      <div className="finance-visual-grid">
        <FinanceDonut
          chart={fixedDistribution}
          action={(
            <button
              className="icon-button compact-icon-button"
              type="button"
              aria-label="Edit fixed expenses"
              onClick={() => setIsCommitmentEditorOpen(true)}
            >
              <Pencil size={15} />
            </button>
          )}
        />
        <FinanceDonut chart={flexibleDistribution} />
      </div>

      <VoiceExpenseBox
        voiceDraft={voiceDraft}
        voiceStatus={voiceStatus}
        isListening={isListening}
        voiceLanguage={voiceLanguage}
        setVoiceLanguage={setVoiceLanguage}
        quickSaveMode={quickSaveMode}
        setQuickSaveMode={setQuickSaveMode}
        startVoiceExpense={startVoiceExpense}
        stopVoiceExpense={stopVoiceExpense}
        confirmVoiceExpense={confirmVoiceExpense}
        updateVoiceDraft={updateVoiceDraft}
        clearVoiceDraft={clearVoiceDraft}
        useVoiceDraftInForm={useVoiceDraftInForm}
        undoVoiceSave={undoVoiceSave}
        lastVoiceSave={lastVoiceSave}
      />

      <ProfileExpenseQuickAdd
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        customExpenseName={customExpenseName}
        setCustomExpenseName={setCustomExpenseName}
        expenseAmount={expenseAmount}
        setExpenseAmount={setExpenseAmount}
        expenseNote={expenseNote}
        setExpenseNote={setExpenseNote}
        expenseError={expenseError}
        expenseFieldErrors={expenseFieldErrors}
        clearExpenseFieldError={clearExpenseFieldError}
        addExpense={addExpense}
        quickExpenseChips={quickExpenseChips}
        applyQuickExpense={applyQuickExpense}
      />

      <SavingsBucketsManager
        buckets={savingsBuckets}
        addSavingsBucket={addSavingsBucket}
        updateSavingsBucket={updateSavingsBucket}
        removeSavingsBucket={removeSavingsBucket}
      />

      {isCommitmentEditorOpen && (
        <CommitmentEditorSheet
          commitments={commitments}
          updateCommitment={updateCommitment}
          addCommitment={addCommitment}
          removeCommitment={removeCommitment}
          onClose={() => setIsCommitmentEditorOpen(false)}
        />
      )}
      {isProfileMenuOpen && (
        <ProfileMenuSheet
          authUser={authUser}
          profile={profile}
          setProfile={setProfile}
          onClose={() => setIsProfileMenuOpen(false)}
          onSignOut={onSignOut}
        />
      )}
    </section>
  )
}

function ProfileMenuSheet({ authUser, profile, setProfile, onClose, onSignOut }) {
  return (
    <AppModal onClose={onClose} labelledBy="profile-menu-title" sheetClassName="editor-sheet profile-menu-sheet">
      <div className="editor-sheet-header">
        <div>
          <p className="eyebrow">Account</p>
          <h2 id="profile-menu-title">Profile menu</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close profile menu" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <div className="profile-menu-account">
        <BrandMark size="small" />
        <div>
          <span className="mini-label">Signed in as</span>
          <strong>{authUser?.email || profile.email || 'Local profile'}</strong>
        </div>
      </div>
      <div className="editor-sheet-body profile-menu-body">
        <label className="input-label" htmlFor="profile-menu-name">
          Name
        </label>
        <input
          className="plain-input"
          id="profile-menu-name"
          type="text"
          value={profile.name}
          placeholder="Your name"
          onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
        />
        <CurrencyInput
          label="Income"
          id="profile-menu-income"
          value={profile.income}
          onChange={(value) => setProfile((current) => ({ ...current, income: Number(value) }))}
        />
        <div className="profile-menu-section">
          <span className="input-label">Planner style</span>
          <div className="preference-grid compact-preference-grid">
            {['safe', 'balanced', 'flexible'].map((preference) => (
              <button
                className={`preference-card ${profile.savingsPreference === preference ? 'active' : ''}`}
                key={preference}
                type="button"
                onClick={() => setProfile((current) => ({ ...current, savingsPreference: preference }))}
              >
                <CheckCircle2 size={16} />
                <span>{titleCase(preference)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="editor-sheet-footer profile-menu-footer">
        <button
          className="sign-out-button"
          type="button"
          onClick={() => {
            onClose()
            onSignOut()
          }}
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </AppModal>
  )
}

function ProfileExpenseQuickAdd({
  selectedCategory,
  setSelectedCategory,
  customExpenseName,
  setCustomExpenseName,
  expenseAmount,
  setExpenseAmount,
  expenseNote,
  setExpenseNote,
  expenseError,
  expenseFieldErrors = {},
  clearExpenseFieldError,
  addExpense,
  quickExpenseChips,
  applyQuickExpense,
}) {
  const clearField = (field) => {
    if (clearExpenseFieldError) {
      clearExpenseFieldError(field)
    }
  }

  return (
    <form className={`profile-quick-expense-card ${Object.keys(expenseFieldErrors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={addExpense}>
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Quick expense</p>
          <h2>Add from profile</h2>
        </div>
      </div>
      <div className="quick-chip-row profile-quick-chip-row">
        {quickExpenseChips.slice(0, 5).map((chip) => (
          <button key={chip.label} type="button" onClick={() => {
            applyQuickExpense(chip)
            clearField('name')
            clearField('amount')
            clearField('category')
          }}>
            {chip.label}
            {chip.amount > 0 && <span>{shortRupees(chip.amount)}</span>}
          </button>
        ))}
      </div>
      <div className="profile-expense-grid">
        <label>
          <span className="input-label">Name</span>
          <input
            className={`plain-input ${expenseFieldErrors.name ? 'field-invalid' : ''}`}
            id="profile-expense-name"
            type="text"
            value={customExpenseName}
            placeholder="Petrol, food, bill..."
            onChange={(event) => {
              setCustomExpenseName(event.target.value)
              clearField('name')
            }}
          />
          {expenseFieldErrors.name && <small className="field-helper">{expenseFieldErrors.name}</small>}
        </label>
        <div className={expenseFieldErrors.category ? 'field-invalid-wrap' : ''}>
          <CategoryPicker
            categories={expenseCategories}
            customExpenseName={customExpenseName}
            quickExpenseChips={quickExpenseChips}
            selectedCategory={selectedCategory}
            setCustomExpenseName={(value) => {
              setCustomExpenseName(value)
              clearField('name')
            }}
            setSelectedCategory={(value) => {
              setSelectedCategory(value)
              clearField('category')
            }}
            error={expenseFieldErrors.category}
          />
        </div>
        <div>
          <CurrencyInput
            label="Amount"
            id="profile-expense-amount"
            value={expenseAmount}
            onChange={(value) => {
              setExpenseAmount(value)
              clearField('amount')
            }}
            error={expenseFieldErrors.amount}
          />
        </div>
        <label>
          <span className="input-label">Note</span>
          <input
            className="plain-input"
            type="text"
            value={expenseNote}
            placeholder="Optional"
            onChange={(event) => setExpenseNote(event.target.value)}
          />
        </label>
      </div>
      <button className="primary-button full" type="submit">
        Add Expense
      </button>
      {expenseError && <p className="form-message">{expenseError}</p>}
    </form>
  )
}

function CommitmentEditorSheet({ commitments, updateCommitment, addCommitment, removeCommitment, onClose }) {
  return (
    <AppModal onClose={onClose} labelledBy="commitment-editor-title">
      <div className="editor-sheet-header">
        <div>
          <p className="eyebrow">Fixed expenses</p>
          <h2 id="commitment-editor-title">Edit monthly commitments</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close fixed expense editor" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <p className="editor-sheet-copy">
        These regular payments power the fixed expense chart, planner comfort range, and reports.
      </p>
      <div className="editor-sheet-body">
        <CommitmentsEditor
          commitments={commitments}
          updateCommitment={updateCommitment}
          addCommitment={addCommitment}
          removeCommitment={removeCommitment}
        />
      </div>
      <div className="editor-sheet-footer">
        <button className="primary-button full" type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </AppModal>
  )
}

function SavingsBucketsManager({ buckets, addSavingsBucket, updateSavingsBucket, removeSavingsBucket }) {
  return (
    <section className="savings-manager">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Savings buckets</p>
          <h2>Small goals, clearer comfort.</h2>
        </div>
        <button className="ghost-button small-button" type="button" onClick={addSavingsBucket}>
          <Plus size={17} />
          Add Bucket
        </button>
      </div>
      <div className="bucket-grid">
        {buckets.length === 0 ? (
          <EmptyState
            title="Give your next win a place"
            detail="A small bucket makes progress visible without adding pressure."
            actionLabel="Add bucket"
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
        onChange={(value) => updateSavingsBucket(bucket.id, { saved: Number(value) })}
      />
      <CurrencyInput
        label="Target"
        id={`bucket-target-${slugify(bucket.id)}`}
        value={bucket.target}
        onChange={(value) => updateSavingsBucket(bucket.id, { target: Number(value) })}
      />
      <div className="bucket-recurring-grid">
        <div className="bucket-recurring-amount">
          <CurrencyInput
            label="Monthly add"
            id={`bucket-monthly-${slugify(bucket.id)}`}
            value={bucket.monthlyContribution || ''}
            onChange={(value) => updateSavingsBucket(bucket.id, { monthlyContribution: Number(value) })}
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
  const progress = bucket.target > 0 ? Math.min(Math.round((Number(bucket.saved || 0) / Number(bucket.target)) * 100), 100) : 0

  return (
    <article className={`bucket-card ${compact ? 'compact' : ''}`}>
      <div>
        <h3>{bucket.name}</h3>
        <p>{rupees(bucket.saved)} saved of {rupees(bucket.target)}</p>
      </div>
      <strong>{progress}%</strong>
      <div className="bucket-progress" aria-label={`${progress}% saved`}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </article>
  )
}

function BrandMark({ size = 'default' }) {
  return (
    <span className={`brand-mark ${size}`} aria-hidden="true">
      F
    </span>
  )
}

function HeaderLogo() {
  return (
    <div className="header-logo">
      <BrandMark />
      <span>FBPly</span>
    </div>
  )
}

function CurrencyInput({ label, value, onChange, placeholder = '0', id = slugify(label), ariaLabel = label, error = '' }) {
  return (
    <>
      <label className="input-label" htmlFor={id}>
        {label}
      </label>
      <div className={`currency-input ${error ? 'field-invalid' : ''}`}>
        <span>₹</span>
        <input
          id={id}
          min="0"
          type="number"
          aria-label={ariaLabel}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error && <small className="field-helper">{error}</small>}
    </>
  )
}

function BottomNav({ activeTab, setActiveTab, openAddSheet }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon
        const isAdd = item.isAdd
        return (
          <button
            className={`${activeTab === item.key ? 'active' : ''} ${isAdd ? 'nav-add-button' : ''}`}
            key={item.key}
            type="button"
            aria-label={isAdd ? 'Add money entry' : item.label}
            onClick={() => {
              if (isAdd) {
                openAddSheet('menu')
                return
              }

              setActiveTab(item.key)
            }}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function buildExpenseBreakdown(expenses, profile) {
  const sources = {}
  const totals = normalizeCommitments(profile).reduce((map, commitment) => {
    const normalized = normalizeSpendCategory({
      category: commitment.name,
      note: commitment.name,
    })
    const name = normalized.category === 'Other' ? 'Recurring' : normalized.category
    map[name] = (map[name] || 0) + Number(commitment.amount || 0)
    sources[name] = sources[name] ? 'Mixed' : 'Monthly commitment'
    return map
  }, {})

  expenses.forEach((expense) => {
    const normalized = normalizeSpendCategory(expense)
    const name = normalized.category || 'Other'
    totals[name] = (totals[name] || 0) + Number(expense.amount || 0)
    sources[name] = sources[name] ? 'Mixed' : 'Tracked expense'
  })

  return Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([name, value], index) => ({
      name,
      value,
      color: categoryColor(name) || getFinanceColor(name, index),
      source: sources[name] || 'Tracked expense',
    }))
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export default App
