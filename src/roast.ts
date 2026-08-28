import { capture } from './analytics.ts'

export type RoastIntensity = 'gentle' | 'honest' | 'scorched'
export type RoastBurn = { text: string; receipt: string; territory: 'pipeline' | 'follow-through' | 'speed' | 'memory' | 'cash' }
export type RoastResult = { burns: RoastBurn[]; severity: number; cached: boolean; pivot: { line: string; cta: string } }

const API_BASE = 'https://api.welcometotheaijungle.com'
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIntensity(value: unknown): value is RoastIntensity {
  return value === 'gentle' || value === 'honest' || value === 'scorched'
}

function isTerritory(value: unknown): value is RoastBurn['territory'] {
  return value === 'pipeline' || value === 'follow-through' || value === 'speed' || value === 'memory' || value === 'cash'
}

function readResult(value: unknown): RoastResult {
  if (!isRecord(value) || !Array.isArray(value.burns) || typeof value.severity !== 'number' || typeof value.cached !== 'boolean' || !isRecord(value.pivot)) throw new Error('The roast service returned an invalid result.')
  const burns: RoastBurn[] = []
  for (const item of value.burns) {
    if (!isRecord(item) || typeof item.text !== 'string' || typeof item.receipt !== 'string' || !isTerritory(item.territory)) throw new Error('The roast service returned an invalid burn.')
    const territory = item.territory
    burns.push({ text: item.text, receipt: item.receipt, territory })
  }
  if (burns.length === 0 || typeof value.pivot.line !== 'string' || typeof value.pivot.cta !== 'string') throw new Error('The roast service returned an incomplete result.')
  return { burns, severity: Math.max(0, Math.min(100, Math.round(value.severity))), cached: value.cached, pivot: { line: value.pivot.line, cta: value.pivot.cta } }
}

export async function requestRoast(input: { domain: string; intensity: RoastIntensity }): Promise<RoastResult> {
  const response = await fetch(`${API_BASE}/roast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(70000),
  })
  const payload: unknown = await response.json()
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'The roast service is unavailable.'
    throw new Error(message)
  }
  return readResult(payload)
}

function resultMarkup(result: RoastResult, domain: string): string {
  const burns = result.burns.map((burn, index) => `<article class="roast-burn"><div class="roast-burn-top"><span class="roast-number">0${index + 1}</span><span class="roast-territory">${escapeHtml(burn.territory)}</span></div><p class="roast-text">${escapeHtml(burn.text)}</p><blockquote class="roast-receipt"><span>RECEIPT · EXACT OBSERVATION</span><strong>“${escapeHtml(burn.receipt)}”</strong></blockquote></article>`).join('')
  return `<section class="roast-results"><div class="roast-score"><div><p class="eyebrow">ROAST SEVERITY SCORE</p><strong>${result.severity}</strong><span>/100</span></div><small>${result.cached ? 'Cached from the last 24 hours.' : 'Freshly observed and checked.'}</small></div><div class="roast-burns">${burns}</div><section class="roast-pivot"><p class="eyebrow">THE PIVOT</p><h2>${escapeHtml(result.pivot.line)}</h2><a class="button button-primary" data-action="roast-pivot" href="/?roast_domain=${encodeURIComponent(domain)}">${escapeHtml(result.pivot.cta)} →</a></section></section>`
}

export function stageAgentRoast(result: RoastResult): void {
  const root = document.querySelector<HTMLElement>('#app')
  if (!root) return
  root.querySelector('.agent-roast-stage')?.remove()
  const burns = result.burns.map((burn) => `<li><span>${escapeHtml(burn.text)}</span><strong>Receipt: “${escapeHtml(burn.receipt)}”</strong></li>`).join('')
  root.insertAdjacentHTML('beforeend', `<section class="agent-roast-stage"><p class="eyebrow">AGENT CHANNEL · GORIA</p><h2>Your agent asked for a roast of your own site. Brave.</h2><p>Severity: <strong>${result.severity}/100</strong></p><ol>${burns}</ol><p class="muted">Every burn above is backed by an exact observation.</p></section>`)
}

export function renderRoast(root: HTMLElement): () => void {
  let intensity: RoastIntensity = 'honest'
  root.innerHTML = `<main class="roast-page roast-skin-${intensity}"><div class="site-shell"><nav class="site-nav"><a class="site-mark" href="/">AI JUNGLE</a><div class="site-links"><a href="/">The Living Pitch</a><a href="/evolution">Public ledger ↗</a></div></nav><header class="roast-hero"><p class="eyebrow">THE ROAST · GORIA IS WATCHING</p><h1>Drop your URL.<br>Get the receipt.</h1><p class="business-intro">A roast of what your website actually says, shows, and loads. Every burn comes with the exact observation behind it.</p><form class="roast-form" data-roast-form><label>Your domain<input name="domain" type="text" placeholder="yourdomain.com" autocomplete="url" required maxlength="253"></label><fieldset><legend>How much truth can it take?</legend><label class="intensity-option"><input type="radio" name="intensity" value="gentle">Gentle<span>Sharp, never cruel.</span></label><label class="intensity-option"><input type="radio" name="intensity" value="honest" checked>Honest<span>The useful version.</span></label><label class="intensity-option intensity-scorched"><input type="radio" name="intensity" value="scorched">Scorched Earth<span>Bring the fire.</span></label></fieldset><button class="button button-primary" type="submit">Roast my site →</button></form><p class="roast-note">No screenshot. No invented claims. Just the page and its receipts.</p></header><div data-roast-output></div><footer class="site-footer"><strong>Human-directed, AI-executed.</strong><span>Want to improve the organism?</span><button class="footer-action" data-action="improve">Improve this</button><a href="/">Play the Living Pitch →</a></footer></div></main>`
  const form = root.querySelector<HTMLFormElement>('[data-roast-form]')
  const output = root.querySelector<HTMLElement>('[data-roast-output]')
  const page = root.querySelector<HTMLElement>('.roast-page')
  form?.addEventListener('change', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || target.name !== 'intensity' || !isIntensity(target.value)) return
    intensity = target.value
    if (page) page.className = `roast-page roast-skin-${intensity}`
  })
  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const domain = data.get('domain')
    if (typeof domain !== 'string' || !domain.trim()) return
    capture('roast_start', { intensity, domain_length: domain.trim().length })
    if (output) output.innerHTML = '<section class="roast-loading"><p class="eyebrow">GORIA · LIVE READ</p><h2>reading your website… oh no…<br>oh NO.</h2><p>Fetching the page, finding the claims, checking the receipts.</p></section>'
    void requestRoast({ domain: domain.trim(), intensity })
      .then((result) => {
        capture('roast_done', { intensity, severity: result.severity, cached: result.cached, burns: result.burns.length })
        if (output) output.innerHTML = resultMarkup(result, domain.trim())
        output?.querySelector<HTMLAnchorElement>('[data-action="roast-pivot"]')?.addEventListener('click', () => capture('roast_pivot', { intensity, domain_length: domain.trim().length }))
      })
      .catch((error: unknown) => {
        if (output) output.innerHTML = `<section class="roast-loading roast-error"><p class="eyebrow">THE PAGE REFUSED THE INTERVIEW</p><h2>${escapeHtml(error instanceof Error ? error.message : 'The roast could not be completed.')}</h2><p>Try the canonical domain again, or check whether it is reachable.</p></section>`
      })
  })
  return () => undefined
}
