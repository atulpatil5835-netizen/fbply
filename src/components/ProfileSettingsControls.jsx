import { CreditCard, House, Plus, Receipt, Trash2, Utensils, Wallet } from 'lucide-react'
import { normalizeCurrency, normalizeMoney } from '../lib/money'
import { slugify } from '../lib/uiHelpers'
import { CurrencyInput } from './AppPrimitives.jsx'

const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD']

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

export function CurrencyPreference({ profile, setProfile, id = 'currency-preference' }) {
  const value = normalizeCurrency(profile.currency)

  return (
    <label>
      <span className="input-label">Currency</span>
      <select
        className="month-select"
        id={id}
        value={value}
        onChange={(event) => setProfile((current) => ({
          ...current,
          currency: normalizeCurrency(event.target.value),
        }))}
      >
        {currencyOptions.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CommitmentsEditor({ commitments, updateCommitment, addCommitment, removeCommitment }) {
  return (
    <div className="commitment-list">
      {commitments.length === 0 && (
        <p className="section-note">No monthly bills added yet. Add only what repeats every month.</p>
      )}

      {commitments.map((item, index) => {
        const Icon = commitmentIconForName(item.name)

        return (
          <article className="commitment-row" key={item.id}>
            <span className="soft-icon">
              <Icon size={18} />
            </span>
            <label>
              <span>Bill {index + 1}</span>
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
                ariaLabel={`Amount for ${item.name || `bill ${index + 1}`}`}
                value={item.amount}
                onChange={(value) => updateCommitment(item.id, { amount: normalizeMoney(value) })}
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
              aria-label={`Remove ${item.name || 'monthly bill'}`}
              onClick={() => removeCommitment(item.id)}
            >
              <Trash2 size={17} />
            </button>
          </article>
        )
      })}

      <button className="ghost-button commitment-add" type="button" onClick={addCommitment}>
        <Plus size={18} />
        Add monthly bill
      </button>
    </div>
  )
}
