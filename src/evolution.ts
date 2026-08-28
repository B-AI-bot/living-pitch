import { capture } from './analytics'

type Mutation = {
  id: number | string
  ts: string
  title: string
  detail: string
  proposed_by: string
  approved_by: string
  latency_s: number
  verified: boolean
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function mutationCard(mutation: Mutation): string {
  const agent = /agent|bot/i.test(mutation.proposed_by)
  return `
    <article class="mutation-card">
      <div class="mutation-meta">
        <span>${escapeHtml(formatTimestamp(mutation.ts))} UTC</span>
        <span>Mutation #${escapeHtml(String(mutation.id))}</span>
      </div>
      <h2>${escapeHtml(mutation.title)}</h2>
      <p>${escapeHtml(mutation.detail)}</p>
      <div class="mutation-receipt">
        <span>Proposed by ${escapeHtml(mutation.proposed_by)}${agent ? ' · agent' : ''}</span>
        <span>Approved by ${escapeHtml(mutation.approved_by)} in ${escapeHtml(String(mutation.latency_s))}s</span>
        <span class="verification ${mutation.verified ? 'is-verified' : ''}">${mutation.verified ? 'Verified' : 'Awaiting verification'}</span>
      </div>
    </article>
  `
}

export async function renderEvolution(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <main class="shell evolution-page">
      <nav class="top-nav"><a href="/">The Living Pitch</a><span>Public changelog</span></nav>
      <header class="evolution-header">
        <p class="eyebrow">The approval ledger</p>
        <h1>Watch it change.</h1>
        <p class="evolution-intro">This is the organism's public memory. Every mutation has a proposal, a human decision, and a receipt. Nothing ships without a human yes.</p>
        <div class="counter-grid" aria-live="polite">
          <div><strong id="mutation-count">0</strong><span>mutations</span></div>
          <div><strong id="agent-count">0</strong><span>proposed by agents</span></div>
          <div><strong>0</strong><span>shipped without a human yes</span></div>
        </div>
      </header>
      <section id="mutation-list" class="mutation-list" aria-label="Public mutations">
        <p class="loading">Reading the ledger...</p>
      </section>
    </main>
  `

  try {
    const response = await fetch('/mutations.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`Ledger request failed with ${response.status}`)
    const mutations = (await response.json()) as Mutation[]
    const ordered = [...mutations].sort((left, right) => Date.parse(right.ts) - Date.parse(left.ts))
    const agentCount = ordered.filter((mutation) => /agent|bot/i.test(mutation.proposed_by)).length
    const count = root.querySelector<HTMLElement>('#mutation-count')
    const agents = root.querySelector<HTMLElement>('#agent-count')
    const list = root.querySelector<HTMLElement>('#mutation-list')
    if (count) count.textContent = String(ordered.length)
    if (agents) agents.textContent = String(agentCount)
    if (list) list.innerHTML = ordered.length ? ordered.map(mutationCard).join('') : '<p class="empty-state">The first mutation is waiting for a human yes.</p>'
    capture('evolution_view', { mutation_count: ordered.length, agent_proposals: agentCount })
  } catch (error) {
    const list = root.querySelector<HTMLElement>('#mutation-list')
    if (list) list.innerHTML = '<p class="error-state">The ledger is temporarily unreadable. The organism is still waiting for a human yes.</p>'
    capture('evolution_view', { ok: false, error: String(error) })
  }
}
