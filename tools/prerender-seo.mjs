import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  buildStructuredDataForPath,
  getSeoMetaForPath,
  legalSeoPages,
  seoRouteMeta,
} from '../src/lib/seoRoutes.js'

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
