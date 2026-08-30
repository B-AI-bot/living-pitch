import { capture } from './analytics'

type ContributionKind = 'pr' | 'burn' | 'mutation' | 'share'
type Breakdown = { count: number; points: number }
type Contribution = { id: number; ts: string; kind: ContributionKind; points: number; handle: string; url: string | null; title: string; category: string }
type BoardEntry = { rank: number; handle: string; points: number; first_ts: string; url: string | null; categories: string[]; breakdown: Partial<Record<ContributionKind, Breakdown>>; contributions: Contribution[] }
type BoardPayload = { categories: string[]; crowns: { today: Record<string, string | null>; alltime: Record<string, string | null> }; today: BoardEntry[]; alltime: BoardEntry[]; ticker: Contribution[] }

const API_BASE = 'https://api.welcometotheaijungle.com'
const kindLabels: Record<ContributionKind, string> = { pr: 'merged PR', burn: 'accepted burn', mutation: 'accepted mutation / feedback', share: 'shared visitor' }

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isContributionKind(value: string): value is ContributionKind {
  return value === 'pr' || value === 'burn' || value === 'mutation' || value === 'share'
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

function parseContribution(value: unknown, categories: string[]): Contribution {
  if (!isRecord(value) || !isFiniteInteger(value.id) || value.id < 1 || typeof value.ts !== 'string' || typeof value.kind !== 'string' || !isContributionKind(value.kind) || !isFiniteInteger(value.points) || value.points < 1 || typeof value.handle !== 'string' || value.handle.length === 0 || (value.url !== null && typeof value.url !== 'string') || typeof value.title !== 'string' || typeof value.category !== 'string' || !categories.includes(value.category)) throw new Error('The board returned an invalid contribution.')
  return { id: value.id, ts: value.ts, kind: value.kind, points: value.points, handle: value.handle, url: value.url, title: value.title, category: value.category }
}

function parseEntry(value: unknown, categories: string[]): BoardEntry {
  if (!isRecord(value) || !isFiniteInteger(value.rank) || value.rank < 1 || typeof value.handle !== 'string' || value.handle.length === 0 || !isFiniteInteger(value.points) || value.points < 1 || typeof value.first_ts !== 'string' || (value.url !== null && typeof value.url !== 'string') || !Array.isArray(value.categories) || !value.categories.every((item): item is string => typeof item === 'string' && categories.includes(item)) || !isRecord(value.breakdown) || !Array.isArray(value.contributions)) throw new Error('The board returned an invalid ranking entry.')
  const breakdown: Partial<Record<ContributionKind, Breakdown>> = {}
  for (const [kind, raw] of Object.entries(value.breakdown)) {
    if (!isContributionKind(kind)) throw new Error('The board returned an invalid breakdown.')
    if (!isRecord(raw) || typeof raw.count !== 'number' || typeof raw.points !== 'number') throw new Error('The board returned an invalid breakdown.')
    breakdown[kind] = { count: raw.count, points: raw.points }
  }
  return { rank: value.rank, handle: value.handle, points: value.points, first_ts: value.first_ts, url: value.url, categories: value.categories, breakdown, contributions: value.contributions.map((item) => parseContribution(item, categories)) }
}

function parseBoard(value: unknown): BoardPayload {
  if (!isRecord(value) || !Array.isArray(value.categories) || !value.categories.every((item): item is string => typeof item === 'string' && item.length > 0) || !Array.isArray(value.today) || !Array.isArray(value.alltime) || !Array.isArray(value.ticker) || !isRecord(value.crowns) || !isRecord(value.crowns.today) || !isRecord(value.crowns.alltime)) throw new Error('The board returned an invalid response.')
  const categories = value.categories
  const readCrowns = (raw: Record<string, unknown>): Record<string, string | null> => Object.fromEntries(categories.map((category) => {
    const leader = raw[category]
    if (leader !== null && typeof leader !== 'string') throw new Error('The board returned an invalid crown.')
    return [category, leader]
  }))
  return { categories, crowns: { today: readCrowns(value.crowns.today), alltime: readCrowns(value.crowns.alltime) }, today: value.today.map((item) => parseEntry(item, categories)), alltime: value.alltime.map((item) => parseEntry(item, categories)), ticker: value.ticker.map((item) => parseContribution(item, categories)) }
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date) + ' UTC'
}

function breakdown(entry: BoardEntry): string {
  const items = Object.entries(entry.breakdown).filter((item): item is [ContributionKind, Breakdown] => isContributionKind(item[0]) && item[1] !== undefined).map(([kind, item]) => `<span>${escapeHtml(kindLabels[kind])}: ${item.count} · ${item.points} LP</span>`)
  return items.join('')
}

function entryCard(entry: BoardEntry): string {
  const identity = entry.url ? `<a class="board-handle" href="${escapeHtml(entry.url)}">${escapeHtml(entry.handle)}</a>` : `<span class="board-handle">${escapeHtml(entry.handle)}</span>`
  const badges = entry.categories.map((category) => `<span class="category-badge">${escapeHtml(category)}</span>`).join('')
  return `<article class="board-entry"><div class="board-rank">#${entry.rank}</div><div class="board-entry-body"><div class="board-entry-head">${identity}<strong>${entry.points} LP</strong></div><div class="category-badges">${badges}</div><p>${escapeHtml(entry.contributions[entry.contributions.length - 1]?.title ?? 'Useful contribution accepted')}</p><div class="board-breakdown">${breakdown(entry)}</div><small>First accepted ${escapeHtml(formatTimestamp(entry.first_ts))}</small></div></article>`
}

function ladder(): string {
  return '<section class="prize-ladder"><p class="eyebrow">IF WE WIN</p><h2>The useful prize</h2><div><strong>#1 $1,500</strong><strong>#2 $1,000</strong><strong>#3 $500</strong></div><p>All-time rank decides the split at judging.</p></section>'
}

function boardSection(title: string, entries: BoardEntry[], empty: string): string {
  return `<section class="board-section"><div class="board-section-head"><p class="eyebrow">${title === 'Today' ? 'UTC · RESET AT MIDNIGHT' : 'PERMANENT RACE'}</p><h2>${title}</h2></div>${entries.length ? `<div class="board-list">${entries.map(entryCard).join('')}</div>` : `<div class="board-empty"><p>${empty}</p><p class="muted">Feedback, burns, and useful PRs all count once the ledger accepts them.</p></div>`}</section>`
}

function ticker(entries: Contribution[]): string {
  if (!entries.length) return '<div class="board-ticker"><span>THE TICKER</span><strong>Waiting for the first accepted contribution.</strong></div>'
  return `<div class="board-ticker"><span>THE TICKER</span><div>${entries.slice(0, 6).map((entry) => `<span><strong>${escapeHtml(entry.handle)}</strong> +${entry.points} LP · <em class="category-badge">${escapeHtml(entry.category)}</em> · ${escapeHtml(kindLabels[entry.kind])}</span>`).join('')}</div></div>`
}

function categoryLabel(category: string): string {
  return category.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function categoryChips(categories: string[], selected: string | null): string {
  const all = `<button type="button" class="category-chip${selected === null ? ' is-selected' : ''}" data-category="" aria-pressed="${selected === null}">All</button>`
  const chips = categories.map((category) => `<button type="button" class="category-chip${selected === category ? ' is-selected' : ''}" data-category="${escapeHtml(category)}" aria-pressed="${selected === category}">${escapeHtml(categoryLabel(category))}</button>`).join('')
  return `<div class="category-filters" aria-label="Filter by category">${all}${chips}</div>`
}

function crowns(board: BoardPayload): string {
  const cards = board.categories.map((category) => {
    const today = board.crowns.today[category]
    const alltime = board.crowns.alltime[category]
    return `<article class="crown-card"><h3>${escapeHtml(categoryLabel(category))}</h3><p><span>Today</span><strong>${today ? escapeHtml(today) : `The ${escapeHtml(category)} crown is unclaimed.`}</strong></p><p><span>All-time</span><strong>${alltime ? escapeHtml(alltime) : `The ${escapeHtml(category)} crown is unclaimed.`}</strong></p></article>`
  }).join('')
  return `<section class="crowns"><div class="crowns-head"><p class="eyebrow">CATEGORY CROWNS</p><h2>Useful work has its own race.</h2></div><div class="crown-grid">${cards}</div></section>`
}

function shell(content: string): string {
  return `<main class="board-page"><div class="site-shell"><nav class="site-nav"><a class="site-mark" href="/">AI JUNGLE</a><div class="site-links"><a href="/evolution">Evolution</a><a href="/rules">Rules</a><a href="/roast">Roast my site</a></div></nav>${content}<footer class="site-footer"><strong>Human-directed, AI-executed.</strong><a href="/">Play the Living Pitch →</a><a href="/evolution">Evolution</a><a href="/rules">Board rules</a><a href="/roast">Roast my site</a></footer></div></main>`
}

export async function renderBoard(root: HTMLElement): Promise<void> {
  root.innerHTML = shell('<header class="board-hero"><p class="eyebrow">THE USEFULNESS BOARD</p><h1>Rank by what you make better.</h1><p class="business-intro">Outbid sold rank for dollars. This board gives it to whoever makes the organism more useful. Nothing ranks without a human yes.</p><a class="button button-primary" href="/rules">Read the rules →</a></header><div data-board-output><p class="loading">Reading the board...</p></div>')
  const output = root.querySelector<HTMLElement>('[data-board-output]')
  const load = async (selected: string | null): Promise<void> => {
    try {
      const url = new URL(`${API_BASE}/board`)
      if (selected) url.searchParams.set('category', selected)
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
      const payload: unknown = await response.json()
      if (!response.ok) throw new Error(`Board request failed with ${response.status}`)
      const board = parseBoard(payload)
      const empty = selected ? `The ${selected} crown is unclaimed.` : 'The board is open. First useful contribution takes #1.'
      if (output) {
        output.innerHTML = `${categoryChips(board.categories, selected)}${crowns(board)}${ticker(board.ticker)}${ladder()}${boardSection('Today', board.today, empty)}${boardSection('All-time', board.alltime, empty)}`
        output.querySelectorAll<HTMLButtonElement>('[data-category]').forEach((button) => button.addEventListener('click', () => {
          const category = button.dataset.category || null
          window.history.replaceState({}, '', category ? `/board?category=${encodeURIComponent(category)}` : '/board')
          void load(category)
        }))
      }
      capture('board_view', { category: selected ?? 'all', today_entries: board.today.length, alltime_entries: board.alltime.length, ticker_entries: board.ticker.length })
    } catch (error) {
      if (output) output.innerHTML = '<p class="error-state">The board is temporarily unreadable. The ledger is still accepting useful work.</p>'
      capture('board_view', { ok: false, error: String(error) })
    }
  }
  const initial = new URLSearchParams(window.location.search).get('category')
  await load(initial)
}
