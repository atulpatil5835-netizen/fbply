import { useState } from 'react'
import {
  Coffee,
  ExternalLink,
  Mail,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import {
  ActionCard,
  MoneyCard,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../design-system'
import { NotesInput, TextInput } from '../design-system/forms.jsx'
import { isSupabaseReady, supabase } from '../lib/supabaseClient'
import { trackEvent } from '../lib/analytics'
import { focusInvalidField } from '../lib/uiHelpers'

function mailtoFeedbackHref(supportEmail, suggestion = '', email = '') {
  const subject = encodeURIComponent('FBPly feedback')
  const body = encodeURIComponent(`${suggestion}${email ? `\n\nFrom: ${email}` : ''}`)
  return `mailto:${supportEmail}?subject=${subject}&body=${body}`
}

function externalProps(external) {
  return external
    ? {
        target: '_blank',
        rel: 'noreferrer noopener',
      }
    : {}
}

function ProfileHubFeedback({ supportEmail, source = 'profile_hub' }) {
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

  const openMailto = (cleanSuggestion = suggestion.trim(), cleanEmail = email.trim()) => {
    if (typeof window !== 'undefined') {
      window.location.href = mailtoFeedbackHref(supportEmail, cleanSuggestion, cleanEmail)
    }
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
            source,
            page: typeof window === 'undefined' ? '/' : window.location.pathname,
          })

        if (error) {
          throw error
        }

        setStatus('Thanks for your feedback. It genuinely helps make FBPly clearer and better.')
      } else {
        openMailto(cleanSuggestion, cleanEmail)
        setStatus('Thanks for your feedback. Your note is ready to send.')
      }

      setSuggestion('')
      setEmail('')
      setErrors({})
      trackEvent('feedback_submitted', {
        surface: 'profile_hub',
        provider: isSupabaseReady ? 'supabase' : 'mailto',
      })
    } catch {
      openMailto(cleanSuggestion, cleanEmail)
      setStatus('Thanks for your feedback. Your note is ready to send.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <MoneyCard
      className="mos-profile-feedback-card"
      eyebrow="Feedback"
      title="Tell us what felt unclear"
      detail="Send a product note without leaving the Profile Hub."
      icon={MessageCircle}
      tone="tint"
    >
      <form className="mos-profile-feedback-form" onSubmit={submitFeedback}>
        <NotesInput
          label="Suggestion / feedback"
          value={suggestion}
          placeholder="One thing FBPly should improve..."
          rows={3}
          error={errors.suggestion}
          onChange={(event) => {
            setSuggestion(event.target.value)
            clearError('suggestion')
            setStatus('')
          }}
        />
        <TextInput
          label="Email optional"
          type="email"
          value={email}
          placeholder="you@example.com"
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value)
            clearError('email')
            setStatus('')
          }}
        />
        <div className="mos-profile-feedback-actions">
          <PrimaryButton type="submit" icon={Mail} loading={isSending} loadingLabel="Sending">
            Send feedback
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => {
              setSuggestion('')
              setEmail('')
              setErrors({})
              setStatus('')
            }}
          >
            Clear
          </SecondaryButton>
        </div>
        {status && <p className="mos-profile-feedback-status">{status}</p>}
      </form>
    </MoneyCard>
  )
}

function ProfileHubSection({ eyebrow, title, detail, children }) {
  return (
    <section className="mos-profile-hub-section">
      <SectionHeader eyebrow={eyebrow} title={title} detail={detail} />
      <div className="mos-profile-hub-grid">
        {children}
      </div>
    </section>
  )
}

export default function ProfileHub({
  supportEmail = 'contact@fbply.com',
  supportPaymentUrl = '',
  founderName = '',
  founderLinkedInUrl = '',
  className = '',
}) {
  return (
    <section className={`money-os mos-profile-hub ${className}`} aria-label="Profile Hub">
      <SectionHeader
        title="Support & About"
        detail="Help, feedback, and founder notes"
      />

      <ProfileHubSection
        title="Contact"
      >
        <ProfileHubFeedback supportEmail={supportEmail} />
        <ActionCard
          title="Support"
          detail="Support independent FBPly development."
          actionLabel="Open support"
          icon={Coffee}
          tone="warning"
          href={supportPaymentUrl}
          {...externalProps(Boolean(supportPaymentUrl))}
        />
        <ActionCard
          title="About FBPLY"
          detail={founderName ? `Founder-led by ${founderName}.` : 'Founder, support, and product details.'}
          actionLabel="Read about"
          icon={Sparkles}
          tone="tint"
          href="/about"
        />
        {founderLinkedInUrl && (
          <ActionCard
            title="Founder LinkedIn"
            detail="Open the founder profile."
            actionLabel="Open LinkedIn"
            icon={ExternalLink}
            href={founderLinkedInUrl}
            {...externalProps(true)}
          />
          )}
      </ProfileHubSection>
    </section>
  )
}
