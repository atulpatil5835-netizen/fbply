import { HeartHandshake, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { HeaderLogo } from '../components/AppPrimitives.jsx'
import { qualityUpdatedDate } from '../lib/publicRouteContent.js'

const legalUpdatedLabel = `Updated ${qualityUpdatedDate}`

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function LegalText({ text, supportEmail, founderLinkedInUrl, supportPaymentUrl, googlePartnerPrivacyUrl }) {
  const value = String(text)
  const links = [
    supportEmail && { token: supportEmail, href: `mailto:${supportEmail}`, label: supportEmail },
    founderLinkedInUrl && { token: founderLinkedInUrl, href: founderLinkedInUrl, label: 'LinkedIn', external: true },
    supportPaymentUrl && { token: supportPaymentUrl, href: supportPaymentUrl, label: 'Support FBPly', external: true },
    googlePartnerPrivacyUrl && {
      token: googlePartnerPrivacyUrl,
      href: googlePartnerPrivacyUrl,
      label: 'Google partner data policy',
      external: true,
    },
  ].filter(Boolean)

  if (!links.some((link) => value.includes(link.token))) {
    return value
  }

  const matcher = new RegExp(`(${links.map((link) => escapeRegExp(link.token)).join('|')})`, 'g')

  return (
    <>
      {value.split(matcher).map((part, index) => {
        const link = links.find((item) => item.token === part)

        if (!link) {
          return part
        }

        return (
          <a
            className="inline-legal-link"
            href={link.href}
            key={`${link.token}-${index}`}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noreferrer noopener' : undefined}
          >
            {link.label}
          </a>
        )
      })}
    </>
  )
}

export default function LegalScreen({
  page,
  supportEmail,
  founderLinkedInUrl,
  supportPaymentUrl,
  googlePartnerPrivacyUrl,
}) {
  const legalContactItems = [
    {
      title: 'Support',
      body: 'Help with app access, saved data, reports, or account questions.',
      icon: HeartHandshake,
    },
    {
      title: 'Privacy Questions',
      body: 'Questions about local storage, cookies, statement review, or data handling.',
      icon: ShieldCheck,
    },
    {
      title: 'Suggestions & Feedback',
      body: 'Ideas and corrections that help shape the app are always welcome.',
      icon: MessageCircle,
    },
  ]

  return (
    <main className="legal-page-shell">
      <section className="legal-page-card">
        <HeaderLogo />
        <div className="legal-page-hero">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.summary}</p>
          <div className="legal-page-meta" aria-label="Legal page details">
            <span>Official FBPly information</span>
            <span>{legalUpdatedLabel}</span>
          </div>
        </div>
        <div className="legal-section-list">
          {page.sections.map((section) => (
            <article className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((line) => (
                <p key={line}>
                  <LegalText
                    text={line}
                    supportEmail={supportEmail}
                    founderLinkedInUrl={founderLinkedInUrl}
                    supportPaymentUrl={supportPaymentUrl}
                    googlePartnerPrivacyUrl={googlePartnerPrivacyUrl}
                  />
                </p>
              ))}
            </article>
          ))}
        </div>
        <section className="legal-contact-panel" aria-label="Official FBPly contact">
          {legalContactItems.map((item) => (
            <article key={item.title}>
              <span>
                <item.icon size={14} />
                {item.title}
              </span>
              <p>{item.body}</p>
            </article>
          ))}
          <div className="legal-contact-actions">
            <a className="legal-contact-link" href={`mailto:${supportEmail}`}>
              <Mail size={15} />
              {supportEmail}
            </a>
            <a className="legal-contact-link" href={supportPaymentUrl} target="_blank" rel="noreferrer noopener">
              <HeartHandshake size={15} />
              Support FBPly
            </a>
          </div>
        </section>
        <a className="legal-back-link" href="/">
          Back to FBPly
        </a>
      </section>
    </main>
  )
}
