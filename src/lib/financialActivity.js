const SHARED_CATEGORY = 'Shared'

function safeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

export function normalizePersonName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function resolveCurrentUserName(profile = {}) {
  return String(profile.name || profile.email?.split('@')?.[0] || 'You').trim() || 'You'
}

export function isCurrentUserName(name, profile = {}) {
  const normalized = normalizePersonName(name)
  const current = normalizePersonName(resolveCurrentUserName(profile))
  return normalized === 'you' || normalized === 'me' || normalized === current
}

export function displayPersonName(name, profile = {}) {
  return isCurrentUserName(name, profile) ? 'You' : String(name || '').trim() || 'Someone'
}

function uniquePeople(people = []) {
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

function findMemberName(members, value, profile = {}) {
  const normalized = normalizePersonName(value)

  if (!normalized) {
    return resolveCurrentUserName(profile)
  }

  return members.find((member) => normalizePersonName(member) === normalized) || String(value).trim()
}

function settlementId(groupId, from, to) {
  return `${groupId}-${normalizePersonName(from).replace(/\s/g, '-')}-${normalizePersonName(to).replace(/\s/g, '-')}`
}

export function createSharedPayment({ label, amount, paidBy, date }) {
  return {
    id: `shared-payment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: String(label || 'Shared payment').trim() || 'Shared payment',
    amount: safeAmount(amount),
    paidBy: String(paidBy || '').trim(),
    date: date || new Date().toISOString().slice(0, 10),
  }
}

function normalizeSharedPayments(group = {}, members = [], profile = {}) {
  const currentUserName = resolveCurrentUserName(profile)
  const payments = Array.isArray(group.payments) ? group.payments : []
  const normalizedPayments = payments
    .map((payment) => ({
      id: payment.id || `shared-payment-${Math.random().toString(16).slice(2)}`,
      label: String(payment.label || payment.name || group.name || 'Shared payment').trim(),
      amount: safeAmount(payment.amount),
      paidBy: findMemberName(members, payment.paidBy || group.paidBy || currentUserName, profile),
      date: payment.date || group.date || new Date().toISOString().slice(0, 10),
    }))
    .filter((payment) => payment.amount > 0)

  if (normalizedPayments.length > 0) {
    return normalizedPayments
  }

  const legacyAmount = safeAmount(group.amount)

  if (!legacyAmount) {
    return []
  }

  return [{
    id: `legacy-payment-${group.id || 'shared'}`,
    label: group.name || 'Shared payment',
    amount: legacyAmount,
    paidBy: findMemberName(members, group.paidBy || currentUserName, profile),
    date: group.date || new Date().toISOString().slice(0, 10),
  }]
}

export function createSharedSettlements({ groupId, amount, paidBy, people, payments, profile }) {
  const currentUserName = resolveCurrentUserName(profile)
  const members = uniquePeople([currentUserName, ...(people || [])])
  const normalizedPayments = payments?.length
    ? normalizeSharedPayments({ payments }, members, profile)
    : normalizeSharedPayments({ amount, paidBy, date: new Date().toISOString().slice(0, 10) }, members, profile)
  const total = normalizedPayments.reduce((sum, payment) => sum + safeAmount(payment.amount), 0)
  const share = members.length > 0 ? Math.round(total / members.length) : 0

  if (!share || members.length < 2) {
    return []
  }

  const paidTotals = new Map(members.map((member) => [member, 0]))
  normalizedPayments.forEach((payment) => {
    const payer = findMemberName(members, payment.paidBy, profile)
    paidTotals.set(payer, safeAmount(paidTotals.get(payer)) + safeAmount(payment.amount))
  })

  const debtors = []
  const creditors = []

  members.forEach((member) => {
    const balance = Math.round(safeAmount(paidTotals.get(member)) - share)

    if (balance < -1) {
      debtors.push({ member, amount: Math.abs(balance) })
      return
    }

    if (balance > 1) {
      creditors.push({ member, amount: balance })
    }
  })

  const settlements = []
  let creditorIndex = 0

  debtors.forEach((debtor) => {
    let remaining = debtor.amount

    while (remaining > 0 && creditorIndex < creditors.length) {
      const creditor = creditors[creditorIndex]
      const paymentAmount = Math.min(remaining, creditor.amount)
      const from = debtor.member
      const to = creditor.member

      settlements.push({
        id: settlementId(groupId || 'shared', from, to),
        from,
        to,
        amount: Math.round(paymentAmount),
        settledAmount: 0,
        remainingAmount: Math.round(paymentAmount),
        direction: isCurrentUserName(to, profile)
          ? 'incoming'
          : isCurrentUserName(from, profile)
            ? 'outgoing'
            : 'neutral',
        status: 'pending',
        receivedAt: '',
      })

      remaining -= paymentAmount
      creditor.amount -= paymentAmount

      if (creditor.amount <= 1) {
        creditorIndex += 1
      }
    }
  })

  return settlements.filter((settlement) => settlement.amount > 0)
}

export function reconcileSharedGroup(group = {}, profile = {}) {
  const currentUserName = resolveCurrentUserName(profile)
  const members = uniquePeople([currentUserName, ...(group.people || [])])
  const payments = normalizeSharedPayments(group, members, profile)
  const amount = payments.reduce((total, payment) => total + safeAmount(payment.amount), 0)
  const share = members.length > 0 ? Math.round(amount / members.length) : 0
  const generated = createSharedSettlements({
    groupId: group.id || 'shared',
    payments,
    people: members,
    profile,
  })
  const savedById = new Map((group.settlements || []).map((item) => [item.id, item]))
  const settlements = generated.map((item) => {
    const saved = savedById.get(item.id) || {}
    const savedSettledAmount = saved.status === 'received' || saved.status === 'paid' || saved.status === 'settled'
      ? safeAmount(saved.settledAmount || saved.amount || item.amount)
      : safeAmount(saved.settledAmount)
    const settledAmount = Math.min(savedSettledAmount, item.amount)
    const remainingAmount = Math.max(item.amount - settledAmount, 0)
    const settledStatus = item.direction === 'outgoing' ? 'paid' : 'received'

    return {
      ...item,
      ...saved,
      amount: item.amount,
      settledAmount,
      remainingAmount,
      direction: item.direction,
      status: remainingAmount <= 0 ? settledStatus : settledAmount > 0 ? 'partial' : 'pending',
    }
  })
  const paidByUserAmount = payments
    .filter((payment) => isCurrentUserName(payment.paidBy, profile))
    .reduce((total, payment) => total + safeAmount(payment.amount), 0)
  const incoming = settlements.filter((item) => item.direction === 'incoming')
  const outgoing = settlements.filter((item) => item.direction === 'outgoing')
  const received = incoming.reduce((total, item) => total + safeAmount(item.settledAmount), 0)
  const pendingRecoverable = incoming.reduce((total, item) => total + safeAmount(item.remainingAmount), 0)
  const pendingLiability = outgoing.reduce((total, item) => total + safeAmount(item.remainingAmount), 0)
  const paidLiability = outgoing.reduce((total, item) => total + safeAmount(item.settledAmount), 0)
  const outgoingTotal = outgoing.reduce((total, item) => total + safeAmount(item.amount), 0)
  const userIsMember = members.some((person) => isCurrentUserName(person, profile))
  const cashImpact = paidByUserAmount - received + outgoingTotal

  return {
    ...group,
    amount,
    paidBy: payments.length > 1 ? 'Multiple' : payments[0]?.paidBy || currentUserName,
    people: members,
    payments,
    share,
    paidByUser: paidByUserAmount > 0,
    paidByUserAmount,
    userIsMember,
    personalShare: userIsMember ? share : 0,
    settlements,
    received,
    pendingRecoverable,
    pendingLiability,
    paidLiability,
    cashImpact,
  }
}

export function buildFinancialActivity({ expenses = [], sharedGroups = [], profile = {} } = {}) {
  const reconciledShared = sharedGroups.map((group) => reconcileSharedGroup(group, profile))
  const sharedEntries = reconciledShared
    .filter((group) => group.cashImpact > 0)
    .map((group) => ({
      id: `shared-impact-${group.id}`,
      category: SHARED_CATEGORY,
      label: group.name || 'Shared expense',
      amount: group.cashImpact,
      note: `${group.name || 'Shared expense'} includes ${group.payments.length} shared payment${group.payments.length === 1 ? '' : 's'}${group.received > 0 ? `, received back ${group.received}` : ''}`,
      type: 'shared',
      date: group.date || group.payments[0]?.date || new Date().toISOString().slice(0, 10),
      source: 'shared',
      sharedGroupId: group.id,
    }))

  const summary = reconciledShared.reduce((total, group) => ({
    totalPaidByYou: total.totalPaidByYou + group.paidByUserAmount,
    pendingRecoverable: total.pendingRecoverable + group.pendingRecoverable,
    receivedRecoveries: total.receivedRecoveries + group.received,
    pendingLiability: total.pendingLiability + group.pendingLiability,
    paidLiability: total.paidLiability + group.paidLiability,
    netSharedImpact: total.netSharedImpact + group.cashImpact,
    activeGroups: total.activeGroups + 1,
  }), {
    totalPaidByYou: 0,
    pendingRecoverable: 0,
    receivedRecoveries: 0,
    pendingLiability: 0,
    paidLiability: 0,
    netSharedImpact: 0,
    activeGroups: 0,
  })

  return {
    entries: [...expenses, ...sharedEntries],
    manualExpenses: expenses,
    sharedEntries,
    sharedGroups: reconciledShared,
    summary,
  }
}
