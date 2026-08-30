import { capture } from './analytics.ts'

export type ShareKind = 'expedition' | 'roast'

export type SharePayload = {
  text: string
  url: string
  intentUrl: string
}

const API_BASE = 'https://api.welcometotheaijungle.com'
const VISITOR_KEY = 'living-pitch-share-visitor-v1'

function shareUrl(origin: string, ref = 'anon'): string {
  const url = new URL('/', origin)
  url.searchParams.set('utm_source', 'share')
  url.searchParams.set('utm_ref', ref.slice(0, 40))
  return url.toString()
}

export function buildSharePayload(input: { score: number; topLeak: string | null; kind: ShareKind; severity?: number; origin?: string }): SharePayload {
  const url = shareUrl(input.origin ?? window.location.origin)
  const text = input.kind === 'roast'
    ? `My site got a ${input.severity ?? 0}/100 roast. Want the receipts? get roasted → ${url}`
    : `I scored ${Math.round(input.score)}/100 on The Living Pitch. My top leak: ${input.topLeak ?? 'still forming'}. What does YOUR agent see? ${url}`
  return { text, url, intentUrl: `https://x.com/intent/post?text=${encodeURIComponent(text)}` }
}

export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // The textarea fallback handles browsers without clipboard permission.
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  textarea.remove()
  return copied
}

function visitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const generated = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(VISITOR_KEY, generated)
    return generated
  } catch {
    return 'ephemeral'
  }
}

export async function recordShareVisit(): Promise<void> {
  const params = new URLSearchParams(window.location.search)
  if (params.get('utm_source') !== 'share') return
  const ref = (params.get('utm_ref') || 'anon').slice(0, 40)
  try {
    const response = await fetch(`${API_BASE}/visits/utm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ref, visitor_id: visitorId() }),
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`Share visit returned ${response.status}`)
    capture('share_visit_counted', { ref })
  } catch (error) {
    capture('share_visit_failed', { error: String(error) })
  }
}
