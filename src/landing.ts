// The Approval Ledger v2 : landing logic. Hand-written vanilla port of the
// Claude Design component: the page proves its claims as you scroll, the fixed
// ledger totals them, and the final stamp routes into the real funnel.
import { LANDING_HTML, LANDING_STYLE } from './landing-template'
import { capture } from './analytics'
import { siteNav, bindNav } from './nav.ts'

const LINES: Array<[string, string, string]> = [
  ['001', 'assessment · 3 opportunities or it is free', 'act1'],
  ['002', 'covenant · 0 messages without approval', 'act3'],
  ['003', 'case 01 · booked 139 · replied 24%', 'act4'],
  ['004', 'six systems · in production', 'act4'],
  ['005', 'success gate · a number, not a vibe', 'act6'],
  ['006', 'every first client · still a client', 'act6'],
]
const PAIRS = [
  { pain: 'For an interim management and executive search advisory.', name: 'The visibility and network engine', tag: 'SOFI · BOB · MEMO · HUMAN APPROVED', initial: '01', grad: 'linear-gradient(135deg,#5C8460,#33522F)', desc: 'The network gets worked even when the partner cannot. Signals watched daily, briefs on the desk before every meeting, a CRM that maintains itself.' },
  { pain: 'For a consulting practice.', name: 'The process mapper', tag: 'MEMO · EVA · PARTNERS VALIDATE', initial: '02', grad: 'linear-gradient(135deg,#C28A6A,#8a5536)', desc: 'An agent interviews the team, maps how work actually flows, and shows where expertise is trapped in repetitive steps. The map becomes the install plan.' },
  { pain: 'For an M&A advisory and executive search boutique.', name: 'The VIP-circle radar', tag: 'SOFI · MEMO · ALERTS ONLY', initial: '03', grad: 'linear-gradient(135deg,#5C9A8A,#2F6F66)', desc: 'A quiet radar over the people who matter: role changes, deals closing, signals worth a call. The machine watches. The partner decides who to reach, and when.' },
  { pain: 'For an HR and team-building boutique.', name: 'The website that adapts to how you read', tag: 'NESTOR · MEMO · EVERY VARIANT APPROVED', initial: '04', grad: 'linear-gradient(135deg,#7A9B6E,#456B49)', desc: 'The site reads how each visitor decides and reorders itself to match, with a visible toggle and a clean opt-out. The same discipline runs on the site you are reading right now.' },
  { pain: 'For cross-border advisory work.', name: 'Consulting-grade desk research', tag: 'SOFI · MEMO · A SENIOR HUMAN SIGNS', initial: '05', grad: 'linear-gradient(135deg,#C98A3C,#9A5E1F)', desc: 'Research desks that produce partner-grade deliverables on real consulting frameworks, with every source labeled: fact, inference, or hypothesis.' },
  { pain: 'For a principal with a public track record.', name: 'The voice-faithful drafting agent', tag: 'HIPO · MEMO · THEY APPROVE EVERY WORD', initial: '06', grad: 'linear-gradient(135deg,#9aa0a6,#5f6b72)', desc: 'Trained on their own appearances, it drafts in their voice and their positions. Not AI voice. Their voice.' },
]
const TYPED_FULL = 'your first three opportunities · pending your yes'
const EASE = (t: number) => 1 - Math.pow(1 - t, 3)
const CLAMP = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

type LineState = 'idle' | 'pending' | 'approved'

export function renderLanding(root: HTMLElement): void {
  document.title = 'AI Jungle · Grow without hiring'
  // scrollcraft base FIRST, the design tokens override it (progress bar stays jungle green)
  const scCss = document.createElement('link')
  scCss.rel = 'stylesheet'; scCss.href = '/scrollcraft.css'
  document.head.appendChild(scCss)
  const styleTag = document.createElement('style')
  styleTag.textContent = LANDING_STYLE
  document.head.appendChild(styleTag)

  root.innerHTML = `<div id="page" style="position:relative"><span data-sc-progress></span><div class="sc-grain" aria-hidden="true"></div><div style="position:absolute;top:0;left:0;right:0;z-index:15">${siteNav('dark')}</div>${LANDING_HTML}</div>`
  bindNav(root)
  capture('landing_view', {})

  const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lines: Record<string, LineState> = Object.fromEntries(LINES.map(([id]) => [id, 'idle']))
  let stamped = false
  let typedStarted = false
  let counted = false

  // agents rail
  const pairsHost = root.querySelector('[data-lp="pairs"]')
  if (pairsHost) pairsHost.outerHTML = PAIRS.map((p) => `
    <div class="v2-cell" style="width:340px;min-width:340px;flex:none">
      <p style="margin:0 0 14px 4px;font-family:'Fraunces',serif;font-style:italic;font-size:19px;line-height:1.4;color:#6A5443;min-height:56px">${p.pain}</p>
      <div data-sc-tilt="6" style="border-radius:14px;border:1px solid rgba(74,53,38,0.12);background:#FFFDF8;padding:22px;box-shadow:0 14px 30px -18px rgba(60,42,28,0.3)">
        <div style="width:50px;height:50px;border-radius:13px;background:${p.grad};display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:18px;color:#fff;margin-bottom:13px">${p.initial}</div>
        <div style="font-family:'Fraunces',serif;font-weight:500;font-size:19px;color:#3A2A1E">${p.name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:0.05em;color:#9A8773;margin-top:2px">${p.tag}</div>
        <div style="font-size:13.5px;line-height:1.5;color:#6A5443;margin-top:9px">${p.desc}</div>
      </div>
    </div>`).join('')

  // scrollcraft engine (public/scrollcraft.js exposes window.ScrollCraft)
  const boot = () => {
    const SC = (window as unknown as { ScrollCraft?: { mount: (el: Element) => { read: () => void } } }).ScrollCraft
    let api: { read: () => void } | null = null
    if (SC) { try { api = SC.mount(document.body) } catch { api = null } }
    wire(api)
  }
  if ((window as unknown as { ScrollCraft?: unknown }).ScrollCraft) boot()
  else {
    const s = document.createElement('script')
    s.src = '/scrollcraft.js'
    s.onload = boot
    s.onerror = () => wire(null)
    document.head.appendChild(s)
  }

  function rowHtml(id: string, label: string, target: string, st: LineState): string {
    const approved = st === 'approved'
    return `<a href="#${target}" data-goto="${target}" style="display:flex;gap:10px;align-items:baseline;text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:10.5px;line-height:1.55;padding:5px 0;color:${approved ? '#E9E2D2' : '#8F8574'};transform-origin:left center;${approved && !rm ? 'animation:aijStamp .16s cubic-bezier(0.22,1,0.36,1)' : ''}"><span style="color:${approved ? '#90C08A' : '#6E6455'};min-width:26px">${id}</span><span style="flex:1">${label}</span></a>`
  }

  function renderLedger(): void {
    const shown = LINES.filter(([id]) => lines[id] !== 'idle')
    const latest = shown.length ? `${shown[shown.length - 1][0]} · ${shown[shown.length - 1][1]}` : 'no claims verified yet'
    root.querySelectorAll('[data-lp="latest"]').forEach((el) => { el.textContent = latest })
    const rows = shown.map(([id, label, target]) => rowHtml(id, label, target, lines[id])).join('')
    root.querySelectorAll('[data-lp="rows"]').forEach((el) => { el.innerHTML = rows })
    root.querySelectorAll('[data-lp="empty"]').forEach((el) => { (el as HTMLElement).hidden = shown.length > 0 })
    root.querySelectorAll('[data-lp="receiptRows"]').forEach((el) => {
      el.innerHTML = LINES.map(([id, label, target]) => rowHtml(id, label, target, lines[id])).join('')
    })
  }

  function mark(id: string, st: LineState): void {
    if (lines[id] === 'approved' || lines[id] === st) return
    lines[id] = st
    renderLedger()
  }

  function startTyping(): void {
    if (typedStarted) return
    typedStarted = true
    const typedEl = root.querySelector('[data-lp="typed"]')
    const caret = root.querySelector('[data-lp="caret"]') as HTMLElement | null
    if (!typedEl) return
    if (rm) { typedEl.textContent = TYPED_FULL; if (caret) caret.hidden = true; return }
    let i = 0
    const iv = window.setInterval(() => {
      i += 1
      typedEl.textContent = TYPED_FULL.slice(0, i)
      if (i >= TYPED_FULL.length) { window.clearInterval(iv); if (caret) caret.hidden = true }
    }, 26)
  }

  function stamp(): void {
    if (stamped) return
    stamped = true
    capture('landing_stamp', {})
    const typedEl = root.querySelector('[data-lp="typed"]') as HTMLElement | null
    const num = root.querySelector('[data-lp="l7num"]') as HTMLElement | null
    const l7 = root.querySelector('[data-lp="l7"]') as HTMLElement | null
    const note = root.querySelector('[data-lp="stampedNote"]') as HTMLElement | null
    if (typedEl) typedEl.textContent = 'your first three opportunities · approved'
    if (num) { num.style.color = '#90C08A'; if (!rm) num.style.animation = 'aijStamp .16s cubic-bezier(0.22,1,0.36,1)' }
    if (l7) { l7.style.color = '#90C08A'; if (!rm) l7.style.animation = 'aijStamp .16s cubic-bezier(0.22,1,0.36,1)' }
    if (note) note.hidden = false
    window.setTimeout(() => { window.location.href = '/assessment' }, rm ? 150 : 700)
  }

  function wire(api: { read: () => void } | null): void {
    // ledger nav interactions
    const dPanel = root.querySelector('[data-lp="dPanel"]') as HTMLElement | null
    const mPanel = root.querySelector('[data-lp="mPanel"]') as HTMLElement | null
    const chevD = root.querySelector('[data-lp="chevD"]') as HTMLElement | null
    const chevM = root.querySelector('[data-lp="chevM"]') as HTMLElement | null
    const ledgerD = document.getElementById('ledgerD')
    const setD = (open: boolean) => { if (dPanel) dPanel.hidden = !open; if (chevD) chevD.textContent = open ? '▾' : '▴' }
    const setM = (open: boolean) => { if (mPanel) mPanel.hidden = !open; if (chevM) chevM.textContent = open ? '▾' : '▴' }
    ledgerD?.addEventListener('mouseenter', () => setD(true))
    ledgerD?.addEventListener('mouseleave', () => setD(false))
    ledgerD?.querySelector('button')?.addEventListener('click', () => setD(dPanel ? dPanel.hidden : true))
    root.querySelector('.aij-ledger-m button')?.addEventListener('click', () => setM(mPanel ? mPanel.hidden : true))
    root.addEventListener('click', (ev) => {
      const a = (ev.target as HTMLElement).closest('[data-goto]') as HTMLElement | null
      if (a) {
        ev.preventDefault()
        const t = document.getElementById(a.dataset.goto ?? '')
        if (t) window.scrollTo({ top: t.offsetTop + 10, behavior: rm ? 'auto' : 'smooth' })
      }
    })
    // hero CTA scrolls to the close; final CTA stamps then routes to /assessment
    const ctas = Array.from(root.querySelectorAll('[data-lp="cta"]')) as HTMLElement[]
    ctas[0]?.addEventListener('click', (ev) => {
      ev.preventDefault()
      capture('landing_hero_cta', {})
      const w = document.getElementById('act7wrap')
      if (w) window.scrollTo({ top: w.offsetTop + 10, behavior: rm ? 'auto' : 'smooth' })
    })
    ctas[1]?.addEventListener('click', (ev) => { ev.preventDefault(); stamp() })
    // newsletter: the real lead pipe, proxied to the legacy capture route
    const form = root.querySelector('footer form') as HTMLFormElement | null
    form?.addEventListener('submit', (ev) => {
      ev.preventDefault()
      const email = (form.querySelector('input[type="email"]') as HTMLInputElement | null)?.value ?? ''
      const note = root.querySelector('[data-lp="subNote"]') as HTMLElement | null
      fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing-newsletter', page: '/' }),
      }).then((r) => {
        if (note) {
          note.hidden = false
          if (!r.ok) note.textContent = 'That did not go through. Email hello@welcometotheaijungle.com and a human will add you.'
        }
        capture('landing_newsletter', { ok: r.ok })
      }).catch(() => {
        if (note) { note.hidden = false; note.textContent = 'That did not go through. Email hello@welcometotheaijungle.com and a human will add you.' }
      })
    })

    // scroll loop: reveals, act marks, proof approvals, counters, film scrub, ledger fade
    const revealEls = Array.from(root.querySelectorAll('[data-reveal]')).map((el) => {
      const h = el as HTMLElement
      if (!rm) { h.style.opacity = '0'; h.style.transform = 'translateY(14px)' }
      return { el: h, delay: Number(h.dataset.delay ?? 0), done: false }
    })
    const proofEls = Array.from(root.querySelectorAll('[data-proof]')).map((el) => ({ el: el as HTMLElement, ids: (el as HTMLElement).dataset.proof?.split(' ') ?? [], done: false }))
    const actEls = Array.from(root.querySelectorAll('[data-acts]')).map((el) => ({ el: el as HTMLElement, ids: (el as HTMLElement).dataset.acts?.split(' ') ?? [], done: false }))
    const countHost = document.getElementById('countHost')
    const film = document.getElementById('heroFilm') as HTMLVideoElement | null
    const filmShade = document.getElementById('heroFilmShade') as HTMLElement | null
    const act1 = document.getElementById('act1')
    const act7 = document.getElementById('act7wrap')
    let filmOk = false
    film?.addEventListener('loadedmetadata', () => { filmOk = true; film.style.opacity = '0.5'; if (filmShade) filmShade.style.opacity = '1' })
    film?.addEventListener('error', () => { filmOk = false; if (film) film.style.display = 'none' })

    const runCount = (el: HTMLElement) => {
      const target = Number(el.dataset.count ?? 0)
      const suf = el.dataset.suffix ?? ''
      if (rm || target === 0) { el.textContent = `${target}${suf}`; return }
      const t0 = performance.now()
      const step = (t: number) => {
        const p = CLAMP((t - t0) / 950, 0, 1)
        el.textContent = `${Math.round(target * EASE(p))}${suf}`
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    let alive = true
    window.addEventListener('pagehide', () => { alive = false }, { once: true })
    const loop = () => {
      if (!alive || !document.getElementById('act1')) return
      if (api) { try { api.read() } catch { /* engine is optional */ } }
      const vh = window.innerHeight
      const y = window.scrollY
      revealEls.forEach((r) => {
        if (r.done) return
        if (r.el.getBoundingClientRect().top < vh * 0.88) {
          r.done = true
          if (rm) { r.el.style.opacity = '1'; r.el.style.transform = 'none' }
          else window.setTimeout(() => {
            r.el.style.transition = 'opacity .55s cubic-bezier(0.22,1,0.36,1), transform .55s cubic-bezier(0.22,1,0.36,1)'
            r.el.style.opacity = '1'; r.el.style.transform = 'none'
          }, r.delay)
        }
      })
      actEls.forEach((a) => {
        if (!a.done && a.el.getBoundingClientRect().top < vh * 0.95) { a.done = true; a.ids.forEach((id) => mark(id, 'pending')) }
      })
      proofEls.forEach((p) => {
        if (!p.done && p.el.getBoundingClientRect().top < vh * 0.72) {
          p.done = true
          p.ids.forEach((id, i) => window.setTimeout(() => mark(id, 'approved'), rm ? 0 : 260 + i * 350))
        }
      })
      if (!counted && countHost && countHost.getBoundingClientRect().top < vh * 0.78) {
        counted = true
        root.querySelectorAll('[data-count]').forEach((el) => runCount(el as HTMLElement))
      }
      if (filmOk && film && act1 && !rm) {
        const r = act1.getBoundingClientRect()
        const span = act1.offsetHeight - vh
        if (span > 0 && r.bottom > 0 && r.top < vh) {
          const d = film.duration
          if (d && Number.isFinite(d)) {
            const t = CLAMP(-r.top / span, 0, 1) * (d - 0.05)
            if (Math.abs((film.currentTime || 0) - t) > 0.04) film.currentTime = t
          }
        }
      }
      if (ledgerD && act7) {
        const a7r = act7.getBoundingClientRect()
        const o = CLAMP((y - vh * 0.6) / (vh * 0.3), 0, 1) * (a7r.top < vh ? CLAMP(a7r.top / vh, 0, 1) : 1)
        ledgerD.style.opacity = String(o)
        ledgerD.style.pointerEvents = o < 0.4 ? 'none' : 'auto'
        if (a7r.top < vh * 0.4) startTyping()
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    if (rm) startTyping()
    renderLedger()
  }
}
