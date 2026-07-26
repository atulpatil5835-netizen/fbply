import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Calculator,
  CalendarDays,
  Car,
  ChartPie,
  CheckCircle2,
  ChevronLeft,
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
  Percent,
  PiggyBank,
  Plane,
  Plus,
  Popcorn,
  Receipt,
  ShoppingBag,
  ShieldCheck,
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
import { buildMoneyScore, ensureMoneyScoreRollbackFlag, isLegacyMoneyScoreEnabled } from './lib/moneyScore'
import {
  buildNextBestAction,
  ensureNextActionRollbackFlag,
  getNextActionCompletionMetrics,
  hasNextActionCompletion,
  isLegacyNextActionEnabled,
} from './lib/nextBestAction'
import {
  buildSmartFeedback,
  ensureSmartFeedbackRollbackFlag,
} from './lib/smartFeedback'
import {
  ensureMoneyInboxRollbackFlag,
} from './lib/moneyInbox'
import { buildUnifiedFinanceEngine, buildTransactionSummary } from './lib/financeEngine'
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
  cloudRowToProfile,
  hasLocalProfileData,
  hasProfileMigrationRun,
  loadCloudProfile,
  markProfileMigrationRun,
  profileToCloudPayload,
  saveCloudProfile,
} from './lib/profileSync'
import {
  appendExpenseSyncQueue,
  applyExpenseSyncOperations,
  buildExpenseSyncOperations,
  clearExpenseSyncQueue,
  diffExpenseRecords,
  hasExpenseMigrationRun,
  loadCloudExpenses,
  markExpenseMigrationRun,
  normalizeExpenseRecords,
  readExpenseSyncQueue,
  saveCloudExpenses,
  softDeleteCloudExpenses,
} from './lib/expenseSync'
import {
  appendCommitmentSyncQueue,
  applyCommitmentSyncOperations,
  buildCommitmentSyncOperations,
  buildCommitmentSyncRecords,
  clearCommitmentSyncQueue,
  diffCommitmentState,
  hasCommitmentMigrationRun,
  hasLocalCommitmentData,
  loadCloudCommitments,
  markCommitmentMigrationRun,
  normalizeProfileCommitments,
  readCommitmentSyncQueue,
  saveCloudCommitments,
} from './lib/commitmentSync'
import {
  applySavingsSyncOperations,
  buildSavingsSyncOperations,
  buildSavingsSyncRecords,
  diffSavingsSyncRecords,
  flushSavingsSyncQueue,
  hasSavingsMigrationRun,
  loadCloudSavingsBucketState,
  markSavingsMigrationRun,
  normalizeSavingsBuckets,
  queueSavingsSyncOperations,
  saveCloudSavingsBuckets,
} from './lib/savingsSync'
import {
  applyMoneyBookSyncOperations,
  buildMoneyBookSyncOperations,
  buildMoneyBookSyncRecords,
  diffMoneyBookSyncRecords,
  flushMoneyBookSyncQueue,
  hasMoneyBookMigrationRun,
  loadCloudMoneyBook,
  markMoneyBookMigrationRun,
  queueMoneyBookSyncOperations,
  saveCloudMoneyBook,
} from './lib/moneyBookSync'
import {
  applySharedGroupsSyncOperations,
  buildSharedGroupsSyncOperations,
  buildSharedGroupsSyncRecords,
  diffSharedGroupsSyncRecords,
  flushSharedGroupsSyncQueue,
  hasSharedGroupsMigrationRun,
  loadCloudSharedGroups,
  markSharedGroupsMigrationRun,
  queueSharedGroupsSyncOperations,
  saveCloudSharedGroups,
} from './lib/sharedGroupsSync'
import {
  applyReportHistorySyncOperations,
  buildReportHistorySyncOperations,
  buildReportHistorySyncRecords,
  diffReportHistorySyncRecords,
  flushReportHistorySyncQueue,
  hasReportHistoryMigrationRun,
  loadCloudReportHistory,
  markReportHistoryMigrationRun,
  queueReportHistorySyncOperations,
  saveCloudReportHistory,
} from './lib/reportHistorySync'
import {
  applyStatementMappingsSyncOperations,
  buildStatementMappingsSyncOperations,
  buildStatementMappingsSyncRecords,
  diffStatementMappingsSyncRecords,
  flushStatementMappingsSyncQueue,
  hasStatementMappingsMigrationRun,
  loadCloudStatementMappings,
  markStatementMappingsMigrationRun,
  normalizeStatementMappings,
  queueStatementMappingsSyncOperations,
  saveCloudStatementMappings,
} from './lib/statementMappingsSync'
import {
  applyVoiceMemorySyncOperations,
  buildVoiceMemorySyncOperations,
  buildVoiceMemorySyncRecords,
  diffVoiceMemorySyncRecords,
  flushVoiceMemorySyncQueue,
  hasVoiceMemoryMigrationRun,
  loadCloudVoiceMemory,
  markVoiceMemoryMigrationRun,
  normalizeVoiceMemory,
  queueVoiceMemorySyncOperations,
  saveCloudVoiceMemory,
} from './lib/voiceMemorySync'
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
import {
  ActionCard,
  AnimatedNumber,
  BottomSheet,
  FLoader,
  MoneyCard,
  MoneyOSProvider,
  SectionHeader,
  SecondaryButton,
  StatusBadge,
  SuccessState,
  defaultMoneyOSTheme,
  getMoneyOSThemeExperience,
  normalizeMoneyOSTheme,
} from './design-system'
import { focusInvalidField, slugify, titleCase } from './lib/uiHelpers'
import { applySeoMetadata, getSeoMetaForPath, isPublicSeoRoute, normalizeSeoPath } from './lib/seoRoutes.js'
import { trackActivation, trackEvent, trackFeatureUsage } from './lib/analytics'

const ActivityScreen = lazy(() => import('./screens/ActivityScreen.jsx'))
const DailyBookScreen = lazy(() => import('./screens/DailyBookScreen.jsx'))
const GoalsScreen = lazy(() => import('./screens/GoalsScreen.jsx'))
const LegalScreen = lazy(() => import('./screens/LegalScreen.jsx'))
const NotificationCenter = lazy(() => import('./components/NotificationCenter.jsx'))
const ProfileHub = lazy(() => import('./components/ProfileHub.jsx'))
const PublicSeoScreen = lazy(() => import('./screens/PublicSeoScreen.jsx'))
const QuickToolsSheet = lazy(() => import('./components/QuickToolsSheet.jsx'))
const ReportsScreen = lazy(() => import('./components/ReportsScreen.jsx'))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen.jsx'))
const TodayScreen = lazy(() => import('./screens/TodayScreen.jsx'))

function isLegacyMotion() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_MOTION__)
}

function syncLegacyMotionFlag() {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('fbply-legacy-motion', isLegacyMotion())
}

syncLegacyMotionFlag()
ensureMoneyScoreRollbackFlag()
ensureNextActionRollbackFlag()
ensureSmartFeedbackRollbackFlag()
ensureMoneyInboxRollbackFlag()

function ensureAuthRequiredRollbackFlag() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.__FBPLY_LEGACY_AUTH_REQUIRED__ === 'undefined') {
    window.__FBPLY_LEGACY_AUTH_REQUIRED__ = false
  }
}

function ensureQuickToolsRollbackFlag() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.__FBPLY_LEGACY_QUICK_TOOLS__ === 'undefined') {
    window.__FBPLY_LEGACY_QUICK_TOOLS__ = false
  }
}

ensureAuthRequiredRollbackFlag()
ensureQuickToolsRollbackFlag()

function motionSurfaceClassName(className = '') {
  return [className, !isLegacyMotion() && 'fbply-v8-motion-surface'].filter(Boolean).join(' ')
}

function isLegacyAddExperience() {
  return typeof window !== 'undefined' && window.__FBPLY_LEGACY_ADD__
}

function isLegacyFooterExperience() {
  return typeof window !== 'undefined' && Boolean(
    window.__FBPLY_LEGACY_FOOTER__ ||
    window.__FBPLY_LEGACY_PROFILE_HUB__,
  )
}

function isLegacyNavigation() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_NAVIGATION__)
}

function isLegacyDailyHero() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_DAILY_HERO__)
}

function isLegacyInsights() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_INSIGHTS__)
}

function isLegacyQuickTools() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_QUICK_TOOLS__)
}

function isLegacyAuthRequired() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_AUTH_REQUIRED__)
}

function resolveAnonymousFirstPhase({ hasSeenOnboarding, hasCompletedSetup }) {
  if (!hasSeenOnboarding) {
    return 'welcome'
  }

  if (isLegacyAuthRequired()) {
    return hasCompletedSetup && !isSupabaseReady ? 'app' : 'auth'
  }

  return 'app'
}

function resolveAuthenticatedPhase(setupCompleted) {
  return setupCompleted || !isLegacyAuthRequired() ? 'app' : 'setup'
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
        detail: 'Open the trip section. Add the amount, who paid, and a short note.',
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

const legacyNavItems = [
  { key: 'home', label: 'Today', icon: House },
  { key: 'history', label: 'Daily', ariaLabel: 'Daily Book', icon: Receipt },
  { key: 'planner', label: 'Savings', icon: Target },
  { key: 'reports', label: 'Reports', icon: ChartPie },
]

const companionNavItems = [
  { key: 'home', label: 'Home', ariaLabel: 'Home - Daily money notebook', icon: House },
  { key: 'ledger', label: 'Borrow', ariaLabel: 'Borrow and Lend - Money book', icon: CreditCard },
  { key: 'people', label: 'Split', ariaLabel: 'Split - Trip and shared expense notebook', icon: Plane },
  { key: 'account', label: 'Profile', ariaLabel: 'Profile - Money visuals, themes, backup, and support', icon: User },
]

const LEGACY_TAB_VIEW_EVENTS = {
  home: 'home_viewed',
  history: 'people_viewed',
  planner: 'savings_viewed',
  reports: 'reports_viewed',
  profile: 'profile_viewed',
}

const COMPANION_TAB_VIEW_EVENTS = {
  home: 'daily_viewed',
  ledger: 'reports_viewed',
  people: 'people_viewed',
  account: 'profile_viewed',
  reports: 'insights_viewed',
  history: 'tools_viewed',
  profile: 'profile_viewed',
}

const COMPANION_COMPAT_VIEW_EVENTS = {
  home: 'home_viewed',
  ledger: 'reports_viewed',
  people: 'people_viewed',
  account: 'profile_viewed',
  reports: 'reports_viewed',
  history: 'people_viewed',
}

function resolveNavigationTab(tab, useLegacyNavigation = isLegacyNavigation()) {
  if (useLegacyNavigation) {
    return tab
  }

  return {
    account: 'account',
    daily: 'home',
    home: 'home',
    insights: 'account',
    ledger: 'ledger',
    people: 'people',
    planner: 'account',
    profile: 'account',
    reports: 'account',
    review: 'account',
    savings: 'account',
    tools: 'home',
    history: 'people',
  }[tab] || tab
}

const fixedExpenseSuggestions = ['Rent', 'Electricity', 'Internet', 'Petrol', 'Shopping', 'Food', 'Subscription']
const QUICK_AMOUNT_PRESETS = [50, 100, 200, 500]

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
          'Uploaded statements are processed for review and reporting. Files and PDF passwords are not saved permanently.',
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
    title: 'Home is your notebook cover.',
    detail: 'Write today\'s expense, choose a page, preview recent notes, and see the next reminder.',
  },
  {
    tab: 'home',
    title: 'The plus button starts writing.',
    detail: 'Daily expense, Borrow/Lend, Trip Split, and Quick Tools live in one fast notebook menu.',
  },
  {
    tab: 'ledger',
    title: 'Ledger is the heart.',
    detail: 'Daily pages hold entries, search, filters, totals, and timeline rhythm.',
  },
  {
    tab: 'history',
    title: 'People money stays human.',
    detail: 'Borrow/Lend and Trip Split stay fast, readable, and settlement-first.',
  },
  {
    tab: 'home',
    title: 'Quick Tools stay tucked away.',
    detail: 'Calculator, GST, EMI, and split helpers open only when you need them.',
  },
  {
    tab: 'home',
    title: 'Settings stay secondary.',
    detail: 'Themes, profile, and advanced downloads stay out of the daily writing flow.',
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

function readLocalProfileCache(fallback = emptyProfile) {
  const storedProfile = readStoredJson('fbply-profile', fallback)
  return {
    ...fallback,
    ...(storedProfile && typeof storedProfile === 'object' ? storedProfile : {}),
  }
}

function readLocalSetupComplete(fallback = false) {
  return safeStorageGet('fbply-setup-complete', fallback ? 'true' : 'false') === 'true'
}

function withAuthProfile(profile = {}, user = {}) {
  return {
    ...profile,
    name: user.user_metadata?.name || user.user_metadata?.full_name || profile.name,
    email: user.email || profile.email,
  }
}

function writeProfileSetupCache(profile, setupCompleted) {
  safeStorageSetQueued('fbply-profile', JSON.stringify(profile))
  safeStorageSet('fbply-setup-complete', String(Boolean(setupCompleted)))
}

function profileSyncFailurePayload(error, stage) {
  return {
    surface: 'profile_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function authRedirectUrl() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.location.origin
}

function authErrorReason(error, fallback = 'auth_error') {
  return String(error?.code || error?.name || fallback).slice(0, 80)
}

function authErrorNotice(error, authMode = 'login') {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  const status = Number(error?.status || 0)
  const isEmailUnverified =
    code.includes('email_not_confirmed') ||
    code.includes('email_not_verified') ||
    /email.*not.*(confirmed|verified)/.test(message) ||
    /not.*(confirmed|verified)/.test(message)
  const isExistingAccount =
    code.includes('user_already_exists') ||
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already')
  const isWrongPassword =
    status === 400 ||
    code.includes('invalid_credentials') ||
    message.includes('invalid login') ||
    message.includes('invalid credentials')

  if (isEmailUnverified) {
    return {
      message: 'Account exists but email is not verified.',
      followUp: 'resend_verification',
      reason: 'email_not_verified',
    }
  }

  if (authMode === 'signup' && isExistingAccount) {
    return {
      message: 'Cloud backup already exists. Use existing backup.',
      followUp: 'sign_in',
      reason: 'account_exists',
    }
  }

  if (authMode === 'login' && isWrongPassword) {
    return {
      message: 'Email or password is incorrect. Please try again.',
      followUp: 'forgot_password',
      reason: 'invalid_login',
    }
  }

  return {
    message: error?.message || (authMode === 'signup' ? 'Cloud backup could not start. Please try again.' : 'Cloud backup could not open. Please try again.'),
    followUp: authMode === 'login' ? 'forgot_password' : null,
    reason: authErrorReason(error),
  }
}

function signupResultNotice(data) {
  const user = data?.user
  const identities = Array.isArray(user?.identities) ? user.identities : null
  const createdAt = Date.parse(user?.created_at || '')
  const isOlderUser = Number.isFinite(createdAt) && Date.now() - createdAt > 120000
  const isConfirmed = Boolean(user?.email_confirmed_at || user?.confirmed_at)

  if (identities && identities.length === 0) {
    return {
      message: 'Cloud backup already exists. Use existing backup.',
      followUp: 'sign_in',
      reason: 'account_exists',
    }
  }

  if (user && !data?.session && !isConfirmed && isOlderUser) {
    return {
      message: 'Account exists but email is not verified.',
      followUp: 'resend_verification',
      reason: 'email_not_verified',
    }
  }

  return null
}

function readLocalExpenseCache(fallback = []) {
  flushStorageQueue()
  const fallbackExpenses = Array.isArray(fallback) ? fallback : []
  const storedExpenses = readStoredJson('fbply-expenses', fallback)

  if (fallbackExpenses.length > 0) {
    return fallbackExpenses
  }

  return Array.isArray(storedExpenses) ? storedExpenses : fallbackExpenses
}

function readLocalSavingsBucketCache(fallback = []) {
  flushStorageQueue()
  const fallbackBuckets = normalizeSavingsBuckets(fallback)
  const storedBuckets = normalizeSavingsBuckets(readStoredJson('fbply-savings-buckets', fallbackBuckets))

  if (fallbackBuckets.length > 0) {
    return fallbackBuckets
  }

  return storedBuckets
}

function readLocalRecurringScheduleCache(fallback = []) {
  flushStorageQueue()
  const fallbackSchedules = normalizeRecurringSchedules(fallback)
  const storedSchedules = normalizeRecurringSchedules(readStoredJson('fbply-recurring-schedules', fallbackSchedules))

  if (fallbackSchedules.length > 0) {
    return fallbackSchedules
  }

  return storedSchedules
}

function readLocalSharedGroupsCache(fallback = []) {
  flushStorageQueue()
  const fallbackGroups = Array.isArray(fallback) ? fallback : []
  const storedGroups = readStoredJson('fbply-shared-groups', fallbackGroups)

  if (fallbackGroups.length > 0) {
    return fallbackGroups
  }

  return Array.isArray(storedGroups) ? storedGroups : fallbackGroups
}

function readLocalMoneyBookCache(fallback = []) {
  flushStorageQueue()
  const fallbackEntries = normalizeMoneyBookEntries(fallback)
  const storedEntries = normalizeMoneyBookEntries(readStoredJson('fbply-money-book', fallbackEntries))

  if (fallbackEntries.length > 0) {
    return fallbackEntries
  }

  return storedEntries
}

function readLocalReportHistoryCache(fallback = []) {
  flushStorageQueue()
  const fallbackHistory = normalizeReportHistory(fallback)
  const storedHistory = normalizeReportHistory(readStoredJson('fbply-report-history', fallbackHistory))

  if (fallbackHistory.length > 0) {
    return fallbackHistory
  }

  return storedHistory
}

function readLocalStatementMappingsCache(fallback = {}) {
  flushStorageQueue()
  const fallbackMappings = normalizeStatementMappings(fallback)
  const storedMappings = normalizeStatementMappings(readStoredJson('fbply-statement-category-mappings', fallbackMappings))

  if (Object.keys(fallbackMappings).length > 0) {
    return fallbackMappings
  }

  return storedMappings
}

function readLocalVoiceMemoryCache(fallback = {}) {
  flushStorageQueue()
  const fallbackMemory = normalizeVoiceMemory(fallback)
  const storedMemory = normalizeVoiceMemory(readStoredJson('fbply-voice-memory', fallbackMemory))

  if (Object.keys(fallbackMemory).length > 0) {
    return fallbackMemory
  }

  return storedMemory
}

function backupMigrationCompletedKey(userId) {
  return `fbply-backup-migration-completed-v1-${userId}`
}

function hasBackupMigrationCompleted(userId) {
  return Boolean(userId) && safeStorageGet(backupMigrationCompletedKey(userId), 'false') === 'true'
}

function markBackupMigrationCompleted(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(backupMigrationCompletedKey(userId), 'true')
}

function hasMeaningfulLocalBackupData() {
  flushStorageQueue()

  const localProfile = readLocalProfileCache(emptyProfile)
  const hasProfileData = Boolean(
    readLocalSetupComplete(false) ||
    String(localProfile.name || '').trim() ||
    String(localProfile.email || '').trim() ||
    normalizeMoney(localProfile.income) > 0 ||
    normalizeProfileCommitments(localProfile).length > 0,
  )

  return Boolean(
    hasProfileData ||
    normalizeExpenseRecords(readStoredJson('fbply-expenses', [])).length > 0 ||
    normalizeSavingsBuckets(readStoredJson('fbply-savings-buckets', [])).length > 0 ||
    normalizeRecurringSchedules(readStoredJson('fbply-recurring-schedules', [])).length > 0 ||
    buildSharedGroupsSyncRecords(readStoredJson('fbply-shared-groups', [])).length > 0 ||
    normalizeMoneyBookEntries(readStoredJson('fbply-money-book', [])).length > 0 ||
    normalizeReportHistory(readStoredJson('fbply-report-history', [])).length > 0 ||
    Object.keys(normalizeStatementMappings(readStoredJson('fbply-statement-category-mappings', {}))).length > 0 ||
    Object.keys(normalizeVoiceMemory(readStoredJson('fbply-voice-memory', {}))).length > 0,
  )
}

function writeExpenseCache(expenseRecords) {
  safeStorageSetQueued('fbply-expenses', JSON.stringify(Array.isArray(expenseRecords) ? expenseRecords : []))
}

function expenseSyncFailurePayload(error, stage) {
  return {
    surface: 'expense_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function commitmentSyncFailurePayload(error, stage) {
  return {
    surface: 'commitment_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function savingsSyncFailurePayload(error, stage) {
  return {
    surface: 'savings_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function moneyBookSyncFailurePayload(error, stage) {
  return {
    surface: 'money_book_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function sharedGroupsSyncFailurePayload(error, stage) {
  return {
    surface: 'shared_groups_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function reportHistorySyncFailurePayload(error, stage) {
  return {
    surface: 'report_history_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function statementMappingsSyncFailurePayload(error, stage) {
  return {
    surface: 'statement_mappings_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
  }
}

function voiceMemorySyncFailurePayload(error, stage) {
  return {
    surface: 'voice_memory_sync',
    stage,
    reason: String(error?.code || error?.name || 'unknown').slice(0, 80),
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

const ADD_HUB_SELECTION_EVENTS = {
  expense: 'add_expense_selected',
  income: 'add_income_selected',
  borrow: 'add_people_selected',
  transfer: 'add_other_actions_selected',
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
  const [moneyTheme, setMoneyTheme] = useState(() =>
    normalizeMoneyOSTheme(safeStorageGet('fbply-money-theme', defaultMoneyOSTheme)),
  )
  const [profile, setProfile] = useState(() => readLocalProfileCache(emptyProfile))
  const [expenses, setExpenses] = useState(() => readLocalExpenseCache([]))
  const [savingsBuckets, setSavingsBuckets] = useState(() =>
    readLocalSavingsBucketCache([]),
  )
  const [recurringSchedules, setRecurringSchedules] = useState(() =>
    readLocalRecurringScheduleCache([]),
  )
  const [sharedGroups, setSharedGroups] = useState(() => readLocalSharedGroupsCache([]))
  const [moneyBookEntries, setMoneyBookEntries] = useState(() =>
    readLocalMoneyBookCache([]),
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
  const [authFollowUp, setAuthFollowUp] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isAuthFollowUpBusy, setIsAuthFollowUpBusy] = useState(false)
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
  const profileRef = useRef(profile)
  const expensesRef = useRef(expenses)
  const savingsBucketsRef = useRef(savingsBuckets)
  const recurringSchedulesRef = useRef(recurringSchedules)
  const sharedGroupsRef = useRef(sharedGroups)
  const moneyBookEntriesRef = useRef(moneyBookEntries)
  const reportHistoryRef = useRef(reportHistory)
  const voiceMemoryRef = useRef(voiceMemory)
  const hasCompletedSetupRef = useRef(hasCompletedSetup)
  const hasTrackedAppOpenedRef = useRef(false)
  const hasTrackedAnonymousStartedRef = useRef(safeStorageGet('fbply-anonymous-started', 'false') === 'true')
  const skipNextProfileCloudSaveRef = useRef(false)
  const skipNextExpenseCloudSaveRef = useRef(false)
  const skipNextSavingsCloudSaveRef = useRef(false)
  const skipNextCommitmentCloudSaveRef = useRef(false)
  const skipNextSharedGroupsCloudSaveRef = useRef(false)
  const skipNextMoneyBookCloudSaveRef = useRef(false)
  const skipNextReportHistoryCloudSaveRef = useRef(false)
  const skipNextVoiceMemoryCloudSaveRef = useRef(false)
  const profileSaveSequenceRef = useRef(0)
  const expenseSaveSequenceRef = useRef(0)
  const savingsSaveSequenceRef = useRef(0)
  const commitmentSaveSequenceRef = useRef(0)
  const sharedGroupsSaveSequenceRef = useRef(0)
  const moneyBookSaveSequenceRef = useRef(0)
  const reportHistorySaveSequenceRef = useRef(0)
  const voiceMemorySaveSequenceRef = useRef(0)
  const previousSyncedExpensesRef = useRef(normalizeExpenseRecords(expenses))
  const previousSyncedSavingsRef = useRef(buildSavingsSyncRecords(savingsBuckets))
  const previousSyncedCommitmentsRef = useRef(buildCommitmentSyncRecords({ profile, recurringSchedules }))
  const previousSyncedSharedGroupsRef = useRef(buildSharedGroupsSyncRecords(sharedGroups))
  const previousSyncedMoneyBookRef = useRef(buildMoneyBookSyncRecords(moneyBookEntries))
  const previousSyncedReportHistoryRef = useRef(buildReportHistorySyncRecords(reportHistory))
  const previousSyncedStatementMappingsRef = useRef(
    normalizeStatementMappings(readStoredJson('fbply-statement-category-mappings', {})),
  )
  const previousSyncedVoiceMemoryRef = useRef(normalizeVoiceMemory(voiceMemory))
  const [isProfileSyncReady, setIsProfileSyncReady] = useState(() => !isSupabaseReady)
  const [isExpenseSyncReady, setIsExpenseSyncReady] = useState(() => !isSupabaseReady)
  const [isSavingsSyncReady, setIsSavingsSyncReady] = useState(() => !isSupabaseReady)
  const [isCommitmentSyncReady, setIsCommitmentSyncReady] = useState(() => !isSupabaseReady)
  const [isSharedGroupsSyncReady, setIsSharedGroupsSyncReady] = useState(() => !isSupabaseReady)
  const [isMoneyBookSyncReady, setIsMoneyBookSyncReady] = useState(() => !isSupabaseReady)
  const [isReportHistorySyncReady, setIsReportHistorySyncReady] = useState(() => !isSupabaseReady)
  const [isStatementMappingsSyncReady, setIsStatementMappingsSyncReady] = useState(() => !isSupabaseReady)
  const [isVoiceMemorySyncReady, setIsVoiceMemorySyncReady] = useState(() => !isSupabaseReady)
  const isOnline = useOnlineStatus()
  const activeCurrency = normalizeCurrency(profile.currency)
  const normalizedCurrentPath = normalizeSeoPath(currentPath)
  const isPublicSeoPage = isPublicSeoRoute(normalizedCurrentPath)
  setActiveCurrency(activeCurrency)

  useEffect(() => {
    ensureAuthRequiredRollbackFlag()
    ensureQuickToolsRollbackFlag()
    ensureMoneyScoreRollbackFlag()
    ensureNextActionRollbackFlag()
    ensureSmartFeedbackRollbackFlag()
    syncLegacyMotionFlag()
  })

  useEffect(() => {
    if (isPublicSeoPage || hasTrackedAppOpenedRef.current) {
      return
    }

    hasTrackedAppOpenedRef.current = true
    trackEvent('app_opened')
  }, [isPublicSeoPage])

  useEffect(() => {
    if (
      isPublicSeoPage ||
      phase !== 'app' ||
      authUser?.id ||
      hasTrackedAnonymousStartedRef.current
    ) {
      return
    }

    hasTrackedAnonymousStartedRef.current = true
    safeStorageSet('fbply-anonymous-started', 'true')
    trackEvent('anonymous_started', {
      surface: 'auth',
      storage: 'local_only',
    })
  }, [authUser?.id, isPublicSeoPage, phase])

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

      setPhase(resolveAnonymousFirstPhase({ hasSeenOnboarding, hasCompletedSetup }))
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
    const normalizedTheme = normalizeMoneyOSTheme(moneyTheme)
    document.documentElement.dataset.moneyTheme = normalizedTheme
    safeStorageSet('fbply-money-theme', normalizedTheme)
  }, [moneyTheme])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase, activeTab, currentPath])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    expensesRef.current = expenses
  }, [expenses])

  useEffect(() => {
    savingsBucketsRef.current = savingsBuckets
  }, [savingsBuckets])

  useEffect(() => {
    recurringSchedulesRef.current = recurringSchedules
  }, [recurringSchedules])

  useEffect(() => {
    sharedGroupsRef.current = sharedGroups
  }, [sharedGroups])

  useEffect(() => {
    moneyBookEntriesRef.current = moneyBookEntries
  }, [moneyBookEntries])

  useEffect(() => {
    reportHistoryRef.current = reportHistory
  }, [reportHistory])

  useEffect(() => {
    voiceMemoryRef.current = voiceMemory
  }, [voiceMemory])

  useEffect(() => {
    hasCompletedSetupRef.current = hasCompletedSetup
  }, [hasCompletedSetup])

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
      return undefined
    }

    const saveSequence = profileSaveSequenceRef.current + 1
    profileSaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      writeProfileSetupCache(profile, hasCompletedSetup)
      return undefined
    }

    if (!isProfileSyncReady) {
      return undefined
    }

    if (skipNextProfileCloudSaveRef.current) {
      skipNextProfileCloudSaveRef.current = false
      writeProfileSetupCache(profile, hasCompletedSetup)
      return undefined
    }

    let isCancelled = false
    const payload = profileToCloudPayload(authUser, profile, hasCompletedSetup)

    saveCloudProfile(supabase, payload)
      .then(() => {
        trackEvent('profile_cloud_saved', {
          surface: 'profile_sync',
          reason: 'profile_update',
        })
      })
      .catch((error) => {
        trackEvent('profile_sync_failed', profileSyncFailurePayload(error, 'save'))
      })
      .finally(() => {
        if (!isCancelled && profileSaveSequenceRef.current === saveSequence) {
          writeProfileSetupCache(profile, hasCompletedSetup)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [authUser, hasCompletedSetup, isProfileSyncReady, isPublicSeoPage, profile])

  useEffect(() => {
    if (isPublicSeoPage) {
      return undefined
    }

    const normalizedExpenses = normalizeExpenseRecords(expenses)
    const saveSequence = expenseSaveSequenceRef.current + 1
    expenseSaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      writeExpenseCache(expenses)
      previousSyncedExpensesRef.current = normalizedExpenses
      return undefined
    }

    if (!isExpenseSyncReady) {
      return undefined
    }

    if (skipNextExpenseCloudSaveRef.current) {
      skipNextExpenseCloudSaveRef.current = false
      writeExpenseCache(expenses)
      previousSyncedExpensesRef.current = normalizedExpenses
      return undefined
    }

    const diff = diffExpenseRecords(previousSyncedExpensesRef.current, expenses)

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      writeExpenseCache(expenses)
      previousSyncedExpensesRef.current = normalizedExpenses
      return undefined
    }

    const operations = buildExpenseSyncOperations(authUser, diff)

    if (!isOnline) {
      appendExpenseSyncQueue(authUser.id, operations)
      trackEvent('expense_sync_failed', expenseSyncFailurePayload({ name: 'offline' }, 'offline'))
      writeExpenseCache(expenses)
      previousSyncedExpensesRef.current = normalizedExpenses
      return undefined
    }

    let isCancelled = false

    const syncExpenses = async () => {
      try {
        const pendingOperations = readExpenseSyncQueue(authUser.id)

        if (pendingOperations.length > 0) {
          await applyExpenseSyncOperations(supabase, authUser, pendingOperations)
          clearExpenseSyncQueue(authUser.id)
        }

        await saveCloudExpenses(supabase, authUser, diff.upserts)
        await softDeleteCloudExpenses(supabase, authUser.id, diff.deletes)

        trackEvent('expense_cloud_saved', {
          surface: 'expense_sync',
          reason: 'expense_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
        })
      } catch (error) {
        if (!isCancelled) {
          appendExpenseSyncQueue(authUser.id, operations)
          trackEvent('expense_sync_failed', expenseSyncFailurePayload(error, 'save'))
        }
      } finally {
        if (!isCancelled && expenseSaveSequenceRef.current === saveSequence) {
          writeExpenseCache(expenses)
          previousSyncedExpensesRef.current = normalizedExpenses
        }
      }
    }

    syncExpenses()

    return () => {
      isCancelled = true
    }
  }, [authUser, expenses, isExpenseSyncReady, isOnline, isPublicSeoPage])

  useEffect(() => {
    if (isPublicSeoPage || !authUser?.id || !isSupabaseReady || !isExpenseSyncReady || !isOnline) {
      return undefined
    }

    const pendingOperations = readExpenseSyncQueue(authUser.id)

    if (pendingOperations.length === 0) {
      return undefined
    }

    let isCancelled = false

    applyExpenseSyncOperations(supabase, authUser, pendingOperations)
      .then(() => {
        if (isCancelled) {
          return
        }

        clearExpenseSyncQueue(authUser.id)
        trackEvent('expense_cloud_saved', {
          surface: 'expense_sync',
          reason: 'queue_flush',
          operation_count: pendingOperations.length,
        })
      })
      .catch((error) => {
        if (!isCancelled) {
          trackEvent('expense_sync_failed', expenseSyncFailurePayload(error, 'queue_flush'))
        }
      })

    return () => {
      isCancelled = true
    }
  }, [authUser, isExpenseSyncReady, isOnline, isPublicSeoPage])

  useEffect(() => {
    if (isPublicSeoPage) {
      return undefined
    }

    const normalizedCommitments = buildCommitmentSyncRecords({ profile, recurringSchedules })
    const saveSequence = commitmentSaveSequenceRef.current + 1
    commitmentSaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      previousSyncedCommitmentsRef.current = normalizedCommitments
      return undefined
    }

    if (!isCommitmentSyncReady) {
      return undefined
    }

    if (skipNextCommitmentCloudSaveRef.current) {
      skipNextCommitmentCloudSaveRef.current = false
      previousSyncedCommitmentsRef.current = normalizedCommitments
      return undefined
    }

    const diff = diffCommitmentState(previousSyncedCommitmentsRef.current, { profile, recurringSchedules })

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      previousSyncedCommitmentsRef.current = normalizedCommitments
      return undefined
    }

    const operations = buildCommitmentSyncOperations(authUser, diff)

    if (!isOnline) {
      appendCommitmentSyncQueue(authUser.id, operations)
      trackEvent('commitments_sync_failed', commitmentSyncFailurePayload({ name: 'offline' }, 'offline'))
      previousSyncedCommitmentsRef.current = diff.nextRecords
      return undefined
    }

    let isCancelled = false

    const syncCommitments = async () => {
      try {
        const pendingOperations = readCommitmentSyncQueue(authUser.id)

        if (pendingOperations.length > 0) {
          await applyCommitmentSyncOperations(supabase, authUser, pendingOperations)
          clearCommitmentSyncQueue(authUser.id)
        }

        await applyCommitmentSyncOperations(supabase, authUser, operations)

        trackEvent('commitments_cloud_saved', {
          surface: 'commitment_sync',
          reason: 'commitment_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
        })
      } catch (error) {
        if (!isCancelled) {
          appendCommitmentSyncQueue(authUser.id, operations)
          trackEvent('commitments_sync_failed', commitmentSyncFailurePayload(error, 'save'))
        }
      } finally {
        if (!isCancelled && commitmentSaveSequenceRef.current === saveSequence) {
          previousSyncedCommitmentsRef.current = diff.nextRecords
        }
      }
    }

    syncCommitments()

    return () => {
      isCancelled = true
    }
  }, [authUser, isCommitmentSyncReady, isOnline, isPublicSeoPage, profile, recurringSchedules])

  useEffect(() => {
    if (isPublicSeoPage || !authUser?.id || !isSupabaseReady || !isCommitmentSyncReady || !isOnline) {
      return undefined
    }

    const pendingOperations = readCommitmentSyncQueue(authUser.id)

    if (pendingOperations.length === 0) {
      return undefined
    }

    let isCancelled = false

    applyCommitmentSyncOperations(supabase, authUser, pendingOperations)
      .then(() => {
        if (isCancelled) {
          return
        }

        clearCommitmentSyncQueue(authUser.id)
        trackEvent('commitments_cloud_saved', {
          surface: 'commitment_sync',
          reason: 'queue_flush',
          operation_count: pendingOperations.length,
        })
      })
      .catch((error) => {
        if (!isCancelled) {
          trackEvent('commitments_sync_failed', commitmentSyncFailurePayload(error, 'queue_flush'))
        }
      })

    return () => {
      isCancelled = true
    }
  }, [authUser, isCommitmentSyncReady, isOnline, isPublicSeoPage])

  useEffect(() => {
    if (isPublicSeoPage) {
      return undefined
    }

    const normalizedSavings = buildSavingsSyncRecords(savingsBuckets)
    const saveSequence = savingsSaveSequenceRef.current + 1
    savingsSaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      previousSyncedSavingsRef.current = normalizedSavings
      return undefined
    }

    if (!isSavingsSyncReady) {
      return undefined
    }

    if (skipNextSavingsCloudSaveRef.current) {
      skipNextSavingsCloudSaveRef.current = false
      previousSyncedSavingsRef.current = normalizedSavings
      return undefined
    }

    const diff = diffSavingsSyncRecords(previousSyncedSavingsRef.current, savingsBuckets)

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      previousSyncedSavingsRef.current = normalizedSavings
      return undefined
    }

    const operations = buildSavingsSyncOperations(authUser, diff)

    if (!isOnline) {
      queueSavingsSyncOperations(authUser.id, operations)
      trackEvent('savings_sync_failed', savingsSyncFailurePayload({ name: 'offline' }, 'offline'))
      previousSyncedSavingsRef.current = diff.nextRecords
      return undefined
    }

    let isCancelled = false

    const syncSavings = async () => {
      try {
        const flushed = await flushSavingsSyncQueue(supabase, authUser)

        await applySavingsSyncOperations(supabase, authUser, operations)

        trackEvent('savings_cloud_saved', {
          surface: 'savings_sync',
          reason: flushed.operationCount > 0 ? 'queue_flush_and_update' : 'savings_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
          queued_operation_count: flushed.operationCount,
        })
      } catch (error) {
        if (!isCancelled) {
          queueSavingsSyncOperations(authUser.id, operations)
          trackEvent('savings_sync_failed', savingsSyncFailurePayload(error, 'save'))
        }
      } finally {
        if (!isCancelled && savingsSaveSequenceRef.current === saveSequence) {
          previousSyncedSavingsRef.current = diff.nextRecords
        }
      }
    }

    syncSavings()

    return () => {
      isCancelled = true
    }
  }, [authUser, isOnline, isPublicSeoPage, isSavingsSyncReady, savingsBuckets])

  useEffect(() => {
    if (isPublicSeoPage || !authUser?.id || !isSupabaseReady || !isSavingsSyncReady || !isOnline) {
      return undefined
    }

    let isCancelled = false

    flushSavingsSyncQueue(supabase, authUser)
      .then((result) => {
        if (isCancelled || !result.operationCount) {
          return
        }

        trackEvent('savings_cloud_saved', {
          surface: 'savings_sync',
          reason: 'queue_flush',
          operation_count: result.operationCount,
        })
      })
      .catch((error) => {
        if (!isCancelled) {
          trackEvent('savings_sync_failed', savingsSyncFailurePayload(error, 'queue_flush'))
        }
      })

    return () => {
      isCancelled = true
    }
  }, [authUser, isOnline, isPublicSeoPage, isSavingsSyncReady])

  useEffect(() => {
    if (isPublicSeoPage) {
      return undefined
    }

    const normalizedGroups = buildSharedGroupsSyncRecords(sharedGroups)
    const saveSequence = sharedGroupsSaveSequenceRef.current + 1
    sharedGroupsSaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      previousSyncedSharedGroupsRef.current = normalizedGroups
      return undefined
    }

    if (!isSharedGroupsSyncReady) {
      return undefined
    }

    if (skipNextSharedGroupsCloudSaveRef.current) {
      skipNextSharedGroupsCloudSaveRef.current = false
      previousSyncedSharedGroupsRef.current = normalizedGroups
      return undefined
    }

    const diff = diffSharedGroupsSyncRecords(previousSyncedSharedGroupsRef.current, sharedGroups)

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      previousSyncedSharedGroupsRef.current = normalizedGroups
      return undefined
    }

    const operations = buildSharedGroupsSyncOperations(authUser, diff)

    if (!isOnline) {
      queueSharedGroupsSyncOperations(authUser.id, operations)
      trackEvent('shared_groups_sync_failed', sharedGroupsSyncFailurePayload({ name: 'offline' }, 'offline'))
      previousSyncedSharedGroupsRef.current = diff.nextRecords
      return undefined
    }

    let isCancelled = false

    const syncSharedGroups = async () => {
      try {
        const flushed = await flushSharedGroupsSyncQueue(supabase, authUser)

        await applySharedGroupsSyncOperations(supabase, authUser, operations)

        trackEvent('shared_groups_cloud_saved', {
          surface: 'shared_groups_sync',
          reason: flushed.operationCount > 0 ? 'queue_flush_and_update' : 'shared_groups_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
          queued_operation_count: flushed.operationCount,
        })
      } catch (error) {
        if (!isCancelled) {
          queueSharedGroupsSyncOperations(authUser.id, operations)
          trackEvent('shared_groups_sync_failed', sharedGroupsSyncFailurePayload(error, 'save'))
        }
      } finally {
        if (!isCancelled && sharedGroupsSaveSequenceRef.current === saveSequence) {
          previousSyncedSharedGroupsRef.current = diff.nextRecords
        }
      }
    }

    syncSharedGroups()

    return () => {
      isCancelled = true
    }
  }, [authUser, isOnline, isPublicSeoPage, isSharedGroupsSyncReady, sharedGroups])

  useEffect(() => {
    if (isPublicSeoPage) {
      return undefined
    }

    const normalizedEntries = buildMoneyBookSyncRecords(moneyBookEntries)
    const saveSequence = moneyBookSaveSequenceRef.current + 1
    moneyBookSaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      previousSyncedMoneyBookRef.current = normalizedEntries
      return undefined
    }

    if (!isMoneyBookSyncReady) {
      return undefined
    }

    if (skipNextMoneyBookCloudSaveRef.current) {
      skipNextMoneyBookCloudSaveRef.current = false
      previousSyncedMoneyBookRef.current = normalizedEntries
      return undefined
    }

    const diff = diffMoneyBookSyncRecords(previousSyncedMoneyBookRef.current, moneyBookEntries)

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      previousSyncedMoneyBookRef.current = normalizedEntries
      return undefined
    }

    const operations = buildMoneyBookSyncOperations(authUser, diff)

    if (!isOnline) {
      queueMoneyBookSyncOperations(authUser.id, operations)
      trackEvent('money_book_sync_failed', moneyBookSyncFailurePayload({ name: 'offline' }, 'offline'))
      previousSyncedMoneyBookRef.current = diff.nextRecords
      return undefined
    }

    let isCancelled = false

    const syncMoneyBook = async () => {
      try {
        const flushed = await flushMoneyBookSyncQueue(supabase, authUser)

        await applyMoneyBookSyncOperations(supabase, authUser, operations)

        trackEvent('money_book_cloud_saved', {
          surface: 'money_book_sync',
          reason: flushed.operationCount > 0 ? 'queue_flush_and_update' : 'money_book_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
          queued_operation_count: flushed.operationCount,
        })
      } catch (error) {
        if (!isCancelled) {
          queueMoneyBookSyncOperations(authUser.id, operations)
          trackEvent('money_book_sync_failed', moneyBookSyncFailurePayload(error, 'save'))
        }
      } finally {
        if (!isCancelled && moneyBookSaveSequenceRef.current === saveSequence) {
          previousSyncedMoneyBookRef.current = diff.nextRecords
        }
      }
    }

    syncMoneyBook()

    return () => {
      isCancelled = true
    }
  }, [authUser, isMoneyBookSyncReady, isOnline, isPublicSeoPage, moneyBookEntries])

  useEffect(() => {
    if (isPublicSeoPage) {
      return undefined
    }

    const normalizedHistory = buildReportHistorySyncRecords(reportHistory)
    const saveSequence = reportHistorySaveSequenceRef.current + 1
    reportHistorySaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      previousSyncedReportHistoryRef.current = normalizedHistory
      return undefined
    }

    if (!isReportHistorySyncReady) {
      return undefined
    }

    if (skipNextReportHistoryCloudSaveRef.current) {
      skipNextReportHistoryCloudSaveRef.current = false
      previousSyncedReportHistoryRef.current = normalizedHistory
      return undefined
    }

    const diff = diffReportHistorySyncRecords(previousSyncedReportHistoryRef.current, reportHistory)

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      previousSyncedReportHistoryRef.current = normalizedHistory
      return undefined
    }

    const operations = buildReportHistorySyncOperations(authUser, diff)

    if (!isOnline) {
      queueReportHistorySyncOperations(authUser.id, operations)
      trackEvent('report_history_sync_failed', reportHistorySyncFailurePayload({ name: 'offline' }, 'offline'))
      previousSyncedReportHistoryRef.current = diff.nextRecords
      return undefined
    }

    let isCancelled = false

    const syncReportHistory = async () => {
      try {
        const flushed = await flushReportHistorySyncQueue(supabase, authUser)

        await applyReportHistorySyncOperations(supabase, authUser, operations)

        trackEvent('report_history_cloud_saved', {
          surface: 'report_history_sync',
          reason: flushed.operationCount > 0 ? 'queue_flush_and_update' : 'report_history_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
          queued_operation_count: flushed.operationCount,
        })
      } catch (error) {
        if (!isCancelled) {
          queueReportHistorySyncOperations(authUser.id, operations)
          trackEvent('report_history_sync_failed', reportHistorySyncFailurePayload(error, 'save'))
        }
      } finally {
        if (!isCancelled && reportHistorySaveSequenceRef.current === saveSequence) {
          previousSyncedReportHistoryRef.current = diff.nextRecords
        }
      }
    }

    syncReportHistory()

    return () => {
      isCancelled = true
    }
  }, [authUser, isOnline, isPublicSeoPage, isReportHistorySyncReady, reportHistory])

  useEffect(() => {
    if (isPublicSeoPage) {
      return undefined
    }

    const normalizedMemory = normalizeVoiceMemory(voiceMemory)
    const saveSequence = voiceMemorySaveSequenceRef.current + 1
    voiceMemorySaveSequenceRef.current = saveSequence

    if (!authUser?.id || !isSupabaseReady) {
      previousSyncedVoiceMemoryRef.current = normalizedMemory
      return undefined
    }

    if (!isVoiceMemorySyncReady) {
      return undefined
    }

    if (skipNextVoiceMemoryCloudSaveRef.current) {
      skipNextVoiceMemoryCloudSaveRef.current = false
      previousSyncedVoiceMemoryRef.current = normalizedMemory
      return undefined
    }

    const diff = diffVoiceMemorySyncRecords(previousSyncedVoiceMemoryRef.current, voiceMemory)

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      previousSyncedVoiceMemoryRef.current = normalizedMemory
      return undefined
    }

    const operations = buildVoiceMemorySyncOperations(authUser, diff)

    if (!isOnline) {
      queueVoiceMemorySyncOperations(authUser.id, operations)
      trackEvent('voice_memory_sync_failed', voiceMemorySyncFailurePayload({ name: 'offline' }, 'offline'))
      previousSyncedVoiceMemoryRef.current = normalizedMemory
      return undefined
    }

    let isCancelled = false

    const syncVoiceMemory = async () => {
      try {
        const flushed = await flushVoiceMemorySyncQueue(supabase, authUser)

        await applyVoiceMemorySyncOperations(supabase, authUser, operations)

        trackEvent('voice_memory_cloud_saved', {
          surface: 'voice_memory_sync',
          reason: flushed.operationCount > 0 ? 'queue_flush_and_update' : 'voice_memory_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
          queued_operation_count: flushed.operationCount,
        })
      } catch (error) {
        if (!isCancelled) {
          queueVoiceMemorySyncOperations(authUser.id, operations)
          trackEvent('voice_memory_sync_failed', voiceMemorySyncFailurePayload(error, 'save'))
        }
      } finally {
        if (!isCancelled && voiceMemorySaveSequenceRef.current === saveSequence) {
          previousSyncedVoiceMemoryRef.current = normalizedMemory
        }
      }
    }

    syncVoiceMemory()

    return () => {
      isCancelled = true
    }
  }, [authUser, isOnline, isPublicSeoPage, isVoiceMemorySyncReady, voiceMemory])

  useEffect(() => {
    if (
      isPublicSeoPage ||
      !authUser?.id ||
      !isSupabaseReady ||
      !isOnline ||
      !isSharedGroupsSyncReady ||
      !isMoneyBookSyncReady ||
      !isReportHistorySyncReady ||
      !isStatementMappingsSyncReady ||
      !isVoiceMemorySyncReady
    ) {
      return undefined
    }

    let isCancelled = false

    const flushRemainingQueues = async () => {
      const queueFlushes = [
        {
          flush: () => flushSharedGroupsSyncQueue(supabase, authUser),
          savedEvent: 'shared_groups_cloud_saved',
          failedEvent: 'shared_groups_sync_failed',
          failurePayload: sharedGroupsSyncFailurePayload,
          surface: 'shared_groups_sync',
        },
        {
          flush: () => flushMoneyBookSyncQueue(supabase, authUser),
          savedEvent: 'money_book_cloud_saved',
          failedEvent: 'money_book_sync_failed',
          failurePayload: moneyBookSyncFailurePayload,
          surface: 'money_book_sync',
        },
        {
          flush: () => flushReportHistorySyncQueue(supabase, authUser),
          savedEvent: 'report_history_cloud_saved',
          failedEvent: 'report_history_sync_failed',
          failurePayload: reportHistorySyncFailurePayload,
          surface: 'report_history_sync',
        },
        {
          flush: () => flushStatementMappingsSyncQueue(supabase, authUser),
          savedEvent: 'statement_mappings_cloud_saved',
          failedEvent: 'statement_mappings_sync_failed',
          failurePayload: statementMappingsSyncFailurePayload,
          surface: 'statement_mappings_sync',
        },
        {
          flush: () => flushVoiceMemorySyncQueue(supabase, authUser),
          savedEvent: 'voice_memory_cloud_saved',
          failedEvent: 'voice_memory_sync_failed',
          failurePayload: voiceMemorySyncFailurePayload,
          surface: 'voice_memory_sync',
        },
      ]

      for (const item of queueFlushes) {
        try {
          const result = await item.flush()

          if (!isCancelled && result.operationCount > 0) {
            trackEvent(item.savedEvent, {
              surface: item.surface,
              reason: 'queue_flush',
              operation_count: result.operationCount,
            })
          }
        } catch (error) {
          if (!isCancelled) {
            trackEvent(item.failedEvent, item.failurePayload(error, 'queue_flush'))
          }
        }
      }
    }

    flushRemainingQueues()

    return () => {
      isCancelled = true
    }
  }, [
    authUser,
    isMoneyBookSyncReady,
    isOnline,
    isPublicSeoPage,
    isReportHistorySyncReady,
    isSharedGroupsSyncReady,
    isStatementMappingsSyncReady,
    isVoiceMemorySyncReady,
  ])

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

  const loadProfileForUser = useCallback(async (user, source = 'session') => {
    if (!user?.id || !isSupabaseReady) {
      applyAuthUser(user)
      setIsProfileSyncReady(true)
      return {
        profile: profileRef.current,
        setupCompleted: hasCompletedSetupRef.current,
      }
    }

    setAuthUser(user)
    setIsProfileSyncReady(false)

    const localProfile = withAuthProfile(readLocalProfileCache(profileRef.current), user)
    const localSetupCompleted = readLocalSetupComplete(hasCompletedSetupRef.current)

    try {
      const cloudProfile = await loadCloudProfile(supabase, user.id)

      if (cloudProfile) {
        const synced = cloudRowToProfile(cloudProfile, localProfile, localSetupCompleted)
        skipNextProfileCloudSaveRef.current = true
        setProfile(synced.profile)
        setHasCompletedSetup(synced.setupCompleted)

        if (synced.setupCompleted) {
          setHasSeenOnboarding(true)
        }

        trackEvent('profile_cloud_loaded', {
          surface: 'profile_sync',
          source,
        })

        return synced
      }

      skipNextProfileCloudSaveRef.current = true
      setProfile(localProfile)
      setHasCompletedSetup(localSetupCompleted)

      if (localSetupCompleted) {
        setHasSeenOnboarding(true)
      }

      if (!hasProfileMigrationRun(user.id) && hasLocalProfileData(localProfile, localSetupCompleted)) {
        try {
          const payload = profileToCloudPayload(user, localProfile, localSetupCompleted)
          await saveCloudProfile(supabase, payload)
          markProfileMigrationRun(user.id)
          trackEvent('profile_migrated', {
            surface: 'profile_sync',
            source,
          })
          trackEvent('profile_cloud_saved', {
            surface: 'profile_sync',
            reason: 'migration',
          })
        } catch (error) {
          trackEvent('profile_sync_failed', profileSyncFailurePayload(error, 'migrate'))
        }
      }

      return {
        profile: localProfile,
        setupCompleted: localSetupCompleted,
      }
    } catch (error) {
      skipNextProfileCloudSaveRef.current = true
      setProfile(localProfile)
      setHasCompletedSetup(localSetupCompleted)

      if (localSetupCompleted) {
        setHasSeenOnboarding(true)
      }

      trackEvent('profile_sync_failed', profileSyncFailurePayload(error, 'load'))

      return {
        profile: localProfile,
        setupCompleted: localSetupCompleted,
        failed: true,
      }
    } finally {
      setIsProfileSyncReady(true)
    }
  }, [applyAuthUser])

  const loadExpensesForUser = useCallback(async (user, source = 'session') => {
    const localExpenses = readLocalExpenseCache(expensesRef.current)
    const normalizedLocalExpenses = normalizeExpenseRecords(localExpenses)

    if (!user?.id || !isSupabaseReady) {
      skipNextExpenseCloudSaveRef.current = true
      setExpenses(localExpenses)
      previousSyncedExpensesRef.current = normalizedLocalExpenses
      setIsExpenseSyncReady(true)
      return {
        expenses: localExpenses,
      }
    }

    setIsExpenseSyncReady(false)

    try {
      const pendingOperations = readExpenseSyncQueue(user.id)

      if (pendingOperations.length > 0) {
        await applyExpenseSyncOperations(supabase, user, pendingOperations)
        clearExpenseSyncQueue(user.id)
      }

      const cloudExpenses = await loadCloudExpenses(supabase, user.id)

      if (cloudExpenses.length > 0) {
        skipNextExpenseCloudSaveRef.current = true
        setExpenses(cloudExpenses)
        previousSyncedExpensesRef.current = normalizeExpenseRecords(cloudExpenses)
        trackEvent('expense_cloud_loaded', {
          surface: 'expense_sync',
          source,
          record_count: cloudExpenses.length,
        })
        return {
          expenses: cloudExpenses,
        }
      }

      skipNextExpenseCloudSaveRef.current = true
      setExpenses(localExpenses)
      previousSyncedExpensesRef.current = normalizedLocalExpenses

      if (!hasExpenseMigrationRun(user.id)) {
        if (normalizedLocalExpenses.length > 0) {
          try {
            await saveCloudExpenses(supabase, user, normalizedLocalExpenses)
            trackEvent('expense_migrated', {
              surface: 'expense_sync',
              source,
              record_count: normalizedLocalExpenses.length,
            })
            trackEvent('expense_cloud_saved', {
              surface: 'expense_sync',
              reason: 'migration',
              upsert_count: normalizedLocalExpenses.length,
              delete_count: 0,
            })
          } catch (error) {
            appendExpenseSyncQueue(user.id, buildExpenseSyncOperations(user, { upserts: normalizedLocalExpenses }))
            trackEvent('expense_sync_failed', expenseSyncFailurePayload(error, 'migrate'))
          }
        }

        markExpenseMigrationRun(user.id)
      }

      return {
        expenses: localExpenses,
      }
    } catch (error) {
      skipNextExpenseCloudSaveRef.current = true
      setExpenses(localExpenses)
      previousSyncedExpensesRef.current = normalizedLocalExpenses
      trackEvent('expense_sync_failed', expenseSyncFailurePayload(error, 'load'))

      return {
        expenses: localExpenses,
        failed: true,
      }
    } finally {
      setIsExpenseSyncReady(true)
    }
  }, [])

  const loadSavingsForUser = useCallback(async (user, source = 'session') => {
    const localSavingsBuckets = readLocalSavingsBucketCache(savingsBucketsRef.current)
    const normalizedLocalSavings = buildSavingsSyncRecords(localSavingsBuckets)

    if (!user?.id || !isSupabaseReady) {
      skipNextSavingsCloudSaveRef.current = true
      setSavingsBuckets(localSavingsBuckets)
      previousSyncedSavingsRef.current = normalizedLocalSavings
      setIsSavingsSyncReady(true)
      return {
        savingsBuckets: localSavingsBuckets,
      }
    }

    setIsSavingsSyncReady(false)

    try {
      const flushed = await flushSavingsSyncQueue(supabase, user)

      if (flushed.operationCount > 0) {
        trackEvent('savings_cloud_saved', {
          surface: 'savings_sync',
          reason: 'login_queue_flush',
          operation_count: flushed.operationCount,
        })
      }

      const cloudSavingsState = await loadCloudSavingsBucketState(supabase, user.id)
      const cloudSavingsBuckets = cloudSavingsState.buckets

      if (cloudSavingsState.rowCount > 0) {
        skipNextSavingsCloudSaveRef.current = true
        setSavingsBuckets(cloudSavingsBuckets)
        previousSyncedSavingsRef.current = buildSavingsSyncRecords(cloudSavingsBuckets)
        trackEvent('savings_cloud_loaded', {
          surface: 'savings_sync',
          source,
          record_count: cloudSavingsBuckets.length,
          cloud_row_count: cloudSavingsState.rowCount,
        })
        return {
          savingsBuckets: cloudSavingsBuckets,
        }
      }

      skipNextSavingsCloudSaveRef.current = true
      setSavingsBuckets(localSavingsBuckets)
      previousSyncedSavingsRef.current = normalizedLocalSavings

      if (!hasSavingsMigrationRun(user.id) && normalizedLocalSavings.length > 0) {
        try {
          await saveCloudSavingsBuckets(supabase, user, normalizedLocalSavings)
          markSavingsMigrationRun(user.id)
          trackEvent('savings_migrated', {
            surface: 'savings_sync',
            source,
            record_count: normalizedLocalSavings.length,
          })
          trackEvent('savings_cloud_saved', {
            surface: 'savings_sync',
            reason: 'migration',
            upsert_count: normalizedLocalSavings.length,
            delete_count: 0,
          })
        } catch (error) {
          queueSavingsSyncOperations(
            user.id,
            buildSavingsSyncOperations(user, { upserts: normalizedLocalSavings }),
          )
          trackEvent('savings_sync_failed', savingsSyncFailurePayload(error, 'migrate'))
        }
      }

      return {
        savingsBuckets: localSavingsBuckets,
      }
    } catch (error) {
      skipNextSavingsCloudSaveRef.current = true
      setSavingsBuckets(localSavingsBuckets)
      previousSyncedSavingsRef.current = normalizedLocalSavings
      trackEvent('savings_sync_failed', savingsSyncFailurePayload(error, 'load'))

      return {
        savingsBuckets: localSavingsBuckets,
        failed: true,
      }
    } finally {
      setIsSavingsSyncReady(true)
    }
  }, [])

  const loadCommitmentsForUser = useCallback(async (user, source = 'session') => {
    flushStorageQueue()
    const currentProfileCommitments = normalizeProfileCommitments(profileRef.current)
    const storedProfileCommitments = normalizeProfileCommitments(readLocalProfileCache(profileRef.current))
    const localProfileCommitments = currentProfileCommitments.length > 0
      ? currentProfileCommitments
      : storedProfileCommitments
    const localRecurringSchedules = readLocalRecurringScheduleCache(recurringSchedulesRef.current)
    const localCommitmentState = {
      profile: {
        commitments: localProfileCommitments,
      },
      recurringSchedules: localRecurringSchedules,
    }
    const normalizedLocalCommitments = buildCommitmentSyncRecords(localCommitmentState)

    if (!user?.id || !isSupabaseReady) {
      skipNextCommitmentCloudSaveRef.current = true
      skipNextProfileCloudSaveRef.current = true
      setProfile((current) => ({ ...current, commitments: localProfileCommitments }))
      setRecurringSchedules(localRecurringSchedules)
      previousSyncedCommitmentsRef.current = normalizedLocalCommitments
      setIsCommitmentSyncReady(true)
      return localCommitmentState
    }

    setIsCommitmentSyncReady(false)

    try {
      const pendingOperations = readCommitmentSyncQueue(user.id)

      if (pendingOperations.length > 0) {
        await applyCommitmentSyncOperations(supabase, user, pendingOperations)
        clearCommitmentSyncQueue(user.id)
      }

      const cloudCommitments = await loadCloudCommitments(supabase, user.id)

      if (cloudCommitments.syncRecords.length > 0) {
        skipNextCommitmentCloudSaveRef.current = true
        skipNextProfileCloudSaveRef.current = true
        setProfile((current) => ({ ...current, commitments: cloudCommitments.profileCommitments }))
        setRecurringSchedules(cloudCommitments.recurringSchedules)
        previousSyncedCommitmentsRef.current = cloudCommitments.syncRecords
        trackEvent('commitments_cloud_loaded', {
          surface: 'commitment_sync',
          source,
          record_count: cloudCommitments.syncRecords.length,
          profile_count: cloudCommitments.profileCommitments.length,
          schedule_count: cloudCommitments.recurringSchedules.length,
        })
        return cloudCommitments
      }

      skipNextCommitmentCloudSaveRef.current = true
      skipNextProfileCloudSaveRef.current = true
      setProfile((current) => ({ ...current, commitments: localProfileCommitments }))
      setRecurringSchedules(localRecurringSchedules)
      previousSyncedCommitmentsRef.current = normalizedLocalCommitments

      if (!hasCommitmentMigrationRun(user.id)) {
        if (hasLocalCommitmentData(localCommitmentState)) {
          try {
            await saveCloudCommitments(supabase, user, localCommitmentState)
            trackEvent('commitments_migrated', {
              surface: 'commitment_sync',
              source,
              record_count: normalizedLocalCommitments.length,
              profile_count: localProfileCommitments.length,
              schedule_count: localRecurringSchedules.length,
            })
            trackEvent('commitments_cloud_saved', {
              surface: 'commitment_sync',
              reason: 'migration',
              upsert_count: normalizedLocalCommitments.length,
              delete_count: 0,
            })
          } catch (error) {
            appendCommitmentSyncQueue(
              user.id,
              buildCommitmentSyncOperations(user, { upserts: normalizedLocalCommitments }),
            )
            trackEvent('commitments_sync_failed', commitmentSyncFailurePayload(error, 'migrate'))
          }
        }

        markCommitmentMigrationRun(user.id)
      }

      return localCommitmentState
    } catch (error) {
      skipNextCommitmentCloudSaveRef.current = true
      skipNextProfileCloudSaveRef.current = true
      setProfile((current) => ({ ...current, commitments: localProfileCommitments }))
      setRecurringSchedules(localRecurringSchedules)
      previousSyncedCommitmentsRef.current = normalizedLocalCommitments
      trackEvent('commitments_sync_failed', commitmentSyncFailurePayload(error, 'load'))

      return {
        ...localCommitmentState,
        failed: true,
      }
    } finally {
      setIsCommitmentSyncReady(true)
    }
  }, [])

  const loadSharedGroupsForUser = useCallback(async (user, source = 'session') => {
    const localSharedGroups = readLocalSharedGroupsCache(sharedGroupsRef.current)
    const normalizedLocalGroups = buildSharedGroupsSyncRecords(localSharedGroups)

    if (!user?.id || !isSupabaseReady) {
      skipNextSharedGroupsCloudSaveRef.current = true
      setSharedGroups(localSharedGroups)
      previousSyncedSharedGroupsRef.current = normalizedLocalGroups
      setIsSharedGroupsSyncReady(true)
      return {
        sharedGroups: localSharedGroups,
      }
    }

    setIsSharedGroupsSyncReady(false)

    try {
      const flushed = await flushSharedGroupsSyncQueue(supabase, user)

      if (flushed.operationCount > 0) {
        trackEvent('shared_groups_cloud_saved', {
          surface: 'shared_groups_sync',
          reason: 'login_queue_flush',
          operation_count: flushed.operationCount,
        })
      }

      const cloudSharedGroups = await loadCloudSharedGroups(supabase, user.id)

      if (cloudSharedGroups.rowCount > 0) {
        skipNextSharedGroupsCloudSaveRef.current = true
        setSharedGroups(cloudSharedGroups.groups)
        previousSyncedSharedGroupsRef.current = cloudSharedGroups.records
        trackEvent('shared_groups_cloud_loaded', {
          surface: 'shared_groups_sync',
          source,
          record_count: cloudSharedGroups.groups.length,
          cloud_row_count: cloudSharedGroups.rowCount,
        })
        return cloudSharedGroups
      }

      skipNextSharedGroupsCloudSaveRef.current = true
      setSharedGroups(localSharedGroups)
      previousSyncedSharedGroupsRef.current = normalizedLocalGroups

      if (!hasSharedGroupsMigrationRun(user.id) && normalizedLocalGroups.length > 0) {
        try {
          await saveCloudSharedGroups(supabase, user, localSharedGroups)
          markSharedGroupsMigrationRun(user.id)
          trackEvent('shared_groups_migrated', {
            surface: 'shared_groups_sync',
            source,
            record_count: normalizedLocalGroups.length,
          })
          trackEvent('shared_groups_cloud_saved', {
            surface: 'shared_groups_sync',
            reason: 'migration',
            upsert_count: normalizedLocalGroups.length,
            delete_count: 0,
          })
        } catch (error) {
          queueSharedGroupsSyncOperations(
            user.id,
            buildSharedGroupsSyncOperations(user, { upserts: normalizedLocalGroups }),
          )
          trackEvent('shared_groups_sync_failed', sharedGroupsSyncFailurePayload(error, 'migrate'))
        }
      }

      return {
        sharedGroups: localSharedGroups,
      }
    } catch (error) {
      skipNextSharedGroupsCloudSaveRef.current = true
      setSharedGroups(localSharedGroups)
      previousSyncedSharedGroupsRef.current = normalizedLocalGroups
      trackEvent('shared_groups_sync_failed', sharedGroupsSyncFailurePayload(error, 'load'))

      return {
        sharedGroups: localSharedGroups,
        failed: true,
      }
    } finally {
      setIsSharedGroupsSyncReady(true)
    }
  }, [])

  const loadMoneyBookForUser = useCallback(async (user, source = 'session') => {
    const localMoneyBookEntries = readLocalMoneyBookCache(moneyBookEntriesRef.current)
    const normalizedLocalEntries = buildMoneyBookSyncRecords(localMoneyBookEntries)

    if (!user?.id || !isSupabaseReady) {
      skipNextMoneyBookCloudSaveRef.current = true
      setMoneyBookEntries(localMoneyBookEntries)
      previousSyncedMoneyBookRef.current = normalizedLocalEntries
      setIsMoneyBookSyncReady(true)
      return {
        moneyBookEntries: localMoneyBookEntries,
      }
    }

    setIsMoneyBookSyncReady(false)

    try {
      const flushed = await flushMoneyBookSyncQueue(supabase, user)

      if (flushed.operationCount > 0) {
        trackEvent('money_book_cloud_saved', {
          surface: 'money_book_sync',
          reason: 'login_queue_flush',
          operation_count: flushed.operationCount,
        })
      }

      const cloudMoneyBook = await loadCloudMoneyBook(supabase, user.id)

      if (cloudMoneyBook.rowCount > 0) {
        skipNextMoneyBookCloudSaveRef.current = true
        setMoneyBookEntries(cloudMoneyBook.entries)
        previousSyncedMoneyBookRef.current = cloudMoneyBook.records
        trackEvent('money_book_cloud_loaded', {
          surface: 'money_book_sync',
          source,
          record_count: cloudMoneyBook.entries.length,
          cloud_row_count: cloudMoneyBook.rowCount,
        })
        return cloudMoneyBook
      }

      skipNextMoneyBookCloudSaveRef.current = true
      setMoneyBookEntries(localMoneyBookEntries)
      previousSyncedMoneyBookRef.current = normalizedLocalEntries

      if (!hasMoneyBookMigrationRun(user.id) && normalizedLocalEntries.length > 0) {
        try {
          await saveCloudMoneyBook(supabase, user, localMoneyBookEntries)
          markMoneyBookMigrationRun(user.id)
          trackEvent('money_book_migrated', {
            surface: 'money_book_sync',
            source,
            record_count: normalizedLocalEntries.length,
          })
          trackEvent('money_book_cloud_saved', {
            surface: 'money_book_sync',
            reason: 'migration',
            upsert_count: normalizedLocalEntries.length,
            delete_count: 0,
          })
        } catch (error) {
          queueMoneyBookSyncOperations(
            user.id,
            buildMoneyBookSyncOperations(user, { upserts: normalizedLocalEntries }),
          )
          trackEvent('money_book_sync_failed', moneyBookSyncFailurePayload(error, 'migrate'))
        }
      }

      return {
        moneyBookEntries: localMoneyBookEntries,
      }
    } catch (error) {
      skipNextMoneyBookCloudSaveRef.current = true
      setMoneyBookEntries(localMoneyBookEntries)
      previousSyncedMoneyBookRef.current = normalizedLocalEntries
      trackEvent('money_book_sync_failed', moneyBookSyncFailurePayload(error, 'load'))

      return {
        moneyBookEntries: localMoneyBookEntries,
        failed: true,
      }
    } finally {
      setIsMoneyBookSyncReady(true)
    }
  }, [])

  const loadReportHistoryForUser = useCallback(async (user, source = 'session') => {
    const localReportHistory = readLocalReportHistoryCache(reportHistoryRef.current)
    const normalizedLocalHistory = buildReportHistorySyncRecords(localReportHistory)

    if (!user?.id || !isSupabaseReady) {
      skipNextReportHistoryCloudSaveRef.current = true
      setReportHistory(localReportHistory)
      previousSyncedReportHistoryRef.current = normalizedLocalHistory
      setIsReportHistorySyncReady(true)
      return {
        reportHistory: localReportHistory,
      }
    }

    setIsReportHistorySyncReady(false)

    try {
      const flushed = await flushReportHistorySyncQueue(supabase, user)

      if (flushed.operationCount > 0) {
        trackEvent('report_history_cloud_saved', {
          surface: 'report_history_sync',
          reason: 'login_queue_flush',
          operation_count: flushed.operationCount,
        })
      }

      const cloudReportHistory = await loadCloudReportHistory(supabase, user.id)

      if (cloudReportHistory.rowCount > 0) {
        skipNextReportHistoryCloudSaveRef.current = true
        setReportHistory(cloudReportHistory.history)
        previousSyncedReportHistoryRef.current = cloudReportHistory.records
        trackEvent('report_history_cloud_loaded', {
          surface: 'report_history_sync',
          source,
          record_count: cloudReportHistory.history.length,
          cloud_row_count: cloudReportHistory.rowCount,
        })
        return cloudReportHistory
      }

      skipNextReportHistoryCloudSaveRef.current = true
      setReportHistory(localReportHistory)
      previousSyncedReportHistoryRef.current = normalizedLocalHistory

      if (!hasReportHistoryMigrationRun(user.id) && normalizedLocalHistory.length > 0) {
        try {
          await saveCloudReportHistory(supabase, user, localReportHistory)
          markReportHistoryMigrationRun(user.id)
          trackEvent('report_history_migrated', {
            surface: 'report_history_sync',
            source,
            record_count: normalizedLocalHistory.length,
          })
          trackEvent('report_history_cloud_saved', {
            surface: 'report_history_sync',
            reason: 'migration',
            upsert_count: normalizedLocalHistory.length,
            delete_count: 0,
          })
        } catch (error) {
          queueReportHistorySyncOperations(
            user.id,
            buildReportHistorySyncOperations(user, { upserts: normalizedLocalHistory }),
          )
          trackEvent('report_history_sync_failed', reportHistorySyncFailurePayload(error, 'migrate'))
        }
      }

      return {
        reportHistory: localReportHistory,
      }
    } catch (error) {
      skipNextReportHistoryCloudSaveRef.current = true
      setReportHistory(localReportHistory)
      previousSyncedReportHistoryRef.current = normalizedLocalHistory
      trackEvent('report_history_sync_failed', reportHistorySyncFailurePayload(error, 'load'))

      return {
        reportHistory: localReportHistory,
        failed: true,
      }
    } finally {
      setIsReportHistorySyncReady(true)
    }
  }, [])

  const loadStatementMappingsForUser = useCallback(async (user, source = 'session') => {
    const localStatementMappings = readLocalStatementMappingsCache()
    const localMappingCount = Object.keys(localStatementMappings).length

    if (!user?.id || !isSupabaseReady) {
      previousSyncedStatementMappingsRef.current = localStatementMappings
      setIsStatementMappingsSyncReady(true)
      return {
        statementMappings: localStatementMappings,
      }
    }

    setIsStatementMappingsSyncReady(false)

    try {
      const flushed = await flushStatementMappingsSyncQueue(supabase, user)

      if (flushed.operationCount > 0) {
        trackEvent('statement_mappings_cloud_saved', {
          surface: 'statement_mappings_sync',
          reason: 'login_queue_flush',
          operation_count: flushed.operationCount,
        })
      }

      const cloudStatementMappings = await loadCloudStatementMappings(supabase, user.id)

      if (cloudStatementMappings.rowCount > 0) {
        safeStorageSetQueued('fbply-statement-category-mappings', JSON.stringify(cloudStatementMappings.mappings))
        previousSyncedStatementMappingsRef.current = cloudStatementMappings.mappings
        trackEvent('statement_mappings_cloud_loaded', {
          surface: 'statement_mappings_sync',
          source,
          record_count: Object.keys(cloudStatementMappings.mappings).length,
          cloud_row_count: cloudStatementMappings.rowCount,
        })
        return cloudStatementMappings
      }

      previousSyncedStatementMappingsRef.current = localStatementMappings

      if (!hasStatementMappingsMigrationRun(user.id) && localMappingCount > 0) {
        try {
          await saveCloudStatementMappings(supabase, user, localStatementMappings)
          markStatementMappingsMigrationRun(user.id)
          trackEvent('statement_mappings_migrated', {
            surface: 'statement_mappings_sync',
            source,
            record_count: localMappingCount,
          })
          trackEvent('statement_mappings_cloud_saved', {
            surface: 'statement_mappings_sync',
            reason: 'migration',
            upsert_count: localMappingCount,
            delete_count: 0,
          })
        } catch (error) {
          queueStatementMappingsSyncOperations(
            user.id,
            buildStatementMappingsSyncOperations(user, {
              upserts: buildStatementMappingsSyncRecords(localStatementMappings),
            }),
          )
          trackEvent('statement_mappings_sync_failed', statementMappingsSyncFailurePayload(error, 'migrate'))
        }
      }

      return {
        statementMappings: localStatementMappings,
      }
    } catch (error) {
      previousSyncedStatementMappingsRef.current = localStatementMappings
      trackEvent('statement_mappings_sync_failed', statementMappingsSyncFailurePayload(error, 'load'))

      return {
        statementMappings: localStatementMappings,
        failed: true,
      }
    } finally {
      setIsStatementMappingsSyncReady(true)
    }
  }, [])

  const loadVoiceMemoryForUser = useCallback(async (user, source = 'session') => {
    const localVoiceMemory = readLocalVoiceMemoryCache(voiceMemoryRef.current)
    const localMemoryCount = Object.keys(localVoiceMemory).length

    if (!user?.id || !isSupabaseReady) {
      skipNextVoiceMemoryCloudSaveRef.current = true
      setVoiceMemory(localVoiceMemory)
      previousSyncedVoiceMemoryRef.current = localVoiceMemory
      setIsVoiceMemorySyncReady(true)
      return {
        voiceMemory: localVoiceMemory,
      }
    }

    setIsVoiceMemorySyncReady(false)

    try {
      const flushed = await flushVoiceMemorySyncQueue(supabase, user)

      if (flushed.operationCount > 0) {
        trackEvent('voice_memory_cloud_saved', {
          surface: 'voice_memory_sync',
          reason: 'login_queue_flush',
          operation_count: flushed.operationCount,
        })
      }

      const cloudVoiceMemory = await loadCloudVoiceMemory(supabase, user.id)

      if (cloudVoiceMemory.rowCount > 0) {
        skipNextVoiceMemoryCloudSaveRef.current = true
        setVoiceMemory(cloudVoiceMemory.memory)
        previousSyncedVoiceMemoryRef.current = cloudVoiceMemory.memory
        trackEvent('voice_memory_cloud_loaded', {
          surface: 'voice_memory_sync',
          source,
          record_count: Object.keys(cloudVoiceMemory.memory).length,
          cloud_row_count: cloudVoiceMemory.rowCount,
        })
        return cloudVoiceMemory
      }

      skipNextVoiceMemoryCloudSaveRef.current = true
      setVoiceMemory(localVoiceMemory)
      previousSyncedVoiceMemoryRef.current = localVoiceMemory

      if (!hasVoiceMemoryMigrationRun(user.id) && localMemoryCount > 0) {
        try {
          await saveCloudVoiceMemory(supabase, user, localVoiceMemory)
          markVoiceMemoryMigrationRun(user.id)
          trackEvent('voice_memory_migrated', {
            surface: 'voice_memory_sync',
            source,
            record_count: localMemoryCount,
          })
          trackEvent('voice_memory_cloud_saved', {
            surface: 'voice_memory_sync',
            reason: 'migration',
            upsert_count: localMemoryCount,
            delete_count: 0,
          })
        } catch (error) {
          queueVoiceMemorySyncOperations(
            user.id,
            buildVoiceMemorySyncOperations(user, {
              upserts: buildVoiceMemorySyncRecords(localVoiceMemory),
            }),
          )
          trackEvent('voice_memory_sync_failed', voiceMemorySyncFailurePayload(error, 'migrate'))
        }
      }

      return {
        voiceMemory: localVoiceMemory,
      }
    } catch (error) {
      skipNextVoiceMemoryCloudSaveRef.current = true
      setVoiceMemory(localVoiceMemory)
      previousSyncedVoiceMemoryRef.current = localVoiceMemory
      trackEvent('voice_memory_sync_failed', voiceMemorySyncFailurePayload(error, 'load'))

      return {
        voiceMemory: localVoiceMemory,
        failed: true,
      }
    } finally {
      setIsVoiceMemorySyncReady(true)
    }
  }, [])

  const loadCloudStateForUser = useCallback(async (user, source = 'session') => {
    const shouldTrackBackupMigration =
      Boolean(user?.id) &&
      ['signup', 'login', 'auth_state'].includes(source) &&
      hasMeaningfulLocalBackupData() &&
      !hasBackupMigrationCompleted(user.id)
    const syncedProfile = await loadProfileForUser(user, source)
    await loadCommitmentsForUser(user, source)
    await loadSavingsForUser(user, source)
    await loadExpensesForUser(user, source)
    await loadSharedGroupsForUser(user, source)
    await loadMoneyBookForUser(user, source)
    await loadReportHistoryForUser(user, source)
    await loadStatementMappingsForUser(user, source)
    await loadVoiceMemoryForUser(user, source)

    if (shouldTrackBackupMigration) {
      markBackupMigrationCompleted(user.id)
      trackEvent('migration_completed', {
        surface: 'auth',
        source,
      })
    }

    return syncedProfile
  }, [
    loadCommitmentsForUser,
    loadExpensesForUser,
    loadMoneyBookForUser,
    loadProfileForUser,
    loadReportHistoryForUser,
    loadSavingsForUser,
    loadSharedGroupsForUser,
    loadStatementMappingsForUser,
    loadVoiceMemoryForUser,
  ])

  useEffect(() => {
    if (isPublicSeoPage || !isSupabaseReady) {
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) {
        return
      }

      const user = data.session?.user || null

      if (user) {
        const synced = await loadCloudStateForUser(user, 'session')

        if (!isMounted) {
          return
        }

        setIsSessionChecking(false)
        setPhase(resolveAuthenticatedPhase(synced.setupCompleted))
        return
      }

      applyAuthUser(user)
      setIsSessionChecking(false)
    }).catch(() => {
      if (isMounted) {
        setIsSessionChecking(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null

      if (event === 'SIGNED_IN') {
        setAuthMessage('')
        setIsSessionChecking(true)
        loadCloudStateForUser(user, 'auth_state')
          .then((synced) => {
            setIsSessionChecking(false)
            setPhase((currentPhase) => (currentPhase === 'auth' || currentPhase === 'setup'
              ? resolveAuthenticatedPhase(synced.setupCompleted)
              : currentPhase))
          })
          .catch(() => {
            setIsSessionChecking(false)
          })
        return
      }

      if (event === 'SIGNED_OUT') {
        applyAuthUser(null)
        setIsProfileSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsExpenseSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsSavingsSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsCommitmentSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsSharedGroupsSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsMoneyBookSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsReportHistorySyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsStatementMappingsSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setIsVoiceMemorySyncReady(!isSupabaseReady || !isLegacyAuthRequired())
        setPhase(isLegacyAuthRequired() ? 'auth' : 'app')
        return
      }

      applyAuthUser(user)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [applyAuthUser, isPublicSeoPage, loadCloudStateForUser])

  const handleStatementMappingsChange = useCallback((nextMappings = {}) => {
    const normalizedNextMappings = normalizeStatementMappings(nextMappings)

    if (isPublicSeoPage) {
      return
    }

    safeStorageSetQueued('fbply-statement-category-mappings', JSON.stringify(normalizedNextMappings))

    const diff = diffStatementMappingsSyncRecords(
      previousSyncedStatementMappingsRef.current,
      normalizedNextMappings,
    )

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      previousSyncedStatementMappingsRef.current = normalizedNextMappings
      return
    }

    if (!authUser?.id || !isSupabaseReady) {
      previousSyncedStatementMappingsRef.current = normalizedNextMappings
      return
    }

    const operations = buildStatementMappingsSyncOperations(authUser, diff)

    if (!isStatementMappingsSyncReady || !isOnline) {
      queueStatementMappingsSyncOperations(authUser.id, operations)
      trackEvent(
        'statement_mappings_sync_failed',
        statementMappingsSyncFailurePayload({ name: isOnline ? 'not_ready' : 'offline' }, isOnline ? 'not_ready' : 'offline'),
      )
      previousSyncedStatementMappingsRef.current = normalizedNextMappings
      return
    }

    const syncStatementMappings = async () => {
      try {
        const flushed = await flushStatementMappingsSyncQueue(supabase, authUser)

        await applyStatementMappingsSyncOperations(supabase, authUser, operations)

        trackEvent('statement_mappings_cloud_saved', {
          surface: 'statement_mappings_sync',
          reason: flushed.operationCount > 0 ? 'queue_flush_and_update' : 'statement_mappings_update',
          upsert_count: diff.upserts.length,
          delete_count: diff.deletes.length,
          queued_operation_count: flushed.operationCount,
        })
      } catch (error) {
        queueStatementMappingsSyncOperations(authUser.id, operations)
        trackEvent('statement_mappings_sync_failed', statementMappingsSyncFailurePayload(error, 'save'))
      } finally {
        previousSyncedStatementMappingsRef.current = normalizedNextMappings
      }
    }

    syncStatementMappings()
  }, [authUser, isOnline, isPublicSeoPage, isStatementMappingsSyncReady])

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
    () => {
      if (isLegacyMoneyScoreEnabled()) {
        return buildFinancialHealthScore({
          expenses: financialEntries,
          financialState,
          savingsBuckets,
          recommendation,
          moneyBookSummary: financialActivity.moneyBookSummary,
        })
      }

      return buildMoneyScore({
        expenses,
        financialState,
        savingsBuckets,
        recommendation,
        moneyBookSummary: financialActivity.moneyBookSummary,
        moneyBookEntries,
        sharedSummary,
        sharedGroups,
      })
    },
    [
      expenses,
      financialActivity.moneyBookSummary,
      financialEntries,
      financialState,
      moneyBookEntries,
      recommendation,
      savingsBuckets,
      sharedGroups,
      sharedSummary,
    ],
  )
  const nextBestAction = useMemo(
    () => {
      if (isLegacyNextActionEnabled()) {
        return null
      }

      return buildNextBestAction({
        profile,
        financialState,
        safeToSpend,
        expenses,
        savingsBuckets,
        recommendation,
        sharedSummary,
        sharedGroups,
        moneyBookEntries,
        moneyBookSummary: financialActivity.moneyBookSummary,
        financialCalendarEvents,
        moneyReminders,
        reportHistory,
        smartHomeInsights,
      })
    },
    [
      expenses,
      financialActivity.moneyBookSummary,
      financialCalendarEvents,
      financialState,
      moneyBookEntries,
      moneyReminders,
      profile,
      recommendation,
      reportHistory,
      safeToSpend,
      savingsBuckets,
      sharedGroups,
      sharedSummary,
      smartHomeInsights,
    ],
  )
  const smartFeedback = useMemo(
    () => buildSmartFeedback({
      financialHealth,
      financialState,
      savingsBuckets,
      recommendation,
      moneyBookSummary: financialActivity.moneyBookSummary,
      smartHomeInsights,
      transactionSummary: financialActivity.transactionSummary,
      nextBestAction,
    }),
    [
      financialActivity.moneyBookSummary,
      financialActivity.transactionSummary,
      financialHealth,
      financialState,
      nextBestAction,
      recommendation,
      savingsBuckets,
      smartHomeInsights,
    ],
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

  const setAuthNotice = useCallback((message, followUp = null) => {
    setAuthMessage(message || '')
    setAuthFollowUp(followUp)
  }, [])

  const clearAuthNotice = useCallback(() => {
    setAuthNotice('', null)
  }, [setAuthNotice])

  const handleResendVerification = useCallback(async (email) => {
    const cleanEmail = String(email || '').trim().toLowerCase()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthNotice('Add a valid email address to resend verification.', null)
      trackEvent('auth_error', { surface: 'auth', auth_mode: 'resend_verification', reason: 'invalid_email' })
      return
    }

    if (!isSupabaseReady) {
      setAuthNotice('Secure email verification is not available here. Please try again later.', null)
      trackEvent('auth_error', { surface: 'auth', auth_mode: 'resend_verification', reason: 'supabase_unavailable' })
      return
    }

    setIsAuthFollowUpBusy(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: authRedirectUrl(),
        },
      })

      if (error) {
        const notice = authErrorNotice(error, 'signup')
        setAuthNotice(notice.message, notice.followUp ? { type: notice.followUp, email: cleanEmail } : null)
        trackEvent('auth_error', { surface: 'auth', auth_mode: 'resend_verification', reason: notice.reason })
        return
      }

      setAuthNotice('Verification email sent. Please check your inbox.', { type: 'resend_verification', email: cleanEmail })
      trackEvent('verification_email_resent', { surface: 'auth' })
    } catch (error) {
      const notice = authErrorNotice(error, 'signup')
      setAuthNotice(notice.message, notice.followUp ? { type: notice.followUp, email: cleanEmail } : { type: 'resend_verification', email: cleanEmail })
      trackEvent('auth_error', { surface: 'auth', auth_mode: 'resend_verification', reason: notice.reason })
    } finally {
      setIsAuthFollowUpBusy(false)
    }
  }, [setAuthNotice])

  const handleForgotPassword = useCallback(async (email) => {
    const cleanEmail = String(email || '').trim().toLowerCase()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthNotice('Add your account email to reset your password.', null)
      trackEvent('auth_error', { surface: 'auth', auth_mode: 'password_reset', reason: 'invalid_email' })
      return
    }

    if (!isSupabaseReady) {
      setAuthNotice('Password reset is not available here. Please try again later.', null)
      trackEvent('auth_error', { surface: 'auth', auth_mode: 'password_reset', reason: 'supabase_unavailable' })
      return
    }

    setIsAuthFollowUpBusy(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: authRedirectUrl(),
      })

      if (error) {
        const notice = authErrorNotice(error, 'login')
        setAuthNotice(notice.message, { type: 'forgot_password', email: cleanEmail })
        trackEvent('auth_error', { surface: 'auth', auth_mode: 'password_reset', reason: notice.reason })
        return
      }

      setAuthNotice('Password reset email sent. Please check your inbox.', { type: 'forgot_password', email: cleanEmail })
      trackEvent('password_reset_email_sent', { surface: 'auth' })
    } catch (error) {
      const notice = authErrorNotice(error, 'login')
      setAuthNotice(notice.message, { type: 'forgot_password', email: cleanEmail })
      trackEvent('auth_error', { surface: 'auth', auth_mode: 'password_reset', reason: notice.reason })
    } finally {
      setIsAuthFollowUpBusy(false)
    }
  }, [setAuthNotice])

  const handleEmailAuth = useCallback(async ({ mode, email, password, name }) => {
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanName = String(name || '').trim()
    const authMode = mode === 'signup' ? 'signup' : 'login'

    clearAuthNotice()
    trackEvent('auth_submit', {
      surface: 'auth',
      auth_mode: authMode,
      setup_completed: hasCompletedSetup,
    })

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthNotice('Add a valid email address to continue.', null)
      trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: 'invalid_email' })
      return
    }

    if (!password || password.length < 6) {
      setAuthNotice('Use a password with at least 6 characters.', null)
      trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: 'short_password' })
      return
    }

    if (!isSupabaseReady) {
      setAuthNotice(
        hasSupabaseAnonKey
          ? 'Secure sign-in could not start. Please try again in a moment.'
          : 'Cloud backup is not active here, so FBPly will continue locally on this device.',
        null,
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
      setPhase(resolveAuthenticatedPhase(hasCompletedSetup))
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
          const notice = authErrorNotice(error, authMode)
          setAuthNotice(notice.message, notice.followUp ? { type: notice.followUp, email: cleanEmail } : null)
          trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: notice.reason })
          return
        }

        const existingAccountNotice = signupResultNotice(data)

        if (existingAccountNotice) {
          setAuthNotice(
            existingAccountNotice.message,
            existingAccountNotice.followUp ? { type: existingAccountNotice.followUp, email: cleanEmail } : null,
          )
          trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: existingAccountNotice.reason })
          return
        }

        if (data.session?.user) {
          const synced = await loadCloudStateForUser(data.session.user, 'signup')
          trackEvent('backup_enabled', {
            surface: 'auth',
            auth_mode: authMode,
          })
          trackEvent('signup_success', {
            surface: 'auth',
            auth_mode: authMode,
            auth_provider: 'supabase',
            session_created: true,
            setup_completed: hasCompletedSetup,
          })
          setPhase(resolveAuthenticatedPhase(synced.setupCompleted))
          return
        }

        setAuthNotice('Cloud backup is ready. Please confirm your email, then open your backup.', { type: 'resend_verification', email: cleanEmail })
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
        const notice = authErrorNotice(error, authMode)
        setAuthNotice(notice.message, notice.followUp ? { type: notice.followUp, email: cleanEmail } : null)
        trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: notice.reason })
        return
      }

      const synced = await loadCloudStateForUser(data.user, 'login')
      trackEvent('backup_enabled', {
        surface: 'auth',
        auth_mode: authMode,
      })
      trackEvent('login_success', {
        surface: 'auth',
        auth_mode: authMode,
        auth_provider: 'supabase',
        setup_completed: hasCompletedSetup,
      })
      setPhase(resolveAuthenticatedPhase(synced.setupCompleted))
    } catch (error) {
      const notice = authErrorNotice(error, authMode)
      setAuthNotice(notice.message, notice.followUp ? { type: notice.followUp, email: cleanEmail } : null)
      trackEvent('auth_error', { surface: 'auth', auth_mode: authMode, reason: notice.reason })
    } finally {
      setIsAuthBusy(false)
    }
  }, [clearAuthNotice, hasCompletedSetup, loadCloudStateForUser, setAuthNotice])

  const handleSignOut = useCallback(async () => {
    clearAuthNotice()
    trackEvent('sign_out_clicked')

    if (isSupabaseReady) {
      await supabase.auth.signOut().catch(() => null)
    }

    setAuthUser(null)
    setIsProfileSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsExpenseSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsSavingsSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsCommitmentSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsSharedGroupsSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsMoneyBookSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsReportHistorySyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsStatementMappingsSyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setIsVoiceMemorySyncReady(!isSupabaseReady || !isLegacyAuthRequired())
    setPhase(isLegacyAuthRequired() ? 'auth' : 'app')
  }, [clearAuthNotice])

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

  const saveExpenseRecord = useCallback(({
    label,
    category,
    amount,
    note = '',
    type = expenseMode,
    source = 'manual',
    surface = 'quick_add',
    date = todayDateKey(),
    id,
    createdAt,
    activateFirstExpense = true,
  }) => {
    const parsedAmount = normalizeMoney(amount)
    const categoryName = String(category || '').trim()
    const labelName = String(label || categoryName || '').trim()
    const dateKey = normalizeDateKey(date)
    const savedAt = createdAt || new Date().toISOString()
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
      id: id ?? Date.now(),
      label: labelName,
      category: categoryName || 'Other',
      amount: parsedAmount,
      note: note || `${labelName} ${type} entry`,
      type,
      date: dateKey,
      createdAt: savedAt,
      source,
    }

    setExpenseFieldErrors({})
    setExpenses((current) => [newExpense, ...current])
    trackFeatureUsage('expense_saved', {
      expense_type: type,
      source,
      surface,
    })

    if (activateFirstExpense && expenses.length === 0) {
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

  const saveDailyFlowEntries = useCallback((items = []) => {
    const preparedItems = (Array.isArray(items) ? items : [])
      .map((item) => ({
        description: String(item?.description || '').trim(),
        amount: normalizeMoney(item?.amount),
      }))
      .filter((item) => item.description && item.amount > 0)
      .slice(0, DAILY_FLOW_MAX_ITEMS)

    if (preparedItems.length === 0) {
      return []
    }

    const batchStartedAt = Date.now()
    const savedEntries = preparedItems
      .map((item, index) => {
        const categorySuggestion = suggestExpenseCategoryForLabel(item.description, voiceMemory)
        const category = categorySuggestion?.category || 'Other'

        return saveExpenseRecord({
          id: `${batchStartedAt}-${index}`,
          label: item.description,
          category,
          amount: item.amount,
          note: `${item.description} - Daily Flow`,
          type: expenseMode,
          source: 'daily_flow',
          surface: 'home_daily_flow',
          date: todayDateKey(),
          createdAt: new Date(batchStartedAt + index).toISOString(),
          activateFirstExpense: index === 0,
        })
      })
      .filter(Boolean)

    if (savedEntries.length === 0) {
      return []
    }

    setVoiceMemory((current) => savedEntries.reduce((memory, entry) => learnVoiceExpense(memory, {
      label: entry.label,
      merchant: entry.label,
      category: entry.category,
      amount: entry.amount,
      learningSource: 'daily_flow',
    }, { learningSource: 'daily_flow' }), current))

    const totalAmount = savedEntries.reduce((total, entry) => addMoney(total, entry.amount), 0)

    trackFeatureUsage('daily_flow_batch_saved', {
      surface: 'home',
      entry_count: savedEntries.length,
      total_amount: totalAmount,
    })
    trackEvent('daily_flow_batch_saved', {
      surface: 'home',
      entry_count: savedEntries.length,
    })

    return savedEntries
  }, [expenseMode, saveExpenseRecord, voiceMemory])

  const saveVoiceDrafts = useCallback((drafts) => {
    const validDrafts = (Array.isArray(drafts) ? drafts : [drafts]).filter(Boolean)

    if (validDrafts.length === 0) {
      return false
    }

    const savedEntries = validDrafts
      .map((draft) => {
        const label = String(draft.label || draft.category || '').trim()
        const amount = draft.amountConfidence === 'low' ? 0 : normalizeMoney(draft.amount)

        if (amount <= 0) {
          return null
        }

        return saveExpenseRecord({
          label,
          category: draft.category,
          amount,
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
    setExpenseAmount(voiceDraft.amountConfidence === 'low' || normalizeMoney(voiceDraft.amount) <= 0 ? '' : String(voiceDraft.amount))
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
    const hasSettlement = sharedGroups.some((group) => {
      if (group.id !== groupId) {
        return false
      }

      return reconcileSharedGroup(group, profile).settlements.some((item) => item.id === settlementId)
    })

    if (hasSettlement) {
      trackEvent('settlement_completed')
    }

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
  }, [profile, sharedGroups])

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
    if (!entry?.id) {
      trackEvent(saved.kind === 'taken' ? 'borrow_created' : 'lend_created')
    }
    return true
  }, [])

  const toggleMoneyBookSettlement = useCallback((id) => {
    const entry = moneyBookEntries.find((item) => item.id === id)

    if (entry && entry.status !== 'settled') {
      trackEvent('settlement_completed')
    }

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
  }, [moneyBookEntries])

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
    if (!addSheetMode) {
      trackEvent('add_hub_opened')
    }

    if (ADD_HUB_SELECTION_EVENTS[mode]) {
      trackEvent(ADD_HUB_SELECTION_EVENTS[mode])
    }

    setAddSheetMode(mode)
    trackFeatureUsage('quick_add_opened', {
      surface: 'app_chrome',
      mode,
    })
  }, [addSheetMode])

  const closeAddSheet = useCallback(() => {
    setAddSheetMode(null)
  }, [])

  const updateSavingsBucket = useCallback((id, patch) => {
    setSavingsBuckets((current) =>
      current.map((bucket) => (bucket.id === id ? { ...bucket, ...patch } : bucket)),
    )
    trackEvent('goal_updated')
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
      theme: moneyTheme,
    }
    const reconciledGroups = sharedGroups.map((group) => reconcileSharedGroup(group, profile))

    if (type === 'trip') {
      const tripGroups = reconciledGroups.filter((group) => group.amount > 0 || group.settlements?.length > 0)
      const selectedGroup = overrides.groupId
        ? tripGroups.find((group) => group.id === overrides.groupId) || tripGroups[0]
        : tripGroups[0]

      return {
        type,
        reportId,
        payload: {
          reportMeta: {
            ...reportMeta,
            unlimitedSections: true,
            reportType: 'trip',
          },
          profile,
          groups: selectedGroup ? [selectedGroup] : [],
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

    if (type === 'expense-history') {
      const range = overrides.range || {}
      const periodLabel = overrides.periodLabel || range.label || period

      return {
        type,
        reportId,
        payload: {
          reportMeta: {
            ...reportMeta,
            period: periodLabel,
            reportType: 'expense-history',
            historyFilter: overrides.historyFilter || 'today',
            rangeLabel: periodLabel,
          },
          profile,
          range,
          expenses: Array.isArray(overrides.transactions) ? overrides.transactions : [],
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
    moneyTheme,
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
      activeRequest = {
        ...activeRequest,
        payload: {
          ...(activeRequest.payload || {}),
          reportMeta: {
            ...(activeRequest.payload?.reportMeta || {}),
            theme: moneyTheme,
          },
        },
      }
      const { isNativeMobileApp, shareBlob } = await import('./lib/nativeFileShare')
      const { createReportExportBlob } = await import('./lib/reportPdf')
      const exportResult = await createReportExportBlob(activeRequest)
      const blob = exportResult.blob
      const exportType = exportResult.format || 'pdf'
      const filename = `${reportId}.${exportResult.extension || exportType}`
      const reportType = activeRequest.type || 'monthly'

      trackEvent('report_generated', {
        surface: 'reports',
        report_type: reportType,
        template: activeRequest.payload?.reportMeta?.template || reportTemplate,
        export_type: exportType,
        save_history: saveHistory,
      })

      if (saveHistory && reportHistory.length === 0) {
        trackActivation('first_report_generation', {
          report_type: reportType,
        })
      }

      if (isNativeMobileApp()) {
        await shareBlob(blob, filename, {
          title: exportType === 'jpg' ? 'FBPLY Report Card' : 'FBPLY Report',
          text: 'Your FBPLY report is ready.',
          dialogTitle: 'Save or share report',
        })
        trackEvent('report_shared', {
          surface: 'reports',
          report_type: reportType,
          export_type: exportType,
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
        export_type: exportType,
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
            payload: {
              ...activeRequest.payload,
              reportMeta: {
                ...(activeRequest.payload?.reportMeta || {}),
                lastExportFormat: exportType,
              },
            },
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
  }, [buildReportRequest, isExportingPdf, moneyTheme, profile, reportHistory.length, reportTemplate, selectedMonthKey])

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
      <div className="app-root" data-energy="full" data-money-theme={moneyTheme}>
        <Suspense fallback={<PublicSeoFallback path={normalizedCurrentPath} />}>
          <PublicSeoScreen currentPath={normalizedCurrentPath} />
        </Suspense>
        <CookieConsentBanner />
      </div>
    )
  }

  if (legalPage) {
    return (
      <div className="app-root" data-energy="full" data-money-theme={moneyTheme}>
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
    <div className="app-root" data-energy={lowEnergyMode ? 'low' : 'full'} data-currency={activeCurrency} data-money-theme={moneyTheme}>
      <OfflineBanner isOnline={isOnline} />
      <RewardedExportModal
        rewardState={rewardedExport}
        onStart={startRewardedExport}
        onClose={closeRewardedExport}
      />
      <>
        {phase === 'splash' && (
          <SplashScreen
            key="splash"
            onDone={() => setPhase(resolveAnonymousFirstPhase({ hasSeenOnboarding, hasCompletedSetup }))}
          />
        )}
        {phase === 'welcome' && (
          <WelcomeScreen
            key="welcome"
            onStart={() => {
              setHasSeenOnboarding(true)
              setPhase(isLegacyAuthRequired() ? 'auth' : 'app')
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
              authFollowUp={authFollowUp}
              allowLocalContinue={!isLegacyAuthRequired()}
              isAuthBusy={isAuthBusy}
              isAuthFollowUpBusy={isAuthFollowUpBusy}
              onClearAuthNotice={clearAuthNotice}
              onEmailAuth={handleEmailAuth}
              onForgotPassword={handleForgotPassword}
              onUseLocal={() => setPhase('app')}
              onResendVerification={handleResendVerification}
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
              moneyTheme={moneyTheme}
              setMoneyTheme={setMoneyTheme}
              profile={profile}
              setProfile={setProfile}
              authUser={authUser}
              onEnableBackup={() => {
                clearAuthNotice()
                setPhase('auth')
              }}
              onSignOut={handleSignOut}
              addSheetMode={addSheetMode}
              openAddSheet={openAddSheet}
              closeAddSheet={closeAddSheet}
              financialState={financialState}
              insights={insights}
              smartHomeInsights={smartHomeInsights}
              smartReminders={smartReminders}
              financialHealth={financialHealth}
              nextBestAction={nextBestAction}
              smartFeedback={smartFeedback}
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
              saveDailyFlowEntries={saveDailyFlowEntries}
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
              onStatementMappingsChange={handleStatementMappingsChange}
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
      </>
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
    <main className={motionSurfaceClassName('splash-screen')}>
      <span className="splash-progress" aria-hidden="true" onAnimationEnd={onDone} />
      <div className="splash-brand-card">
        <BrandMark size="hero" />
        <strong>FBPly</strong>
      </div>
      <div className="splash-loader">
        <FLoader label="Spend smarter. Feel better." size="lg" />
        <button className="splash-skip-button" type="button" onClick={onDone}>
          Continue
        </button>
      </div>
    </main>
  )
}

function WelcomeScreen({ onStart }) {
  return (
    <main className={motionSurfaceClassName('entry-screen')}>
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
    </main>
  )
}

function AuthFallback() {
  return (
    <main className={motionSurfaceClassName('entry-screen')}>
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
    </main>
  )
}

function AuthScreen({
  authMessage,
  authFollowUp,
  allowLocalContinue = false,
  isAuthBusy,
  isAuthFollowUpBusy,
  onClearAuthNotice,
  onEmailAuth,
  onForgotPassword,
  onUseLocal,
  onResendVerification,
}) {
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const hasInteractedRef = useRef(false)
  const hasSubmittedRef = useRef(false)
  const latestAuthModeRef = useRef(authMode)
  const isSignup = authMode === 'signup'
  const authTitle = isSignup ? 'Protect Your Data' : 'Enable Cloud Backup'
  const authTagline = isSignup ? 'Keep Your Data Safe Across Devices.' : 'Open your protected FBPly backup.'
  const followUpType = authFollowUp?.type || ''
  const followUpEmail = authFollowUp?.email || email
  const authLegalLinks = legalLinks
    .filter((link) => ['/privacy', '/terms', '/contact'].includes(link.href))
    .map((link) => ({
      ...link,
      label: link.href === '/terms' ? 'Terms' : link.href === '/privacy' ? 'Privacy' : link.label,
    }))
  const markAuthInteraction = () => {
    hasInteractedRef.current = true
  }

  const clearNoticeOnEdit = () => {
    markAuthInteraction()
    onClearAuthNotice?.()
  }

  const switchAuthMode = (mode) => {
    markAuthInteraction()
    setAuthMode(mode)
    onClearAuthNotice?.()
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
    <main className={motionSurfaceClassName('entry-screen')}>
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
                    clearNoticeOnEdit()
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
                clearNoticeOnEdit()
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
              onChange={clearNoticeOnEdit}
            />
          </div>
          {!isSignup && (
            <p className="auth-switch-line">
              Forgot your password?
              <button
                type="button"
                disabled={isAuthBusy || isAuthFollowUpBusy}
                onClick={() => {
                  markAuthInteraction()
                  onForgotPassword?.(followUpEmail)
                }}
              >
                Send reset email
              </button>
            </p>
          )}
          <button className="primary-button full" type="submit" disabled={isAuthBusy}>
            {isAuthBusy ? 'Please wait...' : isSignup ? 'Enable Cloud Backup' : 'Continue'}
          </button>
          {allowLocalContinue && (
            <button
              className="ghost-button full"
              type="button"
              disabled={isAuthBusy || isAuthFollowUpBusy}
              onClick={() => {
                markAuthInteraction()
                onUseLocal?.()
              }}
            >
              Continue locally
            </button>
          )}
          {authMessage && (
            <>
              <p className="form-message">{authMessage}</p>
              {followUpType === 'resend_verification' && (
                <button
                  className="ghost-button full"
                  type="button"
                  disabled={isAuthBusy || isAuthFollowUpBusy}
                  onClick={() => {
                    markAuthInteraction()
                    onResendVerification?.(followUpEmail)
                  }}
                >
                  {isAuthFollowUpBusy ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
              {followUpType === 'forgot_password' && (
                <button
                  className="ghost-button full"
                  type="button"
                  disabled={isAuthBusy || isAuthFollowUpBusy}
                  onClick={() => {
                    markAuthInteraction()
                    onForgotPassword?.(followUpEmail)
                  }}
                >
                  {isAuthFollowUpBusy ? 'Sending...' : 'Send password reset email'}
                </button>
              )}
              {followUpType === 'sign_in' && (
                <button
                  className="ghost-button full"
                  type="button"
                  disabled={isAuthBusy}
                  onClick={() => switchAuthMode('login')}
                >
                  Use existing backup
                </button>
              )}
            </>
          )}
          <p className="auth-switch-line">
            {isSignup ? 'Already protected?' : 'Keep your data safe across devices?'}
            <button
              type="button"
              onClick={() => switchAuthMode(isSignup ? 'login' : 'signup')}
            >
              {isSignup ? 'Use existing backup' : 'Protect data'}
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
    </main>
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
    <main className={motionSurfaceClassName('setup-page')}>
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
    </main>
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
    <footer className="app-legal-footer" aria-label="Legal links">
      {legalLinks.map((link) => (
        <a href={link.href} key={link.href}>
          {link.label}
        </a>
      ))}
    </footer>
  )
}

function normalizeDailyHeroAmount(value) {
  const amount = normalizeMoney(value)

  return amount > 0 ? String(amount) : ''
}

function dailyHeroActivityIcon(transaction = {}) {
  if (transaction.tone === 'incoming' || transaction.impactType === 'income') {
    return Wallet
  }

  return Receipt
}

function dailyHeroActivityTone(transaction = {}) {
  if (transaction.tone === 'incoming' || transaction.impactType === 'income') {
    return 'success'
  }

  if (transaction.tone === 'outgoing') {
    return 'danger'
  }

  return 'neutral'
}

function dailyHeroSignedAmount(transaction = {}) {
  const prefix = transaction.tone === 'incoming' ? '+' : transaction.tone === 'outgoing' ? '-' : ''

  return `${prefix}${rupees(transaction.amount || 0)}`
}

function formatDailyHeroTime(value) {
  const parsed = new Date(value || '')

  if (Number.isNaN(parsed.getTime())) {
    return 'Recent'
  }

  const today = new Date().toISOString().slice(0, 10)
  const dateKey = parsed.toISOString().slice(0, 10)

  if (dateKey === today) {
    return parsed.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function buildDailyHeroActivity(transactions = []) {
  return transactions
    .filter((transaction) => transaction && normalizeMoney(transaction.amount) > 0)
    .filter((transaction) => transaction.sourceModule !== 'Planner')
    .filter((transaction) => transaction.sourceModule !== 'Goals')
    .filter((transaction) => transaction.source !== 'commitment')
    .slice(0, 5)
    .map((transaction) => ({
      ...transaction,
      icon: dailyHeroActivityIcon(transaction),
      heroTone: dailyHeroActivityTone(transaction),
      amountLabel: dailyHeroSignedAmount(transaction),
      timeLabel: formatDailyHeroTime(transaction.dateTime || transaction.date),
    }))
}

function buildDailyHeroNextAction(recommendation) {
  if (!recommendation) {
    return {
      title: 'Add today expense',
      detail: 'Record the next money move.',
      badge: 'Add',
      tone: 'tint',
      icon: Receipt,
      target: 'expense',
    }
  }

  return {
    title: recommendation.insight?.title || recommendation.category || recommendation.goalName || 'Next action',
    detail:
      recommendation.waitSuggestion ||
      recommendation.insight?.detail ||
      recommendation.categorySummary ||
      'Review the current recommendation.',
    badge: recommendation.ownershipTone || recommendation.timelineLabel || 'Now',
    tone: recommendation.ownershipTone === 'danger' ? 'warning' : recommendation.ownershipTone || 'tint',
    icon: Target,
  }
}

const NEXT_BEST_ACTION_ICONS = {
  check: CheckCircle2,
  creditCard: CreditCard,
  plus: Plus,
  receipt: Receipt,
  sparkles: Sparkles,
  target: Target,
  wallet: Wallet,
}

function NextBestActionCard({ action, surface = 'home', onAction, className = '' }) {
  const actionId = action?.id || ''
  const actionType = action?.type || ''
  const actionSystem = action?.system || ''

  useEffect(() => {
    if (actionSystem !== 'v7.8-next-action') {
      return
    }

    trackEvent('next_action_viewed', {
      surface,
      action_type: actionType,
    })
  }, [actionId, actionSystem, actionType, surface])

  if (!action) {
    return null
  }

  const ActionIcon = NEXT_BEST_ACTION_ICONS[action.iconKey] || Sparkles

  return (
    <MoneyCard
      eyebrow="Next Action"
      title={action.title}
      detail={action.reason}
      meta={action.badge || 'Next'}
      icon={ActionIcon}
      tone={action.tone || 'tint'}
      className={`v72-next-action-card v78-next-action-card ${className}`.trim()}
      footer={(
        <button
          className="ghost-button v78-next-action-cta"
          type="button"
          onClick={() => onAction?.(action, surface)}
        >
          <span>{action.action}</span>
          <ChevronRight size={15} />
        </button>
      )}
    />
  )
}

const SMART_FEEDBACK_ICONS = {
  chartPie: ChartPie,
  check: CheckCircle2,
  receipt: Receipt,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  wallet: Wallet,
}

function SmartFeedbackCard({ feedback, surface = 'home', onFeedbackClick, className = '' }) {
  const feedbackId = feedback?.id || ''
  const feedbackType = feedback?.type || ''
  const feedbackSystem = feedback?.system || ''

  useEffect(() => {
    if (feedbackSystem !== 'v8.2-smart-feedback') {
      return
    }

    trackEvent('feedback_viewed', {
      surface,
      feedback_type: feedbackType,
    })
  }, [feedbackId, feedbackSystem, feedbackType, surface])

  if (!feedback) {
    return null
  }

  const FeedbackIcon = SMART_FEEDBACK_ICONS[feedback.iconKey] || CheckCircle2

  return (
    <MoneyCard
      as="button"
      type="button"
      eyebrow="Smart Feedback"
      title={feedback.title}
      detail={feedback.detail}
      meta={feedback.label || 'Progress'}
      icon={FeedbackIcon}
      tone={feedback.tone || 'tint'}
      interactive
      className={`v82-smart-feedback-card ${className}`.trim()}
      id={surface === 'insights' ? 'v82-smart-feedback-insights' : undefined}
      onClick={() => onFeedbackClick?.(feedback, surface)}
      footer={(
        <span className="v82-smart-feedback-cue">
          <span>View</span>
          <ChevronRight size={15} />
        </span>
      )}
    />
  )
}

function DailyCompanionEntry({
  safeToSpend = {},
  financialState = {},
  transactionSummary = {},
  openAddSheet,
  openQuickEntry,
  todayTransactions = [],
  recommendation,
  nextBestAction,
  smartFeedback,
  onNextActionClick,
  onSmartFeedbackClick,
  legacyDailyHero = false,
}) {
  const [heroAmount, setHeroAmount] = useState('')
  const moneySnapshot = useMemo(
    () => buildDailyMoneySnapshot(financialState, safeToSpend, transactionSummary),
    [financialState, safeToSpend, transactionSummary],
  )
  const periodSummaries = useMemo(
    () => buildDailyPeriodSummaries(todayTransactions, transactionSummary, safeToSpend, financialState),
    [financialState, safeToSpend, todayTransactions, transactionSummary],
  )
  const recentActivity = useMemo(() => buildDailyHeroActivity(todayTransactions), [todayTransactions])
  const legacyNextAction = buildDailyHeroNextAction(recommendation)
  const LegacyNextActionIcon = legacyNextAction.icon
  const handleEntry = (mode) => {
    if (openQuickEntry) {
      openQuickEntry(mode, heroAmount)
      return
    }

    openAddSheet?.(mode)
  }

  if (legacyDailyHero) {
    return (
      <MoneyOSProvider as="section" className="screen-content v7-daily-entry money-os-daily-companion v10-home-entry">
        <SectionHeader
          title="Daily"
          detail="Record money"
          actions={<StatusBadge tone="success">{moneySnapshot.balance.value}</StatusBadge>}
        />
        <section className="v84-daily-hero-stack v10-home-summary" aria-label="Daily summary">
          <article className={`v84-daily-balance-hero v73-flow-node--${moneySnapshot.balance.tone} v10-summary-card`}>
            <small>{moneySnapshot.balance.label}</small>
            <AnimatedNumber as="strong" value={moneySnapshot.balance.value} />
          </article>
          <div className="v84-daily-flow-row">
            <article className={`v73-flow-node v73-flow-node--${moneySnapshot.moneyIn.tone} v10-summary-card`}>
              <small>{moneySnapshot.moneyIn.label}</small>
              <AnimatedNumber as="strong" value={moneySnapshot.moneyIn.value} />
            </article>
            <article className={`v73-flow-node v73-flow-node--${moneySnapshot.moneyOut.tone} v10-summary-card`}>
              <small>{moneySnapshot.moneyOut.label}</small>
              <AnimatedNumber as="strong" value={moneySnapshot.moneyOut.value} />
            </article>
          </div>
        </section>
        <div className="v7-companion-grid v7-daily-entry-grid v10-home-quick-actions">
          <ActionCard
            title="Add expense"
            detail="Record money going out"
            actionLabel="Record"
            icon={Receipt}
            tone="danger"
            onClick={() => openAddSheet?.('expense')}
          />
          <ActionCard
            title="Add received money"
            detail="Record money coming in"
            actionLabel="Record"
            icon={Wallet}
            tone="success"
            onClick={() => openAddSheet?.('income')}
          />
        </div>
      </MoneyOSProvider>
    )
  }

  return (
    <MoneyOSProvider as="section" className="screen-content v7-daily-entry v72-daily-hero money-os-daily-companion v10-home-entry">
      <DailyPremiumViewport
        balanceValue={moneySnapshot.balance.value}
        balanceLabel={moneySnapshot.balance.label}
        periods={periodSummaries}
        heroAmount={heroAmount}
        setHeroAmount={setHeroAmount}
        onAddExpense={() => handleEntry('expense')}
        onAddReceived={() => handleEntry('income')}
        nextBestAction={nextBestAction}
        legacyNextAction={legacyNextAction}
        LegacyNextActionIcon={LegacyNextActionIcon}
        onNextActionClick={onNextActionClick}
        smartFeedback={smartFeedback}
        onSmartFeedbackClick={onSmartFeedbackClick}
        recentActivity={recentActivity}
      />
    </MoneyOSProvider>
  )
}

const DAILY_FLOW_MAX_ITEMS = 20

const HOME_QUICK_TOOLS = [
  { key: 'calculator', label: 'Calculator', detail: 'Add or total quickly', icon: Calculator },
  { key: 'gst', label: 'GST', detail: 'Tax included or extra', icon: Receipt },
  { key: 'percentage', label: 'Percent', detail: 'Discounts and shares', icon: Percent },
  { key: 'split', label: 'Split', detail: 'Divide a bill', icon: Plane },
  { key: 'emi', label: 'EMI', detail: 'Monthly estimate', icon: CreditCard },
]

const HOME_CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const INDIAN_FIXED_HOLIDAYS = Object.freeze({
  '01-26': Object.freeze({ name: 'Republic Day', shortName: 'Republic Day', type: 'National' }),
  '08-15': Object.freeze({ name: 'Independence Day', shortName: 'Independence', type: 'National' }),
  '10-02': Object.freeze({ name: "Mahatma Gandhi's Birthday", shortName: 'Gandhi Jayanti', type: 'National' }),
  '12-25': Object.freeze({ name: 'Christmas Day', shortName: 'Christmas', type: 'Gazetted' }),
})

const INDIAN_CALENDAR_HOLIDAYS_2026 = Object.freeze({
  '2026-01-01': Object.freeze({ name: "New Year's Day", shortName: 'New Year', type: 'Restricted' }),
  '2026-01-03': Object.freeze({ name: "Hazarat Ali's Birthday", shortName: 'Hazarat Ali', type: 'Restricted' }),
  '2026-01-14': Object.freeze({ name: 'Makar Sankranti / Pongal', shortName: 'Sankranti', type: 'Restricted' }),
  '2026-01-23': Object.freeze({ name: 'Basant Panchami', shortName: 'Basant Panchami', type: 'Restricted' }),
  '2026-01-26': Object.freeze({ name: 'Republic Day', shortName: 'Republic Day', type: 'National' }),
  '2026-02-01': Object.freeze({ name: "Guru Ravi Das's Birthday", shortName: 'Guru Ravi Das', type: 'Restricted' }),
  '2026-02-15': Object.freeze({ name: 'Maha Shivaratri', shortName: 'Shivaratri', type: 'Restricted' }),
  '2026-02-19': Object.freeze({ name: 'Shivaji Jayanti', shortName: 'Shivaji Jayanti', type: 'Restricted' }),
  '2026-03-03': Object.freeze({ name: 'Holika Dahan / Dolyatra', shortName: 'Holika Dahan', type: 'Restricted' }),
  '2026-03-04': Object.freeze({ name: 'Holi', shortName: 'Holi', type: 'Gazetted' }),
  '2026-03-19': Object.freeze({ name: 'Chaitra Sukladi / Gudi Padava / Ugadi', shortName: 'Ugadi', type: 'Restricted' }),
  '2026-03-20': Object.freeze({ name: 'Jamat Ul-Vida', shortName: 'Jamat Ul-Vida', type: 'Restricted' }),
  '2026-03-21': Object.freeze({ name: 'Id-ul-Fitr', shortName: 'Id-ul-Fitr', type: 'Gazetted' }),
  '2026-03-26': Object.freeze({ name: 'Ram Navami', shortName: 'Ram Navami', type: 'Gazetted' }),
  '2026-03-31': Object.freeze({ name: 'Mahavir Jayanti', shortName: 'Mahavir', type: 'Gazetted' }),
  '2026-04-03': Object.freeze({ name: 'Good Friday', shortName: 'Good Friday', type: 'Gazetted' }),
  '2026-04-05': Object.freeze({ name: 'Easter Sunday', shortName: 'Easter', type: 'Restricted' }),
  '2026-04-14': Object.freeze({ name: 'Vaisakhi / Vishu / Mesadi', shortName: 'Vaisakhi', type: 'Restricted' }),
  '2026-04-15': Object.freeze({ name: 'Bahag Bihu', shortName: 'Bihu', type: 'Restricted' }),
  '2026-05-01': Object.freeze({ name: 'Buddha Purnima', shortName: 'Buddha Purnima', type: 'Gazetted' }),
  '2026-05-09': Object.freeze({ name: 'Birthday of Guru Rabindranath Tagore', shortName: 'Tagore', type: 'Restricted' }),
  '2026-05-27': Object.freeze({ name: 'Id-ul-Zuha (Bakrid)', shortName: 'Bakrid', type: 'Gazetted' }),
  '2026-06-26': Object.freeze({ name: 'Muharram', shortName: 'Muharram', type: 'Gazetted' }),
  '2026-07-16': Object.freeze({ name: 'Rath Yatra', shortName: 'Rath Yatra', type: 'Restricted' }),
  '2026-08-15': Object.freeze({ name: 'Independence Day', shortName: 'Independence', type: 'National' }),
  '2026-08-26': Object.freeze({ name: 'Milad-Un-Nabi / Onam', shortName: 'Milad / Onam', type: 'Gazetted' }),
  '2026-08-28': Object.freeze({ name: 'Raksha Bandhan', shortName: 'Rakhi', type: 'Restricted' }),
  '2026-09-04': Object.freeze({ name: 'Janmashtami', shortName: 'Janmashtami', type: 'Gazetted' }),
  '2026-09-14': Object.freeze({ name: 'Ganesh Chaturthi', shortName: 'Ganesh', type: 'Restricted' }),
  '2026-10-02': Object.freeze({ name: "Mahatma Gandhi's Birthday", shortName: 'Gandhi Jayanti', type: 'National' }),
  '2026-10-18': Object.freeze({ name: 'Dussehra Saptami', shortName: 'Saptami', type: 'Restricted' }),
  '2026-10-19': Object.freeze({ name: 'Dussehra Mahashtami', shortName: 'Mahashtami', type: 'Restricted' }),
  '2026-10-20': Object.freeze({ name: 'Dussehra', shortName: 'Dussehra', type: 'Gazetted' }),
  '2026-10-26': Object.freeze({ name: "Maharishi Valmiki's Birthday", shortName: 'Valmiki', type: 'Restricted' }),
  '2026-10-29': Object.freeze({ name: 'Karwa Chauth', shortName: 'Karwa Chauth', type: 'Restricted' }),
  '2026-11-08': Object.freeze({ name: 'Diwali / Naraka Chaturdasi', shortName: 'Diwali', type: 'Gazetted' }),
  '2026-11-09': Object.freeze({ name: 'Govardhan Puja', shortName: 'Govardhan', type: 'Restricted' }),
  '2026-11-11': Object.freeze({ name: 'Bhai Duj', shortName: 'Bhai Duj', type: 'Restricted' }),
  '2026-11-15': Object.freeze({ name: 'Chhath Puja', shortName: 'Chhath', type: 'Restricted' }),
  '2026-11-24': Object.freeze({ name: "Guru Nanak's Birthday", shortName: 'Guru Nanak', type: 'Gazetted' }),
  '2026-12-23': Object.freeze({ name: "Hazarat Ali's Birthday", shortName: 'Hazarat Ali', type: 'Restricted' }),
  '2026-12-24': Object.freeze({ name: 'Christmas Eve', shortName: 'Christmas Eve', type: 'Restricted' }),
  '2026-12-25': Object.freeze({ name: 'Christmas Day', shortName: 'Christmas', type: 'Gazetted' }),
})

function isHomeDailyExpenseTransaction(transaction = {}) {
  return transaction?.tone === 'outgoing' &&
    transaction?.sourceModule !== 'Shared' &&
    transaction?.sourceModule !== 'Money Book'
}

function buildHomeDateBox(dateKey = todayDateKey()) {
  const parsed = new Date(`${String(dateKey || todayDateKey()).slice(0, 10)}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return {
      weekday: 'Today',
      day: '--',
      month: 'Daily page',
      full: 'Today',
    }
  }

  return {
    weekday: parsed.toLocaleDateString('en-IN', { weekday: 'long' }),
    day: parsed.toLocaleDateString('en-IN', { day: '2-digit' }),
    month: parsed.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    full: parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

function getIndianCalendarHoliday(dateKey) {
  const cleanDateKey = String(dateKey || '').slice(0, 10)
  const mappedHoliday = INDIAN_CALENDAR_HOLIDAYS_2026[cleanDateKey]

  if (mappedHoliday) {
    return mappedHoliday
  }

  return INDIAN_FIXED_HOLIDAYS[cleanDateKey.slice(5)] || null
}

function buildHomeCalendarMonth({ monthKey = currentMonthKey(), transactions = [], todayKey = todayDateKey() } = {}) {
  const safeMonthKey = dateMonthKey(`${monthKey || currentMonthKey()}-01`)
  const firstDay = new Date(`${safeMonthKey}-01T12:00:00`)

  if (Number.isNaN(firstDay.getTime())) {
    return {
      monthKey: currentMonthKey(),
      label: 'This month',
      days: [],
    }
  }

  const lastDay = new Date(firstDay)
  lastDay.setMonth(lastDay.getMonth() + 1, 0)

  const amountByDate = transactions.reduce((map, transaction) => {
    const dateKey = dailyTransactionDateKey(transaction)

    if (!dateKey.startsWith(safeMonthKey)) {
      return map
    }

    const current = map.get(dateKey) || { amount: 0, count: 0 }
    map.set(dateKey, {
      amount: addMoney(current.amount, normalizeMoney(transaction.amount)),
      count: current.count + 1,
    })
    return map
  }, new Map())

  const blanks = Array.from({ length: firstDay.getDay() }, (_, index) => ({
    key: `blank-${safeMonthKey}-${index}`,
    type: 'blank',
  }))

  const dateCells = Array.from({ length: lastDay.getDate() }, (_, index) => {
    const day = index + 1
    const dateKey = `${safeMonthKey}-${String(day).padStart(2, '0')}`
    const parsed = new Date(`${dateKey}T12:00:00`)
    const amountRecord = amountByDate.get(dateKey) || { amount: 0, count: 0 }
    const holiday = getIndianCalendarHoliday(dateKey)

    return {
      key: dateKey,
      type: 'date',
      dateKey,
      day,
      weekday: HOME_CALENDAR_WEEKDAYS[parsed.getDay()],
      isToday: dateKey === todayKey,
      isWeekend: parsed.getDay() === 0 || parsed.getDay() === 6,
      amount: amountRecord.amount,
      amountLabel: amountRecord.amount > 0 ? shortRupees(amountRecord.amount) : '',
      count: amountRecord.count,
      holiday,
    }
  })

  return {
    monthKey: safeMonthKey,
    label: firstDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    days: [...blanks, ...dateCells],
  }
}

function buildHomePageSuggestion({ preview = {}, todayDateBox = {} } = {}) {
  const count = preview.count || 0

  if (count === 0) {
    return `Fresh page for ${todayDateBox.full || 'today'}. Start with the first expense you remember clearly.`
  }

  if (count === 1) {
    return 'The page has begun. Add only the next real expense when it happens.'
  }

  if ((preview.spent || 0) >= 1000) {
    return `${preview.spentLabel || rupees(preview.spent || 0)} is written today. Review once before you close the page.`
  }

  return `${count} lines written today. Keep the next entry simple and honest.`
}

function parseDailyFlowInput(text) {
  const parts = String(text || '')
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const visibleParts = parts.slice(0, DAILY_FLOW_MAX_ITEMS)

  return {
    overflowCount: Math.max(parts.length - visibleParts.length, 0),
    items: visibleParts.map((part, index) => {
      const cleanPart = part.replace(/\s+/g, ' ')
      const match = cleanPart.match(/^(.*?)\s*(?:-|:)?\s*(?:₹|rs\.?)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*$/i)
      const description = String(match?.[1] || cleanPart).trim() || 'Untitled line'
      const amount = match ? normalizeMoney(match[2]) : 0

      return {
        id: `${index}-${cleanPart}`,
        raw: cleanPart,
        description,
        amount,
        isValid: amount > 0,
      }
    }),
  }
}

function V12HomeScreen({
  todayTransactions = [],
  openAddSheet,
  openQuickTools,
  requestReportExport,
  saveDailyFlowEntries,
  moneyTheme = defaultMoneyOSTheme,
}) {
  const [historyFilter, setHistoryFilter] = useState('today')
  const [entryMode, setEntryMode] = useState('normal')
  const [customDate, setCustomDate] = useState(todayDateKey())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [calendarMonthKey, setCalendarMonthKey] = useState(currentMonthKey())
  const [stampActive, setStampActive] = useState(false)
  const [dailyInsight, setDailyInsight] = useState('')
  const [dailyFlowInput, setDailyFlowInput] = useState('')
  const [dailyFlowMessage, setDailyFlowMessage] = useState('')
  const [isDailyFlowSaving, setIsDailyFlowSaving] = useState(false)
  const [isPageClosed, setIsPageClosed] = useState(false)
  const [newEntryId, setNewEntryId] = useState(null)
  const previousTodayCountRef = useRef(null)
  const closePageTimerRef = useRef(null)
  const dailyFlowTimerRef = useRef(null)
  const themeExperience = useMemo(() => getMoneyOSThemeExperience(moneyTheme), [moneyTheme])
  const homeExpenseTransactions = useMemo(
    () => todayTransactions.filter(isHomeDailyExpenseTransaction),
    [todayTransactions],
  )
  const historyRange = useMemo(
    () => buildHomeNotebookHistoryRange(historyFilter, customDate),
    [customDate, historyFilter],
  )
  const dailyFlowPreview = useMemo(() => parseDailyFlowInput(dailyFlowInput), [dailyFlowInput])
  const dailyFlowValidItems = useMemo(
    () => dailyFlowPreview.items.filter((item) => item.isValid),
    [dailyFlowPreview.items],
  )
  const dailyFlowHasInvalidItems = useMemo(
    () => dailyFlowPreview.items.some((item) => !item.isValid),
    [dailyFlowPreview.items],
  )
  const dailyFlowTotal = useMemo(
    () => dailyFlowValidItems.reduce((total, item) => addMoney(total, item.amount), 0),
    [dailyFlowValidItems],
  )
  const notebookPreview = useMemo(
    () => buildHomeNotebookPreview(homeExpenseTransactions, historyRange),
    [historyRange, homeExpenseTransactions],
  )
  const selectedHistoryExpenses = useMemo(
    () => homeExpenseTransactions.filter((transaction) => {
      const dateKey = dailyTransactionDateKey(transaction)

      return dateKey >= historyRange.start && dateKey <= historyRange.end
    }),
    [historyRange, homeExpenseTransactions],
  )
  const todaysPreview = useMemo(
    () => buildHomeNotebookPreview(homeExpenseTransactions, buildHomeNotebookHistoryRange('today')),
    [homeExpenseTransactions],
  )
  const todayDateBox = buildHomeDateBox(todayDateKey())
  const calendarMonth = useMemo(
    () => buildHomeCalendarMonth({
      monthKey: calendarMonthKey,
      transactions: homeExpenseTransactions,
      todayKey: todayDateKey(),
    }),
    [calendarMonthKey, homeExpenseTransactions],
  )
  const todayHasLines = todaysPreview.count > 0
  const todayWrittenTotal = rupees(addMoney(todaysPreview.spent, todaysPreview.received))
  const todayDailyTotal = todaysPreview.spent > 0
    ? `${todaysPreview.spentLabel} out`
    : todaysPreview.received > 0
      ? `${todaysPreview.receivedLabel} in`
      : rupees(0)
  const todayPageTitle = todayHasLines
    ? `Today's page has ${todaysPreview.count} line${todaysPreview.count === 1 ? '' : 's'}`
    : 'A fresh page is waiting'
  const todayPageDetail = todayHasLines
    ? 'Your money notes for today are written below.'
    : 'Write the first line when money moves today.'
  const todayLastLine = todaysPreview.rows[0]?.timeLabel || 'No line yet'
  const homePageSuggestion = buildHomePageSuggestion({ preview: todaysPreview, todayDateBox })
  const todayPageLiveStats = [
    { key: 'date', label: 'Date', value: `${todayDateBox.weekday}, ${todayDateBox.day} ${todayDateBox.month}` },
    { key: 'lines', label: 'Lines', value: String(todaysPreview.count) },
    { key: 'written', label: 'Written', value: todayWrittenTotal },
    { key: 'last', label: 'Last line', value: todayLastLine },
  ]
  const showSelectedPagePreview = historyFilter !== 'today'
  const ambientTimeClass = getHomeAmbientTimeClass()
  const previousPageCount = Math.max(homeExpenseTransactions.length - todaysPreview.count, 0)
  const previousPageDetail = previousPageCount > 0
    ? `${previousPageCount} note${previousPageCount === 1 ? '' : 's'} from earlier pages.`
    : 'Your past entries will rest here quietly.'
  const handleHistoryReportDownload = useCallback(() => {
    requestReportExport?.('expense-history', {
      template: 'standard',
      period: historyRange.start || todayDateKey(),
      periodLabel: historyRange.label,
      historyFilter,
      range: historyRange,
      transactions: selectedHistoryExpenses,
    })
  }, [historyFilter, historyRange, requestReportExport, selectedHistoryExpenses])

  useEffect(() => {
    if (previousTodayCountRef.current === null) {
      previousTodayCountRef.current = todaysPreview.count
      return undefined
    }

    if (todaysPreview.count <= previousTodayCountRef.current) {
      previousTodayCountRef.current = todaysPreview.count
      return undefined
    }

    previousTodayCountRef.current = todaysPreview.count
    setStampActive(true)
    setIsPageClosed(false)
    setNewEntryId(todaysPreview.rows[0]?.id || null)

    const timers = []

    if (typeof window !== 'undefined') {
      timers.push(window.setTimeout(() => setStampActive(false), 1500))
      timers.push(window.setTimeout(() => setNewEntryId(null), 1400))
    }

    if (todaysPreview.count % 5 === 0 && typeof window !== 'undefined') {
      const insight = HOME_DAILY_INSIGHTS[Math.floor(Math.random() * HOME_DAILY_INSIGHTS.length)]

      timers.push(window.setTimeout(() => setDailyInsight(insight), 0))
      timers.push(window.setTimeout(() => setDailyInsight(''), 5000))
    }

    return () => {
      if (typeof window !== 'undefined') {
        timers.forEach((timer) => window.clearTimeout(timer))
      }
    }
  }, [todaysPreview.count, todaysPreview.rows])

  useEffect(() => () => {
    if (closePageTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(closePageTimerRef.current)
    }

    if (dailyFlowTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(dailyFlowTimerRef.current)
    }
  }, [])

  const closeTodayPage = () => {
    setIsPageClosed(true)

    if (closePageTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(closePageTimerRef.current)
    }

    if (typeof window !== 'undefined') {
      closePageTimerRef.current = window.setTimeout(() => {
        setIsPageClosed(false)
        closePageTimerRef.current = null
      }, 3000)
    }
  }

  const clearDailyFlowMessageSoon = (delay = 4200) => {
    if (typeof window === 'undefined') {
      return
    }

    if (dailyFlowTimerRef.current) {
      window.clearTimeout(dailyFlowTimerRef.current)
    }

    dailyFlowTimerRef.current = window.setTimeout(() => {
      setDailyFlowMessage('')
      dailyFlowTimerRef.current = null
    }, delay)
  }

  const clearDailyFlow = () => {
    setDailyFlowInput('')
    setDailyFlowMessage('')
  }

  const saveDailyFlow = async (event) => {
    event.preventDefault()

    if (isDailyFlowSaving) {
      return
    }

    if (dailyFlowHasInvalidItems) {
      setDailyFlowMessage('Add amounts to every line before writing.')
      clearDailyFlowMessageSoon()
      return
    }

    if (dailyFlowValidItems.length === 0) {
      setDailyFlowMessage('Add an amount to at least one line.')
      clearDailyFlowMessageSoon()
      return
    }

    setIsDailyFlowSaving(true)
    setDailyFlowMessage('Writing your lines...')

    try {
      const saved = await Promise.resolve(saveDailyFlowEntries?.(dailyFlowValidItems))
      const savedEntries = Array.isArray(saved) ? saved : []

      if (savedEntries.length === 0) {
        setDailyFlowMessage('Nothing was written. Check the amounts once.')
        clearDailyFlowMessageSoon()
        return
      }

      setDailyFlowInput('')
      setIsPageClosed(false)
      setStampActive(true)
      setDailyFlowMessage(`${savedEntries.length} line${savedEntries.length === 1 ? '' : 's'} written. Today's page has begun.`)
      clearDailyFlowMessageSoon(4600)

      if (typeof window !== 'undefined') {
        window.setTimeout(() => setStampActive(false), 1500)
      }
    } catch {
      setDailyFlowMessage('Could not write these lines. Please try again.')
      clearDailyFlowMessageSoon()
    } finally {
      setIsDailyFlowSaving(false)
    }
  }

  const openCalendarDate = (dateKey) => {
    setCustomDate(dateKey)
    setHistoryFilter('custom')
    setIsCalendarOpen(false)
  }

  return (
    <MoneyOSProvider as="section" className={`screen-content v12-home v16-notebook-cover money-os-daily-companion ${ambientTimeClass}`}>
      <section
        className={`v23-today-page-summary home-notebook-paper ${stampActive ? 'stamp-active' : ''} ${isPageClosed ? 'diary-closed' : ''}`}
        aria-labelledby="v23-today-page-title"
      >
        <div className="v23-today-page-heading home-notebook-paper-heading v25-today-page-opening">
          <div className="v25-today-page-copy">
            <p className="eyebrow">Today&apos;s Page</p>
            <h2 className="sticky-note-title" id="v23-today-page-title">{todayPageTitle}</h2>
            <p>{todayPageDetail}</p>
            <dl className="home-page-live-strip" aria-label="Today page live details">
              {todayPageLiveStats.map((item) => (
                <div key={item.key}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="home-page-suggestion">
              <Sparkles size={15} aria-hidden="true" />
              <span>{homePageSuggestion}</span>
            </p>
          </div>
          <div className="home-notebook-paper-actions v25-page-actions">
            <button
              className={`home-calendar-icon-button ${isCalendarOpen ? 'active' : ''}`.trim()}
              type="button"
              aria-expanded={isCalendarOpen}
              aria-controls="home-india-calendar"
              aria-label="Open Indian calendar"
              onClick={() => setIsCalendarOpen((current) => !current)}
            >
              <CalendarDays size={18} />
            </button>
            <span className="home-notebook-total-pill">{todayDailyTotal}</span>
            {stampActive && (
              <span className="stamp-icon" aria-hidden="true">
                <CheckCircle2 size={15} />
              </span>
            )}
          </div>
        </div>
        {dailyInsight && (
          <aside className="home-daily-insight" role="status" aria-live="polite">
            <Sparkles size={15} aria-hidden="true" />
            <span>{dailyInsight}</span>
          </aside>
        )}

        {isCalendarOpen && (
          <section className="home-calendar-popover" id="home-india-calendar" aria-label="Indian calendar with daily expense totals">
            <div className="home-calendar-topline">
              <div>
                <span>India Calendar</span>
                <strong>{calendarMonth.label}</strong>
              </div>
              <div className="home-calendar-month-actions">
                <button type="button" aria-label="Previous month" onClick={() => setCalendarMonthKey((monthKey) => shiftMonthKey(monthKey, -1))}>
                  <ChevronLeft size={16} />
                </button>
                <button type="button" aria-label="Next month" onClick={() => setCalendarMonthKey((monthKey) => shiftMonthKey(monthKey, 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="home-calendar-weekdays" aria-hidden="true">
              {HOME_CALENDAR_WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="home-calendar-grid">
              {calendarMonth.days.map((day) => {
                if (day.type === 'blank') {
                  return <span className="home-calendar-day blank" key={day.key} aria-hidden="true" />
                }

                const dayClasses = [
                  'home-calendar-day',
                  day.isToday ? 'today' : '',
                  day.isWeekend ? 'weekend' : '',
                  day.holiday ? 'holiday' : '',
                  day.amount > 0 ? 'has-amount' : '',
                ].filter(Boolean).join(' ')

                return (
                  <button
                    className={dayClasses}
                    type="button"
                    key={day.key}
                    aria-label={`${day.day} ${calendarMonth.label}${day.amount > 0 ? `, ${day.amountLabel} written` : ''}${day.holiday ? `, ${day.holiday.name}` : ''}`}
                    onClick={() => openCalendarDate(day.dateKey)}
                  >
                    <span className="home-calendar-day-number">{day.day}</span>
                    {day.amount > 0 && <span className="home-calendar-amount-circle">{day.amountLabel}</span>}
                    {day.holiday && <small>{day.holiday.shortName}</small>}
                  </button>
                )
              })}
            </div>
            <p className="home-calendar-note">Tap a date to review that page. Holidays show India-wide and common central observances.</p>
          </section>
        )}

        <section className="v24-page-start-tools" aria-label="Start today's page">
          <div className="v24-page-start-header">
            <div>
              <p className="eyebrow">Write</p>
              <h3>{entryMode === 'bulk' ? 'Bulk Expense Lines' : 'Add Expense'}</h3>
            </div>
            <div className="v24-mode-switch" role="tablist" aria-label="Choose expense entry mode">
              <button
                className={entryMode === 'normal' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={entryMode === 'normal'}
                onClick={() => setEntryMode('normal')}
              >
                Normal
              </button>
              <button
                className={entryMode === 'bulk' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={entryMode === 'bulk'}
                onClick={() => setEntryMode('bulk')}
              >
                Bulk
              </button>
            </div>
          </div>

          {entryMode === 'normal' ? (
            <div className="v24-normal-add-panel">
              <button className="primary-button v24-normal-add-button" type="button" onClick={() => openAddSheet?.('expense')}>
                <Pencil size={16} />
                <span>Add One Expense</span>
              </button>
              <p>Use this for one clean line like tea, petrol, grocery, recharge, or medicine.</p>
            </div>
          ) : (
            <form className="daily-flow-entry" onSubmit={saveDailyFlow}>
              <label className="daily-flow-label" htmlFor="daily-flow-input">
                <span>Bulk Lines</span>
                <small>Write several lines at once: tea 20, bread 10, lunch 200</small>
              </label>
              <textarea
                id="daily-flow-input"
                value={dailyFlowInput}
                placeholder="tea 20, bread 10, lunch 200"
                rows={2}
                onChange={(event) => {
                  setDailyFlowInput(event.target.value)
                  if (dailyFlowMessage) {
                    setDailyFlowMessage('')
                  }
                }}
              />

              {dailyFlowPreview.items.length > 0 && (
                <div className="daily-flow-preview" aria-label="Daily Flow preview">
                  <div className="daily-flow-preview-list">
                    {dailyFlowPreview.items.map((item) => (
                      <div className={`daily-flow-preview-line ${item.isValid ? '' : 'needs-amount'}`.trim()} key={item.id}>
                        <span>
                          <strong>{item.description}</strong>
                          <small>{item.isValid ? 'Ready to write' : 'Needs amount'}</small>
                        </span>
                        <b>{item.isValid ? rupees(item.amount) : 'Add amount'}</b>
                      </div>
                    ))}
                    {dailyFlowPreview.overflowCount > 0 && (
                      <p className="daily-flow-overflow">
                        + {dailyFlowPreview.overflowCount} more line{dailyFlowPreview.overflowCount === 1 ? '' : 's'} ignored for this batch.
                      </p>
                    )}
                  </div>
                  <div className="daily-flow-total-row">
                    <span>{dailyFlowValidItems.length} ready line{dailyFlowValidItems.length === 1 ? '' : 's'}</span>
                    <strong>{rupees(dailyFlowTotal)}</strong>
                  </div>
                </div>
              )}

              {dailyFlowMessage && <p className="daily-flow-message" role="status">{dailyFlowMessage}</p>}

              {dailyFlowPreview.items.length > 0 && (
                <div className="daily-flow-actions">
                  <button className="daily-flow-clear" type="button" onClick={clearDailyFlow}>
                    Clear
                  </button>
                  <button
                    className="daily-flow-save"
                    type="submit"
                    disabled={isDailyFlowSaving || dailyFlowValidItems.length === 0 || dailyFlowHasInvalidItems}
                  >
                    {isDailyFlowSaving
                      ? 'Writing...'
                      : dailyFlowHasInvalidItems
                        ? 'Add Amounts First'
                        : `Write ${dailyFlowValidItems.length || 0} Line${dailyFlowValidItems.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              )}
            </form>
          )}
        </section>

        <section className="v24-calculator-tools" aria-label="Quick calculator tools">
          <div className="v24-calculator-tools-heading">
            <span>Calculator Tools</span>
            <small>Keep math beside the page, not above writing.</small>
          </div>
          <div className="v24-tool-grid">
            {HOME_QUICK_TOOLS.map((tool) => {
              const ToolIcon = tool.icon

              return (
                <button className="v24-tool-button" type="button" key={tool.key} onClick={() => openQuickTools?.(tool.key)}>
                  <ToolIcon size={15} />
                  <span>
                    <strong>{tool.label}</strong>
                    <small>{tool.detail}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
        {todaysPreview.rows.length === 0 ? (
          <div className="empty-ruled-lines" aria-label="Empty notebook page">
            <div className="ruled-line ruled-line-placeholder">
              <span>Write your first money line</span>
              <span className="empty-cursor" aria-hidden="true" />
            </div>
            <div className="ruled-line ruled-line-placeholder" aria-hidden="true">
              <span className="ruled-line-fill" />
            </div>
            <div className="ruled-line ruled-line-placeholder" aria-hidden="true">
              <span className="ruled-line-fill" />
            </div>
            <p>Tap &quot;Add One Expense&quot; to start this page.</p>
          </div>
        ) : (
          <div className="v12-notebook-row-list v23-today-page-lines">
            {todaysPreview.rows.slice(0, 3).map((entry) => {
              return (
                <article
                  className={`ruled-line ruled-line-written ${newEntryId === entry.id ? 'ruled-line-new' : ''}`}
                  key={entry.id || `${entry.title}-${entry.dateTime}`}
                >
                  <span className="ruled-line-copy">
                    <strong>{entry.title || entry.category || 'Money move'}</strong>
                    <small>{entry.timeLabel}</small>
                  </span>
                  <b className="amount">{entry.amountLabel}</b>
                </article>
              )
            })}
            {todaysPreview.count > 3 && (
              <p className="home-notebook-more-lines">
                + {todaysPreview.count - 3} more line{todaysPreview.count - 3 === 1 ? '' : 's'} resting on this page.
              </p>
            )}
            {!isPageClosed && (
              <div className="home-close-page-row">
                <button className="home-close-page-button" type="button" onClick={closeTodayPage}>
                  Close Today&apos;s Page
                </button>
              </div>
            )}
            {isPageClosed && (
              <div className="home-page-closed-note" role="status">
                Page closed. Calmly done.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="previous-pages-section" aria-label="Previous notebook pages">
        <div className="previous-pages-heading">
          <h3 className="handwritten-subtitle">Previous Pages</h3>
          <p>{previousPageDetail}</p>
        </div>

        <section className="v16-history-selector v23-history-secondary" aria-label="Notebook history selector">
          <div className="v24-history-toolbar">
            <div>
              <p className="eyebrow">History</p>
              <h3>Expense pages</h3>
              <small>{notebookPreview.count} line{notebookPreview.count === 1 ? '' : 's'} in this view.</small>
            </div>
            <div className="v24-history-actions">
              <label className="v24-history-select">
                <span>View</span>
                <select
                  value={historyFilter}
                  onChange={(event) => setHistoryFilter(event.target.value)}
                  aria-label="Choose expense history range"
                >
                  {HOME_HISTORY_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ghost-button v24-history-download" type="button" onClick={handleHistoryReportDownload}>
                <Download size={15} />
                <span>Download report</span>
              </button>
            </div>
          </div>
          {historyFilter === 'custom' && (
            <label className="v16-history-custom-date">
              <span className="input-label">Notebook date</span>
              <input
                className="plain-input"
                type="date"
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
              />
            </label>
          )}
        </section>

        {showSelectedPagePreview && (
          <section className="v12-home-recent v16-cover-preview v23-selected-page-preview" aria-label="Selected notebook preview">
            <SectionHeader
              eyebrow="Selected page"
              title={historyRange.label}
              detail={`${notebookPreview.spentLabel} out, ${notebookPreview.receivedLabel} in.`}
              actions={<StatusBadge tone={notebookPreview.balance >= 0 ? 'success' : 'warning'}>{notebookPreview.balanceLabel}</StatusBadge>}
            />
            {notebookPreview.rows.length === 0 ? (
              <MoneyCard
                title="Fresh page"
                detail={themeExperience.copy.emptyHome}
                icon={Receipt}
                tone="neutral"
              />
            ) : (
              <div className="v12-notebook-row-list">
                {notebookPreview.rows.map((entry) => {
                  const EntryIcon = entry.icon || Receipt

                  return (
                    <article className={`v12-notebook-row v12-notebook-row--${entry.heroTone}`} key={entry.id || `${entry.title}-${entry.dateTime}`}>
                      <span className="v12-notebook-row-icon" aria-hidden="true">
                        <EntryIcon size={16} />
                      </span>
                      <span>
                        <strong>{entry.title || entry.category || 'Money move'}</strong>
                        <small>{entry.timeLabel}</small>
                      </span>
                      <b>{entry.amountLabel}</b>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </section>
    </MoneyOSProvider>
  )
}

const HOME_HISTORY_OPTIONS = [
  { key: 'today', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
  { key: 'custom', label: 'Custom' },
]

const HOME_DAILY_INSIGHTS = [
  "You've written 5 thoughtful entries today. That's mindful progress.",
  'This page is a quiet reflection of your financial clarity.',
  'Each entry is a step toward mastering your money story.',
  '5 entries done. Your future self will thank this calm habit.',
  'Writing money down dissolves anxiety. Keep the flow going.',
  'You are building a gentle, honest record of your life.',
  "Progress isn't loud. It's this. Right here.",
  'Your notebook respects your pace. Steady and calm.',
  "Clarity comes in small, daily doses. You're doing it.",
  'This is your space. Honest. Simple. Entirely yours.',
]

function getHomeAmbientTimeClass() {
  const hour = new Date().getHours()

  if (hour >= 6 && hour < 12) {
    return 'time-morning'
  }

  if (hour >= 12 && hour < 18) {
    return 'time-afternoon'
  }

  return 'time-evening'
}

function buildHomeNotebookHistoryRange(filter = 'today', customDate = todayDateKey()) {
  const todayKey = todayDateKey()
  const safeCustomDate = String(customDate || todayKey).slice(0, 10)

  if (filter === 'yesterday') {
    const yesterdayKey = shiftDailyDateKey(todayKey, -1)
    return { start: yesterdayKey, end: yesterdayKey, label: 'Yesterday' }
  }

  if (filter === 'week') {
    return { start: shiftDailyDateKey(todayKey, -6), end: todayKey, label: 'This week' }
  }

  if (filter === 'month') {
    return { start: `${todayKey.slice(0, 7)}-01`, end: todayKey, label: 'This month' }
  }

  if (filter === 'year') {
    return { start: `${todayKey.slice(0, 4)}-01-01`, end: todayKey, label: 'This year' }
  }

  if (filter === 'custom') {
    return { start: safeCustomDate, end: safeCustomDate, label: formatHomeNotebookDate(safeCustomDate) }
  }

  return { start: todayKey, end: todayKey, label: 'Today' }
}

function formatHomeNotebookDate(dateKey) {
  const parsed = new Date(`${String(dateKey || '').slice(0, 10)}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return 'Selected page'
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function buildHomeNotebookPreview(transactions = [], range = {}) {
  const filtered = transactions.filter((transaction) => {
    const dateKey = dailyTransactionDateKey(transaction)

    return dateKey >= range.start && dateKey <= range.end
  })
  const summary = buildTransactionSummary(filtered)
  const spent = summary.outgoing || 0
  const received = summary.incoming || 0
  const balance = addMoney(received, -spent)

  return {
    rows: buildDailyHeroActivity(filtered).slice(0, 5),
    count: filtered.length,
    spent,
    received,
    balance,
    spentLabel: rupees(spent),
    receivedLabel: rupees(received),
    balanceLabel: rupees(balance),
  }
}

function buildInsightsHealthStatus(financialState = {}, financialHealth = {}) {
  if (normalizeMoney(financialState.income) <= 0) {
    return {
      label: 'Attention Needed',
      detail: 'Add income to understand this month clearly.',
      tone: 'warning',
      badge: financialHealth.status === 'ready' ? financialHealth.label : 'Learning',
    }
  }

  if (financialState.pressureTone === 'slight-pressure') {
    return {
      label: 'Attention Needed',
      detail: 'Fixed costs need attention before new spending.',
      tone: 'warning',
      badge: financialState.pressure || 'Needs Space',
    }
  }

  if (financialState.pressureTone === 'warm' || financialState.pressureTone === 'balanced') {
    return {
      label: 'Moderate',
      detail: 'Money is workable; keep spending measured.',
      tone: 'tint',
      badge: financialState.pressure || 'Moderate',
    }
  }

  return {
    label: 'Healthy',
    detail: 'Income covers this month with room available.',
    tone: 'success',
    badge: financialHealth.status === 'ready' ? financialHealth.label : financialState.pressure || 'Healthy',
  }
}

function buildDailyMoneySnapshot(financialState = {}, safeToSpend = {}, transactionSummary = {}) {
  return {
    balance: {
      key: 'balance',
      label: 'Balance',
      value: rupees(safeToSpend.comfortablyUsable ?? financialState.safeToSpend ?? 0),
      tone: 'tint',
    },
    moneyIn: {
      key: 'in',
      label: 'Money In',
      value: rupees(transactionSummary.incoming || financialState.income || 0),
      tone: 'success',
    },
    moneyOut: {
      key: 'out',
      label: 'Money Out',
      value: rupees(transactionSummary.outgoing || financialState.committed || 0),
      tone: 'danger',
    },
  }
}

function dailyTransactionDateKey(transaction = {}) {
  return String(transaction.date || transaction.dateTime || '').slice(0, 10)
}

function shiftDailyDateKey(baseKey, days) {
  const parsed = new Date(`${String(baseKey || '').slice(0, 10)}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  parsed.setDate(parsed.getDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function buildDailyPeriodMoneySnapshot(transactions = [], range = {}, balanceValue = null) {
  const filtered = transactions.filter((transaction) => {
    const dateKey = dailyTransactionDateKey(transaction)

    return dateKey >= range.start && dateKey <= range.end
  })
  const summary = buildTransactionSummary(filtered)
  const moneyIn = summary.incoming || 0
  const moneyOut = summary.outgoing || 0
  const balance = balanceValue ?? addMoney(moneyIn, -moneyOut)

  return {
    moneyIn: rupees(moneyIn),
    moneyOut: rupees(moneyOut),
    balance: rupees(balance),
  }
}

function buildDailyPeriodSummaries(transactions = [], transactionSummary = {}, safeToSpend = {}, financialState = {}) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const weekStart = shiftDailyDateKey(todayKey, -6)
  const monthBalance = safeToSpend.comfortablyUsable ?? financialState.safeToSpend ?? 0
  const todaySnapshot = buildDailyPeriodMoneySnapshot(transactions, { start: todayKey, end: todayKey })
  const weekSnapshot = buildDailyPeriodMoneySnapshot(transactions, { start: weekStart, end: todayKey })

  return [
    {
      key: 'today',
      label: 'Today',
      spent: todaySnapshot.moneyOut,
      received: todaySnapshot.moneyIn,
      netBalance: todaySnapshot.balance,
    },
    {
      key: 'week',
      label: 'This Week',
      spent: weekSnapshot.moneyOut,
      received: weekSnapshot.moneyIn,
      netBalance: weekSnapshot.balance,
    },
    {
      key: 'month',
      label: 'This Month',
      spent: rupees(transactionSummary.outgoing || 0),
      received: rupees(transactionSummary.incoming || 0),
      netBalance: rupees(monthBalance),
    },
  ]
}

const DAILY_PERIOD_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
]

function DailyPremiumViewport({
  balanceValue,
  balanceLabel = 'Balance',
  periods = [],
  heroAmount,
  setHeroAmount,
  onAddExpense,
  onAddReceived,
  nextBestAction,
  legacyNextAction,
  LegacyNextActionIcon,
  onNextActionClick,
  smartFeedback,
  onSmartFeedbackClick,
  recentActivity = [],
}) {
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('today')
  const selectedPeriod = periods.find((period) => period.key === selectedPeriodKey) || periods[0]
  const hasAmount = normalizeMoney(heroAmount) > 0

  return (
    <section className="v851-daily-premium" aria-label="Daily money book">
      <article className="v851-daily-balance-card v10-home-header v10-summary-card" aria-label="Available balance">
        <span className="v851-daily-balance-label">{balanceLabel}</span>
        <AnimatedNumber as="strong" className="v851-daily-balance-value" value={balanceValue} />
      </article>

      <section className="v851-daily-action-area v10-home-quick-actions" aria-label="Record money">
        <label className="v851-daily-amount-field">
          <span className="v851-daily-amount-label">Amount optional</span>
          <span className="v851-daily-amount-input">
            <span aria-hidden="true">{getCurrencySymbol()}</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="Amount"
              value={heroAmount}
              placeholder="0"
              onChange={(event) => setHeroAmount(event.target.value)}
            />
          </span>
        </label>
        <div className="v851-daily-action-grid">
          <button className="v851-daily-action v851-daily-action--expense" type="button" onClick={onAddExpense}>
            <Receipt size={20} />
            <span>Add expense</span>
          </button>
          <button className="v851-daily-action v851-daily-action--received" type="button" onClick={onAddReceived}>
            <Wallet size={20} />
            <span>Add received money</span>
          </button>
        </div>
        <p className="v851-daily-action-hint">
          {hasAmount ? 'Amount ready. Choose expense or received money.' : 'Tap an action, or enter amount first.'}
        </p>
      </section>

      <div className="v851-period-selector" role="tablist" aria-label="Select period">
        {DAILY_PERIOD_OPTIONS.map((option) => {
          const isActive = option.key === selectedPeriodKey

          return (
            <button
              className={`v851-period-option ${isActive ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              key={option.key}
              onClick={() => setSelectedPeriodKey(option.key)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {selectedPeriod && (
        <article className="v851-period-summary-card v10-summary-card" aria-label={`${selectedPeriod.label} summary`}>
          <header className="v851-period-summary-header">
            <span>{selectedPeriod.label}</span>
          </header>
          <div className="v851-period-summary-metrics">
            <div className="v851-period-metric v851-period-metric--spent">
              <small>Spent</small>
              <AnimatedNumber as="strong" value={selectedPeriod.spent} />
            </div>
            <div className="v851-period-metric v851-period-metric--received">
              <small>Received</small>
              <AnimatedNumber as="strong" value={selectedPeriod.received} />
            </div>
            <div className="v851-period-metric v851-period-metric--net">
              <small>Net Balance</small>
              <AnimatedNumber as="strong" value={selectedPeriod.netBalance} />
            </div>
          </div>
        </article>
      )}

      {nextBestAction ? (
        <NextBestActionCard
          action={nextBestAction}
          surface="home"
          onAction={onNextActionClick}
          className="v851-daily-next-action v10-summary-card"
        />
      ) : (
        <MoneyCard
          as={legacyNextAction.target === 'expense' ? 'button' : 'section'}
          type={legacyNextAction.target === 'expense' ? 'button' : undefined}
          eyebrow="Next Action"
          title={legacyNextAction.title}
          detail={legacyNextAction.detail}
          meta={legacyNextAction.badge}
          icon={LegacyNextActionIcon}
          tone={legacyNextAction.tone}
          className="v851-daily-next-action v10-summary-card"
          interactive={legacyNextAction.target === 'expense'}
          onClick={legacyNextAction.target === 'expense' ? onAddExpense : undefined}
        />
      )}

      <SmartFeedbackCard
        feedback={smartFeedback}
        surface="home"
        onFeedbackClick={onSmartFeedbackClick}
        className="v851-daily-smart-feedback v10-summary-card"
      />

      <section className="v851-recent-activity v72-daily-panel v10-home-recent" aria-label="Recent Activity">
        <div className="v72-panel-header">
          <span>Recent Activity</span>
          <StatusBadge>{recentActivity.length}</StatusBadge>
        </div>
        {recentActivity.length === 0 ? (
          <p className="v72-empty-copy">No money activity yet.</p>
        ) : (
          <div className="v72-activity-list">
            {recentActivity.map((item) => {
              const ActivityIcon = item.icon

              return (
                <article className="v72-activity-row" key={item.id}>
                  <span className={`v72-activity-icon v72-activity-icon--${item.heroTone}`}>
                    <ActivityIcon size={15} />
                  </span>
                  <span className="v72-activity-copy">
                    <strong>{item.title || item.category || 'Money activity'}</strong>
                    <small>{item.category || item.sourceModule || 'Daily'} - {item.timeLabel}</small>
                  </span>
                  <em className={`v72-activity-amount v72-activity-amount--${item.heroTone}`}>
                    {item.amountLabel}
                  </em>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

function buildInsightsFlow(financialState = {}, safeToSpend = {}, transactionSummary = {}) {
  return [
    {
      key: 'income',
      label: 'Money In',
      value: rupees(financialState.income || transactionSummary.incoming || 0),
      icon: Wallet,
      tone: 'success',
    },
    {
      key: 'spent',
      label: 'Money Out',
      value: rupees(transactionSummary.outgoing || financialState.committed || 0),
      icon: Receipt,
      tone: 'danger',
    },
    {
      key: 'saved',
      label: 'Saved',
      value: rupees(transactionSummary.transfers || 0),
      icon: PiggyBank,
      tone: 'success',
    },
    {
      key: 'available',
      label: 'Balance',
      value: rupees(safeToSpend.comfortablyUsable ?? financialState.safeToSpend ?? 0),
      icon: CreditCard,
      tone: 'tint',
    },
  ]
}

function buildMonthlyStorySteps(financialState = {}, safeToSpend = {}, transactionSummary = {}) {
  return [
    {
      label: 'Income received',
      value: rupees(financialState.income || transactionSummary.incoming || 0),
    },
    {
      label: 'Bills and spending paid',
      value: rupees(transactionSummary.outgoing || financialState.committed || 0),
    },
    {
      label: 'Savings protected',
      value: rupees(transactionSummary.transfers || safeToSpend.protectedAmount || financialState.reserveTarget || 0),
    },
    {
      label: 'Available now',
      value: rupees(safeToSpend.comfortablyUsable ?? financialState.safeToSpend ?? 0),
    },
  ]
}

const MONEY_HEALTH_RANK = {
  critical: 1,
  attention_needed: 2,
  moderate: 3,
  healthy: 4,
  excellent: 5,
}

function isMoneyHealthScore(financialHealth = {}) {
  return financialHealth.system === 'v7.6-money-health' && !isLegacyMoneyScoreEnabled()
}

function moneyHealthChangeBucket(delta = 0) {
  const absoluteDelta = Math.abs(Number(delta) || 0)

  if (absoluteDelta >= 18) {
    return 'large'
  }

  if (absoluteDelta >= 8) {
    return 'medium'
  }

  return 'small'
}

function clampPercent(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Math.min(Math.max(number, 0), 100)
}

function InsightsCompanionOverview({
  financialHealth = {},
  financialState = {},
  safeToSpend = {},
  transactionSummary = {},
  reportHistory = [],
  nextBestAction,
  smartFeedback,
  onNextActionClick,
  onSmartFeedbackClick,
  onViewReports,
  onGenerateReport,
  isGeneratingReport = false,
  legacyInsights = false,
}) {
  const hasMoneyHealth = isMoneyHealthScore(financialHealth)
  const previousMoneyHealthRef = useRef(null)
  const health = hasMoneyHealth
    ? {
        label: financialHealth.label,
        detail: financialHealth.explanation,
        tone: financialHealth.tone,
        badge: financialHealth.badge || (financialHealth.status === 'ready' ? 'Ready' : 'Building'),
        scorePercent: Number.isFinite(Number(financialHealth.scorePercent)) ? clampPercent(financialHealth.scorePercent) : null,
      }
    : buildInsightsHealthStatus(financialState, financialHealth)
  const healthLabel = hasMoneyHealth
    ? (financialHealth.status === 'ready' ? financialHealth.label : 'Building')
    : (financialHealth.status === 'ready' ? financialHealth.label : 'Learning')
  const flowItems = buildInsightsFlow(financialState, safeToSpend, transactionSummary)
  const storySteps = buildMonthlyStorySteps(financialState, safeToSpend, transactionSummary)

  useEffect(() => {
    if (!hasMoneyHealth) {
      previousMoneyHealthRef.current = null
      return
    }

    const current = {
      status: financialHealth.status,
      score: Number.isFinite(Number(financialHealth.score)) ? Number(financialHealth.score) : null,
      labelKey: financialHealth.labelKey || 'building',
      primaryFactor: financialHealth.primaryFactor || 'moneyHealth',
    }

    trackEvent('money_health_viewed', {
      surface: 'insights',
      score_state: current.labelKey,
      confidence_state: financialHealth.confidenceState || (current.status === 'ready' ? 'sufficient' : 'insufficient'),
    })

    const previous = previousMoneyHealthRef.current

    if (previous?.status === 'ready' && current.status === 'ready' && previous.score !== null && current.score !== null) {
      const previousRank = MONEY_HEALTH_RANK[previous.labelKey] || 0
      const currentRank = MONEY_HEALTH_RANK[current.labelKey] || 0
      const delta = current.score - previous.score
      const eventPayload = {
        surface: 'insights',
        previous_state: previous.labelKey,
        next_state: current.labelKey,
        change_bucket: moneyHealthChangeBucket(delta),
        primary_factor: current.primaryFactor,
      }

      if (currentRank > previousRank || delta >= 8) {
        trackEvent('money_health_improved', eventPayload)
      } else if (currentRank < previousRank || delta <= -8) {
        trackEvent('money_health_declined', eventPayload)
      }
    }

    previousMoneyHealthRef.current = current
  }, [
    financialHealth.confidenceState,
    financialHealth.labelKey,
    financialHealth.primaryFactor,
    financialHealth.score,
    financialHealth.status,
    hasMoneyHealth,
  ])

  if (legacyInsights) {
    return (
      <MoneyOSProvider as="section" className="screen-content v7-insights-overview money-os-insights">
        <SectionHeader
          title="Insights"
          detail="Understand money"
          actions={<StatusBadge>{healthLabel}</StatusBadge>}
        />
        <div className="v7-companion-grid v7-insights-grid">
          <MoneyCard
            title="Money Score"
            detail="Placeholder"
            icon={Sparkles}
            tone="tint"
            actions={<StatusBadge>Future</StatusBadge>}
          />
          <MoneyCard
            title="Financial Health"
            detail="Moved into Insights"
            icon={ShieldCheck}
            tone="success"
            actions={<StatusBadge>{healthLabel}</StatusBadge>}
          />
          <MoneyCard
            title="Money Flow"
            detail="Placeholder"
            icon={Wallet}
            tone="warning"
            actions={<StatusBadge>Future</StatusBadge>}
          />
          <MoneyCard
            title="Monthly Story"
            detail="Placeholder"
            icon={ChartPie}
            tone="neutral"
            actions={<StatusBadge>Future</StatusBadge>}
          />
        </div>
      </MoneyOSProvider>
    )
  }

  return (
    <MoneyOSProvider as="section" className="screen-content v7-insights-overview v73-insights-hub money-os-insights">
      <SectionHeader
        title="Insights"
        detail="Understand money"
        actions={<StatusBadge tone={health.tone}>{health.label}</StatusBadge>}
      />

      <section className="v73-insights-health" aria-label="Money Health">
        <span className={`v73-health-orb v73-health-orb--${health.tone}`}>
          <ShieldCheck size={20} />
        </span>
        <div className="v76-money-health-copy">
          <p>Money Health</p>
          <h2>{health.label}</h2>
          <span>{health.detail}</span>
          {Number.isFinite(Number(health.scorePercent)) ? (
            <div className="v74-progress-track v76-money-health-track" aria-label={`${health.label} Money Health`}>
              <span className="v74-progress-fill" style={{ width: `${health.scorePercent}%` }} />
            </div>
          ) : null}
        </div>
        <StatusBadge tone={health.tone}>{health.badge}</StatusBadge>
      </section>

      {nextBestAction && (
        <NextBestActionCard
          action={nextBestAction}
          surface="insights"
          onAction={onNextActionClick}
          className="v78-insights-next-action"
        />
      )}

      <SmartFeedbackCard
        feedback={smartFeedback}
        surface="insights"
        onFeedbackClick={onSmartFeedbackClick}
        className="v82-insights-smart-feedback"
      />

      <section className="v73-insights-section" aria-label="Money Flow">
        <div className="v73-insights-section-header">
          <span>Money Flow</span>
          <StatusBadge>Current month</StatusBadge>
        </div>
        <div className="v73-flow-track">
          {flowItems.map((item) => {
            const FlowIcon = item.icon

            return (
              <article className={`v73-flow-node v73-flow-node--${item.tone}`} key={item.key}>
                <span>
                  <FlowIcon size={15} />
                </span>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </article>
            )
          })}
        </div>
      </section>

      <div className="v73-insights-grid">
        <section className="v73-insights-section" aria-label="Monthly Story">
          <div className="v73-insights-section-header">
            <span>Monthly Story</span>
            <StatusBadge>4 steps</StatusBadge>
          </div>
          <ol className="v73-story-list">
            {storySteps.map((step, index) => (
              <li key={step.label}>
                <span>{index + 1}</span>
                <p>{step.label}</p>
                <strong>{step.value}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section className="v73-insights-section v73-report-access" aria-label="Reports">
          <div className="v73-insights-section-header">
            <span>Reports</span>
            <StatusBadge>{reportHistory.length} saved</StatusBadge>
          </div>
          <div className="v73-report-actions">
            <button className="ghost-button" type="button" onClick={onViewReports}>
              <ChartPie size={16} />
              View reports
            </button>
            <button className="primary-button" type="button" onClick={onGenerateReport} disabled={isGeneratingReport}>
              <Download size={16} />
              {isGeneratingReport ? 'Preparing' : 'Download report'}
            </button>
          </div>
        </section>
      </div>
    </MoneyOSProvider>
  )
}

function ProfileCompanionHome({
  authUser,
  expenses = [],
  transactionSummary = {},
  selectedMonthKey = currentMonthKey(),
  openSettings,
  onEnableBackup,
  supportEmail,
  supportPaymentUrl,
  founderName,
  founderLinkedInUrl,
}) {
  const backupStatus = authUser?.id ? 'Protected by Cloud Backup' : 'Local Only'
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => String(expense?.date || expense?.dateKey || '').startsWith(selectedMonthKey)),
    [expenses, selectedMonthKey],
  )
  const categorySummary = useMemo(() => aggregateExpenses(monthExpenses), [monthExpenses])
  const topCategory = categorySummary.categories[0]
  const categoryChart = useMemo(() => ({
    title: 'Money Visuals',
    subtitle: 'Where this month is going',
    totalLabel: rupees(categorySummary.total || 0),
    tone: 'matte',
    entries: categorySummary.categories.slice(0, 6).map((item, index) => ({
      name: item.name,
      value: item.value,
      color: item.color || categoryColor(item.name) || getFinanceColor(item.name, index),
    })),
  }), [categorySummary])
  const profileInsight = topCategory
    ? `${topCategory.name} is the biggest visible spend area at ${rupees(topCategory.value)}.`
    : 'Write a few expenses and this page will turn them into simple visuals.'

  return (
    <MoneyOSProvider as="section" className="screen-content v7-profile-home v13-account-home v24-profile-page money-os-profile">
      <SectionHeader
        eyebrow="Profile"
        title="Your Money Picture"
        detail="Simple visuals from the notebook, without turning the app into a dashboard."
        actions={<StatusBadge tone={authUser?.id ? 'success' : 'warning'}>{backupStatus}</StatusBadge>}
      />

      <section className="v24-profile-visual-grid" aria-label="Money visuals">
        <FinanceDonut chart={categoryChart} />
        <div className="v24-profile-explain-card">
          <p className="eyebrow">Simple Explanation</p>
          <h2>{topCategory ? 'Main spend area' : 'Your picture is forming'}</h2>
          <p>{profileInsight}</p>
          <div className="v24-profile-mini-stats">
            <span>
              <small>Entries</small>
              <strong>{categorySummary.count}</strong>
            </span>
            <span>
              <small>Spent</small>
              <strong>{rupees(categorySummary.total || transactionSummary.outgoing || 0)}</strong>
            </span>
            <span>
              <small>Categories</small>
              <strong>{categorySummary.categories.length}</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="v13-account-group" aria-labelledby="v13-account-appearance">
        <SectionHeader
          title="Themes"
          detail="Choose a clean appearance style. The whole app follows this choice."
        />
        <ActionCard
          id="v13-account-appearance"
          title="Theme & appearance"
          detail="Change colors, typography, and surface styling from one place."
          actionLabel="Open"
          icon={User}
          tone="tint"
          onClick={openSettings}
        />
      </section>

      <section className="v13-account-group" aria-labelledby="v13-account-backup">
        <SectionHeader
          title="Backup"
          detail="Data protection for this notebook."
        />
        <MoneyCard
          id="v13-account-backup"
          title="Backup status"
          detail={authUser?.id ? 'Cloud Backup is active for this account.' : 'Local only until Cloud Backup is enabled.'}
          icon={ShieldCheck}
          tone={authUser?.id ? 'success' : 'warning'}
          actions={<StatusBadge tone={authUser?.id ? 'success' : 'warning'}>{backupStatus}</StatusBadge>}
          footer={!authUser?.id && (
            <button className="ghost-button full" type="button" onClick={onEnableBackup}>
              Enable Cloud Backup
            </button>
          )}
        />
      </section>

      <details className="v13-account-group-details">
        <summary>
          <span>
            <strong>Support</strong>
            <small>Feedback and help when something feels unclear.</small>
          </span>
          <StatusBadge>Open</StatusBadge>
        </summary>
        <Suspense fallback={<FLoader label="Opening Support" />}>
          <ProfileHub
            supportEmail={supportEmail}
            supportPaymentUrl={supportPaymentUrl}
            founderName={founderName}
            founderLinkedInUrl={founderLinkedInUrl}
            className="v13-account-support-panel"
          />
        </Suspense>
      </details>

      <section className="v13-account-group" aria-labelledby="v13-account-about">
        <SectionHeader
          title="About & Privacy"
          detail="FBPLY product and founder details."
        />
        <div className="v13-account-about-grid">
          <ActionCard
            id="v13-account-about"
            title="About FBPLY"
            detail={founderName ? `Founder-led by ${founderName}.` : 'Product details, privacy, and ownership.'}
            actionLabel="Read"
            icon={Sparkles}
            tone="neutral"
            href="/about"
          />
          {founderLinkedInUrl && (
            <ActionCard
              title="Founder LinkedIn"
              detail="Open the founder profile."
              actionLabel="Open"
              icon={ExternalLink}
              tone="tint"
              href={founderLinkedInUrl}
              target="_blank"
              rel="noreferrer noopener"
            />
          )}
        </div>
      </section>
    </MoneyOSProvider>
  )
}

function MainApp(props) {
  const {
    activeTab,
    setActiveTab,
    moneyTheme,
    setMoneyTheme,
    profile,
    setProfile,
    authUser,
    onEnableBackup,
    onSignOut,
    addSheetMode,
    openAddSheet,
    closeAddSheet,
    financialState,
    insights,
    smartHomeInsights,
    smartReminders,
    financialHealth,
    nextBestAction,
    smartFeedback,
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
    saveDailyFlowEntries,
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
    onStatementMappingsChange,
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [hasOpenedNotifications, setHasOpenedNotifications] = useState(false)
  const [statementImportRequestId, setStatementImportRequestId] = useState(0)
  const [quickIncomeInitialAmount, setQuickIncomeInitialAmount] = useState('')
  const [quickToolsSheet, setQuickToolsSheet] = useState(null)
  const [isInsightsReportsOpen, setIsInsightsReportsOpen] = useState(false)
  const [isAccountAdvancedOpen, setIsAccountAdvancedOpen] = useState(false)
  const pendingNextActionRef = useRef(null)
  const useLegacyNavigation = isLegacyNavigation()
  const useLegacyDailyHero = isLegacyDailyHero()
  const useLegacyInsights = isLegacyInsights()
  const activeNavigationTab = resolveNavigationTab(activeTab, useLegacyNavigation)
  const navigationItems = useLegacyNavigation ? legacyNavItems : companionNavItems
  const setCompanionActiveTab = useCallback((tab) => {
    setActiveTab(resolveNavigationTab(tab, useLegacyNavigation))
  }, [setActiveTab, useLegacyNavigation])
  const openDailyHeroEntry = useCallback((mode, amount) => {
    const initialAmount = normalizeDailyHeroAmount(amount)

    if (mode === 'expense') {
      setExpenseAmount(initialAmount)
      trackEvent('quick_expense_entry_opened', {
        screen: 'daily',
        has_amount: Boolean(initialAmount),
      })
    }

    if (mode === 'income') {
      setQuickIncomeInitialAmount(initialAmount)
    }

    openAddSheet(mode)
  }, [openAddSheet, setExpenseAmount])
  const closeQuickAddSheet = useCallback(() => {
    setQuickIncomeInitialAmount('')
    closeAddSheet()
  }, [closeAddSheet])
  const openQuickTools = useCallback((tool = 'calculator') => {
    if (isLegacyQuickTools()) {
      return
    }

    setQuickToolsSheet(tool)
  }, [])
  const closeQuickTools = useCallback(() => {
    setQuickToolsSheet(null)
  }, [])

  useEffect(() => {
    const viewEvent = (useLegacyNavigation ? LEGACY_TAB_VIEW_EVENTS : COMPANION_TAB_VIEW_EVENTS)[activeNavigationTab]

    if (viewEvent) {
      trackEvent(viewEvent)
    }

    if (!useLegacyNavigation) {
      const compatibilityEvent = COMPANION_COMPAT_VIEW_EVENTS[activeNavigationTab]

      if (compatibilityEvent && compatibilityEvent !== viewEvent) {
        trackEvent(compatibilityEvent)
      }
    }
  }, [activeNavigationTab, useLegacyNavigation])

  const scrollToTargetId = useCallback((targetId) => {
    if (!targetId || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    let attempts = 0
    const tryScroll = () => {
      const target = document.getElementById(targetId)

      if (target) {
        let ancestor = target.parentElement

        while (ancestor) {
          if (ancestor.tagName === 'DETAILS' && !ancestor.open) {
            ancestor.open = true
          }

          ancestor = ancestor.parentElement
        }

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
    const destinationTab = resolveNavigationTab(tab, useLegacyNavigation)

    if (
      !useLegacyNavigation &&
      !useLegacyInsights &&
      (destinationTab === 'reports' || tab === 'reports' || targetId === 'reports-export-section')
    ) {
      setIsInsightsReportsOpen(true)
    }

    setCompanionActiveTab(tab)
    scrollToTargetId(targetId)
  }, [scrollToTargetId, setCompanionActiveTab, useLegacyInsights, useLegacyNavigation])
  const openStatementImportFromAddHub = useCallback(() => {
    if (!useLegacyNavigation && !useLegacyInsights) {
      setIsInsightsReportsOpen(true)
    }

    setCompanionActiveTab('reports')
    setStatementImportRequestId((current) => current + 1)
  }, [setCompanionActiveTab, useLegacyInsights, useLegacyNavigation])
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
  const openInsightsReports = useCallback(() => {
    setIsInsightsReportsOpen(true)

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.setTimeout(() => {
        document.getElementById('v73-insights-reports')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    }
  }, [])
  const generateInsightsReport = useCallback(() => {
    setIsInsightsReportsOpen(true)
    requestReportExport?.('monthly')
  }, [requestReportExport])
  const nextActionCompletionMetrics = useMemo(
    () => getNextActionCompletionMetrics({
      expenses,
      savingsBuckets,
      moneyBookSummary,
      sharedSummary,
    }),
    [expenses, moneyBookSummary, savingsBuckets, sharedSummary],
  )
  const completeNextAction = useCallback(() => {
    pendingNextActionRef.current = null
    trackEvent('next_action_completed', {
      surface: 'home',
    })
  }, [])
  const handleNextActionClick = useCallback((action, surface = 'home') => {
    if (!action) {
      return
    }

    const completionRule = action.completionRule || {}
    pendingNextActionRef.current = {
      actionId: action.id,
      rule: completionRule,
      baseline: nextActionCompletionMetrics,
      clickedAt: Date.now(),
    }

    trackEvent('next_action_clicked', {
      surface,
      action_type: action.type,
    })

    const destination = action.destination || {}

    if (destination.kind === 'sheet' && destination.sheet) {
      openDailyHeroEntry(destination.sheet)
    } else if (destination.kind === 'tab' && destination.tab) {
      navigateToTarget(destination.tab, destination.targetId)
    } else if (destination.kind === 'settings') {
      setIsSettingsOpen(true)
      trackEvent('profile_viewed')
      trackFeatureUsage('settings_opened', {
        surface: 'next_action',
      })
    }

    if (completionRule.comparison === 'view') {
      completeNextAction()
    }
  }, [completeNextAction, navigateToTarget, nextActionCompletionMetrics, openDailyHeroEntry])

  const handleSmartFeedbackClick = useCallback((feedback, surface = 'home') => {
    if (!feedback) {
      return
    }

    trackEvent('feedback_clicked', {
      surface,
      feedback_type: feedback.type,
    })

    const destination = feedback.destination || {}

    if (destination.kind === 'tab' && destination.tab) {
      navigateToTarget(destination.tab, destination.targetId)
    }
  }, [navigateToTarget])

  useEffect(() => {
    const pending = pendingNextActionRef.current

    if (!pending || pending.rule?.comparison === 'view') {
      return
    }

    if (Date.now() - pending.clickedAt > 30 * 60 * 1000) {
      pendingNextActionRef.current = null
      return
    }

    if (hasNextActionCompletion(pending.rule, pending.baseline, nextActionCompletionMetrics)) {
      completeNextAction()
    }
  }, [completeNextAction, nextActionCompletionMetrics])

  const todayScreenNode = (
    <Suspense fallback={<HomeScreenFallback />}>
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
        setActiveTab={setCompanionActiveTab}
        openAddSheet={openAddSheet}
        downloadPdf={downloadPdf}
        isExportingPdf={isExportingPdf}
        pdfError={pdfError}
        navigateToTarget={navigateToTarget}
      />
    </Suspense>
  )
  const dailyBookScreenNode = (
    <Suspense fallback={<DailyBookScreenFallback />}>
      <DailyBookScreen
        expenses={expenses}
        openAddSheet={openAddSheet}
      />
    </Suspense>
  )
  const reportsScreenNode = (
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
        onStatementMappingsChange={onStatementMappingsChange}
        exportCsv={exportCsv}
        isExportingPdf={isExportingPdf}
        exportingReportType={exportingReportType}
        reportExportPrompt={reportExportPrompt}
        onReportPromptAction={handleReportPromptAction}
        clearReportExportPrompt={clearReportExportPrompt}
        selectedMonthKey={selectedMonthKey}
        setSelectedMonthKey={setSelectedMonthKey}
        monthOptions={monthOptions}
        statementImportRequestId={statementImportRequestId}
      />
      {pdfError && <p className="form-message">{pdfError}</p>}
    </Suspense>
  )

  return (
    <div className={motionSurfaceClassName(useLegacyNavigation ? 'app-shell' : 'app-shell v12-app-shell')}>
      <div className="app-brand-chip" aria-label="FBPly">
        <BrandMark size="tiny" />
        <span>FBPly</span>
      </div>
      {useLegacyNavigation && (
        <button
          className="top-settings-button"
          type="button"
          aria-label="Open profile and settings"
          onClick={() => {
            setIsSettingsOpen(true)
            trackEvent('profile_viewed')
            trackFeatureUsage('settings_opened', {
              surface: 'app_chrome',
            })
          }}
        >
          <User size={18} />
        </button>
      )}
      <button
        className="top-notification-button"
        type="button"
        aria-label="Open notifications"
        onClick={() => {
          setHasOpenedNotifications(true)
          setIsNotificationsOpen(true)
        }}
      >
        <Bell size={18} />
      </button>
      {hasOpenedNotifications && (
        <Suspense fallback={null}>
          <NotificationCenter
            open={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
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
      )}
      <QuickAddFab openAddSheet={openAddSheet} activeTab={activeNavigationTab} />
      <main className="screen-panel notebook-foundation">
        {activeNavigationTab === 'home' && (
          <>
            {!useLegacyNavigation ? (
              <V12HomeScreen
                safeToSpend={safeToSpend}
                financialState={financialState}
                transactionSummary={transactionSummary}
                todayTransactions={todayTransactions}
                nextBestAction={nextBestAction}
                onNextActionClick={handleNextActionClick}
                openAddSheet={openAddSheet}
                openQuickTools={openQuickTools}
                requestReportExport={requestReportExport}
                saveDailyFlowEntries={saveDailyFlowEntries}
                moneyTheme={moneyTheme}
              />
            ) : (
              <>
                <DailyCompanionEntry
                  safeToSpend={safeToSpend}
                  financialState={financialState}
                  transactionSummary={transactionSummary}
                  openAddSheet={openAddSheet}
                  openQuickEntry={openDailyHeroEntry}
                  todayTransactions={todayTransactions}
                  recommendation={recommendation}
                  nextBestAction={nextBestAction}
                  smartFeedback={smartFeedback}
                  onNextActionClick={handleNextActionClick}
                  onSmartFeedbackClick={handleSmartFeedbackClick}
                  legacyDailyHero={useLegacyDailyHero}
                />
                {todayScreenNode}
                {dailyBookScreenNode}
              </>
            )}
          </>
        )}
        {!useLegacyNavigation && activeNavigationTab === 'ledger' && (
          <Suspense fallback={<DailyBookScreenFallback />}>
            <ActivityScreen
              view="borrow"
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
              setActiveTab={setCompanionActiveTab}
              openAddSheet={openAddSheet}
              openQuickTools={openQuickTools}
              requestReportExport={requestReportExport}
              moneyTheme={moneyTheme}
            />
          </Suspense>
        )}
        {((useLegacyNavigation && activeNavigationTab === 'history') || (!useLegacyNavigation && activeNavigationTab === 'people')) && (
          <>
            {useLegacyNavigation && (
              <Suspense fallback={<DailyBookScreenFallback />}>
                <DailyBookScreen
                  expenses={expenses}
                  openAddSheet={openAddSheet}
                />
              </Suspense>
            )}
            <Suspense fallback={<DailyBookScreenFallback />}>
              <ActivityScreen
                view={useLegacyNavigation ? 'people' : 'split'}
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
                setActiveTab={setCompanionActiveTab}
                openAddSheet={openAddSheet}
                openQuickTools={openQuickTools}
                requestReportExport={requestReportExport}
                moneyTheme={moneyTheme}
              />
            </Suspense>
          </>
        )}
        {activeNavigationTab === 'planner' && (
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
        {activeNavigationTab === 'reports' && (
          <>
            {!useLegacyNavigation && (
              <InsightsCompanionOverview
                financialHealth={financialHealth}
                financialState={financialState}
                safeToSpend={safeToSpend}
                transactionSummary={reportTransactionSummary}
                reportHistory={reportHistory}
                nextBestAction={nextBestAction}
                smartFeedback={smartFeedback}
                onNextActionClick={handleNextActionClick}
                onSmartFeedbackClick={handleSmartFeedbackClick}
                onViewReports={openInsightsReports}
                onGenerateReport={generateInsightsReport}
                isGeneratingReport={isExportingPdf || Boolean(exportingReportType)}
                legacyInsights={useLegacyInsights}
              />
            )}
            {(useLegacyNavigation || useLegacyInsights) && reportsScreenNode}
            {!useLegacyNavigation && !useLegacyInsights && (
              <details
                className="v73-insights-reports-details"
                id="v73-insights-reports"
                open={isInsightsReportsOpen}
                onToggle={(event) => setIsInsightsReportsOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>
                    <strong>Saved downloads</strong>
                    <small>Advanced review and older notebook downloads</small>
                  </span>
                  <StatusBadge>{isInsightsReportsOpen ? 'Open' : 'View'}</StatusBadge>
                </summary>
                <div className="v73-insights-reports-stack">
                  {isInsightsReportsOpen && reportsScreenNode}
                </div>
              </details>
            )}
          </>
        )}
        {((!useLegacyNavigation && activeNavigationTab === 'account') || (useLegacyNavigation && activeNavigationTab === 'profile')) && (
          <>
            {!useLegacyNavigation && (
              <ProfileCompanionHome
                authUser={authUser}
                expenses={expenses}
                transactionSummary={transactionSummary}
                selectedMonthKey={selectedMonthKey}
                onEnableBackup={onEnableBackup}
                supportEmail={supportEmail}
                supportPaymentUrl={supportPaymentUrl}
                founderName={founderName}
                founderLinkedInUrl={founderLinkedInUrl}
                openSettings={() => {
                  setIsSettingsOpen(true)
                  trackEvent('profile_viewed')
                  trackFeatureUsage('settings_opened', {
                    surface: 'profile_tab',
                  })
                }}
              />
            )}
            {!useLegacyNavigation && (
              <details
                className="v12-account-secondary-details"
                id="v12-account-reports"
                open={isInsightsReportsOpen}
                onToggle={(event) => setIsInsightsReportsOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>
                    <strong>Report downloads</strong>
                    <small>Older notebook reports and statement downloads</small>
                  </span>
                  <StatusBadge>{isInsightsReportsOpen ? 'Open' : 'Hidden'}</StatusBadge>
                </summary>
                <div className="v12-account-secondary-stack">
                  {isInsightsReportsOpen && reportsScreenNode}
                </div>
              </details>
            )}
            {!useLegacyNavigation ? (
              <details
                className="v83-profile-advanced-details"
                open={isAccountAdvancedOpen}
                onToggle={(event) => setIsAccountAdvancedOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>
                    <strong>Settings & Preferences</strong>
                    <small>Themes, backup, bills, voice entry, and advanced controls</small>
                  </span>
                  <StatusBadge>Advanced</StatusBadge>
                </summary>
                {isAccountAdvancedOpen && (
                  <ProfileScreen
                    profile={profile}
                    setProfile={setProfile}
                    authUser={authUser}
                    onEnableBackup={onEnableBackup}
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
                    navigateToTarget={navigateToTarget}
                    openStatementImport={openStatementImportFromAddHub}
                  />
                )}
              </details>
            ) : (
              <ProfileScreen
                profile={profile}
                setProfile={setProfile}
                authUser={authUser}
                onEnableBackup={onEnableBackup}
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
                navigateToTarget={navigateToTarget}
                openStatementImport={openStatementImportFromAddHub}
              />
            )}
          </>
        )}
      </main>
      <LoggedInLegalFooter />
      {addSheetMode && (
        <QuickAddSheet
          mode={addSheetMode}
          setMode={openAddSheet}
          onClose={closeQuickAddSheet}
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
          setActiveTab={setCompanionActiveTab}
          navigateToTarget={navigateToTarget}
          openQuickTools={openQuickTools}
          initialIncomeAmount={quickIncomeInitialAmount}
        />
      )}
      {quickToolsSheet && !isLegacyQuickTools() && (
        <Suspense fallback={<FLoader fullPage label="Opening Quick Calculators" />}>
          <QuickToolsSheet
            key={quickToolsSheet}
            open
            initialTool={quickToolsSheet}
            onClose={closeQuickTools}
          />
        </Suspense>
      )}
      {isSettingsOpen && (
        <Suspense fallback={<FLoader fullPage label="Opening Profile Hub" />}>
          <SettingsScreen
            authUser={authUser}
            moneyTheme={moneyTheme}
            setMoneyTheme={setMoneyTheme}
            profile={profile}
            setProfile={setProfile}
            onEnableBackup={onEnableBackup}
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
            navigateToTarget={navigateToTarget}
            openStatementImport={openStatementImportFromAddHub}
            supportEmail={supportEmail}
            supportPaymentUrl={supportPaymentUrl}
            founderName={founderName}
            founderLinkedInUrl={founderLinkedInUrl}
          />
        </Suspense>
      )}
      <BottomNav activeTab={activeNavigationTab} setActiveTab={setCompanionActiveTab} items={navigationItems} />
    </div>
  )
}

function QuickAddFab({ openAddSheet, activeTab }) {
  const longPressTimerRef = useRef(null)
  const didLongPressRef = useRef(false)
  const useLegacyAdd = isLegacyAddExperience()

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

  if (activeTab === 'home') {
    return null
  }

  return (
    <button
      className="top-quick-add-button"
      type="button"
      aria-label={useLegacyAdd ? 'Add expense' : 'Add money action'}
      title={useLegacyAdd ? 'Add expense' : 'Add money action'}
      onClick={() => {
        if (didLongPressRef.current) {
          didLongPressRef.current = false
          return
        }

        openAddSheet(useLegacyAdd ? 'expense' : 'menu')
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        openAddSheet('menu')
      }}
      onPointerDown={useLegacyAdd ? startLongPressTimer : undefined}
      onPointerLeave={useLegacyAdd ? clearLongPressTimer : undefined}
      onPointerCancel={useLegacyAdd ? clearLongPressTimer : undefined}
      onPointerUp={useLegacyAdd ? clearLongPressTimer : undefined}
    >
      <Plus size={20} />
    </button>
  )
}

function ReportsFallback() {
  return (
    <section className="screen-content reports-screen">
      <FLoader fullPage label="Preparing reports" />
    </section>
  )
}

function HomeScreenFallback() {
  return (
    <section className="screen-content v10-home-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Preparing your money view</span>
      <div className="v10-home-skeleton-hero skeleton-card">
        <span className="skeleton-line" />
        <span className="skeleton-line short" />
        <span className="skeleton-block" />
      </div>
      <div className="v10-home-skeleton-grid" aria-hidden="true">
        <article className="v10-home-skeleton-card skeleton-card" />
        <article className="v10-home-skeleton-card skeleton-card" />
      </div>
      <div className="v10-home-skeleton-actions" aria-hidden="true">
        <span className="skeleton-option" />
        <span className="skeleton-option" />
        <span className="skeleton-option" />
      </div>
    </section>
  )
}

function DailyBookScreenFallback() {
  return (
    <section className="screen-content">
      <FLoader fullPage label="Preparing daily book" />
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
          <span>{isUnlocked ? 'Unlocked. Preparing report...' : isWatching ? 'Thanks. Unlocking download...' : 'Report download unlock'}</span>
          <strong>{Math.min(rewardState.progress, 100)}%</strong>
        </div>
        <div className="reward-actions">
          <button className="primary-button" type="button" onClick={onStart} disabled={isWatching || isUnlocked}>
            {isWatching ? 'Watching...' : isUnlocked ? 'Unlocked' : 'Watch short ad'}
          </button>
          <button className="ghost-button" type="button" onClick={onClose} disabled={isUnlocked}>
            Close
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
  navigateToTarget,
  openQuickTools,
  initialIncomeAmount = '',
}) {
  const title = {
    menu: 'Notebook actions',
    expense: "Add Today's Expense",
    income: 'Add income',
    transfer: 'Move to goal',
    borrow: 'Borrow or lend',
  }[mode] || 'Add money move'
  const [successState, setSuccessState] = useState(null)
  const [inboxPreparedDraft, setInboxPreparedDraft] = useState(null)

  const openAddMode = (nextMode) => {
    setInboxPreparedDraft(null)
    setMode(nextMode)
  }

  const openHubDestination = (tab, targetId) => {
    onClose()

    if (navigateToTarget) {
      navigateToTarget(tab, targetId)
      return
    }

    setActiveTab?.(tab)
  }

  const buildSuccessActions = (nextMode = 'menu') => [
    {
      label: 'Add another',
      onClick: () => {
        setSuccessState(null)
        setInboxPreparedDraft(null)
        setMode(nextMode)
      },
      variant: 'primary',
    },
    { label: 'Close', onClick: onClose, variant: 'secondary' },
  ]

  const showActionSuccess = ({ title: successTitle, detail, mode: nextMode = mode, actions, autoCloseMs = 950 }) => {
    setSuccessState({
      title: successTitle,
      detail,
      actions: actions || buildSuccessActions(nextMode),
      autoCloseMs,
    })
  }

  useEffect(() => {
    if (!successState?.autoCloseMs || typeof window === 'undefined') {
      return undefined
    }

    const closeTimer = window.setTimeout(() => {
      onClose?.()
    }, successState.autoCloseMs)

    return () => window.clearTimeout(closeTimer)
  }, [onClose, successState])

  const openSharedExpense = () => {
    setInboxPreparedDraft(null)
    trackEvent('add_people_selected')
    trackFeatureUsage('add_hub_action_selected', {
      surface: 'add_hub',
      action: 'shared_expense',
    })
    openHubDestination('history', 'shared-expenses-section')
  }

  const openBorrowLendMode = (kind = 'given') => {
    setSuccessState(null)
    setInboxPreparedDraft({
      mode: 'borrow',
      moneyBookDraft: {
        kind,
        date: todayDateKey(),
      },
    })
    setMode('borrow')
  }

  const openQuickToolsFromHub = () => {
    trackEvent('add_other_actions_selected')
    trackFeatureUsage('add_hub_action_selected', {
      surface: 'add_hub',
      action: 'quick_tools',
    })
    onClose()
    openQuickTools?.('calculator')
  }

  if (!isLegacyAddExperience()) {
    const isMenu = mode === 'menu'
    const isExpenseSpread = mode === 'expense' && !successState
    const sheetTitle = successState ? successState.title : title
    const sheetDescription = successState
      ? 'Saved.'
      : isMenu
        ? ''
        : isExpenseSpread
          ? formatHomeNotebookDate(todayDateKey())
        : ''
    const footer = successState
      ? null
      : isMenu || isExpenseSpread
        ? null
        : (
            <SecondaryButton onClick={() => {
              setSuccessState(null)
              openAddMode('menu')
            }}>Back to actions</SecondaryButton>
          )

    return (
      <BottomSheet
        open={Boolean(mode)}
        onClose={onClose}
        title={sheetTitle}
        description={sheetDescription}
        className={`mos-add-hub-sheet ${isExpenseSpread ? 'notebook-spread-sheet' : ''}`.trim()}
        bodyClassName={`mos-add-hub-body ${isExpenseSpread ? 'notebook-spread-body' : ''}`.trim()}
        footer={footer}
      >
        {successState && (
          <SuccessState
            title={successState.title}
            detail={successState.detail}
            actions={successState.actions}
            className="mos-add-hub-success"
          />
        )}

        {!successState && mode === 'menu' && (
          <>
            <div className="mos-add-hub-grid mos-add-hub-grid--primary mos-add-hub-grid--v16-primary" aria-label="Notebook action options">
              <ActionCard
                title="Daily Expense"
                detail="Write today's expense"
                actionLabel="Write"
                icon={Receipt}
                tone="danger"
                onClick={() => openAddMode('expense')}
              />
              <ActionCard
                title="Borrow / Lend"
                detail="Money owed either way"
                actionLabel="Add entry"
                icon={CreditCard}
                tone="warning"
                onClick={() => openBorrowLendMode('given')}
              />
              <ActionCard
                title="Trip Split"
                detail="Trip, members, expenses, settlement"
                actionLabel="Create"
                icon={Plane}
                tone="tint"
                onClick={openSharedExpense}
              />
              <ActionCard
                title="Quick Tools"
                detail="Calculator, GST, EMI, split"
                actionLabel="Open"
                icon={Calculator}
                tone="neutral"
                onClick={openQuickToolsFromHub}
              />
            </div>
            <details className="mos-add-hub-more mos-add-hub-more--v16">
              <summary>
                <span>Notebook setup</span>
                <ChevronRight size={16} aria-hidden="true" />
              </summary>
              <div className="mos-add-hub-grid" aria-label="Notebook setup actions">
                <ActionCard
                  title="Income"
                  detail="Update monthly income"
                  actionLabel="Update"
                  icon={Wallet}
                  tone="success"
                  onClick={() => openAddMode('income')}
                />
                <ActionCard
                  title="Move to goal"
                  detail="Send money to a saved goal"
                  actionLabel="Move"
                  icon={PiggyBank}
                  tone="tint"
                  onClick={() => openAddMode('transfer')}
                />
              </div>
            </details>
          </>
        )}

        {!successState && mode === 'expense' && (
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
            onSaved={(saved) => showActionSuccess({
              title: 'Line written',
              detail: `${rupees(saved?.amount || 0)} ${saved?.label || saved?.category || 'expense'} added to today's page.`,
              mode: 'expense',
            })}
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
            onCancel={onClose}
          />
        )}

        {!successState && mode === 'income' && (
          <QuickIncomeEntry
            profile={profile}
            setProfile={setProfile}
            initialAmount={inboxPreparedDraft?.mode === 'income' ? inboxPreparedDraft.incomeAmount : initialIncomeAmount}
            onSaved={(saved) => showActionSuccess({
              title: 'Income saved',
              detail: `${rupees(saved?.amount || 0)} monthly income added.`,
              mode: 'income',
            })}
          />
        )}

        {!successState && mode === 'transfer' && (
          <QuickTransferEntry
            savingsBuckets={savingsBuckets}
            addSavingsBucket={addSavingsBucket}
            updateSavingsBucket={updateSavingsBucket}
            initialDraft={inboxPreparedDraft?.mode === 'transfer' ? inboxPreparedDraft.transferDraft : null}
            onSaved={() => showActionSuccess({
              title: 'Savings updated',
              detail: 'Goal amount added.',
              mode: 'transfer',
            })}
            setActiveTab={setActiveTab}
          />
        )}

        {!successState && mode === 'borrow' && (
          <QuickBorrowLendEntry
            saveMoneyBookEntry={saveMoneyBookEntry}
            initialDraft={inboxPreparedDraft?.mode === 'borrow' ? inboxPreparedDraft.moneyBookDraft : null}
            onSaved={(saved) => showActionSuccess({
              title: 'Borrow/lend saved',
              detail: `${rupees(saved?.amount || 0)} ${saved?.person || 'entry'} added.`,
              mode: 'borrow',
            })}
          />
        )}
      </BottomSheet>
    )
  }

  return (
    <AppModal
      onClose={onClose}
      labelledBy="quick-add-title"
      sheetClassName={`editor-sheet quick-add-sheet chrome-popover-sheet quick-add-popover-sheet ${mode === 'expense' ? 'notebook-spread-sheet legacy-notebook-spread-sheet' : ''}`.trim()}
      backdropClassName={`editor-sheet-backdrop chrome-popover-backdrop ${mode === 'expense' ? 'notebook-spread-backdrop' : ''}`.trim()}
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
        <button className="text-action-button quick-add-back" type="button" onClick={() => openAddMode('menu')}>
          Back to options
        </button>
      )}

      <div className="editor-sheet-body quick-add-body">
        {mode === 'menu' && (
          <div className="quick-add-options">
            <button type="button" onClick={() => openAddMode('expense')}>
              <span className="soft-icon"><Receipt size={18} /></span>
              <span>
                <strong>Expense</strong>
                <small>Food, petrol, bill, shopping</small>
              </span>
            </button>
            <button type="button" onClick={() => openAddMode('income')}>
              <span className="soft-icon"><Wallet size={18} /></span>
              <span>
                <strong>Income</strong>
                <small>Update monthly income</small>
              </span>
            </button>
            <button type="button" onClick={() => openAddMode('transfer')}>
              <span className="soft-icon"><PiggyBank size={18} /></span>
              <span>
                <strong>Save to goal</strong>
                <small>Move money to a goal</small>
              </span>
            </button>
            <button type="button" onClick={() => openAddMode('borrow')}>
              <span className="soft-icon"><CreditCard size={18} /></span>
              <span>
                <strong>Borrow / lend</strong>
                <small>Money given or taken</small>
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
            onCancel={onClose}
          />
        )}

        {mode === 'income' && (
          <QuickIncomeEntry
            profile={profile}
            setProfile={setProfile}
            initialAmount={inboxPreparedDraft?.mode === 'income' ? inboxPreparedDraft.incomeAmount : initialIncomeAmount}
            onSaved={onClose}
          />
        )}

        {mode === 'transfer' && (
          <QuickTransferEntry
            savingsBuckets={savingsBuckets}
            addSavingsBucket={addSavingsBucket}
            updateSavingsBucket={updateSavingsBucket}
            initialDraft={inboxPreparedDraft?.mode === 'transfer' ? inboxPreparedDraft.transferDraft : null}
            onSaved={onClose}
            setActiveTab={setActiveTab}
          />
        )}

        {mode === 'borrow' && (
          <QuickBorrowLendEntry
            saveMoneyBookEntry={saveMoneyBookEntry}
            initialDraft={inboxPreparedDraft?.mode === 'borrow' ? inboxPreparedDraft.moneyBookDraft : null}
            onSaved={onClose}
          />
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
  onCancel,
}) {
  const descriptionInputRef = useRef(null)
  const amountInputRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      descriptionInputRef.current?.focus()
      descriptionInputRef.current?.select?.()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const clearField = (field) => {
    if (clearExpenseFieldError) {
      clearExpenseFieldError(field)
    }
  }

  return (
    <form className={`quick-expense-form v17-writing-form notebook-spread-form ${Object.keys(expenseFieldErrors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={(event) => {
      const form = event.currentTarget
      const saved = addExpense(event)

      if (saved) {
        trackEvent('quick_expense_created', {
          screen: 'quick_add',
        })
        onSaved(saved)
        return
      }

      focusInvalidField(form)
    }}>
      <label className="notebook-spread-line notebook-spread-line--description" htmlFor="quick-expense-description">
        <span>Line</span>
        <input
          id="quick-expense-description"
          ref={descriptionInputRef}
          className="sheet-ruled-input"
          type="text"
          value={customExpenseName}
          placeholder="What did you spend on?"
          autoComplete="off"
          data-autofocus="true"
          onChange={(event) => {
            setCustomExpenseName(event.target.value)
            clearField('category')
          }}
        />
      </label>

      <div className="notebook-spread-amount-line">
        <CurrencyInput
          ref={amountInputRef}
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
      </div>

      <div className="quick-chip-row compact-quick-row quick-amount-row" aria-label="Quick amounts">
        {QUICK_AMOUNT_PRESETS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => {
              setExpenseAmount(String(amount))
              clearField('amount')
              amountInputRef.current?.focus()
            }}
          >
            {rupees(amount)}
          </button>
        ))}
      </div>

      {quickExpenseChips.length > 0 && (
        <div className="quick-chip-row compact-quick-row" aria-label="Recent expenses">
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
      )}

      <div className="notebook-spread-category-line">
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
            clearField('category')
          }}
          error={expenseFieldErrors.category}
        />
      </div>

      <details className="quick-extra-details">
        <summary>
          <span>Note or voice</span>
          <ChevronRight size={15} aria-hidden="true" />
        </summary>
        <div className="quick-extra-body">
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
        </div>
      </details>

      <div className="notebook-spread-actions">
        <button className="sheet-btn-cancel" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button sheet-btn-save quick-save-button" type="submit">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Save Entry</span>
        </button>
      </div>
      {expenseError && <p className="form-message">{expenseError}</p>}
    </form>
  )
}

function QuickIncomeEntry({ profile, setProfile, onSaved, initialAmount = '' }) {
  const [incomeAmount, setIncomeAmount] = useState(initialAmount || (profile.income ? String(profile.income) : ''))
  const [error, setError] = useState('')
  const incomeInputRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      incomeInputRef.current?.focus()
      incomeInputRef.current?.select?.()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

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
      trackEvent('quick_income_created', {
        screen: 'quick_add',
      })

      if (normalizeMoney(profile.income) <= 0) {
        trackActivation('first_income', {
          source: 'quick_add',
        })
      }

      onSaved({ amount: parsed })
    }}>
      <CurrencyInput
        ref={incomeInputRef}
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
      <button className="primary-button full quick-save-button" type="submit">
        Save income
      </button>
    </form>
  )
}

function QuickTransferEntry({ savingsBuckets = [], addSavingsBucket, updateSavingsBucket, initialDraft = null, onSaved, setActiveTab }) {
  const initialBucketId = initialDraft?.bucketId && savingsBuckets.some((bucket) => bucket.id === initialDraft.bucketId)
    ? initialDraft.bucketId
    : savingsBuckets[0]?.id || ''
  const [bucketId, setBucketId] = useState(initialBucketId)
  const [amount, setAmount] = useState(initialDraft?.amount || '')
  const [errors, setErrors] = useState({})
  const amountInputRef = useRef(null)
  const selectedBucket = savingsBuckets.find((bucket) => bucket.id === bucketId)

  useEffect(() => {
    if (savingsBuckets.length === 0 || typeof window === 'undefined') {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      amountInputRef.current?.focus()
      amountInputRef.current?.select?.()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [savingsBuckets.length])

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
        ref={amountInputRef}
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
      <button className="primary-button full quick-save-button" type="submit">
        Move money
      </button>
    </form>
  )
}

function QuickBorrowLendEntry({ saveMoneyBookEntry, initialDraft = null, onSaved }) {
  const [kind, setKind] = useState(initialDraft?.kind === 'taken' ? 'taken' : 'given')
  const [person, setPerson] = useState(initialDraft?.person || '')
  const [amount, setAmount] = useState(initialDraft?.amount || '')
  const [note, setNote] = useState(initialDraft?.note || '')
  const [errors, setErrors] = useState({})
  const personInputRef = useRef(null)
  const amountInputRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      const target = initialDraft?.person ? amountInputRef.current : personInputRef.current
      target?.focus()
      target?.select?.()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [initialDraft?.person])

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

      onSaved({ kind, person: person.trim(), amount: parsedAmount })
    }}>
      <div className="segmented-control quick-kind-toggle" aria-label="Borrow or lend type">
        <button className={kind === 'given' ? 'active' : ''} type="button" onClick={() => setKind('given')}>
          They owe me
        </button>
        <button className={kind === 'taken' ? 'active' : ''} type="button" onClick={() => setKind('taken')}>
          I owe them
        </button>
      </div>
      <label>
        <span className="input-label">Person</span>
        <input
          ref={personInputRef}
          className={`plain-input ${errors.person ? 'field-invalid' : ''}`}
          type="text"
          autoComplete="name"
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
        ref={amountInputRef}
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

      <div className="quick-chip-row compact-quick-row quick-amount-row" aria-label="Quick borrow/lend amounts">
        {QUICK_AMOUNT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setAmount(String(preset))
              setErrors((current) => {
                const next = { ...current }
                delete next.amount
                return next
              })
              amountInputRef.current?.focus()
            }}
          >
            {rupees(preset)}
          </button>
        ))}
      </div>

      <details className="quick-extra-details">
        <summary>
          <span>Note</span>
          <ChevronRight size={15} aria-hidden="true" />
        </summary>
        <div className="quick-extra-body">
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
        </div>
      </details>

      <button className="primary-button full quick-save-button" type="submit">
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
    <footer className="home-footer" aria-label="FBPly founder information">
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
    </footer>
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
  const voiceExamplePrompts = ['Tea 20', 'Petrol 500', 'Salary 20000', 'Bus ticket 35', 'Recharge 299']
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
                      value={draft.amountConfidence === 'low' || normalizeMoney(draft.amount) <= 0 ? '' : (draft.amount || '')}
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
                    <option value="income">Received Money</option>
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
                  {reviewDrafts.length > 1 ? 'Save entries' : 'Save entry'}
                </button>
                <button className="ghost-button" type="button" onClick={useVoiceDraftInForm}>
                  Edit in form
                </button>
                <button className="ghost-button" type="button" onClick={clearVoiceDraft}>
                  Close
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
  onEnableBackup,
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

      {isLegacyFooterExperience() && <HomeFooter />}

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
          onEnableBackup={onEnableBackup}
          onClose={() => setIsProfileMenuOpen(false)}
          onSignOut={onSignOut}
        />
      )}
    </section>
  )
}

function ProfileMenuSheet({ authUser, profile, setProfile, onEnableBackup, onClose, onSignOut }) {
  const backupStatus = authUser?.id ? 'Protected by Cloud Backup' : 'Local Only'

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
          <span className="mini-label">{backupStatus}</span>
          <strong>{authUser?.email || profile.email || 'This device'}</strong>
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
        {authUser?.id ? (
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
        ) : (
          <button
            className="sign-out-button"
            type="button"
            onClick={() => {
              onClose()
              onEnableBackup?.()
            }}
          >
            <ShieldCheck size={17} />
            Enable Cloud Backup
          </button>
        )}
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
        Save expense
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
          Close
        </button>
      </div>
    </AppModal>
  )
}

function BottomNav({ activeTab, setActiveTab, items = legacyNavItems }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
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
