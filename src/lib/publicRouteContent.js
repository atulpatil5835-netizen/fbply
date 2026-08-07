export const qualityUpdatedDate = '2026-08-07'

const defaultInternalLinks = [
  { href: '/budget-planner', label: 'Budget Planner' },
  { href: '/expense-tracker', label: 'Expense Tracker' },
  { href: '/monthly-financial-report', label: 'Financial Reports' },
  { href: '/bank-statement-analysis', label: 'Statement Analysis' },
  { href: '/faq', label: 'FAQ' },
]

const routeContent = {
  '/': {
    eyebrow: 'FBPly Overview',
    heading: 'A practical money planning product, explained before the app opens',
    summary:
      'The homepage gives new visitors a clear explanation of what FBPly does, who it helps, and how its budget, expense, shared-cost, report, and statement review workflows fit together.',
    points: [
      'FBPly is built around real monthly decisions: daily spending, recurring commitments, shared expenses, savings goals, and reports.',
      'The public content explains the product in plain language before asking visitors to use the private app experience.',
      'Sample reports, templates, calculators, guides, legal pages, and contact details are linked so the site is understandable without signing in.',
    ],
    checks: [
      'Useful original explanation is available on public pages.',
      'Navigation points to topic pages, samples, calculators, privacy, terms, about, and contact.',
      'Private user data is not exposed in public report examples.',
    ],
  },
  '/budget-planner': {
    eyebrow: 'Budget Planning Quality',
    heading: 'Budget guidance tied to real monthly commitments',
    summary:
      'This page explains how FBPly treats a budget as a living monthly picture instead of a static number. It connects income, fixed commitments, flexible spending, savings goals, and purchase checks.',
    points: [
      'Visitors can understand why recurring bills matter before judging available money.',
      'The examples are focused on everyday planning such as fuel, groceries, subscriptions, travel, repairs, and planned purchases.',
      'Related calculators and guides help users move from explanation to a practical estimate.',
    ],
  },
  '/expense-tracker': {
    eyebrow: 'Expense Tracking Quality',
    heading: 'Expense tracking with reviewable context',
    summary:
      'This page explains how daily expense records become useful only when they can be reviewed by category, date range, and monthly context.',
    points: [
      'The content separates raw entry from useful review: totals, daily averages, top categories, and recent trend signals.',
      'It describes realistic categories such as food, fuel, groceries, shopping, bills, subscriptions, travel, and medical costs.',
      'The page links to daily book, personal expense tracking, budget planning, and monthly reporting so visitors can continue naturally.',
    ],
  },
  '/daily-expense-book': {
    eyebrow: 'Daily Book Quality',
    heading: 'Day-wise records that explain spending as it happens',
    summary:
      'This page focuses on daily spending visibility. It explains why today, yesterday, weekly, monthly, and custom-range views are useful before a month-end report.',
    points: [
      'A daily book helps users catch small expenses while the context is still fresh.',
      'The page explains how daily entries support later budget and report review.',
      'It avoids claiming automatic financial accuracy and keeps the user responsible for checking entries.',
    ],
  },
  '/personal-expense-tracker': {
    eyebrow: 'Personal Tracking Quality',
    heading: 'Personal spending patterns without financial noise',
    summary:
      'This page explains personal expense tracking for people who want a simple record, category awareness, and monthly context without building a spreadsheet system.',
    points: [
      'The page uses concrete spending examples instead of generic productivity claims.',
      'It explains top categories, highest-spend days, date ranges, and review habits.',
      'It connects personal tracking with public guides and monthly reports.',
    ],
  },
  '/trip-expense-splitter': {
    eyebrow: 'Shared Trip Quality',
    heading: 'Trip splitting explained with payer, people, and settlement context',
    summary:
      'This page explains the important parts of a trip split: who paid, who joined, what the payment covered, and how balances should be reviewed before settlement.',
    points: [
      'The examples cover hotels, fuel, food, tickets, activities, and reimbursements.',
      'The content makes it clear that shared expenses need readable payment history, not only a final amount.',
      'Related sample reports and calculators show how the trip record can become a report.',
    ],
  },
  '/shared-expense-calculator': {
    eyebrow: 'Shared Expense Quality',
    heading: 'Shared costs with payment history and settlement direction',
    summary:
      'This page explains how FBPly helps groups keep shared payments understandable through participants, paid amounts, reimbursements, and settlement status.',
    points: [
      'It covers everyday shared costs such as groceries, rent add-ons, cab rides, meals, event tickets, and group outings.',
      'The page explains why settlement status matters after money is paid back.',
      'It links to trip splitting, settlement templates, and FAQ pages for deeper context.',
    ],
  },
  '/monthly-financial-report': {
    eyebrow: 'Report Quality',
    heading: 'Monthly reports built from reviewed activity',
    summary:
      'This page explains how a report becomes useful when it summarizes income context, tracked expenses, savings progress, shared costs, and clear next steps.',
    points: [
      'The content separates summary, evidence, insight, and recommendation so reports do not become raw transaction dumps.',
      'It describes report types for monthly budgets, trips, settlements, and statement reviews.',
      'Public sample pages use illustrative data only and do not reveal private user information.',
    ],
  },
  '/bank-statement-analysis': {
    eyebrow: 'Statement Review Quality',
    heading: 'Statement analysis that keeps review controls visible',
    summary:
      'This page explains statement analysis as a review-first process. Detected rows, dates, categories, and money direction should be checked before a report is trusted.',
    points: [
      'The page explains PDF and CSV statement review without promising perfect parsing.',
      'It notes that older statement months should not automatically change current live balances.',
      'It connects statement analysis to templates, samples, and FAQ answers.',
    ],
  },
  '/faq': {
    eyebrow: 'FAQ Quality',
    heading: 'A public answer hub for product, budgeting, reports, and privacy',
    summary:
      'The FAQ hub gives direct answers to common visitor questions and links people to deeper pages instead of hiding the product behind a sign-in wall.',
    points: [
      'Questions cover budgeting, trip splits, shared expenses, recurring bills, statement review, calculators, reports, and public-page privacy.',
      'The FAQ content helps a reviewer understand FBPly without creating an account.',
      'Answers avoid professional advice claims and point users toward review-first decision making.',
    ],
  },
  '/sample-monthly-financial-report': {
    eyebrow: 'Sample Quality',
    heading: 'A realistic monthly report sample with demo-only numbers',
    summary:
      'This sample shows the kind of summary, key numbers, insights, and recommendations a user can review without exposing actual private account data.',
    points: [
      'The sample separates monthly status from category explanation and next actions.',
      'Demo values are clearly illustrative and not financial advice.',
      'The page links to templates and guides so visitors can understand the structure.',
    ],
  },
  '/sample-trip-expense-report': {
    eyebrow: 'Sample Quality',
    heading: 'A trip report sample that explains shared payments',
    summary:
      'This sample shows how group spending can be summarized with participants, payments, balances, settlement notes, and recommendations.',
    points: [
      'The sample explains why payer records matter during a trip.',
      'It makes settlement context visible before users rely on final balances.',
      'The data is illustrative and does not expose private user trips.',
    ],
  },
  '/sample-settlement-report': {
    eyebrow: 'Sample Quality',
    heading: 'A settlement sample that shows open and completed balances',
    summary:
      'This sample explains who owes whom, what has been paid, what remains open, and how shared expenses can be closed cleanly.',
    points: [
      'The sample distinguishes settlement direction from final confirmation.',
      'It helps visitors understand reimbursement notes and closure checks.',
      'It uses demo values only.',
    ],
  },
  '/sample-bank-statement-analysis': {
    eyebrow: 'Sample Quality',
    heading: 'A bank statement sample that highlights review warnings',
    summary:
      'This sample demonstrates statement summary, category insights, warnings, and recommendations from reviewed demo rows.',
    points: [
      'It explains that statement analysis can support reports only after row review.',
      'It keeps uncertainty and parsing limits visible.',
      'It avoids using private statement files or private account data.',
    ],
  },
  '/privacy': {
    eyebrow: 'Privacy Trust',
    heading: 'Clear privacy, storage, statement, cookie, and advertising disclosures',
    summary:
      'The privacy page explains what FBPly may process, how local storage and hosted services can be used, how statement review works, and how advertising partners may use cookies or similar technologies.',
    points: [
      'FBPly may process user-entered income, expenses, bills, savings goals, shared expenses, planner inputs, profile details, and reviewed statement data to calculate app summaries and reports.',
      'If Google AdSense or similar advertising is enabled, third-party partners, including Google, may place and read cookies or use web beacons, IP addresses, and identifiers to serve, limit, measure, protect, and improve ads.',
      'FBPly does not intentionally pass raw statement files, PDF passwords, personal expense rows, shared payment notes, or detailed financial profile values to Google ad requests. Google partner data policy: https://policies.google.com/technologies/partner-sites.',
    ],
    checks: [
      'Privacy information is available without sign-in.',
      'Public samples use illustrative data only and do not expose private records.',
      'Users can contact contact@fbply.com for privacy questions.',
    ],
  },
  '/terms': {
    eyebrow: 'Terms Trust',
    heading: 'Acceptable use and product limits are public',
    summary:
      'The terms page explains lawful personal use, user responsibility, product availability, and the fact that FBPly is a planning tool rather than a bank or advisor.',
    points: [
      'Users remain responsible for checking information before making financial decisions.',
      'Insights, comfort labels, statement summaries, and reports are estimates based on provided or reviewed data.',
      'Features may change as the independent product evolves.',
    ],
  },
  '/disclaimer': {
    eyebrow: 'Disclaimer Trust',
    heading: 'Financial limits and review responsibility stay visible',
    summary:
      'The disclaimer page makes clear that FBPly supports personal money visibility and does not provide banking, investment, tax, legal, or lending services.',
    points: [
      'Planner guidance and report insights are estimates, not guarantees.',
      'Statement parsing can miss or misread rows when file formats are unclear.',
      'Major financial, legal, tax, or investment decisions should be checked with qualified professionals.',
    ],
  },
  '/about': {
    eyebrow: 'About Trust',
    heading: 'Founder-led product context and public ownership signals',
    summary:
      'The about page explains what FBPly does, who maintains it, why feedback matters, and how visitors can contact or support the product.',
    points: [
      'FBPly is independently built and maintained by Atul Sadanand Hinge.',
      'The product focuses on transparent, practical, real-life money planning.',
      'Feedback around clarity, reports, privacy, accessibility, and usability is welcomed.',
    ],
  },
  '/contact': {
    eyebrow: 'Contact Trust',
    heading: 'Support and privacy contact paths are public',
    summary:
      'The contact page gives visitors a direct support route for app access, saved data, reports, account questions, privacy questions, and product feedback.',
    points: [
      'Support email: contact@fbply.com.',
      'Visitors are asked not to send bank passwords, full statement files, or highly sensitive financial details by email.',
      'Founder-led response may take time, but genuine messages help shape improvements.',
    ],
  },
}

const typeContent = {
  landing: {
    eyebrow: 'Original Page Value',
    heading: 'A focused product page with examples and next steps',
    summary:
      'This public page explains one FBPly workflow with original examples, use cases, internal links, and practical review notes.',
    points: [
      'The page has a clear answer section, expected user, common problems, examples, FAQs, and related public pages.',
      'It is written to help visitors understand the product before they enter private app screens.',
      'It links to guides, calculators, samples, templates, and trust pages where relevant.',
    ],
  },
  faq: {
    eyebrow: 'FAQ Page Value',
    heading: 'Direct answers backed by related public pages',
    summary:
      'This FAQ page answers a specific money planning question and connects the answer to related FBPly workflows.',
    points: [
      'The page gives concise answers instead of sending visitors straight into the app.',
      'Related links help readers continue to calculators, guides, samples, or product pages.',
      'The content avoids replacing professional financial advice.',
    ],
  },
  calculator: {
    eyebrow: 'Calculator Page Value',
    heading: 'A quick estimate with clear limits',
    summary:
      'This public calculator page gives a no-login estimate and clearly separates page-only calculations from private saved app data.',
    points: [
      'Inputs are explained in context so the calculator is useful even before the user changes values.',
      'The page states that values are estimates and should be checked against real terms or records.',
      'No account data is required to understand or try the calculator.',
    ],
  },
  guide: {
    eyebrow: 'Guide Page Value',
    heading: 'A practical guide with steps and examples',
    summary:
      'This guide turns one financial workflow into clear steps, context, examples, and related public resources.',
    points: [
      'The guide explains what the workflow is, why it matters, who it helps, and how to approach it.',
      'Examples are specific to everyday budgeting, shared expenses, statement review, or reports.',
      'Related links help visitors continue through the topic without relying on thin navigation pages.',
    ],
  },
  sample: {
    eyebrow: 'Sample Page Value',
    heading: 'Illustrative output that protects user privacy',
    summary:
      'This sample page shows the structure of a useful report with demo data so visitors can inspect output quality without seeing private user records.',
    points: [
      'The sample distinguishes summary, key numbers, notes, and recommendations.',
      'It clearly states that public examples use illustrative data only.',
      'The structure helps visitors judge whether the app can produce readable reports.',
    ],
  },
  authoritySample: {
    eyebrow: 'Sample Page Value',
    heading: 'Realistic public sample with clear review notes',
    summary:
      'This sample gives a fuller report-style page with demo numbers, insights, recommendations, and privacy-safe context.',
    points: [
      'The sample shows what a finished report can communicate.',
      'It protects private data by using illustrative records.',
      'It links to templates and guides for visitors who want the structure behind the output.',
    ],
  },
  template: {
    eyebrow: 'Template Page Value',
    heading: 'A public structure visitors can learn from',
    summary:
      'This template page explains report sections and best practices so visitors can understand the shape of a useful financial report.',
    points: [
      'The template describes what each section should contain.',
      'It encourages reviewed data, clear labels, and visible limits.',
      'It links to sample reports and related workflows.',
    ],
  },
  authorityTemplate: {
    eyebrow: 'Template Page Value',
    heading: 'A detailed report structure with trust checks',
    summary:
      'This authority template explains how to organize financial information into a readable report while keeping data limits visible.',
    points: [
      'The page covers section structure, best practices, and related examples.',
      'It gives visitors useful public information even if they never open the app.',
      'It supports report quality without exposing user data.',
    ],
  },
  faqHub: {
    eyebrow: 'Hub Page Value',
    heading: 'A navigable hub for public answers',
    summary:
      'This hub organizes public FAQ topics so users and reviewers can understand FBPly from clear answer pages.',
    points: [
      'Topic cards point to deeper answers rather than leaving visitors on a thin navigation page.',
      'The hub explains product, privacy, report, calculator, and statement review questions.',
      'It connects visitor intent with related FBPly workflows.',
    ],
  },
  sampleHub: {
    eyebrow: 'Hub Page Value',
    heading: 'A navigable hub for public report samples',
    summary:
      'This hub gathers privacy-safe sample reports so visitors can inspect report structure before using private app data.',
    points: [
      'Each linked sample uses illustrative data only.',
      'The hub explains the difference between monthly, trip, settlement, and statement report outputs.',
      'Related templates help readers move from example to structure.',
    ],
  },
  legal: {
    eyebrow: 'Trust Page Value',
    heading: 'Public trust information for visitors and reviewers',
    summary:
      'This page explains FBPly ownership, contact, privacy, terms, or disclaimer information in a public, accessible format.',
    points: [
      'Visitors can find support and privacy contact details without signing in.',
      'The page describes data handling, product limits, and user responsibility where relevant.',
      'Legal and trust links are visible across the public site.',
    ],
  },
  home: {
    eyebrow: 'FBPly Overview',
    heading: 'A practical money planning product, explained before the app opens',
    summary:
      'The homepage gives new visitors a clear explanation of what FBPly does, who it helps, and how its budget, expense, shared-cost, report, and statement review workflows fit together.',
    points: [
      'FBPly is built around real monthly decisions: daily spending, recurring commitments, shared expenses, savings goals, and reports.',
      'The public content explains the product in plain language before asking visitors to use the private app experience.',
      'Sample reports, templates, calculators, guides, legal pages, and contact details are linked so the site is understandable without signing in.',
    ],
  },
}

export function getPublicRouteContent(path = '/', meta = {}) {
  const normalizedPath = path === '/' ? '/' : String(path || '/').replace(/\/+$/, '') || '/'
  const routeSpecificContent = routeContent[normalizedPath]
  const fallbackContent = typeContent[meta.type] || typeContent.landing
  const pageLabel = meta.breadcrumbLabel || meta.title || 'FBPly'
  const description = meta.description || ''

  const content = routeSpecificContent || fallbackContent

  return {
    eyebrow: content.eyebrow,
    heading: content.heading,
    summary: routeSpecificContent
      ? content.summary
      : `${content.summary} The current page focuses on ${pageLabel.toLowerCase()} and expands on this topic with route-specific title, description, examples, and links.`,
    points: content.points,
    checks: content.checks || [
      `${pageLabel} has a clear public purpose and original explanatory copy.`,
      description ? `The page description is: ${description}` : 'The page includes route-specific context.',
      'The page links to other useful FBPly resources instead of acting as a dead end.',
    ],
    links: defaultInternalLinks,
    updated: qualityUpdatedDate,
  }
}
