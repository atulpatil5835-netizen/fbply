import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Car,
  ChartPie,
  CheckCircle2,
  ChevronRight,
  Coffee,
  CreditCard,
  Download,
  ExternalLink,
  House,
  LogOut,
  LockKeyhole,
  Mail,
  MessageCircle,
  Mic,
  MoreVertical,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  Popcorn,
  Receipt,
  ShoppingBag,
  ShieldCheck,
  Send,
  Sparkles,
  Square,
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
  buildSmartReminders,
} from './lib/financeIntelligence'
import { getFinanceColor } from './lib/financeColors'
import { addMoney, getCurrencySymbol, normalizeCurrency, normalizeMoney, setActiveCurrency, sumMoney } from './lib/money'
import {
  createSharedPayment,
  normalizePersonName,
  reconcileSharedGroup,
  resolveCurrentUserName,
  uniqueSharedPeople,
} from './lib/financialActivity'
import { flushStorageQueue, safeStorageGet, safeStorageSet, safeStorageSetQueued } from './lib/storage'
import {
  buildFinancialCalendarEvents,
  buildMoneyReminders,
  buildUpcomingMoney,
  createRecurringSchedule,
  normalizeRecurringSchedules,
} from './lib/recurringSchedule'
import {
  createReportHistoryEntry,
  createReportId,
  normalizeReportHistory,
} from './lib/reportHistory'
import {
  learnVoiceExpense,
  parseVoiceExpense as parseSpokenExpense,
  parseVoiceExpenseEntries as parseSpokenExpenseEntries,
  voiceCategoryOptions,
} from './lib/voiceExpense'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { AppModal, BrandMark, CurrencyInput, EmptyState, HeaderLogo } from './components/AppPrimitives.jsx'
import CategoryPicker from './components/CategoryPicker.jsx'
import FinanceDonut from './components/FinanceDonut.jsx'
import { CommitmentsEditor, CurrencyPreference } from './components/ProfileSettingsControls.jsx'
import { SavingsBucketsManager } from './components/SavingsBucketsManager.jsx'
import { focusInvalidField, slugify, titleCase } from './lib/uiHelpers'
import { applySeoMetadata, getSeoMetaForPath, isPublicSeoRoute, normalizeSeoPath } from './lib/seoRoutes.js'
import { trackActivation, trackEvent, trackFeatureUsage } from './lib/analytics'

const ActivityScreen = lazy(() => import('./screens/ActivityScreen.jsx'))
const DailyBookScreen = lazy(() => import('./screens/DailyBookScreen.jsx'))
const GoalsScreen = lazy(() => import('./screens/GoalsScreen.jsx'))
const LegalScreen = lazy(() => import('./screens/LegalScreen.jsx'))
const NotificationCenter = lazy(() => import('./components/NotificationCenter.jsx'))
const PublicSeoScreen = lazy(() => import('./screens/PublicSeoScreen.jsx'))
const ReportsScreen = lazy(() => import('./components/ReportsScreen.jsx'))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen.jsx'))
const TodayScreen = lazy(() => import('./screens/TodayScreen.jsx'))

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.22, ease: 'easeOut' },
}

const expenseCategories = [
  { label: 'Food', icon: Utensils, tone: 'cyan' },
  { label: 'Grocery', icon: Receipt, tone: 'green' },
  { label: 'Fuel', icon: Car, tone: 'orange' },
  { label: 'Transport', icon: Plane, tone: 'orange' },
  { label: 'Shopping', icon: ShoppingBag, tone: 'blue' },
  { label: 'Bills', icon: Receipt, tone: 'blue' },
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

const supportEmail = 'contact@fbply.com'
const founderName = 'Atul Sadanand Hinge'
const founderLinkedInUrl = 'https://www.linkedin.com/in/atul-hinge-304aab155/'
const supportPaymentUrl = 'https://razorpay.me/@atulsadanandhinge'
const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'About FBPly', href: '/about' },
  { label: 'Contact', href: '/contact' },
]
const appFooterLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Budget Planner', href: '/budget-planner' },
  { label: 'Trip Splitter', href: '/trip-expense-splitter' },
  { label: 'Expense Tracker', href: '/expense-tracker' },
  { label: 'Daily Expense Book', href: '/daily-expense-book' },
  { label: 'Personal Expense Tracker', href: '/personal-expense-tracker' },
  { label: 'Financial Reports', href: '/monthly-financial-report' },
  { label: 'Statement Analysis', href: '/bank-statement-analysis' },
  { label: 'Feedback', href: `mailto:${supportEmail}?subject=FBPly%20Feedback` },
  { label: 'Support FBPly', href: supportPaymentUrl, external: true },
  { label: 'About FBPly', href: '/about' },
]

function buildReportExportPrompt(type, request, sharedGroups = []) {
  const requestedType = type || request?.type || 'monthly'
  const reportGroups = Array.isArray(request?.payload?.groups) ? request.payload.groups : []
  const hasTrip = Array.isArray(sharedGroups) && sharedGroups.length > 0
  const tripTarget = { tab: 'history', targetId: 'shared-expenses-section' }

  if (requestedType === 'trip') {
    if (!hasTrip) {
      return {
        type: 'trip',
        title: 'Add a trip before exporting',
        message: 'No trip has been added yet. Would you like to add one now?',
        detail: 'The Activity trip section will open. Add a trip name, people, and the first shared payment there.',
        actionLabel: 'Add trip',
        ...tripTarget,
      }
    }

    if (reportGroups.length === 0) {
      return {
        type: 'trip',
        title: 'Add a payment to this trip',
        message: 'A trip exists, but there is no shared payment to include in the report yet.',
        detail: 'The Activity trip section will open. Add the amount, who paid, and a short note to the existing trip.',
        actionLabel: 'Add payment',
        ...tripTarget,
      }
    }
  }

  if (requestedType === 'settlement') {
    if (!hasTrip) {
      return {
        type: 'settlement',
        title: 'Add a trip before settlement export',
        message: 'No trip has been added yet. Add a trip first to create a settlement report.',
        detail: 'The Activity trip section will open. After you add a trip and shared payment, FBPly can calculate settlements.',
        actionLabel: 'Add trip',
        ...tripTarget,
      }
    }

    if (reportGroups.length === 0) {
      return {
        type: 'settlement',
        title: 'No settlement is ready yet',
        message: 'A trip exists, but there is no settlement amount to include yet.',
        detail: 'The Activity trip section will open. Add a shared payment so FBPly can calculate the settlement.',
        actionLabel: 'Add shared payment',
        ...tripTarget,
      }
    }
  }

  return null
}

const navItems = [
  { key: 'home', label: 'Today', icon: House },
  { key: 'history', label: 'Daily', ariaLabel: 'Daily Book', icon: Receipt },
  { key: 'planner', label: 'Savings', icon: Target },
  { key: 'reports', label: 'Reports', icon: ChartPie },
]

const fixedExpenseSuggestions = ['Rent', 'Electricity', 'Internet', 'Petrol', 'Shopping', 'Food', 'Subscription']

const emiSuggestions = ['Bike EMI', 'Car EMI', 'Phone EMI', 'Education loan', 'Personal loan']

const legalPages = {
  '/privacy': {
    eyebrow: 'Privacy Policy',
    title: 'Privacy Policy',
    summary: 'FBPly is designed to make personal finance tracking clear and respectful. This policy explains what the app may process and how users stay in control.',
    sections: [
      {
        title: 'Information You Provide',
        body: [
          'FBPly uses the information you enter, such as income, expenses, monthly bills, savings goals, shared expenses, planner inputs, profile details, and reviewed statement data.',
          'This information is used to calculate personal summaries, reports, reminders, safe-spend estimates, and purchase planning suggestions inside the app.',
        ],
      },
      {
        title: 'Local Storage And Account Data',
        body: [
          'FBPly may use browser or device storage to remember setup status, app data, cookie consent, and locally saved entries.',
          'If sign-in or hosted services are enabled, limited account information such as email may be processed by the authentication or infrastructure providers needed to operate the app.',
        ],
      },
      {
        title: 'Statement Review',
        body: [
          'Uploaded statements are processed for review and reporting. Raw files and PDF passwords are not saved permanently by default.',
          'Statement totals are based only on readable rows. Users should review detected dates, categories, and money-in or money-out direction before using them.',
        ],
      },
      {
        title: 'Cookies And Ads',
        body: [
          'FBPly may use local storage and similar browser features for app preferences and basic functionality.',
          'If advertising is enabled, Google AdSense or related partners may use cookies or similar technologies to show, limit, and measure ads under their own policies.',
        ],
      },
      {
        title: 'Your Choices',
        body: [
          'You may choose not to upload statements, may edit or remove reviewed data, and may clear locally stored browser data from your device.',
          `For privacy questions, contact ${supportEmail}.`,
        ],
      },
    ],
  },
  '/terms': {
    eyebrow: 'Terms & Conditions',
    title: 'Terms & Conditions',
    summary: 'These terms explain acceptable use, product limits, and the role of FBPly as a personal planning tool.',
    sections: [
      {
        title: 'Using FBPly',
        body: [
          'By using FBPly, you agree to use it for lawful personal financial tracking, planning, and review.',
          'You are responsible for the information you enter and for using the app in a respectful, lawful way.',
        ],
      },
      {
        title: 'No Professional Advice',
        body: [
          'FBPly is not a bank, financial institution, investment advisor, tax advisor, or legal advisor.',
          'Insights, planner outputs, comfort labels, and statement summaries are estimates based on provided or detected data. They are not professional advice.',
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
        title: 'Availability And Updates',
        body: [
          'FBPly is independently built and continuously improved. Features, calculations, design, and availability may change as the product evolves.',
          'Some updates may take time, especially for careful fixes that affect reports, privacy, imports, or user data.',
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
    summary: 'FBPly provides personal finance clarity from user-provided and reviewed data. It is a planning aid, not professional advice.',
    sections: [
      {
        title: 'Personal Planning Estimates',
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
      {
        title: 'No Guarantees',
        body: [
          'Planner guidance, comfort labels, summaries, and report insights are estimates, not guarantees of savings, eligibility, repayment ability, or financial outcomes.',
          'Please use FBPly as one helpful view of your information, not as the only basis for important decisions.',
        ],
      },
      {
        title: 'Responsible Use',
        body: [
          'For major financial, legal, tax, or investment decisions, consult a qualified professional.',
          `Questions or corrections can be sent to ${supportEmail}.`,
        ],
      },
    ],
  },
  '/about': {
    eyebrow: 'About',
    title: 'About FBPly',
    summary: 'FBPly is a founder-led personal finance clarity app for monthly spending, bills, shared expenses, and purchase planning.',
    sections: [
      {
        title: 'What FBPly Does',
        body: [
          'FBPly helps users see what is committed, what is flexible, and how a planned purchase may affect the month.',
          'The app focuses on clear, practical guidance from saved data without aggressive recommendations or unrealistic promises.',
        ],
      },
      {
        title: 'Founder Note',
        body: [
          'FBPly is independently built and continuously improved with care by a solo developer.',
          'Some updates may take a little longer, but every suggestion genuinely helps shape a calmer and more useful product experience.',
        ],
      },
      {
        title: 'Feedback Matters',
        body: [
          'Found something to improve? Suggestions are always welcome, especially around clarity, reports, privacy, accessibility, and everyday usability.',
          `Feedback can be sent anytime to ${supportEmail}.`,
        ],
      },
      {
        title: 'Founder',
        body: [
          `${founderName} (${founderLinkedInUrl}) builds and maintains FBPly as an independent product.`,
          'The goal is to keep the app transparent, useful, and respectful of the real-life financial decisions people make every month.',
        ],
      },
      {
        title: 'Support FBPly',
        body: [
          `You can support independent FBPly development here: ${supportPaymentUrl}.`,
          'Support helps keep the app improving for practical, everyday money planning.',
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
    summary: 'Use the official email below for support, privacy questions, product suggestions, or general inquiries.',
    sections: [
      {
        title: 'Support',
        body: [
          `For app access, saved data, reports, or account questions, email ${supportEmail}.`,
          `To support FBPly, use ${supportPaymentUrl}.`,
          'Please avoid sending bank passwords, full statement files, or highly sensitive financial details by email.',
        ],
      },
      {
        title: 'Privacy Questions',
        body: [
          `For privacy questions about local storage, statement review, cookies, or data handling, contact ${supportEmail}.`,
          'Clear, specific questions help make the answer faster and more useful.',
        ],
      },
      {
        title: 'Suggestions & Feedback',
        body: [
          'Suggestions are always welcome. Feedback about confusing flows, reports, wording, or missing features directly helps improve FBPly.',
          `Share product feedback at ${supportEmail}.`,
        ],
      },
      {
        title: 'Founder-Led Response',
        body: [
          'FBPly is independently maintained, so some responses and updates may take a little time.',
          'Every genuine message is appreciated and helps guide what gets improved next.',
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
  currency: 'INR',
  salaryDay: 1,
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
    title: 'Savings goals help you buy safely.',
    detail: 'Enter a target purchase and FBPly estimates a calmer path from your saved numbers.',
  },
  {
    tab: 'reports',
    title: 'Reports stay simple.',
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
    detail: 'Use the avatar/settings button for income, monthly bills, preferences, and sign out.',
  },
]

function createCommitment(name = 'New bill', amount = 0) {
  return {
    id: `commitment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    amount,
    dueDay: 1,
    recurrence: 'monthly',
  }
}

function normalizeMonthlyBillsForEdit(profile = {}) {
  const source = Array.isArray(profile.commitments) && profile.commitments.length > 0
    ? profile.commitments
    : profile.fixedExpenses || []

  return source
    .map((item, index) => ({
      id: item.id || item.key || `commitment-${index}`,
      name: String(item.name ?? item.label ?? ''),
      amount: normalizeMoney(item.amount),
      dueDay: Number(item.dueDay || item.paymentDay || 0) || undefined,
      recurrence: item.recurrence || 'monthly',
    }))
    .filter((item) => item.id || item.name || item.amount > 0)
}

function createBucket(name = 'New goal', saved = 0, target = 10000) {
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

function normalizeDateKey(value, fallback = todayDateKey()) {
  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : fallback
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
        amount: normalizeMoney(entry.amount),
        date,
        note: String(entry.note || '').trim(),
        interest: normalizeMoney(entry.interest || entry.vyaj),
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
    amount: normalizeMoney(entry.amount),
    date,
    note: String(entry.note || '').trim(),
    interest: normalizeMoney(entry.interest),
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

function createSharedGroup({ name, amount, paidBy, people, profile, purpose = '' }) {
  const id = `shared-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const currentUserName = resolveCurrentUserName(profile)
  const members = uniqueSharedPeople([currentUserName, ...(people || [])])
  const initialAmount = normalizeMoney(amount)
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
    purpose: String(purpose || '').trim(),
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

function parseVoiceExpenseEntries(transcript, memory) {
  return parseSpokenExpenseEntries(transcript, memory)
}

function getSpeechRecognitionLocale() {
  if (typeof navigator === 'undefined') {
    return 'en-IN'
  }

  const languages = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((language) => String(language))
  const indianLocale = languages.find((language) => /^(en-IN|hi-IN|mr-IN)$/i.test(language))

  return indianLocale || 'en-IN'
}

function pickVoiceDraft(transcripts, memory) {
  return transcripts
    .map((transcript) => parseVoiceExpense(transcript, memory))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.canQuickSave !== b.canQuickSave) {
        return a.canQuickSave ? -1 : 1
      }

      return (b.confidenceScore || 0) - (a.confidenceScore || 0)
    })[0] || null
}

function pickVoiceDrafts(transcripts, memory) {
  const entries = transcripts
    .flatMap((transcript) => parseVoiceExpenseEntries(transcript, memory))
    .filter(Boolean)

  if (entries.length > 0) {
    return entries
  }

  const fallback = pickVoiceDraft(transcripts, memory)
  return fallback ? [fallback] : []
}

function suggestExpenseCategoryForLabel(label, memory) {
  const cleanLabel = String(label || '').trim()

  if (!cleanLabel) {
    return null
  }

  const [suggestion] = parseVoiceExpenseEntries(`${cleanLabel} 1`, memory)

  if (!suggestion || suggestion.category === 'Other') {
    return null
  }

  return suggestion
}

const voiceUiStates = {
  ready: {
    label: 'Ready',
    message: 'Ready. Tap Speak and say an expense.',
  },
  listening: {
    label: 'Listening',
    message: 'Listening. Speak naturally.',
  },
  processing: {
    label: 'Processing',
    message: 'Checking microphone and preparing voice entry.',
  },
  transcript_found: {
    label: 'Transcript Found',
    message: 'Transcript found. Check it once, then review.',
  },
  no_speech: {
    label: 'No Speech Detected',
    message: 'No speech was detected. Try again or add it manually.',
  },
  permission_required: {
    label: 'Permission Required',
    message: 'Microphone permission is required. Allow access and try again.',
  },
  microphone_error: {
    label: 'Microphone Error',
    message: 'No working microphone was found. Add manually for now.',
  },
  network_error: {
    label: 'Network Error',
    message: 'Browser voice recognition needs its speech service. Try again online or add manually.',
  },
  manual_fallback: {
    label: 'Manual Fallback',
    message: 'Manual expense fields are ready. Voice is optional.',
  },
}

function getVoiceUiState(state) {
  return voiceUiStates[state] || voiceUiStates.ready
}

function getVoiceFailureUi(errorType, recognitionError = '') {
  const cleanType = String(errorType || '').trim()
  const cleanRecognitionError = String(recognitionError || '').trim()

  if (cleanType === 'permission_denied' || cleanRecognitionError === 'not-allowed' || cleanRecognitionError === 'service-not-allowed') {
    return { state: 'permission_required', message: voiceUiStates.permission_required.message }
  }

  if (cleanType === 'microphone_error' || cleanRecognitionError === 'audio-capture') {
    return { state: 'microphone_error', message: voiceUiStates.microphone_error.message }
  }

  if (cleanType === 'no_speech' || cleanRecognitionError === 'no-speech') {
    return { state: 'no_speech', message: voiceUiStates.no_speech.message }
  }

  if (cleanType === 'network_error' || cleanRecognitionError === 'network') {
    return { state: 'network_error', message: voiceUiStates.network_error.message }
  }

  if (cleanType === 'aborted' || cleanRecognitionError === 'aborted') {
    return {
      state: 'ready',
      message: 'Voice entry stopped. You can retry whenever it feels easy.',
    }
  }

  return {
    state: 'manual_fallback',
    message: 'Voice entry is not available here. Manual expense fields are ready.',
  }
}

function trackVoiceEvent(action, payload = {}) {
  trackEvent(action, {
    surface: 'voice_expense',
    provider: 'webSpeech',
    ...payload,
  })
}

function trackCategoryLearningEvent(action, payload = {}) {
  trackEvent(action, {
    surface: 'category_learning',
    ...payload,
  })
}

function buildQuickExpenseChips(expenses, voiceMemory) {
  const memory = expenses.reduce((map, expense) => {
    const label = expense.category
    const current = map.get(label) || { label, category: label, count: 0, amount: 0 }
    map.set(label, {
      label,
      category: current.category || label,
      count: current.count + 1,
      amount: normalizeMoney(expense.amount || current.amount),
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
      amount: normalizeMoney(item.amount || current.amount),
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
  const protectedAmount = normalizeMoney(state.reserveTarget)
  const comfortablyUsable = normalizeMoney(state.safeToSpend ?? state.breathingRoom)
  const flexibilityLevel =
    state.pressureTone === 'comfortable' ? 'Open' : state.pressureTone === 'balanced' ? 'Steady' : 'Careful'

  return {
    amount: comfortablyUsable,
    comfortablyUsable,
    protectedAmount,
    monthlyRemaining: comfortablyUsable,
    remainingFlexibility: normalizeMoney(state.flexibility),
    pressure: state.pressure,
    flexibilityLevel,
  }
}

function buildCalmSummaries(expenses, state, buckets) {
  const spending = aggregateExpenses(expenses)
  const foodTotal = getCategoryTotal(spending, 'Food') + getCategoryTotal(spending, 'Grocery')
  const shoppingTotal = getCategoryTotal(spending, 'Shopping')
  const bucketProgress = sumMoney(buckets, (bucket) => bucket.saved)

  if (spending.count === 0) {
    return [
      'Current spending history is still limited, so summaries will stay simple for now.',
      'Add a few expenses to make food, travel, and shopping patterns clearer.',
      bucketProgress > 0
        ? 'Savings goals are slowly building a clearer cushion.'
        : 'Starting one small savings goal can make future plans feel easier.',
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
      ? 'Savings goals are slowly building a clearer cushion.'
      : 'Starting one small savings goal can make future plans feel easier.',
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
    state.safeToSpend > 0
      ? 'You still have safe spending room after safety savings.'
      : 'Safe spending room is close, so lighter choices may feel better.',
  ]
}

function buildEmergencyCushion(buckets, state) {
  const emergencyBucket = buckets.find((bucket) => bucket.name.toLowerCase().includes('emergency'))
  const saved = normalizeMoney(emergencyBucket?.saved)
  const dailyNeed = Math.max(normalizeMoney(state.committed) / 30, 1)
  const days = Math.round(saved / dailyNeed)
  const label =
    days >= 45 ? 'Emergency stability looks steady.' : days >= 15 ? 'Emergency stability is forming.' : 'Emergency cushion is still early.'

  return {
    saved,
    days,
    label,
  }
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
  const [recurringSchedules, setRecurringSchedules] = useState(() =>
    hasCompletedSetup ? normalizeRecurringSchedules(readStoredJson('fbply-recurring-schedules', [])) : [],
  )
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
  const [voiceDrafts, setVoiceDrafts] = useState([])
  const [voiceState, setVoiceState] = useState('ready')
  const [voiceStatus, setVoiceStatus] = useState(voiceUiStates.ready.message)
  const [voiceTranscriptDraft, setVoiceTranscriptDraft] = useState('')
  const [voiceTranscriptOptions, setVoiceTranscriptOptions] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [voiceMemory, setVoiceMemory] = useState(() => readStoredJson('fbply-voice-memory', {}))
  const [lastVoiceSave, setLastVoiceSave] = useState(null)
  const [addSheetMode, setAddSheetMode] = useState(null)
  const [plannerInput, setPlannerInput] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('Car')
  const [plannerTargetAmount, setPlannerTargetAmount] = useState('')
  const [plannerCurrentSavings, setPlannerCurrentSavings] = useState('')
  const [plannerTimeline, setPlannerTimeline] = useState('6m')
  const lowEnergyMode = false
  const [walkthroughStep, setWalkthroughStep] = useState(() =>
    safeStorageGet('fbply-walkthrough-complete', 'false') === 'true' ? -1 : 0,
  )
  const [authMessage, setAuthMessage] = useState('')
  const [authUser, setAuthUser] = useState(null)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isSessionChecking, setIsSessionChecking] = useState(() => isSupabaseReady)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportingReportType, setExportingReportType] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [exportUnlockUntil, setExportUnlockUntil] = useState(() => Number(safeStorageGet('fbply-export-unlock-until', '0')))
  const [rewardedExport, setRewardedExport] = useState({ open: false, status: 'idle', progress: 0 })
  const [pendingReportRequest, setPendingReportRequest] = useState(null)
  const [reportExportPrompt, setReportExportPrompt] = useState(null)
  const [reportTemplate, setReportTemplate] = useState('standard')
  const [reportHistory, setReportHistory] = useState(() => normalizeReportHistory(readStoredJson('fbply-report-history', [])))
  const recognitionRef = useRef(null)
  const voiceSessionRef = useRef(null)
  const rewardTimerRef = useRef(null)
  const isOnline = useOnlineStatus()
  const activeCurrency = normalizeCurrency(profile.currency)
  const normalizedCurrentPath = normalizeSeoPath(currentPath)
  const isPublicSeoPage = isPublicSeoRoute(normalizedCurrentPath)
  setActiveCurrency(activeCurrency)

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname || '/')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    applySeoMetadata(normalizedCurrentPath, legalPages[normalizedCurrentPath])
  }, [normalizedCurrentPath])

  useEffect(() => {
    if (isPublicSeoPage || phase !== 'splash') {
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
  }, [hasCompletedSetup, hasSeenOnboarding, isPublicSeoPage, phase])

  useEffect(() => {
    const platform = typeof window !== 'undefined' ? window.Capacitor?.getPlatform?.() : ''
    document.documentElement.dataset.platform = platform || 'web'
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase, activeTab, currentPath])

  useEffect(() => {
    document.documentElement.dataset.currency = activeCurrency
  }, [activeCurrency])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSet('fbply-low-energy', 'false')
    safeStorageSet('fbply-haptics', 'false')
    safeStorageSet('fbply-touch-sounds', 'false')
    document.documentElement.dataset.energy = 'full'
  }, [isPublicSeoPage])

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
    if (isPublicSeoPage) {
      return
    }

    safeStorageSet('fbply-onboarding-complete', String(hasSeenOnboarding))
  }, [hasSeenOnboarding, isPublicSeoPage])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSet('fbply-setup-complete', String(hasCompletedSetup))
  }, [hasCompletedSetup, isPublicSeoPage])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-profile', JSON.stringify(profile))
  }, [isPublicSeoPage, profile])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-expenses', JSON.stringify(expenses))
  }, [expenses, isPublicSeoPage])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-savings-buckets', JSON.stringify(savingsBuckets))
  }, [isPublicSeoPage, savingsBuckets])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-recurring-schedules', JSON.stringify(recurringSchedules))
  }, [isPublicSeoPage, recurringSchedules])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-shared-groups', JSON.stringify(sharedGroups))
  }, [isPublicSeoPage, sharedGroups])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-money-book', JSON.stringify(moneyBookEntries))
  }, [isPublicSeoPage, moneyBookEntries])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-voice-memory', JSON.stringify(voiceMemory))
  }, [isPublicSeoPage, voiceMemory])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSet('fbply-export-unlock-until', String(exportUnlockUntil))
  }, [exportUnlockUntil, isPublicSeoPage])

  useEffect(() => {
    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-report-history', JSON.stringify(reportHistory))
  }, [isPublicSeoPage, reportHistory])

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
    if (isPublicSeoPage || !isSupabaseReady) {
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
  }, [applyAuthUser, hasCompletedSetup, isPublicSeoPage])

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
  const setCustomExpenseNameSmart = useCallback((value) => {
    const nextValue = String(value || '')
    setCustomExpenseName(nextValue)

    const suggestion = suggestExpenseCategoryForLabel(nextValue, voiceMemory)

    if (!suggestion?.category || suggestion.category === selectedCategory) {
      return
    }

    if (['', 'Food', 'Other', 'Custom'].includes(selectedCategory)) {
      setSelectedCategory(suggestion.category)

      if (suggestion.source === 'learned_merchant') {
        trackCategoryLearningEvent('merchant_memory_usage', {
          confidence: suggestion.confidence || 'medium',
          category: suggestion.category,
        })
      } else if (suggestion.source === 'known_merchant') {
        trackCategoryLearningEvent('merchant_auto_match', {
          confidence: suggestion.confidence || 'high',
          category: suggestion.category,
        })
      }

      trackCategoryLearningEvent('merchant_confidence_level', {
        confidence: suggestion.confidence || 'medium',
        source_type: suggestion.source || 'unknown',
      })
    }
  }, [selectedCategory, voiceMemory])
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
  const financialCalendarEvents = useMemo(
    () => buildFinancialCalendarEvents({
      profile,
      recurringSchedules,
      savingsBuckets,
      sharedSummary,
      moneyBookSummary: financialActivity.moneyBookSummary,
      days: 35,
    }),
    [financialActivity.moneyBookSummary, profile, recurringSchedules, savingsBuckets, sharedSummary],
  )
  const moneyReminders = useMemo(
    () => buildMoneyReminders(financialCalendarEvents),
    [financialCalendarEvents],
  )
  const upcomingMoney = useMemo(
    () => buildUpcomingMoney(financialCalendarEvents),
    [financialCalendarEvents],
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
    const authMode = mode === 'signup' ? 'signup' : 'login'

    setAuthMessage('')
    trackEvent('auth_submit', {
      surface: 'auth',
      auth_mode: authMode,
      setup_completed: hasCompletedSetup,
    })

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthMessage('Add a valid email address to continue.')
      trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: 'invalid_email' })
      return
    }

    if (!password || password.length < 6) {
      setAuthMessage('Use a password with at least 6 characters.')
      trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: 'short_password' })
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
      trackEvent(authMode === 'signup' ? 'signup_success' : 'login_success', {
        surface: 'auth',
        auth_mode: authMode,
        auth_provider: 'local',
        setup_completed: hasCompletedSetup,
      })
      setPhase(hasCompletedSetup ? 'app' : 'setup')
      return
    }

    setIsAuthBusy(true)

    try {
      if (authMode === 'signup') {
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
          trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: 'signup_error' })
          return
        }

        if (data.session?.user) {
          applyAuthUser(data.session.user)
          trackEvent('signup_success', {
            surface: 'auth',
            auth_mode: authMode,
            auth_provider: 'supabase',
            session_created: true,
            setup_completed: hasCompletedSetup,
          })
          setPhase(hasCompletedSetup ? 'app' : 'setup')
          return
        }

        setAuthMessage('Account created. Please confirm your email, then log in.')
        trackEvent('signup_success', {
          surface: 'auth',
          auth_mode: authMode,
          auth_provider: 'supabase',
          confirmation_required: true,
          setup_completed: hasCompletedSetup,
        })
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        setAuthMessage(error.message || 'Login could not finish. Please try again.')
        trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: 'login_error' })
        return
      }

      applyAuthUser(data.user)
      trackEvent('login_success', {
        surface: 'auth',
        auth_mode: authMode,
        auth_provider: 'supabase',
        setup_completed: hasCompletedSetup,
      })
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
    setProfile((current) => {
      const commitments = normalizeMonthlyBillsForEdit(current).map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              amount: Object.hasOwn(patch, 'amount') ? normalizeMoney(patch.amount) : item.amount,
            }
          : item,
      )

      return { ...current, commitments }
    })
  }, [])

  const addCommitment = useCallback(() => {
    setProfile((current) => ({
      ...current,
      commitments: [...normalizeMonthlyBillsForEdit(current), createCommitment('New bill', 0)],
    }))
  }, [])

  const removeCommitment = useCallback((id) => {
    setProfile((current) => ({
      ...current,
      commitments: normalizeMonthlyBillsForEdit(current).filter((item) => item.id !== id),
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

  const saveExpenseRecord = useCallback(({ label, category, amount, note = '', type = expenseMode, source = 'manual', date = todayDateKey() }) => {
    const parsedAmount = normalizeMoney(amount)
    const categoryName = String(category || '').trim()
    const labelName = String(label || categoryName || '').trim()
    const dateKey = normalizeDateKey(date)
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
      date: dateKey,
      createdAt: new Date().toISOString(),
      source,
    }

    setExpenseFieldErrors({})
    setExpenses((current) => [newExpense, ...current])
    trackFeatureUsage('expense_saved', {
      expense_type: type,
      source,
      surface: 'quick_add',
    })

    if (expenses.length === 0) {
      trackActivation('first_expense', {
        expense_type: type,
        source,
      })
    }

    return newExpense
  }, [expenseMode, expenses.length])

  const addExpense = useCallback((event) => {
    event.preventDefault()
    const trimmedCustomName = customExpenseName.trim()
    const merchantSuggestion = suggestExpenseCategoryForLabel(trimmedCustomName, voiceMemory)

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

    if (trimmedCustomName && categoryName) {
      if (merchantSuggestion?.source === 'known_merchant') {
        trackCategoryLearningEvent('merchant_auto_match', {
          category: merchantSuggestion.category,
          confidence: merchantSuggestion.confidence || 'high',
          source_type: 'manual',
        })
      }

      if (merchantSuggestion?.source === 'learned_merchant') {
        trackCategoryLearningEvent('merchant_memory_usage', {
          category: merchantSuggestion.category,
          confidence: merchantSuggestion.confidence || 'high',
          source_type: 'manual',
        })
      }

      setVoiceMemory((current) => learnVoiceExpense(current, {
        label: trimmedCustomName,
        merchant: merchantSuggestion?.merchant || trimmedCustomName,
        category: categoryName,
        amount: expenseAmount,
        learningSource: 'manual',
      }, { learningSource: 'manual' }))
      trackCategoryLearningEvent('merchant_learned', {
        category: categoryName,
        confidence: 'high',
        source_type: 'manual',
      })

      if (merchantSuggestion?.category && merchantSuggestion.category !== categoryName) {
        trackCategoryLearningEvent('merchant_correction', {
          original_category: merchantSuggestion.category,
          category: categoryName,
          confidence: 'high',
        })
      }
    }

    return saved
  }, [customExpenseName, expenseAmount, expenseMode, expenseNote, saveExpenseRecord, selectedCategory, voiceMemory])

  const saveVoiceDrafts = useCallback((drafts) => {
    const validDrafts = (Array.isArray(drafts) ? drafts : [drafts]).filter(Boolean)

    if (validDrafts.length === 0) {
      return false
    }

    const savedEntries = validDrafts
      .map((draft) => {
        const label = String(draft.label || draft.category || '').trim()
        return saveExpenseRecord({
          label,
          category: draft.category,
          amount: draft.amount,
          note: label ? `${label} - Voice: ${draft.transcript}` : `Voice entry: ${draft.transcript}`,
          type: draft.type || 'daily',
          source: 'voice',
          date: draft.date,
        })
      })
      .filter(Boolean)

    if (savedEntries.length === 0) {
      return false
    }

    setVoiceMemory((current) => validDrafts.reduce((memory, draft) => learnVoiceExpense(memory, draft, {
      learningSource: draft.learningSource || 'voice',
    }), current))
    validDrafts.forEach((draft) => {
      if (draft.merchant || draft.label) {
        trackCategoryLearningEvent('merchant_learned', {
          category: draft.category || 'Other',
          confidence: draft.confidence || 'medium',
          source_type: draft.learningSource || 'voice',
        })
      }

      if (draft.learningSource === 'correction') {
        trackCategoryLearningEvent('merchant_correction', {
          category: draft.category || 'Other',
          confidence: 'high',
        })
      }
    })
    setLastVoiceSave({
      expense: savedEntries[0],
      expenses: savedEntries,
      draft: validDrafts[0],
      drafts: validDrafts,
    })
    setVoiceDraft(null)
    setVoiceDrafts([])
    setVoiceTranscriptDraft('')
    setVoiceTranscriptOptions([])
    setVoiceState('ready')
    setVoiceStatus(
      savedEntries.length > 1
        ? `Saved ${savedEntries.length} voice entries. You can add another whenever you are ready.`
        : 'Saved. You can add another whenever you are ready.',
    )
    return savedEntries
  }, [saveExpenseRecord])

  const confirmVoiceExpense = useCallback(() => {
    saveVoiceDrafts(voiceDrafts.length > 0 ? voiceDrafts : voiceDraft)
  }, [saveVoiceDrafts, voiceDraft, voiceDrafts])

  const updateVoiceDraft = useCallback((patch) => {
    setVoiceDraft((current) => {
      if (!current) {
        return current
      }

      const categoryChanged = Object.hasOwn(patch || {}, 'category') && patch.category !== current.category
      return {
        ...current,
        ...patch,
        ...(categoryChanged ? {
          learningSource: 'correction',
          categoryReason: 'Learned Merchant',
          categoryConfidence: 'high',
          confidence: 'high',
        } : {}),
      }
    })
    setVoiceDrafts((current) => {
      if (current.length === 0) {
        return current
      }

      return current.map((draft, index) => {
        const categoryChanged = index === 0 && Object.hasOwn(patch || {}, 'category') && patch.category !== draft.category
        return index === 0
          ? {
              ...draft,
              ...patch,
              ...(categoryChanged ? {
                learningSource: 'correction',
                categoryReason: 'Learned Merchant',
                categoryConfidence: 'high',
                confidence: 'high',
              } : {}),
            }
          : draft
      })
    })
    trackVoiceEvent('parser_correction', {
      corrected_field: Object.keys(patch || {}).join(',') || 'unknown',
    })
    if (Object.hasOwn(patch || {}, 'category')) {
      trackCategoryLearningEvent('merchant_correction', {
        category: patch.category || 'Other',
        confidence: 'high',
      })
    }
  }, [])

  const updateVoiceDraftAt = useCallback((index, patch) => {
    const nextDrafts = voiceDrafts.map((draft, draftIndex) => {
      const categoryChanged = draftIndex === index && Object.hasOwn(patch || {}, 'category') && patch.category !== draft.category
      return draftIndex === index
        ? {
            ...draft,
            ...patch,
            ...(categoryChanged ? {
              learningSource: 'correction',
              categoryReason: 'Learned Merchant',
              categoryConfidence: 'high',
              confidence: 'high',
            } : {}),
          }
        : draft
    })
    setVoiceDrafts(nextDrafts)
    setVoiceDraft(nextDrafts[0] || null)
    trackVoiceEvent('parser_correction', {
      corrected_field: Object.keys(patch || {}).join(',') || 'unknown',
    })
    if (Object.hasOwn(patch || {}, 'category')) {
      trackCategoryLearningEvent('merchant_correction', {
        category: patch.category || 'Other',
        confidence: 'high',
      })
    }
  }, [voiceDrafts])

  const removeVoiceDraftAt = useCallback((index) => {
    const nextDrafts = voiceDrafts.filter((_, draftIndex) => draftIndex !== index)
    setVoiceDrafts(nextDrafts)
    setVoiceDraft(nextDrafts[0] || null)
    trackVoiceEvent('parser_correction', { corrected_field: 'remove_entry' })
  }, [voiceDrafts])

  const reviewVoiceTranscript = useCallback(() => {
    const transcript = String(voiceTranscriptDraft || '').trim()

    if (!transcript) {
      setVoiceDraft(null)
      setVoiceDrafts([])
      setVoiceState('no_speech')
      setVoiceStatus(voiceUiStates.no_speech.message)
      trackVoiceEvent('voice_failure', { reason: 'empty_transcript' })
      trackVoiceEvent('parser_failure', { reason: 'empty_transcript' })
      trackVoiceEvent('voice_no_speech', { reason: 'empty_transcript' })
      return null
    }

    setVoiceState('processing')
    setVoiceStatus('Processing transcript.')

    const parsedDrafts = pickVoiceDrafts([transcript], voiceMemory)

    if (parsedDrafts.length === 0) {
      setVoiceDraft(null)
      setVoiceDrafts([])
      setVoiceState('manual_fallback')
      setVoiceStatus('Transcript found, but amount or purpose was unclear. Edit the transcript or add manually.')
      trackVoiceEvent('voice_failure', { reason: 'parse_no_match' })
      trackVoiceEvent('parser_failure', { reason: 'parse_no_match' })
      return null
    }

    setVoiceDraft(parsedDrafts[0])
    setVoiceDrafts(parsedDrafts)
    setVoiceState('transcript_found')
    setVoiceStatus(
      parsedDrafts.length > 1
        ? `${parsedDrafts.length} entries detected. Review each one before saving.`
        : parsedDrafts[0].confidence === 'high'
          ? 'Looks clear. Save when it feels right.'
          : 'Check the amount and category once before saving.',
    )

    trackVoiceEvent('parser_success', {
      entry_count: parsedDrafts.length,
    })

    if (parsedDrafts.length > 1) {
      trackVoiceEvent('parser_multi_entry_detected', { entry_count: parsedDrafts.length })
    }

    if (parsedDrafts.some((draft) => draft.type === 'income')) {
      trackVoiceEvent('parser_income_detected', { entry_count: parsedDrafts.length })
    }

    if (parsedDrafts.some((draft) => draft.confidence === 'low')) {
      trackVoiceEvent('parser_low_confidence', { entry_count: parsedDrafts.length })
    }

    parsedDrafts.forEach((draft) => {
      if (draft.source === 'known_merchant') {
        trackCategoryLearningEvent('merchant_auto_match', {
          category: draft.category || 'Other',
          confidence: draft.confidence || 'high',
        })
      }

      if (draft.source === 'learned_merchant') {
        trackCategoryLearningEvent('merchant_memory_usage', {
          category: draft.category || 'Other',
          confidence: draft.confidence || 'high',
        })
      }

      if (draft.source === 'known_merchant' || draft.source === 'learned_merchant') {
        trackCategoryLearningEvent('merchant_confidence_level', {
          confidence: draft.confidence || 'medium',
          source_type: draft.source,
        })
      }
    })

    return parsedDrafts
  }, [voiceMemory, voiceTranscriptDraft])

  const clearVoiceDraft = useCallback(() => {
    setVoiceDraft(null)
    setVoiceDrafts([])
    setVoiceTranscriptDraft('')
    setVoiceTranscriptOptions([])
    setVoiceState('ready')
    setVoiceStatus('Voice draft cleared. You can try again or add it manually.')
  }, [])

  const useVoiceManualFallback = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop?.()
      recognitionRef.current = null
    }

    if (voiceSessionRef.current) {
      voiceSessionRef.current = { ...voiceSessionRef.current, userStopped: true }
    }

    setIsListening(false)
    setVoiceDraft(null)
    setVoiceDrafts([])
    setVoiceTranscriptDraft('')
    setVoiceTranscriptOptions([])
    setVoiceState('manual_fallback')
    setVoiceStatus(voiceUiStates.manual_fallback.message)
    trackVoiceEvent('voice_manual_fallback_used')
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
    setVoiceDrafts([])
    setVoiceTranscriptDraft('')
    setVoiceTranscriptOptions([])
    setVoiceState('manual_fallback')
    setVoiceStatus('Moved to the form. Adjust anything and save when it looks right.')
    trackVoiceEvent('voice_manual_fallback_used', { reason: 'edit_voice_draft' })
  }, [voiceDraft])

  const undoVoiceSave = useCallback(() => {
    if (!lastVoiceSave?.expense?.id) {
      return
    }

    const savedIds = new Set((lastVoiceSave.expenses || [lastVoiceSave.expense]).map((expense) => expense?.id).filter(Boolean))
    const restoredDrafts = lastVoiceSave.drafts || (lastVoiceSave.draft ? [lastVoiceSave.draft] : [])
    setExpenses((current) => current.filter((expense) => !savedIds.has(expense.id)))
    setVoiceDraft(restoredDrafts[0] || null)
    setVoiceDrafts(restoredDrafts)
    setVoiceTranscriptDraft(restoredDrafts[0]?.fullTranscript || restoredDrafts[0]?.transcript || '')
    setVoiceTranscriptOptions(restoredDrafts[0]?.fullTranscript ? [restoredDrafts[0].fullTranscript] : restoredDrafts[0]?.transcript ? [restoredDrafts[0].transcript] : [])
    setVoiceState('transcript_found')
    setVoiceStatus('Last voice save undone. You can edit it before saving again.')
    setLastVoiceSave(null)
  }, [lastVoiceSave])

  const addSharedGroup = useCallback((group) => {
    const ownerName = String(group.ownerName || '').trim()
    const effectiveProfile = ownerName ? { ...profile, name: ownerName } : profile
    const members = uniqueSharedPeople([
      resolveCurrentUserName(effectiveProfile),
      ...(group.people || []),
    ])
    const groupName = String(group.name || '').trim()

    if (!groupName || members.length < 2) {
      return false
    }

    if (ownerName && normalizePersonName(ownerName) !== normalizePersonName(profile.name)) {
      setProfile((current) => ({ ...current, name: ownerName }))
    }

    setSharedGroups((current) => [
      createSharedGroup({
        name: groupName,
        people: members,
        profile: effectiveProfile,
        purpose: group.purpose,
      }),
      ...current,
    ])
    trackFeatureUsage('trip_created', {
      surface: 'shared_expenses',
      member_count: members.length,
    })

    if (sharedGroups.length === 0) {
      trackActivation('first_trip', {
        member_count: members.length,
      })
    }

    return true
  }, [profile, sharedGroups.length])

  const addSharedPayment = useCallback((groupId, payment) => {
    const label = String(payment.label || '').trim()
    const paidBy = String(payment.paidBy || '').trim()
    const amount = normalizeMoney(payment.amount)
    const participants = uniqueSharedPeople(payment.participants || [])

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
                  participants,
                }),
                ...(group.payments || []),
              ],
            }
          : group,
      ),
    )
    trackFeatureUsage('shared_payment_added', {
      surface: 'shared_expenses',
      participant_count: participants.length,
    })
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

        const status = settlement.direction === 'incoming' ? 'received' : 'paid'
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
    trackFeatureUsage('borrow_lend_saved', {
      surface: 'money_book',
      entry_kind: saved.kind,
      is_edit: Boolean(entry?.id),
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

  const addRecurringSchedule = useCallback((schedule) => {
    setRecurringSchedules((current) => [createRecurringSchedule(schedule), ...current])
  }, [])

  const updateRecurringSchedule = useCallback((id, patch) => {
    setRecurringSchedules((current) =>
      normalizeRecurringSchedules(
        current.map((schedule) => (schedule.id === id ? { ...schedule, ...patch } : schedule)),
      ),
    )
  }, [])

  const removeRecurringSchedule = useCallback((id) => {
    setRecurringSchedules((current) => current.filter((schedule) => schedule.id !== id))
  }, [])

  const toggleRecurringSchedule = useCallback((id) => {
    setRecurringSchedules((current) =>
      current.map((schedule) => (schedule.id === id ? { ...schedule, paused: !schedule.paused } : schedule)),
    )
  }, [])

  const addSavingsBucket = useCallback(() => {
    setSavingsBuckets((current) => [createBucket('New goal', 0, 10000), ...current])
    trackFeatureUsage('goal_created', {
      surface: 'goals',
      source: 'manual',
    })

    if (savingsBuckets.length === 0) {
      trackActivation('first_goal', {
        source: 'manual',
      })
    }
  }, [savingsBuckets.length])

  const createSetupSavingsGoal = useCallback((goal) => {
    const name = String(goal?.name || '').trim()
    const target = normalizeMoney(goal?.target)

    if (!name || target <= 0) {
      return
    }

    setSavingsBuckets((current) => [
      {
        ...createBucket(name, 0, target),
        deadline: String(goal?.deadline || '').slice(0, 10),
      },
      ...current,
    ])
    trackFeatureUsage('goal_created', {
      surface: 'setup',
      source: 'setup',
    })

    if (savingsBuckets.length === 0) {
      trackActivation('first_goal', {
        source: 'setup',
      })
    }
  }, [savingsBuckets.length])

  const openAddSheet = useCallback((mode = 'menu') => {
    setAddSheetMode(mode)
    trackFeatureUsage('quick_add_opened', {
      surface: 'app_chrome',
      mode,
    })
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

  const handleVoiceFailure = useCallback((failure, sessionId = voiceSessionRef.current?.id) => {
    const session = voiceSessionRef.current?.id === sessionId ? voiceSessionRef.current : null

    if (session) {
      voiceSessionRef.current = { ...session, hasError: true }
    }

    if (failure?.type === 'aborted' && session?.userStopped) {
      return
    }

    const ui = getVoiceFailureUi(failure?.type, failure?.recognitionError)
    const reason = failure?.recognitionError || failure?.type || 'unknown'

    setIsListening(false)
    setVoiceDraft(null)
    setVoiceDrafts([])
    setVoiceState(ui.state)
    setVoiceStatus(ui.message)

    trackVoiceEvent('voice_failure', {
      reason,
      state: ui.state,
    })

    if (ui.state === 'permission_required') {
      trackVoiceEvent('voice_permission_denied', { reason })
    }

    if (ui.state === 'no_speech') {
      trackVoiceEvent('voice_no_speech', { reason })
    }

    if (ui.state === 'network_error') {
      trackVoiceEvent('voice_network_error', { reason })
    }
  }, [])

  const handleVoiceTranscripts = useCallback((transcripts, sessionId = voiceSessionRef.current?.id) => {
    const uniqueTranscripts = Array.from(new Set((transcripts || []).map((item) => String(item || '').trim()).filter(Boolean)))

    if (uniqueTranscripts.length === 0) {
      handleVoiceFailure({ type: 'no_speech', recognitionError: 'no-speech' }, sessionId)
      return
    }

    const session = voiceSessionRef.current?.id === sessionId ? voiceSessionRef.current : null

    if (session) {
      voiceSessionRef.current = { ...session, hasResult: true }
    }

    setIsListening(false)
    setVoiceDraft(null)
    setVoiceDrafts([])
    setVoiceTranscriptOptions(uniqueTranscripts)
    setVoiceTranscriptDraft(uniqueTranscripts[0])
    setVoiceState('transcript_found')
    setVoiceStatus(voiceUiStates.transcript_found.message)
    trackVoiceEvent('voice_success', {
      stage: 'transcript_found',
      transcript_count: uniqueTranscripts.length,
    })
  }, [handleVoiceFailure])

  const startVoiceExpense = useCallback(async () => {
    if (isListening || voiceState === 'processing') {
      return
    }

    if (typeof window === 'undefined') {
      handleVoiceFailure({ type: 'unsupported' })
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop?.()
      recognitionRef.current = null
    }

    const session = {
      id: `${Date.now()}-${Math.random()}`,
      hasResult: false,
      hasError: false,
      userStopped: false,
    }
    voiceSessionRef.current = session

    setIsListening(false)
    setVoiceDraft(null)
    setVoiceDrafts([])
    setVoiceTranscriptDraft('')
    setVoiceTranscriptOptions([])
    setVoiceState('processing')
    setVoiceStatus(voiceUiStates.processing.message)
    trackVoiceEvent('voice_start')

    let providerModule

    try {
      providerModule = await import('./lib/voiceInputProviders.js')
    } catch {
      handleVoiceFailure({ type: 'unsupported' }, session.id)
      return
    }

    if (voiceSessionRef.current?.id !== session.id || voiceSessionRef.current?.userStopped) {
      return
    }

    const provider = providerModule.createVoiceInputProvider({
      providerName: providerModule.VOICE_PROVIDER_NAMES.WEB_SPEECH,
      windowRef: window,
      navigatorRef: navigator,
    })
    recognitionRef.current = provider

    const result = await provider.start({
      lang: getSpeechRecognitionLocale(),
      interimResults: false,
      maxAlternatives: 5,
      onReady: () => {
        setVoiceState('processing')
        setVoiceStatus('Microphone ready. Starting listener.')
      },
      onStart: () => {
        setIsListening(true)
        setVoiceState('listening')
        setVoiceStatus(voiceUiStates.listening.message)
      },
      onResult: (payload) => {
        handleVoiceTranscripts(payload?.transcripts, session.id)
      },
      onError: (failure) => {
        handleVoiceFailure(failure, session.id)
      },
      onEnd: () => {
        if (recognitionRef.current === provider) {
          recognitionRef.current = null
        }

        setIsListening(false)

        const activeSession = voiceSessionRef.current?.id === session.id ? voiceSessionRef.current : null

        if (activeSession && !activeSession.userStopped && !activeSession.hasResult && !activeSession.hasError) {
          handleVoiceFailure({ type: 'no_speech', recognitionError: 'no-speech' }, session.id)
        }
      },
    })

    const activeSession = voiceSessionRef.current?.id === session.id ? voiceSessionRef.current : null

    if (!result?.ok && !activeSession?.hasError) {
      handleVoiceFailure(result, session.id)
    }
  }, [handleVoiceFailure, handleVoiceTranscripts, isListening, voiceState])

  const stopVoiceExpense = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop?.()
      recognitionRef.current = null
    }

    if (voiceSessionRef.current) {
      voiceSessionRef.current = { ...voiceSessionRef.current, userStopped: true }
    }

    setIsListening(false)
    setVoiceState('ready')
    setVoiceStatus('Voice entry stopped. You can retry whenever it feels easy.')
  }, [])

  const buildReportRequest = useCallback((type = 'monthly', overrides = {}) => {
    const generatedAt = new Date().toISOString()
    const period = overrides.period || selectedMonthKey
    const reportId = overrides.reportId || createReportId(type, period)
    const currency = normalizeCurrency(profile.currency)
    const reportMeta = {
      reportId,
      template: overrides.template || reportTemplate,
      generatedAt,
      currency,
      period,
      accuracy: overrides.accuracy,
      userOverrides: overrides.userOverrides || 0,
    }
    const reconciledGroups = sharedGroups.map((group) => reconcileSharedGroup(group, profile))

    if (type === 'trip') {
      return {
        type,
        reportId,
        payload: {
          reportMeta,
          profile,
          groups: reconciledGroups.filter((group) => group.amount > 0 || group.settlements?.length > 0),
        },
      }
    }

    if (type === 'settlement') {
      return {
        type,
        reportId,
        payload: {
          reportMeta,
          profile,
          groups: reconciledGroups.filter((group) => group.settlements?.length > 0),
        },
      }
    }

    if (type === 'statement') {
      return {
        type,
        reportId,
        payload: {
          reportMeta: {
            ...reportMeta,
            period: overrides.statementReport?.dateRange || period,
            accuracy: overrides.accuracy,
            userOverrides: overrides.userOverrides || 0,
          },
          profile,
          statementReport: overrides.statementReport || {},
          transactions: overrides.transactions || [],
        },
      }
    }

    return {
      type: 'monthly',
      reportId,
      payload: {
        reportMeta,
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
      },
    }
  }, [
    insights,
    moneyBookSummary,
    profile,
    recommendation,
    reportTemplate,
    savingsBuckets,
    selectedAdvancedReport,
    selectedExpenseBreakdown,
    selectedFinancialEntries,
    selectedFinancialState,
    selectedMonthKey,
    selectedSharedSummary,
    sharedGroups,
  ])

  const downloadReportRequest = useCallback(async (request, { saveHistory = true } = {}) => {
    if (isExportingPdf) {
      return
    }

    setPdfError('')
    setIsExportingPdf(true)
    let activeRequest = null

    try {
      activeRequest = request || buildReportRequest('monthly')
      setExportingReportType(activeRequest.type || 'monthly')
      const reportId = activeRequest.reportId || activeRequest.payload?.reportMeta?.reportId || createReportId(activeRequest.type)
      const { isNativeMobileApp, sharePdfBlob } = await import('./lib/nativeFileShare')
      const { createReportPdfBlob } = await import('./lib/reportPdf')
      const blob = await createReportPdfBlob(activeRequest)
      const filename = `${reportId}.pdf`
      const reportType = activeRequest.type || 'monthly'

      trackEvent('report_generated', {
        surface: 'reports',
        report_type: reportType,
        template: activeRequest.payload?.reportMeta?.template || reportTemplate,
        save_history: saveHistory,
      })

      if (saveHistory && reportHistory.length === 0) {
        trackActivation('first_report_generation', {
          report_type: reportType,
        })
      }

      if (isNativeMobileApp()) {
        await sharePdfBlob(blob, filename)
        trackEvent('report_shared', {
          surface: 'reports',
          report_type: reportType,
          export_type: 'pdf',
        })
      } else {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.click()
        URL.revokeObjectURL(url)
      }

      trackEvent('report_exported', {
        surface: 'reports',
        report_type: reportType,
        export_type: 'pdf',
        save_history: saveHistory,
      })

      if (saveHistory) {
        setReportHistory((current) => normalizeReportHistory([
          createReportHistoryEntry({
            type: activeRequest.type,
            template: activeRequest.payload?.reportMeta?.template || reportTemplate,
            profile,
            period: activeRequest.payload?.reportMeta?.period || selectedMonthKey,
            currency: activeRequest.payload?.reportMeta?.currency || profile.currency,
            reportId,
            payload: activeRequest.payload,
          }),
          ...current,
        ]))
      }
    } catch {
      trackEvent('report_export_failed', {
        surface: 'reports',
        report_type: activeRequest?.type || 'monthly',
      })
      setPdfError('The report could not be prepared. Please try again in a moment.')
    } finally {
      setIsExportingPdf(false)
      setExportingReportType('')
    }
  }, [buildReportRequest, isExportingPdf, profile, reportHistory.length, reportTemplate, selectedMonthKey])

  const requestReportExport = useCallback((type = 'monthly', overrides = {}) => {
    if (isExportingPdf) {
      return
    }

    setPdfError('')
    const reportRequest = buildReportRequest(type, overrides)
    const prompt = buildReportExportPrompt(type, reportRequest, sharedGroups)
    trackEvent('report_export_requested', {
      surface: 'reports',
      report_type: reportRequest.type || type,
      template: reportRequest.payload?.reportMeta?.template || reportTemplate,
      has_prompt: Boolean(prompt),
    })

    if (prompt) {
      setPendingReportRequest(null)
      setReportExportPrompt(prompt)
      trackEvent('export_blocked', {
        surface: 'reports',
        report_type: reportRequest.type || type,
        reason: prompt.targetId || 'missing_data',
      })
      return
    }

    setReportExportPrompt(null)
    setPendingReportRequest(reportRequest)
    setRewardedExport({ open: true, status: 'ready', progress: 0 })
  }, [buildReportRequest, isExportingPdf, reportTemplate, sharedGroups])

  const redownloadReport = useCallback((entry) => {
    if (!entry?.payload) {
      return
    }

    trackEvent('report_reopened', {
      surface: 'reports',
      report_type: entry.type,
      template: entry.template,
    })
    downloadReportRequest({
      type: entry.type,
      reportId: entry.reportId,
      payload: entry.payload,
    }, { saveHistory: false })
  }, [downloadReportRequest])

  const deleteReportHistoryEntry = useCallback((id) => {
    setReportHistory((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const closeRewardedExport = useCallback(() => {
    if (rewardTimerRef.current) {
      window.clearInterval(rewardTimerRef.current)
      rewardTimerRef.current = null
    }

    if (pendingReportRequest && rewardedExport.status !== 'unlocked') {
      trackEvent('export_abandoned', {
        surface: 'reports',
        report_type: pendingReportRequest.type,
        reason: rewardedExport.status || 'modal_closed',
      })
    }

    setRewardedExport({ open: false, status: 'idle', progress: 0 })
    setPendingReportRequest(null)
  }, [pendingReportRequest, rewardedExport.status])

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
        setExportUnlockUntil(0)
        trackEvent('ad_unlock_completed', {
          surface: 'reports',
          report_type: pendingReportRequest?.type || 'monthly',
        })
        window.setTimeout(() => {
          setRewardedExport({ open: false, status: 'idle', progress: 0 })
          const request = pendingReportRequest
          setPendingReportRequest(null)
          if (request) {
            downloadReportRequest(request)
          }
        }, 450)
      }
    }, 250)
  }, [downloadReportRequest, pendingReportRequest, rewardedExport.status])

  const requestPdfExport = useCallback(() => {
    requestReportExport('monthly')
  }, [requestReportExport])

  const clearReportExportPrompt = useCallback(() => {
    if (reportExportPrompt) {
      trackEvent('export_abandoned', {
        surface: 'reports',
        report_type: reportExportPrompt.type || 'unknown',
        reason: 'prompt_later',
      })
    }

    setReportExportPrompt(null)
  }, [reportExportPrompt])

  const exportCsv = useCallback(async () => {
    trackEvent('csv_export_started', {
      surface: 'reports',
      export_type: 'csv',
      transaction_count: selectedMonthActivity.transactions.length,
    })
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
        trackEvent('csv_exported', {
          surface: 'reports',
          export_type: 'csv',
          delivery: 'native_share',
        })
        return
      }
    } catch {
      trackEvent('csv_export_failed', {
        surface: 'reports',
        export_type: 'csv',
      })
      setPdfError('The CSV could not be prepared. Please try again in a moment.')
      return
    }

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `FBPly-history-${selectedMonthKey}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    trackEvent('csv_exported', {
      surface: 'reports',
      export_type: 'csv',
      delivery: 'download',
    })
  }, [selectedMonthActivity.transactions, selectedMonthKey])

  const legalPage = legalPages[normalizedCurrentPath]

  if (isPublicSeoPage) {
    return (
      <div className="app-root" data-energy="full">
        <Suspense fallback={<PublicSeoFallback path={normalizedCurrentPath} />}>
          <PublicSeoScreen currentPath={normalizedCurrentPath} />
        </Suspense>
        <CookieConsentBanner />
      </div>
    )
  }

  if (legalPage) {
    return (
      <div className="app-root" data-energy="full">
        <Suspense fallback={<ScreenFallback eyebrow={legalPage.eyebrow} title={legalPage.title} />}>
          <LegalScreen
            page={legalPage}
            supportEmail={supportEmail}
            founderLinkedInUrl={founderLinkedInUrl}
            supportPaymentUrl={supportPaymentUrl}
          />
        </Suspense>
        <CookieConsentBanner />
      </div>
    )
  }

  return (
    <div className="app-root" data-energy={lowEnergyMode ? 'low' : 'full'} data-currency={activeCurrency}>
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
            onCreateSavingsGoal={createSetupSavingsGoal}
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
              recurringSchedules={recurringSchedules}
              financialCalendarEvents={financialCalendarEvents}
              moneyReminders={moneyReminders}
              upcomingMoney={upcomingMoney}
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
              setCustomExpenseName={setCustomExpenseNameSmart}
              expenseAmount={expenseAmount}
              setExpenseAmount={setExpenseAmount}
              expenseNote={expenseNote}
              setExpenseNote={setExpenseNote}
              expenseError={expenseError}
              expenseFieldErrors={expenseFieldErrors}
              clearExpenseFieldError={clearExpenseFieldError}
              addExpense={addExpense}
              voiceState={voiceState}
              voiceDraft={voiceDraft}
              voiceDrafts={voiceDrafts}
              voiceStatus={voiceStatus}
              voiceTranscriptDraft={voiceTranscriptDraft}
              setVoiceTranscriptDraft={setVoiceTranscriptDraft}
              voiceTranscriptOptions={voiceTranscriptOptions}
              isListening={isListening}
              startVoiceExpense={startVoiceExpense}
              stopVoiceExpense={stopVoiceExpense}
              reviewVoiceTranscript={reviewVoiceTranscript}
              confirmVoiceExpense={confirmVoiceExpense}
              updateVoiceDraft={updateVoiceDraft}
              updateVoiceDraftAt={updateVoiceDraftAt}
              removeVoiceDraftAt={removeVoiceDraftAt}
              clearVoiceDraft={clearVoiceDraft}
              useVoiceManualFallback={useVoiceManualFallback}
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
              requestReportExport={requestReportExport}
              reportTemplate={reportTemplate}
              setReportTemplate={setReportTemplate}
              reportHistory={reportHistory}
              redownloadReport={redownloadReport}
              deleteReportHistoryEntry={deleteReportHistoryEntry}
              exportCsv={exportCsv}
              isExportingPdf={isExportingPdf}
              exportingReportType={exportingReportType}
              pdfError={pdfError}
              reportExportPrompt={reportExportPrompt}
              clearReportExportPrompt={clearReportExportPrompt}
              updateCommitment={updateCommitment}
              addCommitment={addCommitment}
              removeCommitment={removeCommitment}
              addRecurringSchedule={addRecurringSchedule}
              updateRecurringSchedule={updateRecurringSchedule}
              removeRecurringSchedule={removeRecurringSchedule}
              toggleRecurringSchedule={toggleRecurringSchedule}
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

function PublicSeoFallback({ path }) {
  const meta = getSeoMetaForPath(path)

  return (
    <main className="seo-page-shell seo-fallback-shell">
      <section className="seo-hero seo-fallback-hero" aria-label="FBPly public page">
        <nav className="seo-top-nav" aria-label="Public FBPly navigation">
          <a className="seo-logo-link" href="/">
            <HeaderLogo />
          </a>
          <div>
            <a href="/budget-planner">Budget Planner</a>
            <a href="/trip-expense-splitter">Trip Splitter</a>
            <a href="/faq">FAQ</a>
          </div>
        </nav>
        <div className="seo-hero-grid">
          <div className="seo-hero-copy">
            <p className="eyebrow">{meta.breadcrumbLabel}</p>
            <h1>{meta.title.replace(/^FBPly \| /, '').replace(/ \| FBPly.*$/, '')}</h1>
            <p>{meta.description}</p>
            <p className="seo-positioning-answer">
              FBPly is a budget planner, trip expense splitter, financial report generator, and bank statement analyzer.
            </p>
          </div>
        </div>
      </section>
    </main>
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
          <span className="coin-emblem" />
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
          <h1>Budget planning, shared expenses, and financial reports in one calm place.</h1>
          <p className="welcome-copy">
            FBPly helps plan monthly budgets, split trip costs, generate reports, and analyze bank statements from reviewed data.
          </p>
        </section>
        <nav className="welcome-feature-links" aria-label="Explore FBPly features">
          <a href="/budget-planner">Budget Planner</a>
          <a href="/trip-expense-splitter">Trip Splitter</a>
          <a href="/bank-statement-analysis">Statement Analysis</a>
        </nav>
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
      <div className="entry-shell auth-shell compact-auth-shell">
        <div className="auth-card auth-card-compact skeleton-auth-card" aria-label="Loading login form">
          <HeaderLogo />
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
  const hasInteractedRef = useRef(false)
  const hasSubmittedRef = useRef(false)
  const latestAuthModeRef = useRef(authMode)
  const isSignup = authMode === 'signup'
  const authTitle = isSignup ? 'Create account' : 'Welcome back'
  const authTagline = isSignup ? 'Set up your private money workspace.' : 'Sign in to continue your money system.'
  const authLegalLinks = legalLinks
    .filter((link) => ['/privacy', '/terms', '/contact'].includes(link.href))
    .map((link) => ({
      ...link,
      label: link.href === '/terms' ? 'Terms' : link.href === '/privacy' ? 'Privacy' : link.label,
    }))
  const markAuthInteraction = () => {
    hasInteractedRef.current = true
  }

  useEffect(() => {
    latestAuthModeRef.current = authMode
    trackEvent(isSignup ? 'signup_open' : 'login_open', {
      surface: 'auth',
      auth_mode: authMode,
    })
  }, [authMode, isSignup])

  useEffect(() => () => {
    if (hasInteractedRef.current && !hasSubmittedRef.current) {
      trackEvent('auth_abandon', {
        surface: 'auth',
        auth_mode: latestAuthModeRef.current,
      })
    }
  }, [])

  const submitAuth = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    hasSubmittedRef.current = true
    onEmailAuth({
      mode: authMode,
      email: form.querySelector('#email')?.value || email,
      password: form.querySelector('#password')?.value || '',
      name: form.querySelector('#name')?.value || name,
    })
  }

  return (
    <motion.main className="entry-screen" {...fadeUp}>
      <div className="entry-shell auth-shell compact-auth-shell">
        <form className="auth-card auth-card-compact" onSubmit={submitAuth}>
          <div className="auth-brand-block">
            <HeaderLogo />
            <div>
              <h1>{authTitle}</h1>
              <p>{authTagline}</p>
            </div>
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
                  onChange={(event) => {
                    markAuthInteraction()
                    setName(event.target.value)
                  }}
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
              onChange={(event) => {
                markAuthInteraction()
                setEmail(event.target.value)
              }}
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
              onChange={markAuthInteraction}
            />
          </div>
          <button className="primary-button full" type="submit" disabled={isAuthBusy}>
            {isAuthBusy ? 'Please wait...' : isSignup ? 'Create account' : 'Continue'}
          </button>
          {authMessage && <p className="form-message">{authMessage}</p>}
          <p className="auth-switch-line">
            {isSignup ? 'Already have an account?' : 'New to FBPly?'}
            <button
              type="button"
              onClick={() => {
                markAuthInteraction()
                setAuthMode(isSignup ? 'login' : 'signup')
              }}
            >
              {isSignup ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </form>
        <footer className="auth-legal-footer" aria-label="Legal links">
          {authLegalLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </footer>
      </div>
    </motion.main>
  )
}

function SetupScreen({ profile, setProfile, onCreateSavingsGoal, onComplete }) {
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
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const totalSteps = 7
  const activeStep = Math.min(step + 1, totalSteps)

  const upsertSetupCommitment = (name, amount) => {
    const cleanName = String(name || '').trim()
    const parsedAmount = normalizeMoney(amount)

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
    setSetupError('')
    setStep((current) => Math.min(current + 1, totalSteps - 1))
  }

  const goBack = () => {
    setSetupError('')
    setStep((current) => Math.max(current - 1, 0))
  }

  const finishSetup = () => {
    onCreateSavingsGoal?.({
      name: goalName,
      target: goalTarget,
      deadline: goalDeadline,
    })
    setProfile((current) => ({
      ...current,
      commitments: normalizeCommitments(current).filter((item) => item.name && normalizeMoney(item.amount) > 0),
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
          <h1>What should FBPly remember first?</h1>
          <p className="setup-soft-copy">Add what you know now, or skip and fill it later.</p>
          <CurrencyInput
            label="Monthly Income"
            value={profile.income || ''}
            onChange={(value) => setProfile((current) => ({ ...current, income: normalizeMoney(value) }))}
          />
          <CurrencyPreference profile={profile} setProfile={setProfile} id="setup-currency" />
          <label>
            <span className="input-label">Salary day</span>
            <input
              className="plain-input"
              type="number"
              min="1"
              max="31"
              inputMode="numeric"
              value={profile.salaryDay || 1}
              onChange={(event) => setProfile((current) => ({
                ...current,
                salaryDay: Math.min(Math.max(Number(event.target.value || 1), 1), 31),
              }))}
            />
          </label>
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
          <h1>Any savings goal to watch?</h1>
          <p className="setup-soft-copy">Optional. Savings goals can be added later from the Savings screen.</p>
          <div className="setup-mini-form setup-goal-form">
            <input
              className="plain-input"
              value={goalName}
              placeholder="Emergency fund, trip, phone..."
              onChange={(event) => setGoalName(event.target.value)}
            />
            <CurrencyInput label="Target" id="setup-goal-target" value={goalTarget} onChange={setGoalTarget} />
            <label>
              <span className="input-label">Deadline</span>
              <input
                className="plain-input"
                type="date"
                value={goalDeadline}
                onChange={(event) => setGoalDeadline(event.target.value)}
              />
            </label>
          </div>
        </section>
      )
    }

    if (step === 5) {
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
        <p className="setup-soft-copy">FBPly will use these numbers in Today, Activity, Savings, Reports, and Settings.</p>
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
          <div>
            <span>Goal</span>
            <strong>{goalName ? 'Added' : 'Skipped'}</strong>
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
            <div className="setup-next-actions">
              {step > 0 && (
                <button className="ghost-button" type="button" onClick={goNext}>
                  Skip
                </button>
              )}
              <button className="primary-button" type="button" onClick={goNext}>
                {step === 0 ? 'Begin' : 'Continue'}
                <ChevronRight size={18} />
              </button>
            </div>
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

function LoggedInLegalFooter() {
  return (
    <footer className="app-legal-footer" aria-label="FBPLY legal and support links">
      {appFooterLinks.map((link) => (
        <a
          href={link.href}
          key={link.label}
          target={link.external ? '_blank' : undefined}
          rel={link.external ? 'noreferrer noopener' : undefined}
        >
          {link.label}
        </a>
      ))}
    </footer>
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
    recurringSchedules,
    financialCalendarEvents,
    moneyReminders,
    upcomingMoney,
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
    voiceState,
    voiceDraft,
    voiceDrafts,
    voiceStatus,
    voiceTranscriptDraft,
    setVoiceTranscriptDraft,
    voiceTranscriptOptions,
    isListening,
    startVoiceExpense,
    stopVoiceExpense,
    reviewVoiceTranscript,
    confirmVoiceExpense,
    updateVoiceDraft,
    updateVoiceDraftAt,
    removeVoiceDraftAt,
    clearVoiceDraft,
    useVoiceManualFallback,
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
    requestReportExport,
    reportTemplate,
    setReportTemplate,
    reportHistory,
    redownloadReport,
    deleteReportHistoryEntry,
    exportCsv,
    isExportingPdf,
    exportingReportType,
    pdfError,
    reportExportPrompt,
    clearReportExportPrompt,
    updateCommitment,
    addCommitment,
    removeCommitment,
    addRecurringSchedule,
    updateRecurringSchedule,
    removeRecurringSchedule,
    toggleRecurringSchedule,
    addSavingsBucket,
    updateSavingsBucket,
    removeSavingsBucket,
  } = props
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  useEffect(() => {
    trackFeatureUsage(activeTab, {
      surface: 'app_shell',
      interaction: 'tab_viewed',
    })
  }, [activeTab])

  const scrollToTargetId = useCallback((targetId) => {
    if (!targetId || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    let attempts = 0
    const tryScroll = () => {
      const target = document.getElementById(targetId)

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        target.classList.add('section-focus-pulse')
        window.setTimeout(() => target.classList.remove('section-focus-pulse'), 1200)
        return
      }

      attempts += 1

      if (attempts < 16) {
        window.setTimeout(tryScroll, 90)
      }
    }

    window.setTimeout(tryScroll, 60)
  }, [])
  const navigateToTarget = useCallback((tab, targetId) => {
    setActiveTab(tab)
    scrollToTargetId(targetId)
  }, [scrollToTargetId, setActiveTab])
  const handleReportPromptAction = useCallback((prompt) => {
    if (!prompt?.tab || !prompt?.targetId) {
      return
    }

    clearReportExportPrompt?.()
    trackFeatureUsage('report_prompt_action', {
      surface: 'reports',
      target_tab: prompt.tab,
    })
    navigateToTarget(prompt.tab, prompt.targetId)
  }, [clearReportExportPrompt, navigateToTarget])

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
        onClick={() => {
          setIsSettingsOpen(true)
          trackFeatureUsage('settings_opened', {
            surface: 'app_chrome',
          })
        }}
      >
        <User size={18} />
      </button>
      <Suspense fallback={null}>
        <NotificationCenter
          moneyReminders={moneyReminders}
          savingsBuckets={savingsBuckets}
          sharedGroups={sharedGroups}
          sharedSummary={sharedSummary}
          moneyBookSummary={moneyBookSummary}
          reportHistory={reportHistory}
          profile={profile}
          navigateToTarget={navigateToTarget}
          redownloadReport={redownloadReport}
        />
      </Suspense>
      <QuickAddFab openAddSheet={openAddSheet} />
      <main className="screen-panel">
        {activeTab === 'home' && (
          <Suspense fallback={<ScreenFallback eyebrow="Today" title="Preparing your money view" />}>
            <TodayScreen
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
              recurringSchedules={recurringSchedules}
              moneyReminders={moneyReminders}
              upcomingMoney={upcomingMoney}
              financialCalendarEvents={financialCalendarEvents}
              reportHistory={reportHistory}
              redownloadReport={redownloadReport}
              sharedGroups={sharedGroups}
              sharedSummary={sharedSummary}
              moneyBookSummary={moneyBookSummary}
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
              navigateToTarget={navigateToTarget}
            />
          </Suspense>
        )}
        {activeTab === 'history' && (
          <Suspense fallback={<ScreenFallback eyebrow="Daily Book" title="Preparing expense history" />}>
            <DailyBookScreen
              expenses={expenses}
              openAddSheet={openAddSheet}
            />
            <ActivityScreen
              groups={historyGroups}
              summary={transactionSummary}
              cashflowTimeline={cashflowTimeline}
              expenses={expenses}
              moneyBookEntries={moneyBookEntries}
              moneyBookSummary={moneyBookSummary}
              profile={profile}
              sharedGroups={sharedGroups}
              sharedSummary={sharedSummary}
              addSharedGroup={addSharedGroup}
              addSharedPayment={addSharedPayment}
              markSharedSettlementReceived={markSharedSettlementReceived}
              removeSharedGroup={removeSharedGroup}
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
          </Suspense>
        )}
        {activeTab === 'planner' && (
          <Suspense fallback={<ScreenFallback eyebrow="Savings" title="Preparing savings goals" />}>
            <GoalsScreen
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
              savingsBuckets={savingsBuckets}
              addSavingsBucket={addSavingsBucket}
              updateSavingsBucket={updateSavingsBucket}
              removeSavingsBucket={removeSavingsBucket}
            />
          </Suspense>
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
              requestReportExport={requestReportExport}
              reportTemplate={reportTemplate}
              setReportTemplate={setReportTemplate}
              reportHistory={reportHistory}
              redownloadReport={redownloadReport}
              deleteReportHistoryEntry={deleteReportHistoryEntry}
              exportCsv={exportCsv}
              isExportingPdf={isExportingPdf}
              exportingReportType={exportingReportType}
              reportExportPrompt={reportExportPrompt}
              onReportPromptAction={handleReportPromptAction}
              clearReportExportPrompt={clearReportExportPrompt}
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
            voiceState={voiceState}
            voiceDraft={voiceDraft}
            voiceDrafts={voiceDrafts}
            voiceStatus={voiceStatus}
            voiceTranscriptDraft={voiceTranscriptDraft}
            setVoiceTranscriptDraft={setVoiceTranscriptDraft}
            voiceTranscriptOptions={voiceTranscriptOptions}
            isListening={isListening}
            startVoiceExpense={startVoiceExpense}
            stopVoiceExpense={stopVoiceExpense}
            reviewVoiceTranscript={reviewVoiceTranscript}
            confirmVoiceExpense={confirmVoiceExpense}
            updateVoiceDraft={updateVoiceDraft}
            updateVoiceDraftAt={updateVoiceDraftAt}
            removeVoiceDraftAt={removeVoiceDraftAt}
            clearVoiceDraft={clearVoiceDraft}
            useVoiceManualFallback={useVoiceManualFallback}
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
      <LoggedInLegalFooter />
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
          voiceState={voiceState}
          voiceDraft={voiceDraft}
          voiceDrafts={voiceDrafts}
          voiceStatus={voiceStatus}
          voiceTranscriptDraft={voiceTranscriptDraft}
          setVoiceTranscriptDraft={setVoiceTranscriptDraft}
          voiceTranscriptOptions={voiceTranscriptOptions}
          isListening={isListening}
          startVoiceExpense={startVoiceExpense}
          stopVoiceExpense={stopVoiceExpense}
          reviewVoiceTranscript={reviewVoiceTranscript}
          confirmVoiceExpense={confirmVoiceExpense}
          updateVoiceDraft={updateVoiceDraft}
          updateVoiceDraftAt={updateVoiceDraftAt}
          removeVoiceDraftAt={removeVoiceDraftAt}
          clearVoiceDraft={clearVoiceDraft}
          useVoiceManualFallback={useVoiceManualFallback}
          useVoiceDraftInForm={useVoiceDraftInForm}
          undoVoiceSave={undoVoiceSave}
          lastVoiceSave={lastVoiceSave}
          saveMoneyBookEntry={saveMoneyBookEntry}
          setActiveTab={setActiveTab}
        />
      )}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsScreen
            authUser={authUser}
            profile={profile}
            setProfile={setProfile}
            onClose={() => setIsSettingsOpen(false)}
            onSignOut={onSignOut}
            financialState={financialState}
            fixedDistribution={fixedDistribution}
            flexibleDistribution={flexibleDistribution}
            commitments={normalizeMonthlyBillsForEdit(profile)}
            updateCommitment={updateCommitment}
            addCommitment={addCommitment}
            removeCommitment={removeCommitment}
            recurringSchedules={recurringSchedules}
            addRecurringSchedule={addRecurringSchedule}
            updateRecurringSchedule={updateRecurringSchedule}
            removeRecurringSchedule={removeRecurringSchedule}
            toggleRecurringSchedule={toggleRecurringSchedule}
          />
        </Suspense>
      )}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </motion.div>
  )
}

function QuickAddFab({ openAddSheet }) {
  const longPressTimerRef = useRef(null)
  const didLongPressRef = useRef(false)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const startLongPressTimer = useCallback(() => {
    didLongPressRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true
      openAddSheet('menu')
    }, 460)
  }, [clearLongPressTimer, openAddSheet])

  useEffect(() => clearLongPressTimer, [clearLongPressTimer])

  return (
    <button
      className="top-quick-add-button"
      type="button"
      aria-label="Add expense"
      title="Add expense"
      onClick={() => {
        if (didLongPressRef.current) {
          didLongPressRef.current = false
          return
        }

        openAddSheet('expense')
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        openAddSheet('menu')
      }}
      onPointerDown={startLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onPointerUp={clearLongPressTimer}
    >
      <Plus size={20} />
    </button>
  )
}

function ReportsFallback() {
  return (
    <section className="screen-content reports-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Preparing monthly financial reports</h1>
        </div>
      </div>
      <article className="chart-card skeleton-card" />
      <article className="chart-card skeleton-card" />
      <article className="chart-card skeleton-card" />
    </section>
  )
}

function ScreenFallback({ eyebrow = 'Loading', title = 'Preparing view' }) {
  return (
    <section className="screen-content">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </div>
      <article className="chart-card skeleton-card" />
    </section>
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
  voiceState,
  voiceDraft,
  voiceDrafts,
  voiceStatus,
  voiceTranscriptDraft,
  setVoiceTranscriptDraft,
  voiceTranscriptOptions,
  isListening,
  startVoiceExpense,
  stopVoiceExpense,
  reviewVoiceTranscript,
  confirmVoiceExpense,
  updateVoiceDraft,
  updateVoiceDraftAt,
  removeVoiceDraftAt,
  clearVoiceDraft,
  useVoiceManualFallback,
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
    <AppModal
      onClose={onClose}
      labelledBy="quick-add-title"
      sheetClassName="editor-sheet quick-add-sheet chrome-popover-sheet quick-add-popover-sheet"
      backdropClassName="editor-sheet-backdrop chrome-popover-backdrop"
    >
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
            voiceState={voiceState}
            voiceDraft={voiceDraft}
            voiceDrafts={voiceDrafts}
            voiceStatus={voiceStatus}
            voiceTranscriptDraft={voiceTranscriptDraft}
            setVoiceTranscriptDraft={setVoiceTranscriptDraft}
            voiceTranscriptOptions={voiceTranscriptOptions}
            isListening={isListening}
            startVoiceExpense={startVoiceExpense}
            stopVoiceExpense={stopVoiceExpense}
            reviewVoiceTranscript={reviewVoiceTranscript}
            confirmVoiceExpense={confirmVoiceExpense}
            updateVoiceDraft={updateVoiceDraft}
            updateVoiceDraftAt={updateVoiceDraftAt}
            removeVoiceDraftAt={removeVoiceDraftAt}
            clearVoiceDraft={clearVoiceDraft}
            useVoiceManualFallback={useVoiceManualFallback}
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
  voiceState,
  voiceDraft,
  voiceDrafts,
  voiceStatus,
  voiceTranscriptDraft,
  setVoiceTranscriptDraft,
  voiceTranscriptOptions,
  isListening,
  startVoiceExpense,
  stopVoiceExpense,
  reviewVoiceTranscript,
  confirmVoiceExpense,
  updateVoiceDraft,
  updateVoiceDraftAt,
  removeVoiceDraftAt,
  clearVoiceDraft,
  useVoiceManualFallback,
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
      const form = event.currentTarget
      const saved = addExpense(event)

      if (saved) {
        onSaved()
        return
      }

      focusInvalidField(form)
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
        voiceState={voiceState}
        voiceDraft={voiceDraft}
        voiceDrafts={voiceDrafts}
        voiceStatus={voiceStatus}
        voiceTranscriptDraft={voiceTranscriptDraft}
        setVoiceTranscriptDraft={setVoiceTranscriptDraft}
        voiceTranscriptOptions={voiceTranscriptOptions}
        isListening={isListening}
        startVoiceExpense={startVoiceExpense}
        stopVoiceExpense={stopVoiceExpense}
        reviewVoiceTranscript={reviewVoiceTranscript}
        confirmVoiceExpense={confirmVoiceExpense}
        updateVoiceDraft={updateVoiceDraft}
        updateVoiceDraftAt={updateVoiceDraftAt}
        removeVoiceDraftAt={removeVoiceDraftAt}
        clearVoiceDraft={clearVoiceDraft}
        useVoiceManualFallback={useVoiceManualFallback}
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
    <form className={`quick-expense-form ${error ? 'form-has-errors' : ''}`} onSubmit={(event) => {
      event.preventDefault()
      const form = event.currentTarget
      const parsed = normalizeMoney(incomeAmount)

      if (!parsed || parsed <= 0) {
        setError('Add a valid income amount.')
        focusInvalidField(form)
        return
      }

      setProfile((current) => ({ ...current, income: parsed }))
      trackFeatureUsage('income_saved', {
        surface: 'quick_add',
      })

      if (normalizeMoney(profile.income) <= 0) {
        trackActivation('first_income', {
          source: 'quick_add',
        })
      }

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
  const [errors, setErrors] = useState({})
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
    <form className={`quick-expense-form ${Object.keys(errors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={(event) => {
      event.preventDefault()
      const form = event.currentTarget
      const parsed = normalizeMoney(amount)
      const fieldErrors = {}

      if (!selectedBucket) {
        fieldErrors.bucket = 'Choose a goal.'
      }

      if (!parsed || parsed <= 0) {
        fieldErrors.amount = 'Add a positive amount.'
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        focusInvalidField(form)
        return
      }

      updateSavingsBucket(selectedBucket.id, {
        saved: addMoney(selectedBucket.saved, parsed),
      })
      trackFeatureUsage('goal_transfer_saved', {
        surface: 'quick_add',
      })
      onSaved()
    }}>
      <label>
        <span className="input-label">Goal</span>
        <select className={`month-select ${errors.bucket ? 'field-invalid' : ''}`} value={bucketId} aria-invalid={errors.bucket ? 'true' : undefined} onChange={(event) => {
          setBucketId(event.target.value)
          setErrors((current) => {
            const next = { ...current }
            delete next.bucket
            return next
          })
        }}>
          {savingsBuckets.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>
              {bucket.name || 'Goal'}
            </option>
          ))}
        </select>
        {errors.bucket && <small className="field-helper">{errors.bucket}</small>}
      </label>
      <CurrencyInput
        label="Amount to move"
        id="quick-transfer-amount"
        value={amount}
        placeholder="1000"
        onChange={(value) => {
          setAmount(value)
          setErrors((current) => {
            const next = { ...current }
            delete next.amount
            return next
          })
        }}
        error={errors.amount}
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
  const [errors, setErrors] = useState({})

  return (
    <form className={`quick-expense-form ${Object.keys(errors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={(event) => {
      event.preventDefault()
      const form = event.currentTarget
      const parsedAmount = normalizeMoney(amount)
      const fieldErrors = {}

      if (!String(person || '').trim()) {
        fieldErrors.person = 'Add the person name.'
      }

      if (!parsedAmount || parsedAmount <= 0) {
        fieldErrors.amount = 'Add a positive amount.'
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        focusInvalidField(form)
        return
      }

      const saved = saveMoneyBookEntry({
        kind,
        person,
        amount: parsedAmount,
        date: todayDateKey(),
        note,
      })

      if (!saved) {
        setErrors({ form: 'Check the highlighted fields before saving.' })
        focusInvalidField(form)
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
          className={`plain-input ${errors.person ? 'field-invalid' : ''}`}
          type="text"
          value={person}
          placeholder="Rahul, Priya..."
          aria-invalid={errors.person ? 'true' : undefined}
          onChange={(event) => {
            setPerson(event.target.value)
            setErrors((current) => {
              const next = { ...current }
              delete next.person
              return next
            })
          }}
        />
        {errors.person && <small className="field-helper">{errors.person}</small>}
      </label>
      <CurrencyInput
        label="Amount"
        id="quick-borrow-amount"
        value={amount}
        placeholder="500"
        onChange={(value) => {
          setAmount(value)
          setErrors((current) => {
            const next = { ...current }
            delete next.amount
            return next
          })
        }}
        error={errors.amount}
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
      {errors.form && <p className="form-message form-message-error">{errors.form}</p>}
    </form>
  )
}

function HomeFooter() {
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const trustItems = [
    { label: 'Privacy-aware', icon: ShieldCheck },
    { label: 'Local-first planning', icon: LockKeyhole },
    { label: 'Founder-led support', icon: MessageCircle },
  ]

  return (
    <footer className="home-footer" aria-label="FBPly legal and founder information">
      <QuickFeedbackForm />

      <section className={`home-about-block ${isAboutOpen ? 'open' : ''}`} aria-labelledby="home-about-title">
        <button
          className="home-about-toggle"
          type="button"
          aria-expanded={isAboutOpen}
          aria-controls="home-about-details"
          onClick={() => setIsAboutOpen((current) => !current)}
        >
          <span className="home-about-toggle-main">
            <BrandMark size="tiny" />
            <span>
              <span className="mini-label" id="home-about-title">About FBPly</span>
              <strong>Founder, support, and trust details</strong>
              <small>Tap to view the founder note and links.</small>
            </span>
          </span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>

        {isAboutOpen && (
          <div className="home-about-details" id="home-about-details">
            <div className="home-footer-brand">
              <div>
                <strong>Founder-led personal finance clarity.</strong>
                <p>Built independently to make everyday spending, shared costs, and future purchases easier to understand.</p>
              </div>
            </div>

            <div className="home-founder-stack">
              <span>Founder</span>
              <div className="home-founder-name">
                <strong>{founderName}</strong>
                <a
                  className="home-founder-link"
                  href={founderLinkedInUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`${founderName} on LinkedIn`}
                >
                  LinkedIn
                  <ExternalLink size={11} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="home-about-actions">
              <a
                className="home-support-button"
                href={supportPaymentUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Coffee size={14} />
                Support FBPly
              </a>
            </div>
          </div>
        )}
      </section>

      <div className="home-trust-strip" aria-label="FBPly trust notes">
        {trustItems.map((item) => (
          <span key={item.label}>
            <item.icon size={13} />
            {item.label}
          </span>
        ))}
      </div>

      <nav className="home-footer-links" aria-label="Legal links">
        {legalLinks.map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  )
}

function QuickFeedbackForm() {
  const [suggestion, setSuggestion] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [isSending, setIsSending] = useState(false)

  const clearError = (field) => {
    setErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const sendViaMailto = (cleanSuggestion, cleanEmail) => {
    const subject = encodeURIComponent('FBPly feedback')
    const body = encodeURIComponent(`${cleanSuggestion}${cleanEmail ? `\n\nFrom: ${cleanEmail}` : ''}`)
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`
  }

  const submitFeedback = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const cleanSuggestion = suggestion.trim()
    const cleanEmail = email.trim()
    const fieldErrors = {}

    setStatus('')

    if (cleanSuggestion.length < 4) {
      fieldErrors.suggestion = 'Add a short note so the feedback is useful.'
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      fieldErrors.email = 'Use a valid email, or leave this blank.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      focusInvalidField(form)
      return
    }

    setIsSending(true)

    try {
      if (isSupabaseReady) {
        const { error } = await supabase
          .from('feedback')
          .insert({
            email: cleanEmail || null,
            message: cleanSuggestion,
            source: 'footer',
            page: typeof window === 'undefined' ? '/' : window.location.pathname,
          })

        if (error) {
          throw error
        }

        setStatus('Thanks for your feedback. It genuinely helps make FBPly clearer and better.')
      } else {
        sendViaMailto(cleanSuggestion, cleanEmail)
        setStatus('Thanks for your feedback. Your note is ready to send, and it genuinely helps improve FBPly.')
      }

      setSuggestion('')
      setEmail('')
      setErrors({})
    } catch {
      sendViaMailto(cleanSuggestion, cleanEmail)
      setStatus('Thanks for your feedback. Your note is ready to send, and it genuinely helps improve FBPly.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form className={`home-feedback-card ${Object.keys(errors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={submitFeedback}>
      <div className="home-feedback-heading">
        <div>
          <span className="mini-label">Quick feedback</span>
          <strong>Tell us what felt unclear.</strong>
        </div>
        <MessageCircle size={17} />
      </div>
      <label>
        <span className="input-label">Suggestion / feedback</span>
        <textarea
          className={`plain-input textarea-input ${errors.suggestion ? 'field-invalid' : ''}`}
          value={suggestion}
          placeholder="One thing FBPly should improve..."
          rows={3}
          aria-invalid={errors.suggestion ? 'true' : undefined}
          onChange={(event) => {
            setSuggestion(event.target.value)
            clearError('suggestion')
            setStatus('')
          }}
        />
        {errors.suggestion && <small className="field-helper">{errors.suggestion}</small>}
      </label>
      <div className="home-feedback-actions">
        <label>
          <span className="input-label">Email optional</span>
          <input
            className={`plain-input ${errors.email ? 'field-invalid' : ''}`}
            type="email"
            value={email}
            placeholder="you@example.com"
            aria-invalid={errors.email ? 'true' : undefined}
            onChange={(event) => {
              setEmail(event.target.value)
              clearError('email')
              setStatus('')
            }}
          />
          {errors.email && <small className="field-helper">{errors.email}</small>}
        </label>
        <button className="primary-button" type="submit" disabled={isSending}>
          <Send size={15} />
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
      {status && <p className="form-message feedback-success">{status}</p>}
    </form>
  )
}

function VoiceExpenseBox({
  voiceState = 'ready',
  voiceDraft,
  voiceDrafts = [],
  voiceStatus,
  voiceTranscriptDraft,
  setVoiceTranscriptDraft,
  voiceTranscriptOptions = [],
  isListening,
  startVoiceExpense,
  stopVoiceExpense,
  reviewVoiceTranscript,
  confirmVoiceExpense,
  updateVoiceDraft,
  updateVoiceDraftAt,
  removeVoiceDraftAt,
  clearVoiceDraft,
  useVoiceManualFallback,
  useVoiceDraftInForm,
  undoVoiceSave,
  lastVoiceSave,
}) {
  const voiceStateInfo = getVoiceUiState(voiceState)
  const isVoiceProcessing = voiceState === 'processing' && !isListening
  const transcriptValue = String(voiceTranscriptDraft || '')
  const reviewDrafts = voiceDrafts.length > 0 ? voiceDrafts : voiceDraft ? [voiceDraft] : []
  const hasParsedDrafts = reviewDrafts.length > 0
  const hasTranscriptReview = Boolean(transcriptValue.trim()) && !hasParsedDrafts
  const transcriptOptions = Array.from(
    new Set((voiceTranscriptOptions || []).map((option) => String(option || '').trim()).filter(Boolean)),
  )
  const voiceExamplePrompts = ['Swiggy 450', 'Uber 250', 'Salary 50000', 'Netflix 649', 'Dmart 2200']
  const categoryChoices = Array.from(
    new Set([
      ...(voiceDraft?.category ? [voiceDraft.category] : []),
      ...voiceCategoryOptions,
      ...expenseCategories.map((category) => category.label),
    ]),
  )
  const hasVoicePanel = isListening || hasParsedDrafts || voiceStatus || lastVoiceSave || hasTranscriptReview

  return (
    <section className="voice-box voice-compact">
      <div className="voice-compact-bar">
        <button
          className={`voice-mic-button ${isListening ? 'listening' : ''}`}
          type="button"
          disabled={isVoiceProcessing}
          onClick={isListening ? stopVoiceExpense : startVoiceExpense}
          aria-label={isListening ? 'Stop voice entry' : 'Start voice entry'}
        >
          {isListening ? <Square size={17} /> : <Mic size={18} />}
          <span>{isListening ? 'Listening' : isVoiceProcessing ? 'Processing' : 'Speak'}</span>
        </button>
        <span className={`voice-state-badge ${voiceState}`}>{voiceStateInfo.label}</span>
      </div>

      {hasVoicePanel && (
        <div className="voice-mini-sheet">
          <div className="voice-state-line">
            {isListening && <span className="listening-dot" aria-label="Listening" />}
            {voiceStatus && <p className="voice-status">{voiceStatus}</p>}
          </div>

          {!hasTranscriptReview && !hasParsedDrafts && (
            <div className="voice-example-hints" aria-label="Voice examples">
              <span>Try saying:</span>
              {voiceExamplePrompts.map((example) => (
                <button type="button" key={example} onClick={() => setVoiceTranscriptDraft(example)}>
                  {example}
                </button>
              ))}
            </div>
          )}

          {lastVoiceSave && (
            <div className="voice-undo-row">
              <span>Last voice entry saved.</span>
              <button type="button" onClick={undoVoiceSave}>
                Undo
              </button>
            </div>
          )}

          {hasTranscriptReview && (
            <article className="voice-transcript-review">
              <label className="voice-transcript-label">
                <span>Transcript</span>
                <textarea
                  className="plain-input"
                  rows="2"
                  value={transcriptValue}
                  onChange={(event) => setVoiceTranscriptDraft(event.target.value)}
                />
              </label>
              {transcriptOptions.length > 1 && (
                <div className="voice-transcript-options">
                  {transcriptOptions.slice(0, 3).map((option) => (
                    <button type="button" key={option} onClick={() => setVoiceTranscriptDraft(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
              <div className="mini-action-row voice-review-actions">
                <button className="primary-button" type="button" onClick={reviewVoiceTranscript}>
                  Review expense
                </button>
                <button className="ghost-button" type="button" onClick={useVoiceManualFallback}>
                  Add manually
                </button>
                <button className="ghost-button" type="button" onClick={clearVoiceDraft}>
                  Clear
                </button>
              </div>
            </article>
          )}

          {!hasTranscriptReview && ['no_speech', 'permission_required', 'microphone_error', 'network_error', 'manual_fallback'].includes(voiceState) && (
            <div className="voice-fallback-row">
              <button className="ghost-button" type="button" onClick={useVoiceManualFallback}>
                Add manually
              </button>
            </div>
          )}

          {hasParsedDrafts && (
            <div className="voice-draft-list">
              {reviewDrafts.map((draft, index) => (
                <article className="voice-draft compact-voice-draft" key={`${draft.label || 'voice'}-${draft.amount || 0}-${index}`}>
                  {reviewDrafts.length > 1 && (
                    <div className="voice-entry-heading">
                      <strong>Entry {index + 1}</strong>
                      <button className="text-action-button" type="button" onClick={() => removeVoiceDraftAt(index)}>
                        Remove
                      </button>
                    </div>
                  )}
              <div className="voice-draft-fields">
                <label>
                  Detected item
                  <input
                    className="plain-input"
                    type="text"
                    value={draft.label || ''}
                    onChange={(event) => {
                      const patch = { label: event.target.value }
                      if (updateVoiceDraftAt) {
                        updateVoiceDraftAt(index, patch)
                      } else {
                        updateVoiceDraft(patch)
                      }
                    }}
                  />
                </label>
                <label>
                  Detected amount
                  <span className="voice-amount-input">
                    {getCurrencySymbol()}
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={draft.amount || ''}
                      onChange={(event) => {
                        const patch = { amount: event.target.value }
                        if (updateVoiceDraftAt) {
                          updateVoiceDraftAt(index, patch)
                        } else {
                          updateVoiceDraft(patch)
                        }
                      }}
                    />
                  </span>
                </label>
                <label>
                  Detected type
                  <select
                    className="month-select"
                    value={draft.type || 'daily'}
                    onChange={(event) => {
                      const nextType = event.target.value
                      const patch = {
                        type: nextType,
                        category: nextType === 'income' && (!draft.category || draft.category === 'Other') ? 'Income' : draft.category,
                      }
                      if (updateVoiceDraftAt) {
                        updateVoiceDraftAt(index, patch)
                      } else {
                        updateVoiceDraft(patch)
                      }
                    }}
                  >
                    <option value="daily">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
                <label>
                  Detected date
                  <input
                    className="plain-input"
                    type="date"
                    value={normalizeDateKey(draft.date)}
                    onChange={(event) => {
                      const patch = { date: event.target.value, dateLabel: 'Custom' }
                      if (updateVoiceDraftAt) {
                        updateVoiceDraftAt(index, patch)
                      } else {
                        updateVoiceDraft(patch)
                      }
                    }}
                  />
                </label>
                <label>
                  Detected category
                  <select
                    className="month-select"
                    value={draft.category || 'Other'}
                    onChange={(event) => {
                      const patch = { category: event.target.value }
                      if (updateVoiceDraftAt) {
                        updateVoiceDraftAt(index, patch)
                      } else {
                        updateVoiceDraft(patch)
                      }
                    }}
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
                <span className={`confidence-pill ${draft.confidence || 'low'}`}>
                  {draft.confidence === 'high' ? 'High confidence' : draft.confidence === 'medium' ? 'Medium confidence' : 'Low confidence'}
                </span>
                <p>
                  {draft.type === 'income' ? 'Income' : 'Expense'} / {draft.category || 'Other'} / {getCurrencySymbol()}
                  {draft.amount || 0} / {draft.dateLabel || 'Today'}
                </p>
              </div>
              <div className="voice-detection-grid">
                <span>
                  <small>Merchant</small>
                  <strong>{draft.merchant || draft.label || 'Not detected'}</strong>
                </span>
                <span>
                  <small>Detected category</small>
                  <strong>{draft.category || 'Other'}</strong>
                </span>
                <span>
                  <small>Reason</small>
                  <strong>{draft.categoryReason || 'Keyword Match'}</strong>
                </span>
              </div>
              {draft.confidence === 'low' && (
                <p className="voice-low-confidence">Please confirm this entry before saving.</p>
              )}
              <p className="voice-transcript-line">{draft.transcript}</p>
                </article>
              ))}
              <div className="mini-action-row">
                <button className="primary-button" type="button" onClick={confirmVoiceExpense}>
                  {reviewDrafts.length > 1 ? 'Save all' : 'Save'}
                </button>
                <button className="ghost-button" type="button" onClick={useVoiceDraftInForm}>
                  Edit in form
                </button>
                <button className="ghost-button" type="button" onClick={clearVoiceDraft}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
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
  voiceState,
  voiceDraft,
  voiceDrafts,
  voiceStatus,
  voiceTranscriptDraft,
  setVoiceTranscriptDraft,
  voiceTranscriptOptions,
  isListening,
  startVoiceExpense,
  stopVoiceExpense,
  reviewVoiceTranscript,
  confirmVoiceExpense,
  updateVoiceDraft,
  updateVoiceDraftAt,
  removeVoiceDraftAt,
  clearVoiceDraft,
  useVoiceManualFallback,
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
  const commitments = normalizeMonthlyBillsForEdit(profile)
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

      <div className="finance-visual-grid" id="profile-bills-section">
        <FinanceDonut
          chart={fixedDistribution}
          action={(
            <button
              className="icon-button compact-icon-button"
              type="button"
              aria-label="Edit monthly bills"
              onClick={() => setIsCommitmentEditorOpen(true)}
            >
              <Pencil size={15} />
            </button>
          )}
        />
        <FinanceDonut chart={flexibleDistribution} />
      </div>

      <VoiceExpenseBox
        voiceState={voiceState}
        voiceDraft={voiceDraft}
        voiceDrafts={voiceDrafts}
        voiceStatus={voiceStatus}
        voiceTranscriptDraft={voiceTranscriptDraft}
        setVoiceTranscriptDraft={setVoiceTranscriptDraft}
        voiceTranscriptOptions={voiceTranscriptOptions}
        isListening={isListening}
        startVoiceExpense={startVoiceExpense}
        stopVoiceExpense={stopVoiceExpense}
        reviewVoiceTranscript={reviewVoiceTranscript}
        confirmVoiceExpense={confirmVoiceExpense}
        updateVoiceDraft={updateVoiceDraft}
        updateVoiceDraftAt={updateVoiceDraftAt}
        removeVoiceDraftAt={removeVoiceDraftAt}
        clearVoiceDraft={clearVoiceDraft}
        useVoiceManualFallback={useVoiceManualFallback}
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

      <HomeFooter />

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
          onChange={(value) => setProfile((current) => ({ ...current, income: normalizeMoney(value) }))}
        />
        <CurrencyPreference profile={profile} setProfile={setProfile} id="profile-menu-currency" />
        <label>
          <span className="input-label">Salary day</span>
          <input
            className="plain-input"
            type="number"
            min="1"
            max="31"
            inputMode="numeric"
            value={profile.salaryDay || 1}
            onChange={(event) => setProfile((current) => ({
              ...current,
              salaryDay: Math.min(Math.max(Number(event.target.value || 1), 1), 31),
            }))}
          />
        </label>
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
    <form className={`profile-quick-expense-card ${Object.keys(expenseFieldErrors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={(event) => {
      const form = event.currentTarget
      const saved = addExpense(event)

      if (!saved) {
        focusInvalidField(form)
      }
    }}>
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
          <p className="eyebrow">Monthly bills</p>
          <h2 id="commitment-editor-title">Edit monthly bills</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close monthly bills editor" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <p className="editor-sheet-copy">
        These regular payments update safe spending, reminders, insights, and purchase planning.
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

function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <button
            className={activeTab === item.key ? 'active' : ''}
            key={item.key}
            type="button"
            aria-label={item.ariaLabel || item.label}
            onClick={() => setActiveTab(item.key)}
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
    map[name] = addMoney(map[name] || 0, commitment.amount)
    sources[name] = sources[name] ? 'Mixed' : 'Monthly bill'
    return map
  }, {})

  expenses.forEach((expense) => {
    const normalized = normalizeSpendCategory(expense)
    const name = normalized.category || 'Other'
    totals[name] = addMoney(totals[name] || 0, expense.amount)
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

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export default App
