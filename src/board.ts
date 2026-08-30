import { capture } from './analytics'

type ContributionKind = 'pr' | 'burn' | 'mutation' | 'share'
type Breakdown = { count: number; points: number }
type Contribution = { id: number; ts: string; kind: ContributionKind; points: number; handle: string; url: string | null; title: string }
type BoardEntry = { rank: number; handle: string; points: number; first_ts: string; url: string | null; breakdown: Partial<Record<ContributionKind, Breakdown>>; contributions: Contribution[] }
type BoardPayload = { today: BoardEntry[]; alltime: BoardEntry[]; ticker: Contribution[] }

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

function parseContribution(value: unknown): Contribution {
  if (!isRecord(value) || !isFiniteInteger(value.id) || value.id < 1 || typeof value.ts !== 'string' || !['pr', 'burn', 'mutation', 'share'].includes(String(value.kind)) || !isFiniteInteger(value.points) || value.points < 1 || typeof value.handle !== 'string' || value.handle.length === 0 || (value.url !== null && typeof value.url !== 'string') || typeof value.title !== 'string') throw new Error('The board returned an invalid contribution.')
  const kind = value.kind
  if (kind !== 'pr' && kind !== 'burn' && kind !== 'mutation' && kind !== 'share') throw new Error('The board returned an invalid contribution kind.')
  return { id: value.id, ts: value.ts, kind, points: value.points, handle: value.handle, url: value.url, title: value.title }
}

function parseEntry(value: unknown): BoardEntry {
  if (!isRecord(value) || !isFiniteInteger(value.rank) || value.rank < 1 || typeof value.handle !== 'string' || value.handle.length === 0 || !isFiniteInteger(value.points) || value.points < 1 || typeof value.first_ts !== 'string' || (value.url !== null && typeof value.url !== 'string') || !isRecord(value.breakdown) || !Array.isArray(value.contributions)) throw new Error('The board returned an invalid ranking entry.')
  const breakdown: Partial<Record<ContributionKind, Breakdown>> = {}
  for (const [kind, raw] of Object.entries(value.breakdown)) {
    if (!isContributionKind(kind)) throw new Error('The board returned an invalid breakdown.')
    if (!isRecord(raw) || typeof raw.count !== 'number' || typeof raw.points !== 'number') throw new Error('The board returned an invalid breakdown.')
    breakdown[kind] = { count: raw.count, points: raw.points }
  }
  return { rank: value.rank, handle: value.handle, points: value.points, first_ts: value.first_ts, url: value.url, breakdown, contributions: value.contributions.map(parseContribution) }
}

function parseBoard(value: unknown): BoardPayload {
  if (!isRecord(value) || !Array.isArray(value.today) || !Array.isArray(value.alltime) || !Array.isArray(value.ticker)) throw new Error('The board returned an invalid response.')
  return { today: value.today.map(parseEntry), alltime: value.alltime.map(parseEntry), ticker: value.ticker.map(parseContribution) }
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
  return `<article class="board-entry"><div class="board-rank">#${entry.rank}</div><div class="board-entry-body"><div class="board-entry-head">${identity}<strong>${entry.points} LP</strong></div><p>${escapeHtml(entry.contributions[entry.contributions.length - 1]?.title ?? 'Useful contribution accepted')}</p><div class="board-breakdown">${breakdown(entry)}</div><small>First accepted ${escapeHtml(formatTimestamp(entry.first_ts))}</small></div></article>`
}

function ladder(): string {
  return '<section class="prize-ladder"><p class="eyebrow">IF WE WIN</p><h2>The useful prize</h2><div><strong>#1 $1,500</strong><strong>#2 $1,000</strong><strong>#3 $500</strong></div><p>All-time rank decides the split at judging.</p></section>'
}

function boardSection(title: string, entries: BoardEntry[], empty: string): string {
  return `<section class="board-section"><div class="board-section-head"><p class="eyebrow">${title === 'Today' ? 'UTC · RESET AT MIDNIGHT' : 'PERMANENT RACE'}</p><h2>${title}</h2></div>${entries.length ? `<div class="board-list">${entries.map(entryCard).join('')}</div>` : `<div class="board-empty"><p>${empty}</p><p class="muted">Feedback, burns, and useful PRs all count once the ledger accepts them.</p></div>`}</section>`
}

function ticker(entries: Contribution[]): string {
  if (!entries.length) return '<div class="board-ticker"><span>THE TICKER</span><strong>Waiting for the first accepted contribution.</strong></div>'
  return `<div class="board-ticker"><span>THE TICKER</span><div>${entries.slice(0, 6).map((entry) => `<span><strong>${escapeHtml(entry.handle)}</strong> +${entry.points} LP · ${escapeHtml(kindLabels[entry.kind])}</span>`).join('')}</div></div>`
}

function shell(content: string): string {
  return `<main class="board-page"><div class="site-shell"><nav class="site-nav"><a class="site-mark" href="/">AI JUNGLE</a><div class="site-links"><a href="/evolution">Evolution</a><a href="/rules">Rules</a><a href="/roast">Roast my site</a></div></nav>${content}<footer class="site-footer"><strong>Human-directed, AI-executed.</strong><a href="/">Play the Living Pitch →</a><a href="/evolution">Evolution</a><a href="/rules">Board rules</a><a href="/roast">Roast my site</a></footer></div></main>`
}

export async function renderBoard(root: HTMLElement): Promise<void> {
  root.innerHTML = shell('<header class="board-hero"><p class="eyebrow">THE USEFULNESS BOARD</p><h1>Rank by what you make better.</h1><p class="business-intro">Outbid sold rank for dollars. This board gives it to whoever makes the organism more useful. Nothing ranks without a human yes.</p><a class="button button-primary" href="/rules">Read the rules →</a></header><div data-board-output><p class="loading">Reading the board...</p></div>')
  const output = root.querySelector<HTMLElement>('[data-board-output]')
  try {
    const response = await fetch(`${API_BASE}/board`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    const payload: unknown = await response.json()
    if (!response.ok) throw new Error(`Board request failed with ${response.status}`)
    const board = parseBoard(payload)
    if (output) output.innerHTML = `${ticker(board.ticker)}${ladder()}${boardSection('Today', board.today, 'The board is open. First useful contribution takes #1.')}${boardSection('All-time', board.alltime, 'The board is open. First useful contribution takes #1.')}`
    capture('board_view', { today_entries: board.today.length, alltime_entries: board.alltime.length, ticker_entries: board.ticker.length })
  } catch (error) {
    if (output) output.innerHTML = '<p class="error-state">The board is temporarily unreadable. The ledger is still accepting useful work.</p>'
    capture('board_view', { ok: false, error: String(error) })
  }
}
