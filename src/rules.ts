import { siteNav } from './nav.ts'
import { capture } from './analytics'

const API_BASE = 'https://api.welcometotheaijungle.com'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function categoryDescription(category: string): string {
  if (category === 'dev') return 'Default for worker, ledger, API, and general code changes.'
  if (category === 'copy') return 'Copy, objections, burns, and changes to the human path.'
  if (category === 'seo') return 'Search metadata, social previews, sitemaps, and llms.txt.'
  if (category === 'design') return 'CSS, styles, layout, and visual interaction changes.'
  if (category === 'business') return 'Offer, pricing, and business model changes.'
  if (category === 'qa') return 'Bug fixes and work that improves verification.'
  return 'Work that does not match a more specific category yet.'
}

function renderCategoryRules(categories: string[]): string {
  return categories.map((category) => `<div><dt>${escapeHtml(category)}</dt><dd>${escapeHtml(categoryDescription(category))}</dd></div>`).join('')
}

export function renderRules(root: HTMLElement): void {
  root.innerHTML = `<main class="rules-page"><div class="site-shell">${siteNav('light')}<header class="rules-hero"><p class="eyebrow">THE BOARD · RULES</p><h1>Useful work earns rank.</h1><p class="business-intro">You cannot pay to rank here. You can only be useful.</p></header><div class="rules-grid"><section><p class="eyebrow">THE CLASSES</p><h2>Four ways to contribute.</h2><dl><div><dt>50 LP</dt><dd>Merged community PR</dd></div><div><dt>15 LP</dt><dd>Accepted burn</dd></div><div><dt>10 LP</dt><dd>Accepted mutation or feedback</dd></div><div><dt>1 LP</dt><dd>Visitor brought by a share, capped at 20 per day per ref</dd></div></dl></section><section><p class="eyebrow">THE CATEGORIES</p><h2>Six ways to find the useful work.</h2><dl data-category-rules><div><dd>Reading the category rules...</dd></div></dl></section><section><p class="eyebrow">THE TIEBREAKER</p><h2>Oldest acceptance wins.</h2><p>Leverage Points come only from contributions accepted through the ledger. A measured impact multiplier from 1 to 3 is reserved for a later version and is not used here.</p><p>Rejected slop counts for nothing. Links pass through the same human review.</p><p>Authors choose a GitHub <code>cat:category</code> label first. Otherwise the mutation type sets the category, then changed files provide the fallback.</p></section><section><p class="eyebrow">THE ARC</p><h2>A race with an ending.</h2><p>At the announcement of the results, the prize pays out to the all-time top three. Then this race becomes the permanent Founding Contributors wall of the living site.</p><p>The daily winner gets the visibility of the build-in-public artifact. The useful thing you made stays in the organism.</p></section></div><a class="button button-primary" href="/board">Back to the board →</a><footer class="site-footer"><strong>Human-directed, AI-executed.</strong><a href="/board">The Board</a><a href="/">Play the Living Pitch →</a><a href="/roast">Roast my site</a></footer></div></main>`
  const target = root.querySelector<HTMLElement>('[data-category-rules]')
  void fetch(`${API_BASE}/board`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    .then(async (response) => {
      const payload: unknown = await response.json()
      if (!response.ok || !isRecord(payload) || !Array.isArray(payload.categories)) throw new Error(`Rules request failed with ${response.status}`)
      const categories = payload.categories.filter((category): category is string => typeof category === 'string' && category.length > 0)
      if (target) target.innerHTML = renderCategoryRules(categories)
      capture('rules_view', { categories: categories.length })
    })
    .catch((error: unknown) => {
      if (target) target.innerHTML = '<div><dd>The category rules are temporarily unreadable.</dd></div>'
      capture('rules_view', { ok: false, error: String(error) })
    })
}
