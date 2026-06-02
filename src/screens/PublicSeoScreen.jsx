import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ChartPie,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Plane,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { HeaderLogo } from '../components/AppPrimitives.jsx'
import {
  applySeoMetadata,
  getSeoMetaForPath,
  normalizeSeoPath,
  siteOrigin,
} from '../lib/seoRoutes.js'
import { trackEvent, trackFeatureUsage, trackPublicPageView } from '../lib/analytics'

const workflowLinks = [
  { href: '/budget-planner', label: 'Budget Planner', icon: Wallet },
  { href: '/expense-tracker', label: 'Expense Tracker', icon: Receipt },
  { href: '/daily-expense-book', label: 'Daily Expense Book', icon: CalendarDays },
  { href: '/monthly-financial-report', label: 'Financial Reports', icon: ChartPie },
  { href: '/bank-statement-analysis', label: 'Statement Analysis', icon: Receipt },
  { href: '/trip-expense-splitter', label: 'Trip Expense Splitter', icon: Plane },
  { href: '/shared-expense-calculator', label: 'Shared Expense Calculator', icon: CreditCard },
]

const authorityLinks = [
  { href: '/daily-expense-book', label: 'Daily Expense Book' },
  { href: '/sample-monthly-financial-report', label: 'Sample Reports' },
  { href: '/monthly-financial-report-template', label: 'Templates' },
  { href: '/budget-calculator', label: 'Calculators' },
  { href: '/guides/how-to-create-monthly-budget', label: 'Guides' },
  { href: '/faq', label: 'FAQ' },
]

const calculatorUsageEvents = {
  tripSplit: 'trip_split_calculator_usage',
  emi: 'emi_calculator_usage',
  budget: 'budget_calculator_usage',
  savings: 'savings_calculator_usage',
}

const landingPages = {
  '/budget-planner': {
    eyebrow: 'Budget Planner',
    title: 'Plan a monthly budget around real commitments.',
    intro:
      'FBPly helps you understand income, regular bills, flexible spending, savings goals, and planned purchases in one monthly view.',
    answer:
      'FBPly is a budget planner for people who want practical monthly clarity before they spend. It turns saved income, commitments, expenses, and goals into simple guidance that explains what is committed, what is flexible, and what may need attention.',
    who: 'For salary earners, students, families, solo workers, and anyone who wants a calmer way to check whether a month can support normal spending and future goals.',
    problems: [
      'Monthly bills and flexible spending are hard to compare.',
      'A planned purchase can look affordable until recurring payments are included.',
      'Small daily expenses are difficult to explain at the end of the month.',
    ],
    how: [
      'Add income and recurring monthly commitments.',
      'Track daily expenses and savings goals.',
      'Review safe-spend guidance, reminders, reports, and changes over time.',
    ],
    examples: [
      'Estimate whether a phone, bike repair, or travel booking fits the month.',
      'Compare fixed bills against flexible spending.',
      'Review savings goals beside upcoming commitments.',
    ],
    benefits: ['Clear monthly context', 'Practical safe-spend checks', 'Connected reports'],
    related: ['/monthly-financial-report', '/bank-statement-analysis', '/faq/monthly-budget'],
    faqs: [
      {
        question: 'What is FBPly used for as a budget planner?',
        answer:
          'FBPly is used to plan monthly money by combining income, recurring bills, tracked expenses, savings goals, and simple purchase guidance.',
      },
      {
        question: 'Does FBPly replace financial advice?',
        answer:
          'No. FBPly is a planning and reporting tool. Its outputs depend on user-entered or reviewed data and should be checked before important decisions.',
      },
    ],
  },
  '/expense-tracker': {
    eyebrow: 'Expense Tracker',
    title: 'Track daily expenses with budget awareness.',
    intro:
      'FBPly helps record personal expenses, review recent spending, and connect everyday money records with monthly planning context.',
    answer:
      'FBPly is an expense tracker for people who want daily spending visibility without creating a separate finance system. It uses saved expense records to show history, category patterns, and budget awareness beside monthly planning.',
    who: 'For people tracking food, fuel, groceries, shopping, subscriptions, medical costs, travel, and other everyday expenses from one personal spending record.',
    problems: [
      'Small expenses are easy to forget when they are not recorded the same day.',
      'Monthly budgets become unclear when daily spending is only reviewed at month end.',
      'Category patterns are hard to spot when expenses sit in a mixed activity timeline.',
    ],
    how: [
      'Add an expense from the existing quick add flow.',
      'Review today, yesterday, 7-day, 30-day, or custom-range history.',
      'Use totals, top category, daily average, and trend signals for budget awareness.',
    ],
    examples: [
      'Track lunch, tea, fuel, groceries, and mobile recharge in one day.',
      'Review the last 7 days before deciding on weekend spending.',
      'Check the month-to-date top category before preparing a monthly report.',
    ],
    benefits: ['Daily visibility', 'Personal spending history', 'Budget awareness'],
    related: ['/daily-expense-book', '/personal-expense-tracker', '/budget-planner', '/monthly-financial-report'],
    faqs: [
      {
        question: 'What is an expense tracker?',
        answer:
          'An expense tracker records money spent across categories so a person can review daily history, monthly totals, and spending patterns.',
      },
      {
        question: 'How does FBPly track expenses?',
        answer:
          'FBPly uses saved expense records added by the user and presents them through daily history, category summaries, and connected budget views.',
      },
    ],
  },
  '/daily-expense-book': {
    eyebrow: 'Daily Expense Book',
    title: 'Keep a daily expense book for everyday spending.',
    intro:
      'Review daily expense records for today, yesterday, the last 7 days, the last 30 days, or a custom date range.',
    answer:
      'FBPly is a daily expense book for personal spending tracking. It focuses on day-by-day expense visibility, using the same expense records that power the rest of the app.',
    who: 'For users who want a simple daily book view before reviewing broader activity, reports, shared expenses, or monthly budget pressure.',
    problems: [
      'Daily spending gets hidden when income, goals, shared expenses, and borrow/lend entries are mixed together.',
      'A month-end view can explain totals but not the day-by-day habit.',
      'Users need quick access to today and yesterday before opening full reports.',
    ],
    how: [
      'Open the Daily Book from the existing app navigation.',
      'Choose Today, Yesterday, 7 Days, 30 Days, or Custom Range.',
      'Open quick add from Daily Book when a new expense needs to be recorded.',
    ],
    examples: [
      'Check how much was spent today before adding dinner or shopping.',
      'Compare yesterday with today after a busy travel day.',
      'Review a custom range before discussing household spending.',
    ],
    benefits: ['Today view', 'Date-range history', 'Spending pattern visibility'],
    related: ['/expense-tracker', '/personal-expense-tracker', '/budget-planner', '/faq/track-recurring-expenses'],
    faqs: [
      {
        question: 'What is a daily expense book?',
        answer:
          'A daily expense book is a day-wise record of personal expenses that helps review spending as it happens instead of only at month end.',
      },
      {
        question: 'Does Daily Book create a new finance system in FBPly?',
        answer:
          'No. Daily Book presents the existing expense records already used by FBPly for activity, insights, and reports.',
      },
    ],
  },
  '/personal-expense-tracker': {
    eyebrow: 'Personal Expense Tracker',
    title: 'Understand personal spending patterns clearly.',
    intro:
      'Use FBPly to record personal expenses, review history, and see category-led spending patterns in daily and monthly context.',
    answer:
      'FBPly is a personal expense tracker for budget awareness. It helps people record spending, understand top categories, notice recent trends, and keep personal expenses connected to monthly planning.',
    who: 'For salary earners, students, families, solo workers, and anyone who wants a practical spending record without overcomplicating the budget.',
    problems: [
      'Personal spending decisions are often made without seeing recent totals.',
      'Top categories can quietly grow when small purchases are scattered.',
      'Budget awareness is weaker when expense tracking is disconnected from reports.',
    ],
    how: [
      'Save everyday spending as an expense.',
      'Review personal spending history by day or date range.',
      'Use category and trend summaries to prepare better monthly reviews.',
    ],
    examples: [
      'Track personal food, travel, fuel, subscription, and shopping expenses.',
      'Review the highest spending day in a month.',
      'Check recent trend before a planned purchase.',
    ],
    benefits: ['Personal spending tracking', 'Top category clarity', 'Monthly budget awareness'],
    related: ['/expense-tracker', '/daily-expense-book', '/monthly-financial-report', '/guides/how-to-create-monthly-budget'],
    faqs: [
      {
        question: 'What should a personal expense tracker show?',
        answer:
          'It should show saved expenses, daily totals, date-range history, top categories, and enough context to support budget awareness.',
      },
      {
        question: 'Can expense tracking improve budget awareness?',
        answer:
          'Yes. Reviewing daily and monthly spending patterns helps a person understand where money is going before the month ends.',
      },
    ],
  },
  '/trip-expense-splitter': {
    eyebrow: 'Trip Expense Splitter',
    title: 'Split trip expenses without losing the story.',
    intro:
      'Record who paid, who joined, what the payment covered, and how each person should settle after a trip or shared event.',
    answer:
      'FBPly is a trip expense splitter that keeps group payments readable. It helps track shared payments, participant balances, and settlement direction so the final report explains the trip clearly.',
    who: 'For friends, couples, roommates, teams, and families sharing hotels, fuel, food, tickets, activities, or other trip costs.',
    problems: [
      'One person pays several times and the group forgets the details.',
      'Settlements become confusing when payments happen across different days.',
      'A group needs a clear trip report after the expense split is complete.',
    ],
    how: [
      'Create a trip or shared group.',
      'Add each shared payment with payer, people, amount, and note.',
      'Review balances and export a trip or settlement report when ready.',
    ],
    examples: [
      'Split hotel, food, fuel, and tickets among four people.',
      'Mark a reimbursement as received after settlement.',
      'Generate a trip expense report for everyone to review.',
    ],
    benefits: ['Readable group balances', 'Settlement direction', 'Trip report support'],
    related: ['/shared-expense-calculator', '/report-templates/trip-expense-report', '/faq/split-trip-expenses'],
    faqs: [
      {
        question: 'Can FBPly track who paid during a trip?',
        answer:
          'Yes. FBPly can record the payer, people included, amount, and note for each shared trip payment.',
      },
      {
        question: 'Can FBPly create a trip expense report?',
        answer:
          'Yes. FBPly supports trip report output from saved shared expense data after the user reviews the group details.',
      },
    ],
  },
  '/monthly-financial-report': {
    eyebrow: 'Financial Report Generator',
    title: 'Generate monthly financial reports from real activity.',
    intro:
      'Turn tracked expenses, recurring payments, savings goals, shared expenses, and reviewed statement data into a share-ready monthly report.',
    answer:
      'FBPly is a financial report generator for monthly money summaries. It organizes spending, income context, category patterns, savings progress, and practical notes into a report structure that is easier to review than raw transactions.',
    who: 'For users who want a monthly money summary for personal review, family discussion, expense documentation, or better follow-up next month.',
    problems: [
      'Transactions are hard to explain without a summary.',
      'Budgets and goals live separately from actual spending.',
      'Reports need context, not just totals.',
    ],
    how: [
      'Track financial activity during the month.',
      'Review the report screen and choose a report template.',
      'Generate a monthly budget report, trip report, settlement report, or statement report.',
    ],
    examples: [
      'Create a monthly budget report after payday and bill payments.',
      'Download a trip expense report from shared costs.',
      'Save statement analysis output into report history.',
    ],
    benefits: ['Monthly review structure', 'Export-ready summaries', 'Report history'],
    related: ['/report-templates/monthly-financial-report', '/sample-reports/monthly-financial-report', '/faq/generate-financial-reports'],
    faqs: [
      {
        question: 'What reports can FBPly generate?',
        answer:
          'FBPly can generate monthly budget reports, trip expense reports, settlement reports, and statement analysis reports from reviewed app data.',
      },
      {
        question: 'Do reports expose public user data?',
        answer:
          'No. Public template and sample pages use illustrative structures only. Private user reports remain inside the app experience.',
      },
    ],
  },
  '/bank-statement-analysis': {
    eyebrow: 'Bank Statement Analyzer',
    title: 'Analyze bank statements with review-first controls.',
    intro:
      'Analyze statement PDFs or CSV files, review detected transactions, understand category signals, and generate a statement analysis report.',
    answer:
      'FBPly is a bank statement analyzer that helps users review readable statement rows and turn them into spending signals. Older statement months stay in report history and are not added to live balances automatically.',
    who: 'For people who want to understand a bank statement without manually rewriting every row into a monthly report.',
    problems: [
      'Statements are detailed but difficult to summarize.',
      'PDF and CSV formats need review before they can be trusted.',
      'Older statement months should not automatically change current planning.',
    ],
    how: [
      'Choose a statement analysis period.',
      'Upload a PDF, CSV, or multiple supported files.',
      'Review detected totals, categories, rows, and statement report output.',
    ],
    examples: [
      'Review one month of spending from a CSV file.',
      'Compare category signals across a six-month statement period.',
      'Create a statement analysis report after reviewing detected rows.',
    ],
    benefits: ['Review-first import', 'Statement report output', 'No automatic live balance changes for older months'],
    related: ['/report-templates/statement-analysis-report', '/sample-reports/statement-analysis-report', '/faq/analyze-bank-statements'],
    faqs: [
      {
        question: 'Does FBPly save raw statement files by default?',
        answer:
          'No. FBPly reads statement files for review. Raw files and PDF passwords are not saved permanently by default.',
      },
      {
        question: 'Should detected statement rows be reviewed?',
        answer:
          'Yes. Users should review detected dates, categories, and money direction before relying on statement summaries.',
      },
    ],
  },
  '/shared-expense-calculator': {
    eyebrow: 'Shared Expense Calculator',
    title: 'Calculate shared expenses and settlement direction.',
    intro:
      'Use FBPly to record shared payments, calculate who owes whom, and keep settlement status connected to activity and reports.',
    answer:
      'FBPly is a shared expense calculator for group costs. It helps track paid amounts, people included in each expense, balances, reimbursements, and settlement status.',
    who: 'For roommates, friends, teams, partners, and families managing rent add-ons, groceries, trips, dinners, events, or other shared payments.',
    problems: [
      'Shared payments get mixed with personal expenses.',
      'People remember different versions of who paid what.',
      'Settlement needs a clear record after reimbursements happen.',
    ],
    how: [
      'Create a shared group or trip.',
      'Add payments with payer, amount, people, and note.',
      'Review balances, mark settlements, and generate reports when needed.',
    ],
    examples: [
      'Split groceries between roommates.',
      'Track shared cab rides and meals during a trip.',
      'Create a settlement report when everyone has paid back.',
    ],
    benefits: ['Payment history', 'Balance clarity', 'Settlement reports'],
    related: ['/trip-expense-splitter', '/report-templates/settlement-report', '/faq/manage-shared-expenses'],
    faqs: [
      {
        question: 'What does a shared expense calculator do?',
        answer:
          'It records shared payments and helps explain how costs should be divided between people in a group.',
      },
      {
        question: 'Can FBPly track settlement status?',
        answer:
          'Yes. FBPly can mark shared money as settled so reports and activity stay easier to understand.',
      },
    ],
  },
}

const faqPages = {
  '/faq/monthly-budget': {
    eyebrow: 'FAQ',
    title: 'How to create a monthly budget',
    intro:
      'A monthly budget works best when income, recurring commitments, flexible expenses, savings goals, and upcoming purchases are reviewed together.',
    faqs: [
      {
        question: 'What should I include in a monthly budget?',
        answer:
          'Include income, rent or housing, utilities, EMIs or loans, subscriptions, groceries, transport, savings goals, debt payments, and expected flexible spending.',
      },
      {
        question: 'How does FBPly help with monthly budgeting?',
        answer:
          'FBPly connects income, bills, expenses, goals, reminders, and reports so the month is easier to understand before and after spending happens.',
      },
      {
        question: 'When should I review my monthly budget?',
        answer:
          'Review it after income arrives, before major purchases, after large bills, and near month end when planning the next month.',
      },
    ],
    related: ['/budget-planner', '/monthly-financial-report', '/faq/track-recurring-expenses'],
  },
  '/faq/split-trip-expenses': {
    eyebrow: 'FAQ',
    title: 'How to split trip expenses',
    intro:
      'Trip expense splitting is clearer when every shared payment records the payer, people included, amount, and note.',
    faqs: [
      {
        question: 'What is the easiest way to split trip expenses?',
        answer:
          'Create a trip group, add each payment as it happens, include the people who shared the cost, and review balances before settlement.',
      },
      {
        question: 'What details should be saved for each trip payment?',
        answer:
          'Save the amount, payer, people included, date, and a short note such as hotel, fuel, lunch, tickets, or cab.',
      },
      {
        question: 'Can FBPly prepare a trip expense report?',
        answer:
          'Yes. A trip expense report can summarize shared payments, balances, and settlement notes from reviewed group data.',
      },
    ],
    related: ['/trip-expense-splitter', '/shared-expense-calculator', '/sample-reports/trip-expense-report'],
  },
  '/faq/analyze-bank-statements': {
    eyebrow: 'FAQ',
    title: 'How to analyze bank statements',
    intro:
      'Statement analysis should be review-first. Imported rows need confirmation before summaries are used for decisions.',
    faqs: [
      {
        question: 'How does FBPly analyze a bank statement?',
        answer:
          'FBPly reads supported PDF or CSV statement files, detects readable transaction rows, groups signals, and prepares a statement report for review.',
      },
      {
        question: 'Are older statement months added to the live budget automatically?',
        answer:
          'No. Older statement months stay in report history and are not added to live flexibility automatically.',
      },
      {
        question: 'Why should statement rows be reviewed?',
        answer:
          'Banks use different formats. Reviewing detected rows helps catch unclear dates, categories, amounts, and money-in or money-out direction.',
      },
    ],
    related: ['/bank-statement-analysis', '/report-templates/statement-analysis-report', '/sample-reports/statement-analysis-report'],
  },
  '/faq/manage-shared-expenses': {
    eyebrow: 'FAQ',
    title: 'How to manage shared expenses',
    intro:
      'Shared expenses stay manageable when the app separates personal spending, group payments, and settlement status.',
    faqs: [
      {
        question: 'What counts as a shared expense?',
        answer:
          'A shared expense is any cost paid by one person for multiple people, such as rent add-ons, groceries, meals, tickets, fuel, hotel, or event payments.',
      },
      {
        question: 'How does FBPly help manage shared expenses?',
        answer:
          'FBPly tracks payer, people, amount, note, group balances, and settlement status so shared costs are easier to explain.',
      },
      {
        question: 'When should shared expenses be settled?',
        answer:
          'Settle after the group confirms the payments, when a trip ends, at month end, or when everyone agrees the shared period is complete.',
      },
    ],
    related: ['/shared-expense-calculator', '/trip-expense-splitter', '/report-templates/settlement-report'],
  },
  '/faq/track-recurring-expenses': {
    eyebrow: 'FAQ',
    title: 'How to track recurring expenses',
    intro:
      'Recurring expense tracking makes monthly pressure visible before flexible spending begins.',
    faqs: [
      {
        question: 'Which recurring expenses should I track?',
        answer:
          'Track rent, utilities, internet, subscriptions, school fees, EMIs, loan payments, insurance, and any regular commitment that affects the month.',
      },
      {
        question: 'Why are recurring expenses important in FBPly?',
        answer:
          'Recurring expenses help FBPly estimate committed money, safe spending, reminders, report context, and purchase planning pressure.',
      },
      {
        question: 'Can recurring expenses affect reports?',
        answer:
          'Yes. They help reports explain the difference between fixed commitments and flexible spending.',
      },
    ],
    related: ['/budget-planner', '/monthly-financial-report', '/faq/monthly-budget'],
  },
  '/faq/generate-financial-reports': {
    eyebrow: 'FAQ',
    title: 'How to generate financial reports',
    intro:
      'Financial reports are most useful after the user reviews the data that will appear in the report.',
    faqs: [
      {
        question: 'What data should be reviewed before generating a report?',
        answer:
          'Review expenses, income context, recurring bills, shared payments, settlements, savings goals, and any statement analysis rows used in the report.',
      },
      {
        question: 'Which report types does FBPly support?',
        answer:
          'FBPly supports monthly budget reports, trip expense reports, settlement reports, and statement analysis reports.',
      },
      {
        question: 'Why use a report template?',
        answer:
          'A template keeps the report organized with consistent sections for summary, details, examples, notes, and next steps.',
      },
    ],
    related: ['/monthly-financial-report', '/report-templates/monthly-financial-report', '/sample-reports'],
  },
}

const expandedFaqs = [
  {
    question: 'What is FBPly?',
    answer:
      'FBPly is a budget planner, trip expense splitter, financial report generator, and bank statement analyzer for clearer monthly money decisions.',
  },
  {
    question: 'Who is FBPly for?',
    answer:
      'FBPly is for people who want practical visibility into monthly budgets, shared costs, savings goals, reports, and statement review.',
  },
  {
    question: 'Does FBPly require login to read public resources?',
    answer:
      'No. Public guides, calculators, templates, sample reports, and FAQ pages are available without login or signup.',
  },
  {
    question: 'Does FBPly provide professional financial advice?',
    answer:
      'No. FBPly is a planning and reporting tool. Users should review data and consult qualified professionals for major financial, tax, legal, or investment decisions.',
  },
  {
    question: 'What is a budget planner?',
    answer:
      'A budget planner helps organize income, fixed commitments, flexible spending, savings goals, and upcoming decisions for a month.',
  },
  {
    question: 'What should a monthly budget include?',
    answer:
      'It should include income, rent or housing, utilities, EMIs, subscriptions, groceries, transport, savings goals, shared costs, and planned purchases.',
  },
  {
    question: 'How often should I review a budget?',
    answer:
      'Review a budget after income arrives, after major bills clear, before large purchases, and near the end of the month.',
  },
  {
    question: 'What is fixed spending?',
    answer:
      'Fixed spending includes recurring commitments such as rent, utilities, insurance, subscriptions, school fees, EMIs, or loan payments.',
  },
  {
    question: 'What is flexible spending?',
    answer:
      'Flexible spending includes categories that change during the month, such as food, fuel, shopping, travel, entertainment, and personal expenses.',
  },
  {
    question: 'How can I plan a savings goal?',
    answer:
      'Define the target amount, current savings, monthly contribution, and timeline, then review whether the goal fits monthly commitments.',
  },
  {
    question: 'What is a trip expense splitter?',
    answer:
      'A trip expense splitter records shared travel payments and calculates how costs should be divided between the people involved.',
  },
  {
    question: 'What details matter for trip expense splitting?',
    answer:
      'The important details are payer, amount, people included, date, note, and whether the payment has been settled.',
  },
  {
    question: 'How do equal trip splits work?',
    answer:
      'An equal split divides the total shared cost by the number of people included, then compares each person paid amount against their share.',
  },
  {
    question: 'Can every trip payment include different people?',
    answer:
      'Yes. Some shared payments may include everyone, while others may include only part of the group. That context should be saved.',
  },
  {
    question: 'What is a shared expense calculator?',
    answer:
      'A shared expense calculator estimates balances when one person pays for multiple people and reimbursements are needed.',
  },
  {
    question: 'When should shared expenses be settled?',
    answer:
      'Shared expenses should be settled after the group reviews payment history and agrees the balances are correct.',
  },
  {
    question: 'What is a settlement report?',
    answer:
      'A settlement report explains who owes whom, which reimbursements are complete, and which balances remain open.',
  },
  {
    question: 'Why keep completed settlements visible?',
    answer:
      'Completed settlements show why the remaining balance is lower and help prevent duplicate reimbursement requests.',
  },
  {
    question: 'What is a monthly financial report?',
    answer:
      'A monthly financial report summarizes income context, commitments, spending categories, savings progress, insights, and recommendations.',
  },
  {
    question: 'What should a financial report include?',
    answer:
      'It should include an executive summary, key numbers, category context, insights, recommendations, and data limitations.',
  },
  {
    question: 'What is a report template?',
    answer:
      'A report template is an educational structure that keeps summaries, numbers, insights, and recommendations organized.',
  },
  {
    question: 'Why use sample reports?',
    answer:
      'Sample reports show output quality, section structure, and review style without exposing private user data.',
  },
  {
    question: 'Does FBPly public sample data come from users?',
    answer:
      'No. Public sample report pages use realistic illustrative demo data only.',
  },
  {
    question: 'What is bank statement analysis?',
    answer:
      'Bank statement analysis reviews statement rows to summarize money in, money out, categories, recurring activity, and unclear transactions.',
  },
  {
    question: 'Should bank statement rows be reviewed manually?',
    answer:
      'Yes. Bank formats and narrations vary, so detected rows and categories should be reviewed before decisions or reports.',
  },
  {
    question: 'Does statement analysis change the live budget automatically?',
    answer:
      'Older statement months should be reviewed separately and should not automatically change current planning without user review.',
  },
  {
    question: 'What is a statement analysis report?',
    answer:
      'It is a report structure that explains statement scope, readable rows, category signals, review warnings, and recommendations.',
  },
  {
    question: 'What is an EMI calculator?',
    answer:
      'An EMI calculator estimates monthly loan payment from loan amount, rate, and tenure. Actual lender terms can differ.',
  },
  {
    question: 'What is a budget calculator?',
    answer:
      'A budget calculator estimates remaining monthly money after income, fixed bills, flexible spending, and savings target.',
  },
  {
    question: 'What is a savings goal calculator?',
    answer:
      'A savings goal calculator estimates how long a goal may take based on target amount, current savings, and monthly contribution.',
  },
  {
    question: 'Do public calculators save data?',
    answer:
      'No. Public FBPly calculators are local page estimates and do not require account data or storage.',
  },
  {
    question: 'Can calculators replace financial advice?',
    answer:
      'No. Calculators provide estimates for planning and should be checked against real terms, statements, and professional guidance when needed.',
  },
  {
    question: 'How does FBPly help AI systems understand the product?',
    answer:
      'FBPly public pages clearly explain what the product is, who it helps, why it matters, how it works, examples, benefits, templates, calculators, and sample outputs.',
  },
  {
    question: 'Which public pages prove FBPly expertise?',
    answer:
      'The authority layer includes sample reports, report templates, calculators, structured guides, and expanded FAQs.',
  },
  {
    question: 'How are privacy and trust handled on public pages?',
    answer:
      'Public pages link to Privacy, Terms, Disclaimer, About, and Contact pages and avoid exposing private user data.',
  },
  {
    question: 'Can anonymous visitors open SEO pages directly?',
    answer:
      'Yes. Public SEO pages are designed for direct anonymous access without Supabase session, signup, profile, reports, or user data.',
  },
  {
    question: 'How should I choose between a guide, template, sample report, and calculator?',
    answer:
      'Use a guide to learn the process, a template to structure output, a sample report to preview quality, and a calculator for quick estimates.',
  },
  {
    question: 'What makes FBPly different from a simple spreadsheet?',
    answer:
      'FBPly connects budgeting, shared expenses, statement review, and reports into one product experience instead of leaving each workflow isolated.',
  },
  {
    question: 'What data should be checked before generating reports?',
    answer:
      'Review expenses, income context, recurring bills, shared payments, settlements, savings goals, and any statement rows included in the report.',
  },
  {
    question: 'What is the best first page for new visitors?',
    answer:
      'New visitors can start with Budget Planner, Trip Expense Splitter, Monthly Financial Report, Bank Statement Analysis, or the FAQ hub.',
  },
]

const faqHub = {
  eyebrow: 'FAQ Hub',
  title: 'Answers for budgeting, reports, and shared expenses.',
  intro:
    'These public FAQ pages explain how FBPly helps with monthly budgets, trip splits, bank statement analysis, shared expenses, recurring expenses, and financial reports.',
  items: [
    '/faq/monthly-budget',
    '/faq/split-trip-expenses',
    '/faq/analyze-bank-statements',
    '/faq/manage-shared-expenses',
    '/faq/track-recurring-expenses',
    '/faq/generate-financial-reports',
    '/guides/how-to-create-monthly-budget',
    '/guides/how-to-split-trip-expenses',
    '/guides/how-to-analyze-bank-statements',
    '/guides/how-to-manage-shared-expenses',
    '/guides/how-to-generate-financial-reports',
    '/budget-calculator',
    '/trip-split-calculator',
    '/emi-calculator',
    '/savings-goal-calculator',
    '/monthly-financial-report-template',
    '/trip-expense-report-template',
    '/settlement-report-template',
    '/bank-statement-analysis-template',
    '/sample-monthly-financial-report',
    '/sample-trip-expense-report',
    '/sample-settlement-report',
    '/sample-bank-statement-analysis',
  ],
  faqs: expandedFaqs,
}

const templatePages = {
  '/report-templates/monthly-financial-report': {
    eyebrow: 'Report Template',
    title: 'Monthly Financial Report Template',
    intro:
      'A monthly financial report should summarize the month, show what changed, explain category movement, and list practical next steps.',
    sections: [
      ['Monthly snapshot', 'Income context, committed bills, flexible expenses, savings progress, and safe-spend status.'],
      ['Spending breakdown', 'Category totals, fixed versus flexible spending, and notable changes from recent activity.'],
      ['Planning notes', 'Upcoming bills, goal progress, risk notes, and suggested review points.'],
    ],
    related: ['/monthly-financial-report', '/sample-reports/monthly-financial-report', '/faq/generate-financial-reports'],
  },
  '/report-templates/trip-expense-report': {
    eyebrow: 'Report Template',
    title: 'Trip Expense Report Template',
    intro:
      'A trip expense report should explain the trip group, each shared payment, participant balances, and final settlement direction.',
    sections: [
      ['Trip summary', 'Trip name, people included, date range, total shared spend, and number of payments.'],
      ['Payment table', 'Who paid, amount, people included, note, and payment date.'],
      ['Settlement notes', 'Who should reimburse whom, what is already settled, and what remains open.'],
    ],
    related: ['/trip-expense-splitter', '/sample-reports/trip-expense-report', '/faq/split-trip-expenses'],
  },
  '/report-templates/settlement-report': {
    eyebrow: 'Report Template',
    title: 'Settlement Report Template',
    intro:
      'A settlement report should focus on reimbursement direction, payment status, and the shared expense record behind each balance.',
    sections: [
      ['Settlement summary', 'People involved, open balances, and completed reimbursements.'],
      ['Who owes whom', 'Clear payer and receiver direction with amount and group context.'],
      ['Closure notes', 'Marked settlements, pending items, and any note needed for review.'],
    ],
    related: ['/shared-expense-calculator', '/sample-reports/settlement-report', '/faq/manage-shared-expenses'],
  },
  '/report-templates/statement-analysis-report': {
    eyebrow: 'Report Template',
    title: 'Statement Analysis Report Example',
    intro:
      'A statement analysis report should keep detected rows, category signals, money-in and money-out totals, and review notes easy to audit.',
    sections: [
      ['Statement scope', 'File type, analysis period, readable rows, and review status.'],
      ['Detected movement', 'Income signals, spending categories, transfers, and unusual rows that need attention.'],
      ['Review notes', 'Parsing limits, category checks, and statement rows the user should confirm.'],
    ],
    related: ['/bank-statement-analysis', '/sample-reports/statement-analysis-report', '/faq/analyze-bank-statements'],
  },
}

const samplePages = {
  '/sample-reports/monthly-financial-report': {
    eyebrow: 'Sample Report',
    title: 'Sample Monthly Financial Report',
    intro:
      'This public example shows the structure of an FBPly monthly report. It uses sample data only and does not expose user information.',
    stats: [
      ['Month status', 'Stable with watch items'],
      ['Top category', 'Food and daily spending'],
      ['Next action', 'Review subscriptions and savings goal timing'],
    ],
    notes: [
      'Fixed commitments are separated from flexible spending.',
      'Goal progress appears beside monthly pressure.',
      'The report ends with practical review notes instead of generic advice.',
    ],
    related: ['/monthly-financial-report', '/report-templates/monthly-financial-report', '/faq/monthly-budget'],
  },
  '/sample-reports/trip-expense-report': {
    eyebrow: 'Sample Report',
    title: 'Sample Trip Expense Report',
    intro:
      'This public example shows how a trip expense report can present people, shared payments, balances, and settlement direction.',
    stats: [
      ['Trip group', '4 people'],
      ['Shared payments', 'Hotel, fuel, meals, tickets'],
      ['Next action', 'Confirm remaining reimbursements'],
    ],
    notes: [
      'Each payment includes payer and people included.',
      'Balances are summarized after the payment list.',
      'Settlement direction is shown separately from payment history.',
    ],
    related: ['/trip-expense-splitter', '/report-templates/trip-expense-report', '/faq/split-trip-expenses'],
  },
  '/sample-reports/settlement-report': {
    eyebrow: 'Sample Report',
    title: 'Sample Settlement Report',
    intro:
      'This public example shows how settlement output can explain open balances, completed reimbursements, and closure notes.',
    stats: [
      ['Open items', '2 reimbursements'],
      ['Settled items', '1 reimbursement'],
      ['Next action', 'Mark settlement after payment confirmation'],
    ],
    notes: [
      'Settlement direction is written plainly.',
      'Completed reimbursements stay visible for audit context.',
      'Group notes make the final status easier to verify.',
    ],
    related: ['/shared-expense-calculator', '/report-templates/settlement-report', '/faq/manage-shared-expenses'],
  },
  '/sample-reports/statement-analysis-report': {
    eyebrow: 'Sample Report',
    title: 'Sample Statement Analysis Report',
    intro:
      'This public example shows how a statement analysis report can present detected movement, category signals, and review warnings.',
    stats: [
      ['Analysis period', '3 months'],
      ['Review status', 'Rows need user confirmation'],
      ['Next action', 'Check categories and money direction'],
    ],
    notes: [
      'Readable rows are summarized before conclusions.',
      'Detected categories are treated as review signals.',
      'The report explains parsing limits so the user can verify the output.',
    ],
    related: ['/bank-statement-analysis', '/report-templates/statement-analysis-report', '/faq/analyze-bank-statements'],
  },
}

const authoritySamplePages = {
  '/sample-monthly-financial-report': {
    eyebrow: 'Sample Report',
    title: 'Sample Monthly Financial Report',
    intro:
      'A realistic demo report showing how FBPly can present a month of income, commitments, flexible spending, savings progress, and next steps.',
    summary:
      'Demo household income stayed stable, but food, transport, and subscriptions pushed flexible spending above the planned comfort range. The month is manageable if discretionary spending slows for the final week and the savings transfer remains protected.',
    keyNumbers: [
      ['Income reviewed', 'Rs 82,000', 'Salary and one small reimbursement'],
      ['Fixed commitments', 'Rs 38,500', 'Rent, utilities, insurance, and EMI'],
      ['Flexible spending', 'Rs 24,850', 'Food, transport, shopping, and subscriptions'],
      ['Savings progress', 'Rs 12,000', 'Emergency fund and travel goal transfers'],
    ],
    insights: [
      'Committed spending used 47% of reviewed income, leaving the month sensitive to extra purchases.',
      'Food and transport were the largest flexible categories, mostly from weekend activity and fuel.',
      'Savings progress stayed on track because the transfer happened before discretionary spending increased.',
    ],
    recommendations: [
      'Keep subscriptions under review before the next billing cycle.',
      'Set a weekly flexible-spend checkpoint after rent and EMI clear.',
      'Use a monthly report at month end to compare planned savings against actual spending pressure.',
    ],
    related: ['/monthly-financial-report', '/monthly-financial-report-template', '/budget-calculator', '/guides/how-to-create-monthly-budget'],
  },
  '/sample-trip-expense-report': {
    eyebrow: 'Sample Report',
    title: 'Sample Trip Expense Report',
    intro:
      'A realistic demo report showing shared trip payments, people included, payer balance, settlement direction, and review notes.',
    summary:
      'Four friends shared a weekend trip. Two people paid most hotel and fuel costs, while food and tickets were split across the group. The report separates the payment history from final settlement direction.',
    keyNumbers: [
      ['Trip total', 'Rs 28,400', 'Hotel, fuel, food, parking, and tickets'],
      ['People included', '4', 'Aarav, Neha, Rohan, Meera'],
      ['Equal share', 'Rs 7,100', 'Illustrative equal split'],
      ['Open settlement', 'Rs 6,850', 'Remaining reimbursements after one partial payment'],
    ],
    insights: [
      'Hotel and fuel made up most shared costs, so payer imbalance is concentrated around two transactions.',
      'Food payments were smaller but frequent, making notes important for trust and recall.',
      'The final settlement is easier to understand when each payment keeps payer and participant context.',
    ],
    recommendations: [
      'Confirm the people included in each large payment before settling.',
      'Keep one settlement note per reimbursement so the report shows what closed.',
      'Generate a trip report before the group chat loses payment context.',
    ],
    related: ['/trip-expense-splitter', '/trip-expense-report-template', '/trip-split-calculator', '/guides/how-to-split-trip-expenses'],
  },
  '/sample-settlement-report': {
    eyebrow: 'Sample Report',
    title: 'Sample Settlement Report',
    intro:
      'A realistic demo report showing who owes whom, what has already been paid, what remains open, and how the shared expense group closes.',
    summary:
      'The group has finished recording payments and only two reimbursements remain open. The settlement view keeps paid and pending items separate so closure is easy to verify.',
    keyNumbers: [
      ['Open reimbursements', '2', 'Two people still need to pay back'],
      ['Settled reimbursements', '3', 'Already marked as received'],
      ['Largest pending amount', 'Rs 2,450', 'Fuel and hotel balance'],
      ['Closure status', 'Review needed', 'Waiting for payment confirmation'],
    ],
    insights: [
      'The settlement report should not hide completed reimbursements because they explain why the open balance is lower.',
      'One large payer is still carrying most of the pending amount.',
      'A final review prevents accidental double payment when several people settle around the same time.',
    ],
    recommendations: [
      'Confirm each reimbursement outside the app before marking it settled.',
      'Share the settlement report with the group after the final payment.',
      'Keep notes short and specific: paid by, paid to, amount, and purpose.',
    ],
    related: ['/shared-expense-calculator', '/settlement-report-template', '/trip-split-calculator', '/guides/how-to-manage-shared-expenses'],
  },
  '/sample-bank-statement-analysis': {
    eyebrow: 'Sample Analysis',
    title: 'Sample Bank Statement Analysis',
    intro:
      'A realistic demo analysis showing statement scope, readable rows, category signals, review warnings, and recommendations.',
    summary:
      'A three-month sample statement shows stable salary credits, rising food and transfer activity, and several rows that should be reviewed before being used in a financial report.',
    keyNumbers: [
      ['Statement period', '3 months', 'Illustrative PDF/CSV review'],
      ['Readable rows', '186', 'Rows that could be categorized for review'],
      ['Money in', 'Rs 2,46,000', 'Salary and reimbursements'],
      ['Money out', 'Rs 1,91,750', 'Bills, transfers, shopping, food, and fuel'],
    ],
    insights: [
      'Recurring salary credits are consistent, which makes monthly comparison easier.',
      'Food and transfer rows need review because bank narration can hide the actual purpose.',
      'Statement analysis is strongest when detected categories are treated as review signals, not final truth.',
    ],
    recommendations: [
      'Review money-in and money-out direction before relying on totals.',
      'Confirm ambiguous merchant names and transfer rows.',
      'Use statement analysis as report input only after row-level review.',
    ],
    related: ['/bank-statement-analysis', '/bank-statement-analysis-template', '/guides/how-to-analyze-bank-statements', '/faq/analyze-bank-statements'],
  },
}

const sampleHub = {
  eyebrow: 'Sample Reports',
  title: 'Public report examples with sample data only.',
  intro:
    'These pages show output structure for monthly financial reports, trip expense reports, settlement reports, and statement analysis reports without exposing user data.',
  items: [...Object.keys(authoritySamplePages), ...Object.keys(samplePages)],
}

const authorityTemplatePages = {
  '/monthly-financial-report-template': {
    eyebrow: 'Template Library',
    title: 'Monthly Financial Report Template',
    intro:
      'Use this educational structure to organize a monthly financial report around summary, key numbers, spending context, insights, and next steps.',
    sections: [
      ['Executive summary', 'One paragraph covering month status, pressure points, and the main action needed.'],
      ['Key numbers', 'Income reviewed, fixed commitments, flexible spending, savings progress, and remaining flexibility.'],
      ['Spending context', 'Category movement, fixed versus flexible expenses, unusual rows, and recurring payments.'],
      ['Recommendations', 'Small next steps that can be checked next month without pretending to be financial advice.'],
    ],
    bestPractices: [
      'Separate fixed commitments from flexible spending.',
      'Call out data limitations and review assumptions.',
      'End with practical actions, not generic motivation.',
    ],
    related: ['/sample-monthly-financial-report', '/monthly-financial-report', '/budget-calculator', '/guides/how-to-generate-financial-reports'],
  },
  '/trip-expense-report-template': {
    eyebrow: 'Template Library',
    title: 'Trip Expense Report Template',
    intro:
      'Use this educational structure to document shared trip costs, people, payment history, balances, and settlement direction.',
    sections: [
      ['Trip summary', 'Trip name, dates, people included, total shared spend, and number of payments.'],
      ['Payment history', 'Amount, payer, people included, date, and short note for each shared payment.'],
      ['Balance view', 'Each person paid, each person share, and the difference that needs settlement.'],
      ['Settlement notes', 'Who pays whom, completed reimbursements, pending reimbursements, and final review status.'],
    ],
    bestPractices: [
      'Record payments as they happen.',
      'Include who participated in each payment.',
      'Review balances before asking people to settle.',
    ],
    related: ['/sample-trip-expense-report', '/trip-expense-splitter', '/trip-split-calculator', '/guides/how-to-split-trip-expenses'],
  },
  '/settlement-report-template': {
    eyebrow: 'Template Library',
    title: 'Settlement Report Template',
    intro:
      'Use this educational structure to close shared expense groups with open balances, paid reimbursements, and clear settlement notes.',
    sections: [
      ['Settlement status', 'Open, partially settled, or fully closed group status.'],
      ['Who owes whom', 'Receiver, payer, amount, shared group, and reason for the reimbursement.'],
      ['Completed settlements', 'Paid back entries that should remain visible for audit context.'],
      ['Closure checklist', 'Confirm payment, mark received, share final report, and archive the shared expense context.'],
    ],
    bestPractices: [
      'Do not remove settled payments from the story.',
      'Keep reimbursement direction plain.',
      'Confirm payment outside the report before marking it settled.',
    ],
    related: ['/sample-settlement-report', '/shared-expense-calculator', '/trip-split-calculator', '/guides/how-to-manage-shared-expenses'],
  },
  '/bank-statement-analysis-template': {
    eyebrow: 'Template Library',
    title: 'Bank Statement Analysis Template',
    intro:
      'Use this educational structure to review statement files with detected rows, category signals, totals, warnings, and recommendations.',
    sections: [
      ['Statement scope', 'Bank file type, period reviewed, readable rows, skipped rows, and review status.'],
      ['Movement summary', 'Money in, money out, transfers, recurring payments, and category signals.'],
      ['Review warnings', 'Ambiguous rows, category uncertainty, duplicate-looking entries, and unclear money direction.'],
      ['Recommendations', 'Rows to review, categories to confirm, and what to include in a final report.'],
    ],
    bestPractices: [
      'Treat detected categories as review signals.',
      'Check money-in and money-out direction before reporting.',
      'Keep raw files and sensitive details out of public examples.',
    ],
    related: ['/sample-bank-statement-analysis', '/bank-statement-analysis', '/guides/how-to-analyze-bank-statements', '/faq/analyze-bank-statements'],
  },
}

const calculatorPages = {
  '/trip-split-calculator': {
    eyebrow: 'Calculator',
    title: 'Trip Split Calculator',
    intro:
      'Estimate an equal trip split and simple payer difference without login, storage, or account data.',
    type: 'tripSplit',
    defaults: { total: 28400, people: 4, paid: 12000 },
    labels: ['Total shared trip cost', 'People sharing', 'Amount one person paid'],
    explanation:
      'Use this when a group wants a quick estimate before creating a full trip expense report. It is a public estimate, not a saved group record.',
    related: ['/trip-expense-splitter', '/sample-trip-expense-report', '/trip-expense-report-template', '/guides/how-to-split-trip-expenses'],
  },
  '/emi-calculator': {
    eyebrow: 'Calculator',
    title: 'EMI Calculator',
    intro:
      'Estimate monthly EMI, total payment, and interest from loan amount, annual rate, and tenure.',
    type: 'emi',
    defaults: { principal: 250000, rate: 11, months: 24 },
    labels: ['Loan amount', 'Annual interest rate', 'Tenure in months'],
    explanation:
      'Use this as a planning estimate before comparing loan offers. Actual lender terms, fees, taxes, and repayment rules can differ.',
    related: ['/budget-planner', '/budget-calculator', '/monthly-financial-report-template', '/faq/monthly-budget'],
  },
  '/budget-calculator': {
    eyebrow: 'Calculator',
    title: 'Budget Calculator',
    intro:
      'Estimate monthly remaining money after income, fixed bills, flexible spending, and savings target.',
    type: 'budget',
    defaults: { income: 82000, fixed: 38500, flexible: 24850, savings: 12000 },
    labels: ['Monthly income', 'Fixed bills', 'Flexible spending', 'Savings target'],
    explanation:
      'Use this to understand a month at a glance. For deeper tracking, FBPly connects budget planning with reports and reviewed activity.',
    related: ['/budget-planner', '/sample-monthly-financial-report', '/monthly-financial-report-template', '/guides/how-to-create-monthly-budget'],
  },
  '/savings-goal-calculator': {
    eyebrow: 'Calculator',
    title: 'Savings Goal Calculator',
    intro:
      'Estimate how many months a goal may take from target amount, current savings, and monthly contribution.',
    type: 'savings',
    defaults: { target: 120000, current: 30000, monthly: 10000 },
    labels: ['Goal amount', 'Current savings', 'Monthly contribution'],
    explanation:
      'Use this for a quick savings timeline estimate. It does not store the goal or connect to private FBPly savings data.',
    related: ['/budget-planner', '/budget-calculator', '/sample-monthly-financial-report', '/faq/track-recurring-expenses'],
  },
}

const guidePages = {
  '/guides/how-to-split-trip-expenses': {
    eyebrow: 'Guide',
    title: 'How to Split Trip Expenses',
    intro:
      'A clear trip split starts with recording who paid, who participated, what the payment covered, and when the group should settle.',
    what: 'Trip expense splitting divides shared travel costs between people in a way that can be reviewed later.',
    why: 'It prevents memory-based disputes and turns many small payments into one understandable settlement view.',
    who: 'Friends, families, couples, roommates, and teams sharing hotels, fuel, food, tickets, or group activities.',
    steps: [
      'Create one shared trip group before payments scatter across chats.',
      'Record payer, amount, people included, date, and a short note for each shared payment.',
      'Review whether every person participated in every payment.',
      'Calculate balances and confirm reimbursement direction.',
      'Generate or share a trip expense report after the group agrees.',
    ],
    examples: [
      'Hotel split between all travelers.',
      'Fuel paid by one person but used by everyone.',
      'Dinner paid by two people where one friend was absent.',
    ],
    related: ['/trip-expense-splitter', '/trip-split-calculator', '/sample-trip-expense-report', '/trip-expense-report-template'],
  },
  '/guides/how-to-analyze-bank-statements': {
    eyebrow: 'Guide',
    title: 'How to Analyze Bank Statements',
    intro:
      'Statement analysis should summarize readable rows while keeping uncertain categories and money direction open for review.',
    what: 'Bank statement analysis turns statement rows into totals, category signals, and review notes.',
    why: 'Statements contain useful patterns, but bank narration can be unclear. Review keeps the report trustworthy.',
    who: 'People preparing a monthly review, checking spending categories, or creating a statement analysis report.',
    steps: [
      'Choose the statement period before importing or reviewing files.',
      'Separate money-in, money-out, transfers, fees, and unclear rows.',
      'Review category guesses instead of treating them as final.',
      'Check duplicate-looking rows and unusual merchant names.',
      'Use the final reviewed summary in a statement analysis report.',
    ],
    examples: [
      'Three salary credits across a quarter.',
      'Food delivery rows grouped separately from groceries.',
      'Transfers reviewed before being counted as spending.',
    ],
    related: ['/bank-statement-analysis', '/sample-bank-statement-analysis', '/bank-statement-analysis-template', '/faq/analyze-bank-statements'],
  },
  '/guides/how-to-create-monthly-budget': {
    eyebrow: 'Guide',
    title: 'How to Create a Monthly Budget',
    intro:
      'A useful monthly budget explains committed money, flexible spending, savings goals, and what can safely change during the month.',
    what: 'A monthly budget is a plan for income, fixed commitments, variable expenses, savings, and upcoming decisions.',
    why: 'It helps you spot pressure before the month gets tight and gives reports clearer context.',
    who: 'Anyone with recurring bills, planned purchases, shared expenses, or savings goals to balance.',
    steps: [
      'Start with monthly income and predictable recurring commitments.',
      'Separate fixed bills from flexible spending.',
      'Set a savings target before discretionary spending expands.',
      'Review upcoming payments and shared costs.',
      'Use a report at month end to compare plan against reality.',
    ],
    examples: [
      'Rent, utilities, and EMI as fixed commitments.',
      'Food, fuel, and shopping as flexible categories.',
      'Emergency fund and travel fund as separate savings goals.',
    ],
    related: ['/budget-planner', '/budget-calculator', '/sample-monthly-financial-report', '/monthly-financial-report-template'],
  },
  '/guides/how-to-manage-shared-expenses': {
    eyebrow: 'Guide',
    title: 'How to Manage Shared Expenses',
    intro:
      'Shared expenses are easier to manage when payment history, people included, balances, and settlement status stay connected.',
    what: 'Shared expense management records costs paid by one person for multiple people and tracks how they settle.',
    why: 'It keeps personal spending separate from group balances and prevents incomplete reimbursements.',
    who: 'Roommates, partners, friends, families, and small teams sharing recurring or one-time costs.',
    steps: [
      'Create one group for the shared purpose.',
      'Record every shared payment with payer and people included.',
      'Review balances before asking for reimbursement.',
      'Mark settlements only after payment confirmation.',
      'Keep a settlement report for closure.',
    ],
    examples: [
      'Roommate groceries and household supplies.',
      'Event tickets paid by one person.',
      'Cab and meal payments across a group outing.',
    ],
    related: ['/shared-expense-calculator', '/sample-settlement-report', '/settlement-report-template', '/trip-split-calculator'],
  },
  '/guides/how-to-generate-financial-reports': {
    eyebrow: 'Guide',
    title: 'How to Generate Financial Reports',
    intro:
      'Good financial reports start with reviewed data and end with clear summary, key numbers, insights, and next actions.',
    what: 'A financial report organizes financial activity into a readable structure for review and decision support.',
    why: 'Reports make patterns visible and help explain a month, trip, settlement, or statement without raw transaction overload.',
    who: 'People reviewing monthly spending, shared trips, reimbursements, or statement activity.',
    steps: [
      'Choose the report type: monthly, trip, settlement, or statement analysis.',
      'Review the data that will appear in the report.',
      'Summarize key numbers before adding interpretation.',
      'Separate insights from recommendations.',
      'Keep disclaimers and data limits visible.',
    ],
    examples: [
      'Monthly financial report after all bills clear.',
      'Trip expense report after a weekend group trip.',
      'Statement analysis report after reviewing PDF or CSV rows.',
    ],
    related: ['/monthly-financial-report', '/sample-monthly-financial-report', '/monthly-financial-report-template', '/faq/generate-financial-reports'],
  },
}

const publicPages = {
  ...landingPages,
  '/faq': faqHub,
  ...faqPages,
  ...templatePages,
  ...authorityTemplatePages,
  ...calculatorPages,
  ...guidePages,
  '/sample-reports': sampleHub,
  ...samplePages,
  ...authoritySamplePages,
}

function buildFaqSchema(path, faqs = []) {
  if (!faqs.length) {
    return null
  }

  return {
    '@type': 'FAQPage',
    '@id': `${siteOrigin}${path}#faq`,
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

function formatAmount(value) {
  const number = Number.isFinite(value) ? value : 0
  return `Rs ${Math.round(number).toLocaleString('en-IN')}`
}

function parseNumber(value) {
  return Math.max(Number(value || 0), 0)
}

function AuthorityLinksBand() {
  return (
    <section className="seo-band seo-authority-band" aria-label="FBPly authority resources">
      <div className="seo-section-heading">
        <p className="eyebrow">Authority Layer</p>
        <h2>Calculators, templates, guides, and proof pages</h2>
      </div>
      <div className="seo-flow-row">
        {authorityLinks.map((link) => (
          <a href={link.href} key={link.href}>
            <FileText size={15} aria-hidden="true" />
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

function SampleReportShowcasePage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band seo-report-showcase" aria-labelledby="sample-executive-summary">
        <div className="seo-section-heading">
          <p className="eyebrow">Executive Summary</p>
          <h2 id="sample-executive-summary">What this demo report shows</h2>
        </div>
        <p className="seo-lede">{page.summary}</p>
        <div className="seo-sample-stats">
          {page.keyNumbers.map(([label, value, note]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Insights</p>
          <h2>Readable findings</h2>
        </div>
        <div className="seo-report-preview">
          {page.insights.map((insight) => (
            <article key={insight}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <p>{insight}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Recommendations</p>
          <h2>Practical next steps</h2>
        </div>
        <div className="seo-card-grid">
          {page.recommendations.map((item, index) => (
            <article className="seo-mini-card" key={item}>
              <span>{index + 1}</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-band seo-trust-band">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>Demo numbers are illustrative only. No public sample report contains private user data.</p>
      </section>
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

function AuthorityTemplatePage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Template Sections</p>
          <h2>Recommended structure</h2>
        </div>
        <div className="seo-report-preview">
          {page.sections.map(([title, body]) => (
            <article key={title}>
              <span>{title}</span>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Best Practices</p>
          <h2>How to keep the report trustworthy</h2>
        </div>
        <div className="seo-card-grid">
          {page.bestPractices.map((item) => (
            <article className="seo-mini-card" key={item}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

function CalculatorPage({ page, path }) {
  const [inputs, setInputs] = useState(page.defaults)
  const hasTrackedUsageRef = useRef(false)
  const result = useMemo(() => {
    if (page.type === 'tripSplit') {
      const total = parseNumber(inputs.total)
      const people = Math.max(parseNumber(inputs.people), 1)
      const paid = parseNumber(inputs.paid)
      const share = total / people
      return [
        ['Equal share per person', formatAmount(share)],
        ['Payer difference', formatAmount(paid - share)],
        ['Group total', formatAmount(total)],
      ]
    }

    if (page.type === 'emi') {
      const principal = parseNumber(inputs.principal)
      const months = Math.max(parseNumber(inputs.months), 1)
      const monthlyRate = parseNumber(inputs.rate) / 12 / 100
      const emi = monthlyRate > 0
        ? (principal * monthlyRate * ((1 + monthlyRate) ** months)) / (((1 + monthlyRate) ** months) - 1)
        : principal / months
      const totalPayment = emi * months
      return [
        ['Estimated EMI', formatAmount(emi)],
        ['Total payment', formatAmount(totalPayment)],
        ['Estimated interest', formatAmount(totalPayment - principal)],
      ]
    }

    if (page.type === 'budget') {
      const income = parseNumber(inputs.income)
      const used = parseNumber(inputs.fixed) + parseNumber(inputs.flexible) + parseNumber(inputs.savings)
      return [
        ['Estimated remaining', formatAmount(income - used)],
        ['Planned spending and savings', formatAmount(used)],
        ['Income reviewed', formatAmount(income)],
      ]
    }

    const target = parseNumber(inputs.target)
    const current = parseNumber(inputs.current)
    const monthly = Math.max(parseNumber(inputs.monthly), 1)
    const remaining = Math.max(target - current, 0)
    const months = Math.ceil(remaining / monthly)
    return [
      ['Estimated timeline', `${months} month${months === 1 ? '' : 's'}`],
      ['Remaining amount', formatAmount(remaining)],
      ['Monthly contribution', formatAmount(monthly)],
    ]
  }, [inputs, page.type])

  const entries = Object.entries(page.defaults)
  const trackCalculatorInput = (key) => {
    if (hasTrackedUsageRef.current) {
      return
    }

    hasTrackedUsageRef.current = true
    trackEvent(calculatorUsageEvents[page.type] || 'calculator_usage', {
      surface: 'public_seo',
      calculator_type: page.type,
      path,
      field: key,
    })
    trackFeatureUsage('calculator_used', {
      surface: 'public_seo',
      calculator_type: page.type,
      path,
    })
  }

  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band seo-calculator-band">
        <div className="seo-section-heading">
          <p className="eyebrow">No Login Required</p>
          <h2>Quick public estimate</h2>
        </div>
        <p className="seo-lede">{page.explanation}</p>
        <div className="seo-calculator-grid">
          <form className="seo-calculator-form">
            {entries.map(([key], index) => (
              <label key={key}>
                <span>{page.labels[index]}</span>
                <input
                  min="0"
                  inputMode="decimal"
                  type="number"
                  value={inputs[key]}
                  onChange={(event) => {
                    trackCalculatorInput(key)
                    setInputs((current) => ({ ...current, [key]: event.target.value }))
                  }}
                />
              </label>
            ))}
          </form>
          <div className="seo-calculator-result" aria-live="polite">
            {result.map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="seo-band seo-trust-band">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>Calculator values are page-only estimates. They are not saved, sent to Supabase, or added to private FBPly data.</p>
      </section>
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

function GuidePage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band seo-answer-band">
        <div className="seo-section-heading">
          <p className="eyebrow">What, Why, Who</p>
          <h2>Quick answer</h2>
        </div>
        <div className="seo-info-grid">
          <article>
            <span>What</span>
            <p>{page.what}</p>
          </article>
          <article>
            <span>Why</span>
            <p>{page.why}</p>
          </article>
          <article>
            <span>Who</span>
            <p>{page.who}</p>
          </article>
        </div>
      </section>
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">How</p>
          <h2>Step-by-step guide</h2>
        </div>
        <div className="seo-card-grid">
          {page.steps.map((step, index) => (
            <article className="seo-mini-card" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Examples</p>
          <h2>Where this applies</h2>
        </div>
        <div className="seo-report-preview">
          {page.examples.map((example) => (
            <article key={example}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <p>{example}</p>
            </article>
          ))}
        </div>
      </section>
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

function RelatedLinks({ links = [] }) {
  const uniqueLinks = Array.from(new Set(links))

  if (!uniqueLinks.length) {
    return null
  }

  return (
    <section className="seo-band seo-related-band" aria-labelledby="related-pages-title">
      <div className="seo-section-heading">
        <p className="eyebrow">Related</p>
        <h2 id="related-pages-title">Continue through FBPly</h2>
      </div>
      <div className="seo-related-grid">
        {uniqueLinks.map((href) => {
          const meta = getSeoMetaForPath(href)
          return (
            <a className="seo-related-link" href={href} key={href}>
              <span>{meta.breadcrumbLabel}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </a>
          )
        })}
      </div>
    </section>
  )
}

function WorkflowLinks({ currentPath }) {
  return (
    <section className="seo-band seo-workflow-band" aria-label="FBPly internal workflow">
      <div className="seo-section-heading">
        <p className="eyebrow">Workflow</p>
        <h2>Expense tracking to budget awareness</h2>
      </div>
      <div className="seo-flow-row">
        {workflowLinks.map((link, index) => {
          const Icon = link.icon
          return (
            <a className={currentPath === link.href ? 'active' : ''} href={link.href} key={link.href}>
              <Icon size={16} aria-hidden="true" />
              <span>{link.label}</span>
              {index < workflowLinks.length - 1 && <ChevronRight size={15} aria-hidden="true" />}
            </a>
          )
        })}
      </div>
    </section>
  )
}

function SeoHeader({ page }) {
  return (
    <header className="seo-hero">
      <nav className="seo-top-nav" aria-label="Public FBPly navigation">
        <a className="seo-logo-link" href="/">
          <HeaderLogo />
        </a>
        <div>
          <a href="/budget-planner">Budget Planner</a>
          <a href="/expense-tracker">Expense Tracker</a>
          <a href="/daily-expense-book">Daily Book</a>
          <a href="/trip-expense-splitter">Trip Splitter</a>
          <a href="/budget-calculator">Calculators</a>
          <a href="/sample-monthly-financial-report">Samples</a>
          <a href="/faq">FAQ</a>
        </div>
      </nav>
      <div className="seo-hero-grid">
        <div className="seo-hero-copy">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
          <p className="seo-positioning-answer">
            FBPly is a budget planner, expense tracker, daily expense book, financial report
            generator, and bank statement analyzer.
          </p>
          <div className="seo-identity-tags" aria-label="FBPly core use cases">
            <span>Budget Planner</span>
            <span>Expense Tracker</span>
            <span>Daily Expense Book</span>
            <span>Personal Spending Tracking</span>
            <span>Trip Expense Splitter</span>
            <span>Financial Report Generator</span>
            <span>Bank Statement Analyzer</span>
          </div>
          <div className="seo-hero-actions">
            <a className="primary-button seo-primary-link" href="/">
              Open FBPly
              <ChevronRight size={18} aria-hidden="true" />
            </a>
            <a className="ghost-button seo-secondary-link" href="/sample-reports">
              View samples
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

function LandingPage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band seo-answer-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Answer</p>
          <h2>What problem does this solve?</h2>
        </div>
        <p className="seo-lede">{page.answer}</p>
        <div className="seo-info-grid">
          <article>
            <span>Who</span>
            <p>{page.who}</p>
          </article>
          <article>
            <span>Why</span>
            <p>{page.problems.join(' ')}</p>
          </article>
          <article>
            <span>When</span>
            <p>Use it before a purchase, during the month, before settlement, and while preparing a report.</p>
          </article>
        </div>
      </section>

      <section className="seo-band seo-steps-band">
        <div className="seo-section-heading">
          <p className="eyebrow">How</p>
          <h2>How FBPly helps</h2>
        </div>
        <div className="seo-card-grid">
          {page.how.map((step, index) => (
            <article className="seo-mini-card" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-band seo-examples-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Examples</p>
          <h2>Useful situations</h2>
        </div>
        <div className="seo-card-grid">
          {page.examples.map((example) => (
            <article className="seo-mini-card" key={example}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <p>{example}</p>
            </article>
          ))}
        </div>
        <div className="seo-benefit-strip">
          {page.benefits.map((benefit) => (
            <span key={benefit}>{benefit}</span>
          ))}
        </div>
      </section>

      <FaqSection faqs={page.faqs} />
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

function FaqSection({ faqs = [] }) {
  if (!faqs.length) {
    return null
  }

  return (
    <section className="seo-band seo-faq-band" aria-labelledby="page-faq-title">
      <div className="seo-section-heading">
        <p className="eyebrow">FAQ</p>
        <h2 id="page-faq-title">Common questions</h2>
      </div>
      <div className="seo-faq-list">
        {faqs.map((item) => (
          <details
            key={item.question}
            onToggle={(event) => {
              if (event.currentTarget.open) {
                trackEvent('faq_opened', {
                  surface: 'public_seo',
                  question_length: item.question.length,
                })
              }
            }}
          >
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function HubPage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Explore</p>
          <h2>{path === '/faq' ? 'FAQ topics' : 'Sample report pages'}</h2>
        </div>
        <div className="seo-card-grid">
          {page.items.map((href) => {
            const meta = getSeoMetaForPath(href)
            return (
              <a className="seo-topic-card" href={href} key={href}>
                <FileText size={18} aria-hidden="true" />
                <span>{meta.breadcrumbLabel}</span>
                <p>{meta.description}</p>
              </a>
            )
          })}
        </div>
      </section>
      <FaqSection faqs={page.faqs} />
      <WorkflowLinks currentPath={path} />
    </>
  )
}

function FaqPage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <FaqSection faqs={page.faqs} />
      <section className="seo-band seo-answer-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Context</p>
          <h2>How this fits inside FBPly</h2>
        </div>
        <p className="seo-lede">
          FBPly connects budget planning, shared expenses, recurring commitments, statement review, and report
          generation so each money decision has context instead of isolated totals.
        </p>
      </section>
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

function TemplatePage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Structure</p>
          <h2>Sample template sections</h2>
        </div>
        <div className="seo-report-preview">
          {page.sections.map(([title, body]) => (
            <article key={title}>
              <span>{title}</span>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-band seo-trust-band">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>Template pages are public information only. They do not expose private report data.</p>
      </section>
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

function SamplePage({ page, path }) {
  return (
    <>
      <SeoHeader page={page} />
      <section className="seo-band">
        <div className="seo-section-heading">
          <p className="eyebrow">Sample Output</p>
          <h2>Illustrative report snapshot</h2>
        </div>
        <div className="seo-sample-stats">
          {page.stats.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <div className="seo-report-preview">
          {page.notes.map((note) => (
            <article key={note}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-band seo-trust-band">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>This is a sample structure with illustrative data only. It is designed to show report quality without using user data.</p>
      </section>
      <WorkflowLinks currentPath={path} />
      <RelatedLinks links={page.related} />
    </>
  )
}

export default function PublicSeoScreen({ currentPath }) {
  const path = normalizeSeoPath(currentPath)
  const page = publicPages[path] || landingPages['/budget-planner']
  const meta = getSeoMetaForPath(path)

  useEffect(() => {
    const faqSchema = buildFaqSchema(path, page.faqs)
    applySeoMetadata(path, undefined, faqSchema ? [faqSchema] : [])
  }, [page.faqs, path])

  useEffect(() => {
    trackPublicPageView(path, meta.type, {
      page_label: meta.breadcrumbLabel,
    })
  }, [meta.breadcrumbLabel, meta.type, path])

  const trackPublicNavigation = useCallback((event) => {
    const anchor = event.target.closest?.('a[href]')

    if (!anchor) {
      return
    }

    let targetPath = anchor.getAttribute('href') || ''

    try {
      targetPath = new URL(anchor.href).pathname
    } catch {
      targetPath = normalizeSeoPath(targetPath)
    }

    trackEvent('public_internal_link_clicked', {
      surface: 'public_seo',
      from_path: path,
      to_path: targetPath,
      link_text_length: anchor.textContent?.trim().length || 0,
    })
  }, [path])

  return (
    <main className="seo-page-shell" onClick={trackPublicNavigation}>
      {landingPages[path] && <LandingPage page={page} path={path} />}
      {(path === '/faq' || path === '/sample-reports') && <HubPage page={page} path={path} />}
      {faqPages[path] && <FaqPage page={page} path={path} />}
      {templatePages[path] && <TemplatePage page={page} path={path} />}
      {authorityTemplatePages[path] && <AuthorityTemplatePage page={page} path={path} />}
      {calculatorPages[path] && <CalculatorPage page={page} path={path} />}
      {guidePages[path] && <GuidePage page={page} path={path} />}
      {samplePages[path] && <SamplePage page={page} path={path} />}
      {authoritySamplePages[path] && <SampleReportShowcasePage page={page} path={path} />}
      <AuthorityLinksBand />
      <footer className="seo-footer">
        <HeaderLogo />
        <nav aria-label="Public trust links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/disclaimer">Disclaimer</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
      </footer>
    </main>
  )
}
