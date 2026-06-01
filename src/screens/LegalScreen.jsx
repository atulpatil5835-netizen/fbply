import { HeartHandshake, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { HeaderLogo } from '../components/AppPrimitives.jsx'

const legalUpdatedLabel = 'Updated May 2026'

function LegalText({ text, supportEmail }) {
  const value = String(text)

  if (!value.includes(supportEmail)) {
    return value
  }

  const [before, after] = value.split(supportEmail)

  return (
    <>
      {before}
      <a className="inline-legal-link" href={`mailto:${supportEmail}`}>
        {supportEmail}
      </a>
      {after}
    </>
  )
}

export default function LegalScreen({ page, supportEmail }) {
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
                  <LegalText text={line} supportEmail={supportEmail} />
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
          <a className="legal-contact-link" href={`mailto:${supportEmail}`}>
            <Mail size={15} />
            {supportEmail}
          </a>
        </section>
        <a className="legal-back-link" href="/">
          Back to FBPly
        </a>
      </section>
    </main>
  )
}
