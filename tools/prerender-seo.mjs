import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  buildStructuredDataForPath,
  getSeoMetaForPath,
  legalSeoPages,
  seoRouteMeta,
} from '../src/lib/seoRoutes.js'
import { getPublicRouteContent, qualityUpdatedDate } from '../src/lib/publicRouteContent.js'

const distDir = path.resolve('dist')
const indexHtmlPath = path.join(distDir, 'index.html')
const seoPaths = Array.from(new Set([
  ...Object.keys(seoRouteMeta),
  ...Object.keys(legalSeoPages),
])).sort((first, second) => first.length - second.length || first.localeCompare(second))

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`Could not find ${label} in dist/index.html`)
  }

  return html.replace(pattern, replacement)
}

function setMetaName(html, name, content) {
  return replaceRequired(
    html,
    new RegExp(`<meta\\s+name="${name}"[\\s\\S]*?>`, 'i'),
    `<meta name="${name}" content="${escapeHtml(content)}" />`,
    `meta[name="${name}"]`,
  )
}

function setMetaProperty(html, property, content) {
  return replaceRequired(
    html,
    new RegExp(`<meta\\s+property="${property}"[\\s\\S]*?>`, 'i'),
    `<meta property="${property}" content="${escapeHtml(content)}" />`,
    `meta[property="${property}"]`,
  )
}

function buildStaticList(items = []) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')
}

function buildStaticCards(items = []) {
  return items.map((item, index) => `
          <article class="seo-mini-card">
            <span>${index + 1}</span>
            <p>${escapeHtml(item)}</p>
          </article>`).join('')
}

function buildStaticLinks(links = []) {
  return links.map((link) => `
          <a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')
}

function buildStaticRouteContent(routePath, meta) {
  const content = getPublicRouteContent(routePath, meta)

  return `
    <main class="seo-page-shell static-seo-shell" data-static-route="${escapeHtml(routePath)}">
      <header class="seo-hero static-seo-hero">
        <nav class="seo-top-nav" aria-label="Public FBPly navigation">
          <a class="seo-logo-link" href="/">FBPly</a>
          <div>
            <a href="/budget-planner">Budget Planner</a>
            <a href="/expense-tracker">Expense Tracker</a>
            <a href="/daily-expense-book">Daily Book</a>
            <a href="/monthly-financial-report">Reports</a>
            <a href="/faq">FAQ</a>
          </div>
        </nav>
        <div class="seo-hero-grid">
          <div class="seo-hero-copy">
            <p class="eyebrow">${escapeHtml(meta.breadcrumbLabel || 'FBPly')}</p>
            <h1>${escapeHtml(meta.title)}</h1>
            <p>${escapeHtml(meta.description)}</p>
            <p class="seo-positioning-answer">
              FBPly is a budget planner, expense tracker, daily expense book, shared expense calculator,
              trip expense splitter, financial report generator, and bank statement analyzer.
            </p>
          </div>
        </div>
      </header>
      <section class="seo-band seo-answer-band">
        <div class="seo-section-heading">
          <p class="eyebrow">${escapeHtml(content.eyebrow)}</p>
          <h2>${escapeHtml(content.heading)}</h2>
        </div>
        <p class="seo-lede">${escapeHtml(content.summary)}</p>
        <div class="seo-card-grid">
${buildStaticCards(content.points)}
        </div>
      </section>
      <section class="seo-band">
        <div class="seo-section-heading">
          <p class="eyebrow">Page quality checks</p>
          <h2>Why this page is useful</h2>
        </div>
        <ul class="static-seo-list">
${buildStaticList(content.checks)}
        </ul>
      </section>
      <section class="seo-band seo-authority-band">
        <div class="seo-section-heading">
          <p class="eyebrow">Explore FBPly</p>
          <h2>Public resources and trust pages</h2>
        </div>
        <div class="seo-flow-row">
${buildStaticLinks(content.links)}
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/disclaimer">Disclaimer</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </div>
        <p class="seo-lede">Content reviewed ${escapeHtml(qualityUpdatedDate)}. Public samples use illustrative data only and do not expose private user records.</p>
      </section>
    </main>`
}

function buildSeoHtml(baseHtml, routePath) {
  const meta = getSeoMetaForPath(routePath)
  const structuredData = JSON.stringify(buildStructuredDataForPath(routePath), null, 2)
    .replace(/</g, '\\u003c')

  let html = baseHtml

  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`, 'title')
  html = setMetaName(html, 'description', meta.description)
  html = replaceRequired(
    html,
    /<link\s+rel="canonical"[\s\S]*?>/i,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    'canonical link',
  )
  html = setMetaProperty(html, 'og:url', meta.canonical)
  html = setMetaProperty(html, 'og:title', meta.title)
  html = setMetaProperty(html, 'og:description', meta.description)
  html = setMetaName(html, 'twitter:title', meta.title)
  html = setMetaName(html, 'twitter:description', meta.description)
  html = replaceRequired(
    html,
    /<script\s+type="application\/ld\+json"\s+id="fbply-jsonld">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="fbply-jsonld">\n${structuredData}\n    </script>`,
    'JSON-LD script',
  )
  html = replaceRequired(
    html,
    /<div\s+id="root"><\/div>/i,
    `<div id="root">${buildStaticRouteContent(routePath, meta)}\n    </div>`,
    'root static content',
  )

  return html
}

function makeNestedRouteSafe(html) {
  return html.replace(/(href|src)="\.\//g, '$1="/')
}

async function writeRouteHtml(routePath, html) {
  if (routePath === '/') {
    await writeFile(indexHtmlPath, html)
    return
  }

  const cleanRoute = routePath.replace(/^\/+/, '')
  const htmlFilePath = path.join(distDir, `${cleanRoute}.html`)
  const directoryIndexPath = path.join(distDir, cleanRoute, 'index.html')
  const routeHtml = makeNestedRouteSafe(html)

  await mkdir(path.dirname(htmlFilePath), { recursive: true })
  await mkdir(path.dirname(directoryIndexPath), { recursive: true })
  await writeFile(htmlFilePath, routeHtml)
  await writeFile(directoryIndexPath, routeHtml)
}

const baseHtml = await readFile(indexHtmlPath, 'utf8')

for (const routePath of seoPaths) {
  await writeRouteHtml(routePath, buildSeoHtml(baseHtml, routePath))
}

console.log(`Prerendered ${seoPaths.length} SEO HTML route shells.`)
