import { capture } from './analytics'
import { firstClientCase } from './engine/copy/case.ts'

type Page = {
  kicker?: string
  title: string
  intro?: string
  sections: Array<{ title?: string; body: string[] }>
  cta?: string
  ctaHref?: string
}

const CTA = 'Get my 3 installable opportunities →'

const pages: Record<string, Page> = {
  '/pricing': {
    kicker: '№ 08 Pricing',
    title: 'Flat fees. Written gates. Skin in the game.',
    intro: "You bill for judgment, so you know what pricing games look like from the inside. Here is ours, in full, before any call: fixed prices, a success gate signed before we build, and a slice of our pay riding on results we can prove.",
    sections: [
      { title: 'STEP 1 · THE LEVERAGE ASSESSMENT · 2 to 3 weeks', body: ['Published, fixed. Your three installable opportunities, ranked by dollar impact, each with a scope and a draft success gate. Three or it is free, and the fee is fully credited toward your first install.'] },
      { title: 'STEP 2 · FIRST AGENT INSTALL · 30 to 45 days', body: ['Typically $7,500 to $15,000. Fixed scope, fixed price, signed before we start. Your #1 leverage point goes live, with the approval ledger running and 30 days operated by us.'] },
      { title: 'STEP 3 · THE PARTNERSHIP · 6-month minimum', body: ['From $5,000/month, plus a performance share on results we can prove. We operate the system daily, hold a monthly working session on the numbers, install a new agent every quarter, and train your team deeper each cycle.'] },
      { title: 'WHAT YOU WILL NEVER PAY US FOR', body: ['A percentage of your ad spend. Hourly overruns. Discovery that discovers you need more discovery. Seats, per-user fees, or pricing that punishes you for growing. Exit fees.'] },
      { title: 'WHAT IF THE INSTALL MISSES ITS GATE?', body: ['Then we fix it on our time until it passes, or we say plainly that we were wrong, and the partnership does not start. The gate exists to protect both of us from politeness.'] },
    ], cta: CTA, ctaHref: '/assessment',
  },
  '/assessment': {
    kicker: 'The Leverage Assessment · 2 to 3 weeks',
    title: 'Three installable opportunities. Or you pay nothing.',
    intro: 'In two to three weeks, we map where your firm actually leaks hours, put a dollar figure on each leak, and hand you the Leverage Map: your top three agent opportunities, ranked by impact, each with an install scope and a written success gate. Three, or it is free. And if we find them, the fee comes off your first install.',
    sections: [
      { title: 'THE SCENE', body: ['The first call opens with your calendar, not our slides. Last week, hour by hour. Somewhere around Tuesday afternoon you will go quiet, because you will see it: the two hours rebuilding a brief that existed somewhere, the follow-up you drafted in your head and never sent, the CRM you update in the car. That silence is where we start.'] },
      { title: 'THE LEVERAGE MAP', body: ['Your top three installable opportunities, ranked by dollar impact. Not AI ideas. Opportunities: each one comes with the process it plugs into, the agent shape that fits it, a fixed install scope, and a draft success gate. A number, not a vibe.'] },
      { title: 'WHO THIS IS FOR', body: ['FOR YOU IF: your firm runs on your judgment and your hours. Consulting, advisory, executive search, wealth management, 5 to 50 people. You want leverage, and you refuse to let a machine speak in your name unsupervised.', 'NOT FOR YOU IF: you want AI to replace your judgment instead of multiplying it. You want volume spam with your signature on it. You collect tools the way some people collect gym memberships. We will save us both the call.'] },
      { title: 'THE QUESTIONS YOU ARE ALREADY ASKING', body: ['Is this a sales pitch in disguise? It is a diagnostic with a guarantee attached. If the map is weak, you pay nothing and keep it anyway.', 'We are not technical. At all. Good. Neither are your clients, and you still manage to be indispensable to them. You bring the process knowledge, we bring the build. Your team needs zero code, one messaging app, and opinions.', 'Where does our data sit? In a private, secured environment per client. Your data stays yours, your models if you prefer, no lock-in.', 'Why would we just do this with ChatGPT? You can, the way you can do your own legal work. The question is whether the founder should spend evenings prompt-engineering, or approving finished work in ten minutes a day.'] },
    ], cta: CTA, ctaHref: '/book',
  },
  '/method': {
    kicker: '№ 05 The method', title: 'We do not sell automation. We rethink the firm, then we run it.',
    intro: 'Automation means doing the same thing faster. If your model leaks, it leaks faster. We are operators: we built and ran companies before we built agents, and this site runs on the same agent workforce we install for clients. So we start with strategy. Then, and only then, we build.',
    sections: [
      { title: '01 · RETHINK', body: ['We do not ask where can we put AI. We ask where your model leaks. The Leverage Assessment maps how work actually flows through your firm: what must stay in your hands, what steals your hours, what compounds over time.'] },
      { title: '02 · BUILD', body: ['We build on your processes, not on a template. Every agent is shaped to your method and your voice, and every install carries a goal written before the first line of code. A number, not a vibe.'] },
      { title: '03 · OPERATE', body: ['A system nobody operates dies in three weeks. We run yours every day: human review, approval ledger, a monthly working session on the numbers, a new agent every quarter. Your private environment, your data, your models if you prefer, zero lock-in.'] },
      { title: '04 · TRAIN', body: ['The last phase is making you dangerous without us. We train your team to run, correct, and extend the system. Yes, we teach you to need us less. It is bad for our invoicing. It is exactly why every client has stayed.'] },
      { title: 'THE APPROVAL LEDGER, IN PRACTICE', body: ['Nothing ships without your yes is not a slogan. It is a queue. Every message, quote, and post the system drafts lands in one place: your approval ledger, inside the messaging app you already use (Telegram). You read, you tap yes, it ships. You tap no, it dies.'] },
    ], cta: CTA, ctaHref: '/assessment',
  },
  '/agents': {
    kicker: '№ 03 The workforce', title: 'Twelve agents. One job each. Your processes.',
    intro: 'Monday, 7:58am. Before your coffee is drinkable, the briefing is on your phone: today\'s three priorities, the two risks worth your attention, the four drafts waiting for your yes. Baibot did it, because that is its one job, the way each of the twelve has exactly one job.',
    sections: [
      { title: 'BAIBOT · THE COORDINATOR', body: ['Syncs the team, prioritizes the day, flags the risks before they are fires. Your single point of contact.'] },
      { title: 'BOB · SALES', body: ['Opens doors and turns conversations into deals. Drafts every approach in your voice, works your dormant network, never sends a word you have not approved.'] },
      { title: 'EVA · EXECUTIVE OPS', body: ['Meetings to minutes to follow-through, with nothing lost. The commitments you make in room three actually happen by Friday.'] },
      { title: 'SOFI · SIGNALS', body: ['Sees markets, feeds, role changes, and openings before they are obvious. Your morning brief reads like you have a research desk.'] },
      { title: 'MEMO · MEMORY', body: ['Keeps the full context and makes your firm knowledge usable again. The proposal from 2023 that would save you two hours today is found and summarized.'] },
      { title: 'THE COVENANT', body: ['Not another team of generic personas. Twelve specialists, each shaped to how your firm actually works, each reporting into one ledger, each blocked from sending anything without your yes.'] },
    ], cta: CTA, ctaHref: '/assessment',
  },
  '/cases': {
    kicker: '№ 06 Proof', title: 'Verified numbers, not vibes.',
    intro: 'Every number on this site is real, auditable, and approved by the client it belongs to. What we can tell you at brand level: every client from day one is still a client. Six systems run in production, from pipeline to research to brand. Nothing has shipped without an owner\'s yes.',
    sections: [{ title: 'THE CASE CARD', body: [...firstClientCase.card] }], cta: 'Read the first case →', ctaHref: '/cases/first-client',
  },
  '/cases/first-client': {
    kicker: 'Case 01 · Interim management and executive search advisory', title: 'One system. One client. Three months. 139 qualified meetings.',
    intro: "Franck's business is his network. The problem was never the asset, it was the hours: between mandates, delivery, and travel, the network sat unworked.",
    sections: [
      { title: 'THE INSTALL', body: ['A visibility and network engine: SoFI watches the signals, Memo holds the full context on every relationship, Bob drafts every approach in Franck\'s voice. One rule was welded into the system: nothing leaves without Franck\'s yes, tapped in Telegram.'] },
      { title: 'THE NUMBERS · 3 months', body: ['139 qualified meetings booked · 24% reply rate · 90 meetings held · 0 messages without approval', 'For scale: cold outreach averages a 3.4% reply rate across billions of sends (Instantly 2026 benchmark). Franck\'s system replies at 24%.'] },
      { title: 'THE COVENANT IN PRACTICE', body: ['Franck approved every single message before it went out. Ten minutes a day, mostly between meetings. Some he rewrote. Some he killed. The system learned from both. The machine did the work, the man kept the name.'] },
      { title: 'THE QUOTE', body: [firstClientCase.quote, firstClientCase.attribution] },
    ], cta: CTA, ctaHref: '/assessment',
  },
  '/book': {
    title: 'Thirty minutes. Your real week on the table.', intro: 'No slides, no pitch deck, no let me tell you about our journey. You bring last week\'s calendar. We find the fifteen-hour leak together. If there is a fit, we will tell you exactly what the next step costs.',
    sections: [{ title: 'HOW THE 30 MINUTES GO', body: ['Minutes 0 to 3: the frame. Diagnostic, not demo.', 'Minutes 3 to 15: the leak. Your last week, hour by hour.', 'Minutes 15 to 22: the math. Hours times people times weeks.', 'Minutes 22 to 30: the verdict. Fit or no fit, said out loud.'] }, { title: 'BRING', body: ['Last week\'s calendar and one task that made you think a machine should be doing this by now.'] }], cta: 'Book my 30-min call', ctaHref: 'https://cal.welcometotheaijungle.com/loic/intro',
  },
  '/about': {
    kicker: '№ 02 The operator', title: 'Operators first. Builders second.', intro: 'I did not start AI Jungle because AI is exciting. I started it because I was drowning.',
    sections: [{ title: 'WHY THIS EXISTS', body: ['Ten-plus years building and running businesses across Europe and India. A 25-million-euro industrialisation roadmap on my desk. Teams across cultures and time zones, a demanding job, a family, and the same 24 hours you get.', 'I built the system. First for myself, because I needed it to survive my own life. MAIDA, my managed assistant, ran my days before it ran anyone else\'s. Then the firms around me started asking: does it actually work? So we productized the answer.'] }, { title: 'WHY APPROVAL-FIRST', body: ['Owner-led firms are reputation businesses. Reputations die from one wrong message with your name on it. Nothing ships without your yes.'] }], cta: CTA, ctaHref: '/assessment',
  },
  '/agency': {
    title: 'A business performance agency. Not an automation shop.', intro: 'Automation shops start with tools and go looking for problems. We start with your P&L and your calendar, find where the model leaks, and only then decide what to build.',
    sections: [{ title: 'THE ORDER OF OPERATIONS', body: ['Rethink, Build, Operate, Train: the same arc as a consulting engagement, with software that stays after the slides would have left.', 'An owner-led firm of 5 to 50. A Leverage Assessment that finds three installable opportunities or costs nothing. A first agent live in 30 to 45 days against a written success gate. Every output through one approval ledger. Every number verified.'] }], cta: CTA, ctaHref: '/assessment',
  },
  '/ai': {
    title: 'AI automation consultant for owner-led firms', intro: 'Most AI automation consultants hand you a workflow diagram and an invoice, then disappear before the system meets reality. We rethink the strategy first, build the automation on your firm processes, operate it daily, and train your team to run it.',
    sections: [{ title: 'THE DIFFERENCE', body: ['We work with owner-led firms in consulting, advisory, executive search and wealth management, where the real constraint is not software, it is the founder\'s hours.', 'Installs run $7,500 to $15,000 fixed. Ongoing operation from $5,000/month with a performance share on results we can prove.', 'Ask each consultant who operates this after launch, and what happens when it misses its number. Our answers are we do, daily, and we fix it on our time.'] }], cta: CTA, ctaHref: '/assessment',
  },
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function nav(): string {
  return `<nav class="site-nav"><a class="site-mark" href="/">AI JUNGLE</a><div class="site-links"><a href="/agency">Agency</a><a href="/method">Method</a><a href="/agents">Agents</a><a href="/cases">Cases</a><a href="/assessment">Assessment</a><a href="/pricing">Pricing</a><a href="/board">Board</a><a href="/roast">Roast my site</a><a href="/book">Book a call</a></div></nav>`
}

export function renderBusinessPage(root: HTMLElement, path: string): void {
  const page = pages[path]
  if (!page) {
    renderNotFound(root)
    return
  }
  root.innerHTML = `<main class="business-page"><div class="site-shell">${nav()}<header class="business-hero">${page.kicker ? `<p class="eyebrow">${escapeHtml(page.kicker)}</p>` : ''}<h1>${escapeHtml(page.title)}</h1>${page.intro ? `<p class="business-intro">${escapeHtml(page.intro)}</p>` : ''}<a class="button button-primary" href="${escapeHtml(page.ctaHref ?? '/assessment')}">${escapeHtml(page.cta ?? CTA)}</a></header><div class="business-sections">${page.sections.map((section) => `<section class="business-section">${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('')}</div><footer class="site-footer"><strong>Human-directed, AI-executed.</strong><span>We install and operate custom AI agent systems for owner-led firms of 5 to 50.</span><a href="/board">Board</a><a href="/rules">Rules</a><a href="/roast">Roast my site</a><button class="footer-action" data-action="improve">Improve this</button><a href="/">Play the Living Pitch →</a></footer></div></main>`
  capture('business_page_view', { page: path })
}

export function renderNotFound(root: HTMLElement): void {
  root.innerHTML = `<main class="business-page not-found"><div class="site-shell">${nav()}<header class="business-hero"><p class="eyebrow">404 · SYSTEM DRIFT</p><h1>This page leaked out of the system.</h1><p class="business-intro">It is the only thing here that ships unapproved.</p><div class="actions"><a class="button button-quiet" href="/">Back to solid ground →</a><a class="button button-primary" href="/assessment">${CTA}</a></div></header></div></main>`
  capture('page_not_found')
}
