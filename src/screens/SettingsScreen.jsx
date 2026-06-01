import { CheckCircle2, LogOut, X } from 'lucide-react'
import { AppModal, BrandMark, CurrencyInput } from '../components/AppPrimitives.jsx'
import FinanceDonut from '../components/FinanceDonut.jsx'
import { CommitmentsEditor, CurrencyPreference } from '../components/ProfileSettingsControls.jsx'
import RecurringScheduleManager from '../components/RecurringScheduleManager.jsx'
import { getProfileBalanceMessage } from '../lib/financeVisuals'
import { normalizeMoney } from '../lib/money'
import { titleCase } from '../lib/uiHelpers'

export default function SettingsScreen({
  authUser,
  profile,
  setProfile,
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
}) {
  const balanceMessage = getProfileBalanceMessage(financialState)

  return (
    <AppModal
      onClose={onClose}
      labelledBy="settings-title"
      sheetClassName="editor-sheet settings-sheet chrome-popover-sheet settings-popover-sheet"
      backdropClassName="editor-sheet-backdrop chrome-popover-backdrop"
    >
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
        <section className="settings-compact-group">
          <div className="profile-menu-account settings-account">
            <BrandMark size="small" />
            <div>
              <span className="mini-label">Signed in as</span>
              <strong>{authUser?.email || profile.email || 'Local profile'}</strong>
              <p>{balanceMessage}</p>
            </div>
          </div>

          <div className="settings-form-grid">
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
              <p className="eyebrow">Monthly bills</p>
              <h2>Your regular payments</h2>
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
