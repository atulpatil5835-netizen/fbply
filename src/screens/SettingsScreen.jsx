import { lazy, Suspense, useState } from 'react'
import {
  CheckCircle2,
  Coffee,
  Coins,
  ExternalLink,
  FileText,
  Info,
  LifeBuoy,
  LogOut,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'
import { AppModal, BrandMark, CurrencyInput } from '../components/AppPrimitives.jsx'
import FinanceDonut from '../components/FinanceDonut.jsx'
import { CommitmentsEditor, CurrencyPreference } from '../components/ProfileSettingsControls.jsx'
import RecurringScheduleManager from '../components/RecurringScheduleManager.jsx'
import { ActionCard, FLoader, moneyOSThemeOptions, normalizeMoneyOSTheme } from '../design-system'
import { getProfileBalanceMessage } from '../lib/financeVisuals'
import { normalizeMoney } from '../lib/money'
import { trackEvent } from '../lib/analytics'
import { titleCase } from '../lib/uiHelpers'

const ProductHealthDashboard = lazy(() => import('../components/ProductHealthDashboard.jsx'))

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase()
}

function configuredFounderEmails(supportEmail) {
  const configuredEmails = [
    supportEmail,
    import.meta.env.VITE_FOUNDER_EMAILS || '',
    import.meta.env.VITE_ADMIN_EMAILS || '',
  ].join(',')

  return new Set(
    configuredEmails
      .split(',')
      .map(normalizeEmail)
      .filter(Boolean),
  )
}

function isLocalDevelopmentHost() {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

function canViewFounderDashboard({ authUser, profile, supportEmail }) {
  const accountEmail = normalizeEmail(authUser?.email || profile?.email)

  if (accountEmail && configuredFounderEmails(supportEmail).has(accountEmail)) {
    return true
  }

  return isLocalDevelopmentHost()
}

function ThemePreference({ moneyTheme, setMoneyTheme }) {
  const selectedTheme = normalizeMoneyOSTheme(moneyTheme)

  return (
    <section className="settings-compact-group theme-preference-group" aria-labelledby="theme-preference-title">
      <SettingsSectionTitle
        id="theme-preference-title"
        icon={Palette}
        title="Theme"
        detail="Choose the workspace look."
      />
      <div className="theme-choice-grid" role="radiogroup" aria-label="Theme">
        {moneyOSThemeOptions.map((theme) => {
          const isSelected = selectedTheme === theme.id

          return (
            <button
              className={`theme-choice-button ${isSelected ? 'active' : ''}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-theme-option={theme.id}
              key={theme.id}
              onClick={() => {
                if (!isSelected) {
                  trackEvent('theme_changed')
                }

                setMoneyTheme?.(theme.id)
              }}
            >
              <span className="theme-choice-swatch" aria-hidden="true" />
              <span className="theme-choice-copy">
                <strong>{theme.label}</strong>
                <small>{theme.detail}</small>
              </span>
              {isSelected && <CheckCircle2 size={14} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function SettingsSectionTitle({ id, icon: Icon, title, detail }) {
  return (
    <div className="settings-section-title">
      {Icon && (
        <span className="settings-section-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
      )}
      <div>
        <h2 id={id}>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
    </div>
  )
}

function settingsExternalProps(external) {
  return external
    ? {
        target: '_blank',
        rel: 'noreferrer noopener',
      }
    : {}
}

function supportMailHref(supportEmail = 'contact@fbply.com') {
  const subject = encodeURIComponent('FBPly support')
  return `mailto:${supportEmail}?subject=${subject}`
}

function SettingsMenuLinks({
  supportEmail = 'contact@fbply.com',
  supportPaymentUrl = '',
  founderName = '',
  founderLinkedInUrl = '',
}) {
  return (
    <section className="settings-compact-group settings-menu-links" aria-labelledby="settings-menu-links-title">
      <SettingsSectionTitle
        id="settings-menu-links-title"
        icon={LifeBuoy}
        title="Support & Trust"
        detail="Help, product information, and public policy pages."
      />
      <div className="settings-menu-link-grid">
        <ActionCard
          title="Support"
          detail="Feedback and help when something feels unclear."
          actionLabel="Email"
          icon={LifeBuoy}
          tone="tint"
          href={supportMailHref(supportEmail)}
        />
        <ActionCard
          title="About FBPLY"
          detail={founderName ? `Founder-led by ${founderName}.` : 'Product, founder, and ownership details.'}
          actionLabel="Read"
          icon={Info}
          tone="neutral"
          href="/about"
        />
        <ActionCard
          title="Privacy Policy"
          detail="Data, privacy, and safety details."
          actionLabel="Read"
          icon={ShieldCheck}
          tone="neutral"
          href="/privacy"
        />
        <ActionCard
          title="Terms"
          detail="Use, limits, and responsibilities."
          actionLabel="Read"
          icon={FileText}
          tone="neutral"
          href="/terms"
        />
        <ActionCard
          title="Disclaimer"
          detail="Financial guidance limits and review notes."
          actionLabel="Read"
          icon={FileText}
          tone="neutral"
          href="/disclaimer"
        />
        {supportPaymentUrl && (
          <ActionCard
            title="Support FBPly"
            detail="Support independent FBPly development."
            actionLabel="Open"
            icon={Coffee}
            tone="warning"
            href={supportPaymentUrl}
            {...settingsExternalProps(true)}
          />
        )}
        {founderLinkedInUrl && (
          <ActionCard
            title="Founder LinkedIn"
            detail="Open the founder profile."
            actionLabel="Open"
            icon={ExternalLink}
            tone="tint"
            href={founderLinkedInUrl}
            {...settingsExternalProps(true)}
          />
        )}
      </div>
    </section>
  )
}

export default function SettingsScreen({
  authUser,
  moneyTheme,
  setMoneyTheme,
  profile,
  setProfile,
  onEnableBackup,
  onClose,
  onSignOut,
  financialState,
  fixedDistribution,
  flexibleDistribution,
  commitments,
  updateCommitment,
  addCommitment,
  removeCommitment,
  recurringSchedules,
  addRecurringSchedule,
  updateRecurringSchedule,
  removeRecurringSchedule,
  toggleRecurringSchedule,
  supportEmail,
  supportPaymentUrl,
  founderName,
  founderLinkedInUrl,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const balanceMessage = getProfileBalanceMessage(financialState)
  const backupStatus = authUser?.id ? 'Protected by Cloud Backup' : 'Local Only'
  const showProductHealthDashboard = canViewFounderDashboard({ authUser, profile, supportEmail })

  return (
    <AppModal
      onClose={onClose}
      labelledBy="settings-title"
      sheetClassName="editor-sheet settings-sheet chrome-popover-sheet settings-popover-sheet"
      backdropClassName="editor-sheet-backdrop chrome-popover-backdrop"
    >
      <div className="editor-sheet-header">
        <div>
          <p className="eyebrow">Menu</p>
          <h2 id="settings-title">Options</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close settings" onClick={onClose}>
          <X size={17} />
        </button>
      </div>

      <div className="editor-sheet-body settings-body">
        <section className="settings-compact-group settings-account-overview" aria-labelledby="settings-account-title">
          <SettingsSectionTitle
            id="settings-account-title"
            icon={UserRound}
            title="Account"
            detail={backupStatus}
          />
          <div className="profile-menu-account settings-account">
            <BrandMark size="small" />
            <div>
              <span className="mini-label">{authUser?.email || profile.email || 'This device'}</span>
              <strong>{profile.name || 'FBPly User'}</strong>
              <p>{balanceMessage}</p>
            </div>
          </div>
          <div className="settings-form-grid settings-form-grid--primary">
            <label>
              <span className="input-label">Name</span>
              <input
                className="plain-input"
                id="settings-name"
                type="text"
                value={profile.name}
                placeholder="Your name"
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <CurrencyInput
              label="Monthly income"
              id="settings-income"
              value={profile.income}
              onChange={(value) => setProfile((current) => ({ ...current, income: normalizeMoney(value) }))}
            />
          </div>
        </section>

        <section className="settings-compact-group settings-money-preferences" aria-labelledby="settings-money-title">
          <SettingsSectionTitle
            id="settings-money-title"
            icon={Coins}
            title="Money Preferences"
            detail="Currency and salary cycle used across the app."
          />
          <div className="settings-form-grid">
            <CurrencyPreference profile={profile} setProfile={setProfile} id="settings-currency" />
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
          </div>
        </section>

        <ThemePreference moneyTheme={moneyTheme} setMoneyTheme={setMoneyTheme} />

        {!authUser?.id && (
          <section className="settings-backup-callout">
            <ShieldCheck size={18} />
            <div>
              <strong>Cloud Backup</strong>
              <p>Protect your FBPly data across devices.</p>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                onClose()
                onEnableBackup?.()
              }}
            >
              Enable
            </button>
          </section>
        )}

        <SettingsMenuLinks
          supportEmail={supportEmail}
          supportPaymentUrl={supportPaymentUrl}
          founderName={founderName}
          founderLinkedInUrl={founderLinkedInUrl}
        />

        <details
          className="settings-secondary-details"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              <SlidersHorizontal size={16} aria-hidden="true" />
              <strong>Advanced Settings</strong>
              <small>Bills, planning style, recurring payments, and diagnostics</small>
            </span>
          </summary>
          {detailsOpen && (
            <div className="settings-secondary-stack">
              <section className="settings-compact-group">
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
              </section>

              <div className="settings-donut-grid">
                <FinanceDonut chart={fixedDistribution} />
                <FinanceDonut chart={flexibleDistribution} />
              </div>

              <section className="settings-commitments settings-compact-group">
                <div className="section-heading-row">
                  <div>
                    <h2>Monthly bills</h2>
                  </div>
                </div>
                <CommitmentsEditor
                  commitments={commitments}
                  updateCommitment={updateCommitment}
                  addCommitment={addCommitment}
                  removeCommitment={removeCommitment}
                />
              </section>

              <RecurringScheduleManager
                schedules={recurringSchedules}
                addSchedule={addRecurringSchedule}
                updateSchedule={updateRecurringSchedule}
                removeSchedule={removeRecurringSchedule}
                toggleSchedule={toggleRecurringSchedule}
              />

              {showProductHealthDashboard && (
                <Suspense fallback={<FLoader label="Opening product health" />}>
                  <ProductHealthDashboard />
                </Suspense>
              )}
            </div>
          )}
        </details>
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
