import { aggregateExpenses, getCategoryTotal } from './categoryIntelligence.js'

const preferenceProfiles = {
  safe: {
    reserveRatio: 0.28,
    setAsideRatio: 0.3,
    emiFactor: 0.86,
  },
  balanced: {
    reserveRatio: 0.22,
    setAsideRatio: 0.38,
    emiFactor: 1,
  },
  flexible: {
    reserveRatio: 0.18,
    setAsideRatio: 0.44,
    emiFactor: 1.06,
  },
}

const purchaseProfiles = {
  Car: {
    defaultTarget: 200000,
    tenure: 36,
    interestBuffer: 1.14,
    minDownpaymentRatio: 0.3,
    idealDownpaymentRatio: 0.45,
    breathingKeepRatio: 0.32,
    minBreathingCash: 2500,
    minBreathingIncomeRatio: 0.06,
    ownershipBufferRatio: 0.005,
    minOwnershipBuffer: 1200,
    maxTotalEmiIncomeRatio: 0.3,
    maxNewEmiIncomeRatio: 0.12,
    minTimelineMonths: 6,
    summary: 'Cars need a little extra monthly space for fuel, service, insurance, and small surprises.',
  },
  Bike: {
    defaultTarget: 120000,
    tenure: 30,
    interestBuffer: 1.12,
    minDownpaymentRatio: 0.25,
    idealDownpaymentRatio: 0.4,
    breathingKeepRatio: 0.28,
    minBreathingCash: 1800,
    minBreathingIncomeRatio: 0.05,
    ownershipBufferRatio: 0.004,
    minOwnershipBuffer: 700,
    maxTotalEmiIncomeRatio: 0.28,
    maxNewEmiIncomeRatio: 0.1,
    minTimelineMonths: 4,
    summary: 'A bike plan works best when fuel and service space remain visible after EMI.',
  },
  Phone: {
    defaultTarget: 30000,
    tenure: 10,
    interestBuffer: 1.06,
    minDownpaymentRatio: 0.45,
    idealDownpaymentRatio: 0.7,
    breathingKeepRatio: 0.38,
    minBreathingCash: 1000,
    minBreathingIncomeRatio: 0.035,
    ownershipBufferRatio: 0,
    minOwnershipBuffer: 0,
    maxTotalEmiIncomeRatio: 0.18,
    maxNewEmiIncomeRatio: 0.06,
    minTimelineMonths: 2,
    summary: 'Phone purchases feel calmer when the EMI is short and the downpayment is strong.',
  },
  Laptop: {
    defaultTarget: 80000,
    tenure: 18,
    interestBuffer: 1.08,
    minDownpaymentRatio: 0.35,
    idealDownpaymentRatio: 0.55,
    breathingKeepRatio: 0.34,
    minBreathingCash: 1500,
    minBreathingIncomeRatio: 0.045,
    ownershipBufferRatio: 0.0015,
    minOwnershipBuffer: 300,
    maxTotalEmiIncomeRatio: 0.22,
    maxNewEmiIncomeRatio: 0.085,
    minTimelineMonths: 3,
    summary: 'Laptop planning can stay practical with a medium downpayment and a short EMI window.',
  },
  Appliance: {
    defaultTarget: 50000,
    tenure: 12,
    interestBuffer: 1.07,
    minDownpaymentRatio: 0.4,
    idealDownpaymentRatio: 0.65,
    breathingKeepRatio: 0.36,
    minBreathingCash: 1200,
    minBreathingIncomeRatio: 0.04,
    ownershipBufferRatio: 0.001,
    minOwnershipBuffer: 200,
    maxTotalEmiIncomeRatio: 0.2,
    maxNewEmiIncomeRatio: 0.07,
    minTimelineMonths: 3,
    summary: 'Appliances are easier to absorb when most of the cost is handled before purchase.',
  },
  Custom: {
    defaultTarget: 50000,
    tenure: 12,
    interestBuffer: 1.08,
    minDownpaymentRatio: 0.4,
    idealDownpaymentRatio: 0.6,
    breathingKeepRatio: 0.36,
    minBreathingCash: 1200,
    minBreathingIncomeRatio: 0.04,
    ownershipBufferRatio: 0.001,
    minOwnershipBuffer: 200,
    maxTotalEmiIncomeRatio: 0.2,
    maxNewEmiIncomeRatio: 0.075,
    minTimelineMonths: 3,
    summary: 'A custom plan is kept conservative until the monthly impact is clearly comfortable.',
  },
}

const purchaseAliases = {
  'home setup': 'Appliance',
  fridge: 'Appliance',
  tv: 'Appliance',
  travel: 'Custom',
  education: 'Custom',
  'custom plan': 'Custom',
}

const timelineProfiles = {
  asap: { label: 'ASAP', months: 0 },
  '3m': { label: '3 months', months: 3 },
  '6m': { label: '6 months', months: 6 },
  '12m': { label: '1 year', months: 12 },
  flexible: { label: 'Flexible', months: null },
}

export function rupees(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

export function shortRupees(value) {
  const amount = Number.isFinite(value) ? value : 0
  return rupees(amount)
}

function roundToNearest(value, step = 500) {
  return Math.max(Math.round(value / step) * step, 0)
}

function roundUpToNearest(value, step = 500) {
  return Math.max(Math.ceil(value / step) * step, 0)
}

function safeNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function normalizeDueDay(value) {
  const day = Number(value)
  return Number.isFinite(day) && day >= 1 ? Math.min(Math.round(day), 31) : undefined
}

function getPreference(profile = {}) {
  return preferenceProfiles[profile.savingsPreference] || preferenceProfiles.balanced
}

function isEmiLike(name = '') {
  return /\b(emi|loan|installment|instalment|finance|bnpl)\b/i.test(String(name))
}

function getPurchaseProfile(category = 'Custom') {
  const requested = String(category || 'Custom').trim().toLowerCase()
  const alias = purchaseAliases[requested]
  const exact = Object.keys(purchaseProfiles).find((item) => item.toLowerCase() === requested)

  return {
    label: alias || exact || 'Custom',
    config: purchaseProfiles[alias || exact] || purchaseProfiles.Custom,
  }
}

export function normalizeCommitments(profile = {}) {
  if (Array.isArray(profile.commitments)) {
    return profile.commitments
      .map((item, index) => ({
        id: item.id || `commitment-${index}`,
        name: String(item.name || item.label || 'Monthly commitment').trim() || 'Monthly commitment',
        amount: Number(item.amount || 0),
        dueDay: normalizeDueDay(item.dueDay || item.paymentDay),
        recurrence: item.recurrence || 'monthly',
      }))
      .filter((item) => item.amount > 0 || item.name)
  }

  return (profile.fixedExpenses || [])
    .map((item, index) => ({
      id: item.key || `commitment-${index}`,
      name: String(item.name || item.label || 'Monthly commitment').trim() || 'Monthly commitment',
      amount: Number(item.amount || 0),
      dueDay: normalizeDueDay(item.dueDay || item.paymentDay),
      recurrence: item.recurrence || 'monthly',
    }))
    .filter((item) => item.amount > 0 || item.name)
}

export function sumCommitments(commitments = []) {
  return commitments.reduce((total, item) => total + Number(item.amount || 0), 0)
}

export function sumFixedExpenses(fixedExpenses = []) {
  return sumCommitments(fixedExpenses)
}

export function monthExpenseTotal(expenses = []) {
  return expenses.reduce((total, item) => total + Number(item.amount || 0), 0)
}

function splitCommitments(profile = {}) {
  const commitments = normalizeCommitments(profile)
  const namedEmiTotal = commitments.reduce((total, item) => {
    return isEmiLike(item.name) ? total + Number(item.amount || 0) : total
  }, 0)
  const fixedWithoutEmi = commitments.reduce((total, item) => {
    return isEmiLike(item.name) ? total : total + Number(item.amount || 0)
  }, 0)
  const legacyEmi = Number(profile.emi?.amount || 0)
  const emiAmount = namedEmiTotal || legacyEmi

  return {
    commitments,
    emiAmount,
    fixedWithoutEmi,
    fixedTotal: fixedWithoutEmi + emiAmount,
  }
}

function pressureFrom({ usagePercent, emiLoad, flexibilityRatio }) {
  if (usagePercent >= 92 || emiLoad >= 34 || flexibilityRatio <= 0.05) {
    return {
      comfort: 'Tight Month',
      pressure: 'Needs Space',
      pressureTone: 'slight-pressure',
      conservativeFactor: 0.18,
    }
  }

  if (usagePercent >= 76 || emiLoad >= 24 || flexibilityRatio <= 0.14) {
    return {
      comfort: 'Careful Month',
      pressure: 'Elevated',
      pressureTone: 'warm',
      conservativeFactor: 0.38,
    }
  }

  if (usagePercent >= 58 || emiLoad >= 16 || flexibilityRatio <= 0.26) {
    return {
      comfort: 'Balanced Month',
      pressure: 'Moderate',
      pressureTone: 'balanced',
      conservativeFactor: 0.72,
    }
  }

  return {
    comfort: 'Comfortable Month',
    pressure: 'Light',
    pressureTone: 'comfortable',
    conservativeFactor: 1,
  }
}

export function calculateFinancialState(profile = {}, expenses = []) {
  const income = Number(profile.income || 0)
  const { commitments, emiAmount, fixedWithoutEmi, fixedTotal } = splitCommitments(profile)
  const monthlyVariable = monthExpenseTotal(expenses)
  const committed = fixedTotal + monthlyVariable
  const flexibility = Math.max(income - committed, 0)
  const usagePercent = income > 0 ? Math.min(Math.round((committed / income) * 100), 100) : 0
  const emiLoad = income > 0 ? Math.round((emiAmount / income) * 100) : 0
  const flexibilityRatio = income > 0 ? flexibility / income : 0
  const reserveTarget = Math.round(income * getPreference(profile).reserveRatio)
  const breathingRoom = Math.max(flexibility - reserveTarget, 0)
  const pressure = pressureFrom({ usagePercent, emiLoad, flexibilityRatio })

  return {
    income,
    commitments,
    fixedTotal,
    fixedExpensesTotal: fixedWithoutEmi,
    monthlyVariable,
    lifestyleSpending: monthlyVariable,
    committed,
    flexibility,
    remainingFlexibility: flexibility,
    breathingRoom,
    reserveTarget,
    usagePercent,
    emiLoad,
    emiAmount,
    existingEmiTotal: emiAmount,
    ...pressure,
  }
}

export function buildInsights(state, expenses = []) {
  const spending = aggregateExpenses(expenses)
  const shoppingTotal = getCategoryTotal(spending, 'Shopping')
  const shoppingRatio = state.income > 0 ? shoppingTotal / state.income : 0
  const hasEnoughSpendData = spending.count >= 3

  return [
    {
      title: state.breathingRoom > 0 ? 'Breathing room protected' : 'Breathing room needs care',
      detail:
        state.breathingRoom > 0
          ? 'You still have space after regular commitments and a savings buffer.'
          : 'Your current commitments are already handling a lot, so lighter purchase choices may feel better.',
      tone: state.breathingRoom > 0 ? 'good' : 'warm',
    },
    {
      title: state.emiLoad > 24 ? 'EMI pressure needs space' : 'EMI pressure manageable',
      detail:
        state.emiLoad > 24
          ? 'A new EMI may feel easier after one existing commitment reduces.'
          : 'Current EMI-like commitments are not the main source of pressure right now.',
      tone: state.emiLoad > 24 ? 'warm' : 'good',
    },
    {
      title:
        shoppingTotal <= 0 && !hasEnoughSpendData
          ? 'Discretionary pattern still forming'
          : shoppingRatio > 0.08
            ? 'Discretionary spend is noticeable'
            : 'Discretionary spend looks calm',
      detail:
        shoppingTotal <= 0 && !hasEnoughSpendData
          ? 'More entries will make non-essential spending patterns clearer.'
          : shoppingRatio > 0.08
          ? 'A short pause before non-urgent buys can keep the month more comfortable.'
          : 'Non-essential spending is staying gentle against income.',
      tone: shoppingRatio > 0.08 ? 'balanced' : 'good',
    },
    {
      title: state.usagePercent < 70 ? 'Flexibility is steady' : 'Planning should stay light',
      detail:
        state.usagePercent < 70
          ? 'The month has enough clarity for simple purchase planning.'
          : 'Keeping new purchases modest may protect month-to-month ease.',
      tone: state.usagePercent < 70 ? 'good' : 'balanced',
    },
  ]
}

function estimateEmiForPrincipal(principal, tenureMonths, interestBuffer = 1.08) {
  if (!principal || !tenureMonths) {
    return 0
  }

  return Math.round((principal * interestBuffer) / tenureMonths)
}

function estimateOwnershipBuffer(config, targetAmount) {
  return roundToNearest(
    Math.max(config.minOwnershipBuffer, targetAmount * config.ownershipBufferRatio),
    100,
  )
}

function stressFactorForState(state) {
  const flexibilityRatio = state.income > 0 ? state.flexibility / state.income : 0

  if (state.flexibility <= 0 || state.usagePercent >= 94 || state.emiLoad >= 36) {
    return 0
  }

  if (flexibilityRatio <= 0.07 || state.usagePercent >= 88 || state.emiLoad >= 30) {
    return 0.55
  }

  if (flexibilityRatio <= 0.12 || state.usagePercent >= 82 || state.emiLoad >= 24) {
    return 0.72
  }

  if (state.emiLoad >= 18) {
    return 0.88
  }

  return 1
}

function calculatePlannerCapacity({ state, profile, config, targetAmount }) {
  const preference = getPreference(profile)
  const baseFlexibility = safeNumber(state.flexibility)
  const breathingRoomToKeep = Math.min(
    baseFlexibility,
    roundToNearest(
      Math.max(
        baseFlexibility * config.breathingKeepRatio,
        state.income * config.minBreathingIncomeRatio,
        config.minBreathingCash,
      ),
    ),
  )
  const ownershipBuffer = Math.min(
    Math.max(baseFlexibility - breathingRoomToKeep, 0),
    estimateOwnershipBuffer(config, targetAmount),
  )
  const flexAfterProtection = Math.max(baseFlexibility - breathingRoomToKeep, 0)
  const monthlySetAside = roundToNearest(
    Math.min(baseFlexibility * preference.setAsideRatio, flexAfterProtection) * stressFactorForState(state),
  )
  const totalEmiRoomByIncome = Math.max(state.income * config.maxTotalEmiIncomeRatio - state.emiAmount, 0)
  const newEmiIncomeCap = state.income * config.maxNewEmiIncomeRatio
  const emiRoomByFlexibility = Math.max(baseFlexibility - breathingRoomToKeep - ownershipBuffer, 0)
  const rawComfortableEmiMax = Math.min(totalEmiRoomByIncome, newEmiIncomeCap, emiRoomByFlexibility)
  const comfortableEmiMax = roundToNearest(
    rawComfortableEmiMax * stressFactorForState(state) * preference.emiFactor,
  )
  const comfortableEmiMin = comfortableEmiMax >= 1500 ? roundToNearest(comfortableEmiMax * 0.62) : 0

  return {
    breathingRoomToKeep,
    ownershipBuffer,
    monthlySetAside,
    comfortableEmiMin,
    comfortableEmiMax,
    noNewEmi: comfortableEmiMax < 1000,
  }
}

function statusForPath({ emi, comfortableEmiMax, noNewEmi, downpayment, suggestedDownpaymentMin, financeNeeded }) {
  if (financeNeeded === 0) {
    return { label: 'Savings-led', tone: 'good' }
  }

  if (noNewEmi || comfortableEmiMax <= 0) {
    return { label: 'Wait first', tone: 'warm' }
  }

  if (downpayment < suggestedDownpaymentMin) {
    return emi <= comfortableEmiMax
      ? { label: 'Build downpayment', tone: 'balanced' }
      : { label: 'Wait first', tone: 'warm' }
  }

  if (emi <= comfortableEmiMax) {
    return { label: 'Balanced', tone: 'good' }
  }

  if (emi <= comfortableEmiMax * 1.18) {
    return { label: 'Slight pressure', tone: 'balanced' }
  }

  return { label: 'Pressure likely', tone: 'warm' }
}

function buildOwnershipPath({
  label,
  months,
  targetAmount,
  currentSavings,
  monthlySetAside,
  config,
  capacity,
  suggestedDownpaymentMin,
  state,
}) {
  const projectedDownpayment = Math.min(targetAmount, currentSavings + monthlySetAside * months)
  const financeNeeded = Math.max(targetAmount - projectedDownpayment, 0)
  const requiredEmi = estimateEmiForPrincipal(financeNeeded, config.tenure, config.interestBuffer)
  const flexAfterEmi = Math.max(state.flexibility - requiredEmi, 0)
  const breathingAfterEmi = Math.max(
    state.flexibility - requiredEmi - capacity.breathingRoomToKeep - capacity.ownershipBuffer,
    0,
  )
  const usagePercent =
    state.income > 0
      ? Math.min(
          Math.round(((state.committed + requiredEmi + capacity.ownershipBuffer) / state.income) * 100),
          100,
        )
      : 0
  const status = statusForPath({
    emi: requiredEmi,
    comfortableEmiMax: capacity.comfortableEmiMax,
    noNewEmi: capacity.noNewEmi,
    downpayment: projectedDownpayment,
    suggestedDownpaymentMin,
    financeNeeded,
  })

  return {
    label,
    months,
    projectedDownpayment,
    financeNeeded,
    requiredEmi,
    flexAfterEmi,
    breathingAfterEmi,
    usagePercent,
    status: status.label,
    tone: status.tone,
  }
}

function findSaferOwnershipMonth({
  targetAmount,
  currentSavings,
  monthlySetAside,
  config,
  capacity,
  suggestedDownpaymentMin,
  state,
}) {
  if (targetAmount <= currentSavings) {
    return 0
  }

  if (monthlySetAside <= 0 && capacity.comfortableEmiMax <= 0) {
    return null
  }

  for (let month = 0; month <= 36; month += 1) {
    const path = buildOwnershipPath({
      label: 'Safer path',
      months: month,
      targetAmount,
      currentSavings,
      monthlySetAside,
      config,
      capacity,
      suggestedDownpaymentMin,
      state,
    })

    if (path.financeNeeded === 0 || (path.projectedDownpayment >= suggestedDownpaymentMin && path.requiredEmi <= capacity.comfortableEmiMax)) {
      return month
    }
  }

  return null
}

function chooseTimelineMonths({ timeline, config, saferMonth }) {
  if (timeline.months !== null) {
    return timeline.months
  }

  if (saferMonth === null) {
    return config.minTimelineMonths
  }

  return Math.min(Math.max(saferMonth, config.minTimelineMonths), 18)
}

function buildPlannerInsight({ category, state, selectedPath, capacity, suggestedDownpaymentMin }) {
  const lowerCategory = category.toLowerCase()

  if (capacity.noNewEmi) {
    return `Your current monthly commitments are already using most of the month. Keeping this ${lowerCategory} savings-led, or waiting before adding EMI, may feel calmer right now.`
  }

  if (selectedPath.projectedDownpayment < suggestedDownpaymentMin) {
    return `This ${lowerCategory} plan may feel more stable with a stronger downpayment first. A little waiting can reduce the EMI weight noticeably.`
  }

  if (selectedPath.requiredEmi > capacity.comfortableEmiMax) {
    return `This ${lowerCategory} may become easier with more savings before purchase. The current EMI need is above the low-stress range.`
  }

  if (state.emiLoad >= 18) {
    return `Existing EMIs already take visible monthly space. Keeping the new EMI light helps preserve ownership comfort.`
  }

  return `This path looks balanced if the EMI stays inside the low-stress range and the protected monthly space remains untouched.`
}

function buildWaitSuggestion({ saferMonth, selectedMonths, selectedPath, immediatePath }) {
  if (saferMonth === null) {
    return 'Waiting until flexibility improves, or until one regular commitment reduces, may create a safer ownership position.'
  }

  if (saferMonth === 0 && selectedPath.financeNeeded === 0) {
    return 'This can be handled from savings without adding a new monthly payment.'
  }

  if (selectedMonths >= saferMonth && selectedMonths > 0) {
    return `Your selected timeline gives the plan more room. Around ${saferMonth} months appears to be the calmer ownership point.`
  }

  if (immediatePath.requiredEmi > selectedPath.requiredEmi) {
    return `Waiting about ${saferMonth} months may reduce future EMI pressure and keep more monthly breathing room available.`
  }

  return `A calmer ownership point appears around ${saferMonth} months, based on savings growth and EMI comfort.`
}

export function buildRecommendation(
  category,
  profile = {},
  state = { flexibility: 0, breathingRoom: 0 },
  goal = {},
) {
  const { label: purchaseType, config } = getPurchaseProfile(category)
  const timeline = timelineProfiles[goal.timeline] || timelineProfiles['6m']
  const targetAmount = safeNumber(goal.targetAmount) || config.defaultTarget
  const currentSavings = Math.min(safeNumber(goal.currentSavings), targetAmount)
  const downpaymentStep = targetAmount >= 100000 ? 5000 : 1000
  const suggestedDownpaymentMin = Math.min(
    targetAmount,
    roundUpToNearest(targetAmount * config.minDownpaymentRatio, downpaymentStep),
  )
  const suggestedDownpaymentMax = Math.min(
    targetAmount,
    roundUpToNearest(targetAmount * config.idealDownpaymentRatio, downpaymentStep),
  )
  const financeRangeMin = Math.max(targetAmount - suggestedDownpaymentMax, 0)
  const financeRangeMax = Math.max(targetAmount - suggestedDownpaymentMin, 0)
  const capacity = calculatePlannerCapacity({ state, profile, config, targetAmount })
  const saferMonth = findSaferOwnershipMonth({
    targetAmount,
    currentSavings,
    monthlySetAside: capacity.monthlySetAside,
    config,
    capacity,
    suggestedDownpaymentMin,
    state,
  })
  const selectedMonths = chooseTimelineMonths({ timeline, config, saferMonth })
  const immediatePath = buildOwnershipPath({
    label: 'Immediate path',
    months: 0,
    targetAmount,
    currentSavings,
    monthlySetAside: capacity.monthlySetAside,
    config,
    capacity,
    suggestedDownpaymentMin,
    state,
  })
  const selectedPath = buildOwnershipPath({
    label: selectedMonths === 0 ? 'Immediate path' : 'Safer delayed path',
    months: selectedMonths,
    targetAmount,
    currentSavings,
    monthlySetAside: capacity.monthlySetAside,
    config,
    capacity,
    suggestedDownpaymentMin,
    state,
  })
  const savingsGrowth = capacity.monthlySetAside * selectedMonths
  const downpaymentGap = Math.max(suggestedDownpaymentMin - selectedPath.projectedDownpayment, 0)
  const downpaymentCoveragePercent = targetAmount > 0 ? Math.round((selectedPath.projectedDownpayment / targetAmount) * 100) : 0
  const comfortRangeLabel = capacity.noNewEmi
    ? 'Avoid new EMI'
    : `${shortRupees(capacity.comfortableEmiMin)} - ${shortRupees(capacity.comfortableEmiMax)}`
  const financeRangeLabel =
    financeRangeMin === financeRangeMax
      ? shortRupees(financeRangeMin)
      : `${shortRupees(financeRangeMin)} - ${shortRupees(financeRangeMax)}`

  return {
    category: purchaseType,
    goalName: String(goal.label || '').trim(),
    targetAmount,
    currentSavings,
    timelineKey: goal.timeline || '6m',
    timelineLabel: timeline.months === null ? `Flexible (${selectedMonths} months)` : timeline.label,
    timelineMonths: selectedMonths,
    insight: buildPlannerInsight({
      category: purchaseType,
      state,
      selectedPath,
      capacity,
      suggestedDownpaymentMin,
    }),
    budgetMin: targetAmount,
    budgetMax: targetAmount,
    emiMin: capacity.noNewEmi ? 0 : capacity.comfortableEmiMin,
    emiMax: capacity.noNewEmi ? 0 : capacity.comfortableEmiMax,
    comfortableEmiMin: capacity.noNewEmi ? 0 : capacity.comfortableEmiMin,
    comfortableEmiMax: capacity.noNewEmi ? 0 : capacity.comfortableEmiMax,
    comfortableEmiLabel: comfortRangeLabel,
    monthlySetAside: capacity.monthlySetAside,
    savingsGrowth,
    projectedDownpayment: selectedPath.projectedDownpayment,
    targetDownpayment: suggestedDownpaymentMin,
    idealDownpayment: suggestedDownpaymentMax,
    suggestedDownpaymentMin,
    suggestedDownpaymentMax,
    suggestedDownpaymentLabel: `${shortRupees(suggestedDownpaymentMin)} - ${shortRupees(suggestedDownpaymentMax)}`,
    financeRangeMin,
    financeRangeMax,
    financeRangeLabel,
    downpaymentGap,
    financeNeeded: selectedPath.financeNeeded,
    requiredEmi: selectedPath.requiredEmi,
    projectedFlexAfterEmi: selectedPath.flexAfterEmi,
    projectedBreathingAfterEmi: selectedPath.breathingAfterEmi,
    projectedUsagePercent: selectedPath.usagePercent,
    downpaymentCoveragePercent,
    breathingRoomToProtect: capacity.breathingRoomToKeep,
    ownershipBuffer: capacity.ownershipBuffer,
    commitmentPressure: state.pressure,
    noNewEmi: capacity.noNewEmi,
    ownershipStatus: selectedPath.status,
    ownershipTone: selectedPath.tone,
    saferMonth,
    saferTimingLabel:
      saferMonth === null
        ? 'Wait until flexibility improves'
        : saferMonth === 0
          ? 'Ready from savings'
          : `${saferMonth} months`,
    waitMonths: saferMonth === null ? 'a little longer' : `${saferMonth} months`,
    waitSuggestion: buildWaitSuggestion({
      saferMonth,
      selectedMonths,
      selectedPath,
      immediatePath,
    }),
    immediatePath,
    delayedPath: selectedPath,
    categorySummary: config.summary,
    pathSteps: [
      { label: 'Available savings', value: currentSavings },
      { label: `Projected saving in ${selectedMonths} months`, value: savingsGrowth },
      { label: 'Planned downpayment', value: selectedPath.projectedDownpayment },
      { label: 'Amount to finance', value: selectedPath.financeNeeded },
    ],
    rationale: [
      `Fixed expenses: ${rupees(state.fixedExpensesTotal || 0)}`,
      `Existing EMIs: ${rupees(state.emiAmount || 0)}`,
      `Lifestyle spending: ${rupees(state.monthlyVariable || 0)}`,
      `Monthly space protected: ${rupees(capacity.breathingRoomToKeep)}`,
      `Ownership buffer: ${rupees(capacity.ownershipBuffer)}`,
      `Projected usage after purchase: ${selectedPath.usagePercent}%`,
    ],
  }
}
