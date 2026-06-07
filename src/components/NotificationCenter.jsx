import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, ChartPie, Check, CheckCheck, CreditCard, Plane, Target, Wallet, X } from 'lucide-react'
import { reconcileSharedGroup } from '../lib/financialActivity'
import { normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { AppModal, EmptyState } from './AppPrimitives.jsx'
import { trackEvent } from '../lib/analytics'

const priorityRank = {
  High: 0,
  Medium: 1,
  Low: 2,
}

function trackNotificationInteraction(action, detail = {}) {
  trackEvent(action, {
    surface: 'app_chrome',
    ...detail,
  })
}

function priorityForReminder(reminder = {}) {
  if (reminder.urgency === 'today' || reminder.dueLabel === 'Today' || reminder.dueLabel === 'Tomorrow') {
    return reminder.direction === 'outgoing' || reminder.type === 'Settlement' ? 'High' : 'Medium'
  }

  return reminder.urgency === 'soon' ? 'Medium' : 'Low'
}

function typeForReminder(reminder = {}) {
  if (reminder.type === 'EMI' || reminder.type === 'Settlement' || reminder.direction === 'outgoing') {
    return reminder.urgency === 'today' ? 'CRITICAL' : 'ACTION REQUIRED'
  }

  return reminder.type === 'Salary' || reminder.type === 'Goal' ? 'INSIGHT' : 'ACTION REQUIRED'
}

function targetForReminder(reminder = {}) {
  if (reminder.type === 'Goal') {
    return { tab: 'planner', targetId: 'savings-goals-section' }
  }

  if (reminder.type === 'Settlement') {
    return { tab: 'history', targetId: 'shared-expenses-section' }
  }

  if (reminder.type === 'Borrow/Lend') {
    return { tab: 'history', targetId: 'money-book-section' }
  }

  return { tab: 'profile', targetId: 'profile-bills-section' }
}

function iconForReminder(reminder = {}) {
  if (reminder.type === 'Salary' || reminder.direction === 'incoming') {
    return Wallet
  }

  if (reminder.type === 'Goal') {
    return Target
  }

  if (reminder.type === 'EMI') {
    return CreditCard
  }

  if (reminder.type === 'Settlement') {
    return Plane
  }

  return CalendarDays
}

function buildNotifications({
  moneyReminders = [],
  savingsBuckets = [],
  sharedGroups = [],
  sharedSummary = {},
  moneyBookSummary = {},
  reportHistory = [],
  profile = {},
} = {}) {
  const notifications = moneyReminders.map((reminder) => ({
    id: `money-${reminder.reminderId || reminder.id}`,
    type: typeForReminder(reminder),
    priority: priorityForReminder(reminder),
    title: reminder.dueLabel === 'Open'
      ? reminder.title
      : `${reminder.title} ${String(reminder.dueLabel || 'soon').toLowerCase()}`,
    message: reminder.message || `${reminder.type || 'Money'} needs attention.`,
    icon: iconForReminder(reminder),
    ...targetForReminder(reminder),
  }))

  const activeTrip = sharedGroups
    .map((group) => reconcileSharedGroup(group, profile))
    .find((group) => normalizeMoney(group.pendingRecoverable) + normalizeMoney(group.pendingLiability) > 0)

  if (activeTrip) {
    const pending = normalizeMoney(activeTrip.pendingRecoverable) + normalizeMoney(activeTrip.pendingLiability)
    notifications.push({
      id: `trip-${activeTrip.id}`,
      type: 'ACTION REQUIRED',
      priority: 'Medium',
      title: `${activeTrip.name || 'Trip'} settlement pending`,
      message: `${rupees(pending)} is still open in shared expenses.`,
      icon: Plane,
      tab: 'history',
      targetId: 'shared-expenses-section',
    })
  }

  const goalNearFinish = savingsBuckets
    .map((bucket) => {
      const saved = normalizeMoney(bucket.saved)
      const target = normalizeMoney(bucket.target)
      return {
        ...bucket,
        saved,
        target,
        progress: target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0,
      }
    })
    .filter((bucket) => bucket.progress >= 70)
    .sort((a, b) => b.progress - a.progress)[0]

  if (goalNearFinish) {
    notifications.push({
      id: `goal-${goalNearFinish.id}`,
      type: 'INSIGHT',
      priority: goalNearFinish.progress >= 90 ? 'High' : 'Medium',
      title: `${goalNearFinish.name || 'Goal'} is ${goalNearFinish.progress}% complete`,
      message: `${rupees(goalNearFinish.saved)} saved toward ${rupees(goalNearFinish.target)}.`,
      icon: Target,
      tab: 'planner',
      targetId: 'savings-goals-section',
    })
  }

  if (normalizeMoney(moneyBookSummary.pendingSettlements) > 0) {
    notifications.push({
      id: 'money-book-pending',
      type: 'ACTION REQUIRED',
      priority: 'Medium',
      title: 'Borrow/lend settlement pending',
      message: `${rupees(moneyBookSummary.pendingSettlements)} remains open in Money Book.`,
      icon: Wallet,
      tab: 'history',
      targetId: 'money-book-section',
    })
  }

  if (normalizeMoney(sharedSummary.pendingRecoverable) > 0 && !activeTrip) {
    notifications.push({
      id: 'shared-recoverable',
      type: 'ACTION REQUIRED',
      priority: 'Medium',
      title: 'Shared money to collect',
      message: `${rupees(sharedSummary.pendingRecoverable)} is pending from shared expenses.`,
      icon: Plane,
      tab: 'history',
      targetId: 'shared-expenses-section',
    })
  }

  const latestReport = Array.isArray(reportHistory) ? reportHistory[0] : null

  if (latestReport) {
    notifications.push({
      id: `report-${latestReport.reportId}`,
      type: 'REPORT',
      priority: 'Low',
      title: latestReport.name || 'Latest report ready',
      message: `${latestReport.period || 'Current period'} report can be opened again.`,
      icon: ChartPie,
      tab: 'reports',
      targetId: 'reports-export-section',
      report: latestReport,
    })
  }

  return notifications
    .sort((a, b) => (
      priorityRank[a.priority] - priorityRank[b.priority]
      || String(a.title).localeCompare(String(b.title))
    ))
    .slice(0, 8)
}

export default function NotificationCenter({
  open = false,
  onClose,
  moneyReminders,
  savingsBuckets,
  sharedGroups,
  sharedSummary,
  moneyBookSummary,
  reportHistory,
  profile,
  navigateToTarget,
  redownloadReport,
}) {
  const [readNotificationIds, setReadNotificationIds] = useState([])
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([])
  const notifications = useMemo(
    () => buildNotifications({
      moneyReminders,
      savingsBuckets,
      sharedGroups,
      sharedSummary,
      moneyBookSummary,
      reportHistory,
      profile,
    }),
    [moneyBookSummary, moneyReminders, profile, reportHistory, savingsBuckets, sharedGroups, sharedSummary],
  )
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedNotificationIds.includes(notification.id)),
    [dismissedNotificationIds, notifications],
  )
  const readHistory = useMemo(
    () => notifications
      .filter((notification) => readNotificationIds.includes(notification.id) || dismissedNotificationIds.includes(notification.id))
      .slice(0, 5),
    [dismissedNotificationIds, notifications, readNotificationIds],
  )
  const unreadCount = visibleNotifications.filter((notification) => !readNotificationIds.includes(notification.id)).length

  useEffect(() => {
    if (!open) {
      return
    }

    trackNotificationInteraction('notification_center_open', {
      unread_count: unreadCount,
      notification_count: visibleNotifications.length,
    })
  }, [open, unreadCount, visibleNotifications.length])

  const markRead = useCallback((notification) => {
    if (!notification) {
      return
    }

    setReadNotificationIds((current) => (
      current.includes(notification.id) ? current : [notification.id, ...current]
    ))
    trackNotificationInteraction('notification_mark_read', {
      notification_type: notification.type,
      priority: notification.priority,
    })
  }, [])

  const dismiss = useCallback((notification) => {
    if (!notification) {
      return
    }

    setDismissedNotificationIds((current) => (
      current.includes(notification.id) ? current : [notification.id, ...current]
    ))
    setReadNotificationIds((current) => (
      current.includes(notification.id) ? current : [notification.id, ...current]
    ))
    trackNotificationInteraction('notification_dismiss', {
      notification_type: notification.type,
      priority: notification.priority,
    })
  }, [])

  const markAllRead = useCallback(() => {
    const unreadIds = visibleNotifications
      .filter((notification) => !readNotificationIds.includes(notification.id))
      .map((notification) => notification.id)

    if (!unreadIds.length) {
      return
    }

    setReadNotificationIds((current) => Array.from(new Set([...unreadIds, ...current])))
    trackNotificationInteraction('notification_mark_all_read', { count: unreadIds.length })
  }, [readNotificationIds, visibleNotifications])

  const clearRead = useCallback(() => {
    const readIds = notifications
      .filter((notification) => readNotificationIds.includes(notification.id))
      .map((notification) => notification.id)

    if (!readIds.length) {
      return
    }

    setDismissedNotificationIds((current) => Array.from(new Set([...readIds, ...current])))
    setReadNotificationIds((current) => current.filter((id) => !readIds.includes(id)))
    trackNotificationInteraction('notification_clear_read', { count: readIds.length })
  }, [notifications, readNotificationIds])

  const openNotification = useCallback((notification) => {
    if (!notification) {
      return
    }

    markRead(notification)
    trackNotificationInteraction('notification_open', {
      notification_type: notification.type,
      priority: notification.priority,
    })
    onClose?.()

    if (notification.report) {
      redownloadReport?.(notification.report)
      return
    }

    navigateToTarget?.(notification.tab, notification.targetId)
  }, [markRead, navigateToTarget, onClose, redownloadReport])

  if (!open) {
    return null
  }

  return (
    <AppModal
      onClose={onClose}
      labelledBy="notification-popup-title"
      sheetClassName="editor-sheet notification-popup-sheet chrome-popover-sheet notification-popover-sheet"
      backdropClassName="editor-sheet-backdrop chrome-popover-backdrop"
    >
          <div className="editor-sheet-header">
            <div>
              <p className="eyebrow">Notifications</p>
              <h2 id="notification-popup-title">Money alerts</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Close notifications" onClick={onClose}>
              <X size={17} />
            </button>
          </div>

          <div className="notification-center-actions notification-popup-actions">
            <span>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</span>
            <button type="button" onClick={markAllRead}>
              <CheckCheck size={14} />
              Mark read
            </button>
            <button type="button" onClick={clearRead}>
              Clear read
            </button>
          </div>

          <div className="editor-sheet-body notification-popup-body">
            {visibleNotifications.length === 0 ? (
              <EmptyState
                title="No active money alerts"
                detail="Important reminders, settlements, and reports will appear here."
                icon={Bell}
              />
            ) : (
              <div className="notification-list">
                {visibleNotifications.map((notification) => {
                  const Icon = notification.icon
                  const isRead = readNotificationIds.includes(notification.id)

                  return (
                    <article className={`notification-card ${notification.priority.toLowerCase()} ${isRead ? 'read' : 'unread'}`} key={notification.id}>
                      <button type="button" className="notification-main" onClick={() => openNotification(notification)}>
                        <span className={`notification-type ${notification.type.toLowerCase().replace(/\s+/g, '-')}`}>{notification.type}</span>
                        <Icon size={16} />
                        <div>
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>
                        </div>
                        <b>{notification.priority}</b>
                      </button>
                      <div className="notification-row-actions">
                        <button type="button" aria-label={`Mark ${notification.title} read`} onClick={() => markRead(notification)}>
                          <Check size={14} />
                        </button>
                        <button type="button" aria-label={`Dismiss ${notification.title}`} onClick={() => dismiss(notification)}>
                          <X size={14} />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            {readHistory.length > 0 && (
              <div className="notification-history">
                <span>Read history</span>
                {readHistory.map((notification) => (
                  <small key={`history-${notification.id}`}>{notification.title}</small>
                ))}
              </div>
            )}
          </div>
    </AppModal>
  )
}
