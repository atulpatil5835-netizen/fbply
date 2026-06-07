import { useState } from 'react'
import {
  ChartPie,
  Coffee,
  ExternalLink,
  FileText,
  Mail,
  MessageCircle,
  PiggyBank,
  Plane,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
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
import { trackEvent, trackFeatureUsage } from '../lib/analytics'
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
  onNavigate,
  onOpenStatementAnalysis,
  className = '',
}) {
  const openFeature = (feature, tab, targetId) => {
    trackFeatureUsage('profile_hub_navigation', {
      surface: 'profile_hub',
      feature,
      target_tab: tab,
    })
    onNavigate?.(tab, targetId)
  }

  return (
    <section className={`money-os mos-profile-hub ${className}`} aria-label="Profile Hub">
      <SectionHeader
        title="More settings"
      />

      <ProfileHubSection
        title="Reports, savings, and statements"
      >
        <ActionCard
          title="Reports"
          detail="Open monthly reports and exports."
          actionLabel="Open reports"
          icon={ChartPie}
          tone="tint"
          onClick={() => openFeature('reports', 'reports', 'reports-export-section')}
        />
        <ActionCard
          title="Savings Goals"
          detail="Open protected goals and monthly saving plans."
          actionLabel="Open savings"
          icon={PiggyBank}
          tone="success"
          onClick={() => openFeature('savings_goals', 'planner', 'savings-goals-section')}
        />
        <ActionCard
          title="Statement Analysis"
          detail="Review PDF or CSV statement rows before reporting."
          actionLabel="Analyze statement"
          icon={FileText}
          tone="warning"
          onClick={() => {
            trackFeatureUsage('profile_hub_navigation', {
              surface: 'profile_hub',
              feature: 'statement_analysis',
              target_tab: 'reports',
            })
            onOpenStatementAnalysis?.()
          }}
        />
      </ProfileHubSection>

      <ProfileHubSection
        title="Planning and splitting"
      >
        <ActionCard
          title="Budget Planner"
          detail="Check planned purchases and affordability."
          actionLabel="Open planner"
          icon={Target}
          tone="tint"
          onClick={() => openFeature('budget_planner', 'planner', 'planner-target-amount')}
        />
        <ActionCard
          title="Trip Splitter"
          detail="Open shared groups, trips, and settlements."
          actionLabel="Open trips"
          icon={Plane}
          tone="success"
          onClick={() => openFeature('trip_splitter', 'history', 'shared-expenses-section')}
        />
      </ProfileHubSection>

      <ProfileHubSection
        title="Help, feedback, and founder notes"
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

      <ProfileHubSection
        title="Policies and terms"
      >
        <ActionCard
          title="Privacy Policy"
          detail="How FBPly handles app data and privacy choices."
          actionLabel="Open privacy"
          icon={ShieldCheck}
          href="/privacy"
        />
        <ActionCard
          title="Terms of Service"
          detail="Terms for using FBPly as a planning tool."
          actionLabel="Open terms"
          icon={Scale}
          href="/terms"
        />
        <ActionCard
          title="Disclaimer"
          detail="Planning estimates, limits, and user responsibility."
          actionLabel="Open disclaimer"
          icon={FileText}
          href="/disclaimer"
        />
      </ProfileHubSection>
    </section>
  )
}
