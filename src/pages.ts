import { siteNav, bindNav } from './nav.ts'
import { capture } from './analytics.ts'

// Every word of copy on these pages comes verbatim from the copy master
// (05-aijungle-site-copy-v1.md). Do not paraphrase, trim, or "improve" it here:
// the master is the single home of the voice.

const CTA = 'Get my 3 installable opportunities →'
const TRUSTPILOT = 'https://www.trustpilot.com/review/welcometotheaijungle.com'
const CAL = 'https://cal.welcometotheaijungle.com/loic/intro'

type Step = { n: string; title: string; body: string }
type QA = { q: string; a: string }
type Stat = { value: string; label: string }
type AgentCard = { name: string; animal: string; role: string; img: string; body: string; starts: string }

type Block =
  | { kind: 'scene'; text: string }
  | { kind: 'prose'; title?: string; paras: string[]; link?: { label: string; href: string } }
  | { kind: 'steps'; title?: string; items: Step[] }
  | { kind: 'qa'; title?: string; items: QA[] }
  | { kind: 'stats'; items: Stat[]; note?: string }
  | { kind: 'quote'; text: string; attribution: string }
  | { kind: 'split'; yes: { title: string; body: string }; no: { title: string; body: string } }
  | { kind: 'agents'; items: AgentCard[] }
  | { kind: 'callout'; label: string; paras: string[] }

type FinalCall = { title: string; paras: string[]; ctaLabel?: string; ctaHref?: string; note?: string }

type Page = {
  kicker?: string
  title: string
  lead: string[]
  ctaLabel?: string
  ctaHref?: string
  microcopy?: string
  blocks: Block[]
  final?: FinalCall
}

const DEFAULT_FINAL: FinalCall = {
  title: 'Get your 3 installable opportunities.',
  paras: [
    'The Leverage Assessment finds the first work worth installing. Three installable opportunities, ranked by dollar impact, or you pay nothing. The fee comes off your first install either way. The only thing you risk is finding out exactly where your week goes.',
  ],
  ctaLabel: CTA,
  ctaHref: '/assessment',
  note: 'Prefer email? hello@welcometotheaijungle.com',
}

const AGENTS: AgentCard[] = [
  { name: 'BAIBOT', animal: 'Baboon', role: 'The Coordinator', img: 'baibot', body: "Syncs the team, prioritizes the day, flags the risks before they're fires. Your single point of contact: you talk to Baibot, Baibot runs the rest.", starts: 'your calendar and your priorities, day one.' },
  { name: 'BOB', animal: 'Lion', role: 'Sales', img: 'bob', body: "Opens doors and turns conversations into deals. Drafts every approach in your voice, works your dormant network, never sends a word you haven't approved.", starts: "your ICP and the 200 contacts you've been meaning to call for two years." },
  { name: 'EVA', animal: 'Dog', role: 'Executive Ops', img: 'eva', body: 'Meetings to minutes to follow-through, with nothing lost. The commitments you make in room three actually happen by Friday.', starts: 'your last ten meetings.' },
  { name: 'NESTOR', animal: 'Hummingbird', role: 'Speed-to-lead', img: 'nestor', body: 'Answers the site and the phone before leads go cold. Because the firm that responds in four minutes beats the firm that responds in four hours, almost every time.', starts: 'the honest truth about your current response time.' },
  { name: 'MONI', animal: 'Owl', role: 'Finance', img: 'moni', body: 'Follows invoices, cash, and deadlines through to the end. The polite third reminder you hate sending? Moni drafts it, you approve it, it goes.', starts: 'your aging receivables.' },
  { name: 'MEMO', animal: 'Elephant', role: 'Memory', img: 'memo', body: "Keeps the full context and makes your firm's knowledge usable again. The proposal from 2023 that would save you two hours today? Found, summarized, on your desk.", starts: 'ingesting what your firm already knows and forgot it knew.' },
  { name: 'SoFI', animal: 'Giraffe', role: 'Signals', img: 'sofi', body: "Sees over the grass: markets, feeds, role changes, openings, before they're obvious. Your morning brief reads like you have a research desk. You do now.", starts: 'the fifty accounts and people you actually care about.' },
  { name: 'HIPO', animal: 'Hippo', role: 'Marketing', img: 'hipo', body: 'Keeps the brand visible and grows attention every day, in your voice, from your real work. One receipt a week becomes a post, a thread, an article.', starts: "the best material you've already made and stopped using." },
  { name: 'SENSEI', animal: 'Panda', role: 'Learning', img: 'sensei', body: 'Turns your material into coaching and tracks mastery. New hires stop asking the same five questions, because the answers coach them instead.', starts: 'your onboarding pain.' },
  { name: 'JIMMY', animal: 'Tiger', role: 'Builder', img: 'jimmy', body: 'Turns ideas into systems your team actually uses. The workflow everyone complains about on Fridays becomes a tool by the next one.', starts: 'that workflow. You know the one.' },
  { name: 'CBO', animal: 'Parrot', role: 'Design', img: 'cbo', body: 'Shapes the visual language and keeps the brand sharp across everything that ships. No more decks that look like three different firms made them.', starts: 'your existing brand assets.' },
  { name: 'GORIA', animal: 'Gorilla', role: 'QA & Security', img: 'goria', body: 'Checks what matters and keeps the systems safe. The agent that audits the other agents, because trust is good and verification is billable.', starts: 'before anything else ships. Always.' },
]

const pages: Record<string, Page> = {
  '/assessment': {
    kicker: 'The Leverage Assessment · 2 to 3 weeks',
    title: 'Three installable opportunities. Or you pay nothing.',
    lead: [
      "In two to three weeks, we map where your firm actually leaks hours, put a dollar figure on each leak, and hand you the Leverage Map: your top three agent opportunities, ranked by impact, each with an install scope and a written success gate. Three, or it's free. And if we find them, the fee comes off your first install. Read that again: the only outcome where you lose money is the one where we've already proven we can make you more.",
    ],
    ctaLabel: CTA, ctaHref: '/book',
    microcopy: '$999, published right here, in plain sight. Fully credited toward your first install.',
    blocks: [
      { kind: 'scene', text: "The first call opens with your calendar, not our slides. Last week, hour by hour. Somewhere around Tuesday afternoon you'll go quiet, because you'll see it: the two hours rebuilding a brief that existed somewhere, the follow-up you drafted in your head and never sent, the CRM you update in the car. That silence is where we start." },
      { kind: 'prose', title: 'What you walk away with', paras: [
        'The Leverage Map. A document you can act on without us.',
        'Your top three installable opportunities, ranked by dollar impact. Not "AI ideas". Opportunities: each one comes with the process it plugs into, the agent shape that fits it, a fixed install scope, and a draft success gate. A number, not a vibe. Plus the order to install them in, because sequence is half the value.',
        "It's yours. Take it to another vendor if you want. Nobody has, but the door is open, and that's the point.",
      ] },
      { kind: 'steps', title: 'How it runs', items: [
        { n: 'WEEK 1', title: 'We listen.', body: 'Interviews with you and the people who actually touch the work. We map how work really flows through your firm, not how the org chart claims it does. This is where the bodies are buried, and everyone knows exactly where.' },
        { n: 'WEEK 2', title: 'We count.', body: "Every leak gets a number: hours lost, delay cost, error cost, deals that died of slowness. Consultants are professional skeptics, so we do the math you'd do to us." },
        { n: 'WEEK 3', title: 'We hand you the map.', body: 'A working session, not a reveal. We walk the three opportunities, you push back, we defend or concede. You leave knowing your first install, its price, and its success gate. Then you decide. No countdown timer, no "this offer expires".' },
      ] },
      { kind: 'split',
        yes: { title: 'For you if', body: 'Your firm runs on your judgment and your hours. Consulting, advisory, executive search, wealth management, 5 to 50 people. You want leverage, and you refuse to let a machine speak in your name unsupervised.' },
        no: { title: 'Not for you if', body: "You want AI to replace your judgment instead of multiplying it. You want volume spam with your signature on it. You collect tools the way some people collect gym memberships. We'll save us both the call." } },
      { kind: 'qa', title: "The questions you're already asking", items: [
        { q: 'Is this a sales pitch in disguise?', a: "It's a diagnostic with a guarantee attached. If the map is weak, you pay nothing and keep it anyway. The assessment sells the install only if the numbers do." },
        { q: "We're not technical. At all.", a: 'Good. Neither are your clients, and you still manage to be indispensable to them. You bring the process knowledge, we bring the build. Your team needs zero code, one messaging app, and opinions.' },
        { q: 'Where does our data sit?', a: "In a private, secured environment per client. Your data stays yours, your models if you prefer, no lock-in. We'll put it in writing before we see a single file." },
        { q: 'We already tried AI. It wrote like a robot and we quit.', a: "You tried a tool. Nobody operated it, so it died in three weeks, like every unowned system does. That's not an AI failure, that's an orphan failure. Operating is literally the third phase of our method." },
        { q: "Why wouldn't we just do this with ChatGPT?", a: 'You can, the way you can do your own legal work. The question is whether the founder of the firm should spend evenings prompt-engineering, or approving finished work in ten minutes a day.' },
      ] },
    ],
    final: { title: 'Get your 3 installable opportunities.', paras: ["Three, or it's free. The fee comes off your first install."], ctaLabel: CTA, ctaHref: '/book', note: 'Prefer email? hello@welcometotheaijungle.com' },
  },

  '/method': {
    kicker: '№ 05 The method',
    title: "We don't sell automation. We rethink the firm, then we run it.",
    lead: [
      "We sell to consulting firms. Which means the hardest audience on earth: people paid to take other people's methods apart. This page is written for that exam.",
      "Automation means doing the same thing faster. If your model leaks, it leaks faster. We're operators: we built and ran companies before we built agents, and this site runs on the same agent workforce we install for clients. So we start where a peer would start. With strategy. Then, and only then, we build.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'steps', items: [
        { n: '01', title: 'Rethink', body: 'We don\'t ask "where can we put AI". We ask where your model leaks. The Leverage Assessment maps how work actually flows through your firm: what must stay in your hands, what steals your hours, what compounds over time. You leave with the Leverage Map: your three installable opportunities, ranked by dollar impact, with an install scope. Three opportunities or it\'s free.' },
        { n: '02', title: 'Build', body: 'We build on your processes, not on a template. Every agent is shaped to your method and your voice, and every install carries a goal written before the first line of code. A number, not a vibe. Fixed scope, fixed price, signed before we start. First agent live in 30 to 45 days.' },
        { n: '03', title: 'Operate', body: 'A system nobody operates dies in three weeks. We run yours every day: human review, approval ledger, a monthly working session on the numbers, a new agent every quarter. Your private environment, your data, your models if you prefer, zero lock-in. And our pay follows proven performance.' },
        { n: '04', title: 'Train', body: "The last phase is making you dangerous without us. We train your team to run, correct, and extend the system: operator sessions, coaching built on your own material, documented skill progression. Yes, we teach you to need us less. It's bad for our invoicing. It's exactly why every client has stayed." },
      ] },
      { kind: 'prose', title: 'The approval ledger, in practice', paras: [
        '"Nothing ships without your yes" is not a slogan. It\'s a queue.',
        'Every message, quote, and post the system drafts lands in one place: your approval ledger, inside the messaging app you already use (Telegram). You read, you tap yes, it ships. You tap no, it dies, and the system learns why. Ten minutes a day, usually over coffee. Every decision is logged, timestamped, and inspectable. When we say a number, you can audit the trail behind it.',
      ] },
      { kind: 'quote', text: "It's the first employee who shows you everything before doing anything.", attribution: 'One client put it best' },
      { kind: 'callout', label: 'The success gate', paras: [
        'A number, not a vibe.',
        "Before we build anything, we write the gate together: the metric, the threshold, the date. Meetings booked. Hours recovered. Response time. Whatever your firm actually bleeds. It's signed before we start, reviewed monthly, and it decides whether we've earned the next phase. Most vendors call this terrifying. We call it Tuesday.",
      ] },
      { kind: 'prose', title: 'We run on what we sell', paras: [
        "This site, and the network of businesses around it, is built, QA'd and operated by the same twelve agents we install for clients. The briefs, the follow-ups, the research, the drafts you're reading: agents drafted, a human approved. When you buy from us, you're buying the system we trust our own revenue to. We can't ship you anything we wouldn't run ourselves, because you'd be able to tell.",
        "That's the difference between installing a tool and rethinking a firm. Tools all look alike. Firms don't.",
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/agents': {
    kicker: '№ 03 The workforce',
    title: 'Twelve agents. One job each. Your processes.',
    microcopy: "For owner-led firms of 5 to 50. Three installable opportunities or it's free.",
    lead: [
      "Monday, 7:58am. Before your coffee is drinkable, the briefing is on your phone: today's three priorities, the two risks worth your attention, the four drafts waiting for your yes. You didn't write it. You didn't chase anyone for it. Baibot did, because that's its one job, the way each of the twelve has exactly one job. Specialists, not a chatbot wearing twelve hats.",
      "Here's the team. Each one shaped to your firm's process during install, not shipped from a template. Each one reporting into one ledger. Each one blocked from sending anything without your yes.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'agents', items: AGENTS },
      { kind: 'callout', label: 'The closer', paras: [
        "Not another team of generic personas. Off-the-shelf AI employees ship someone else's process with a costume on. These twelve get shaped to yours during install, which is why the results compound instead of plateauing. And all twelve share one hard rule they cannot break: nothing ships without your yes.",
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/cases': {
    kicker: '№ 06 Proof',
    title: 'Verified numbers, not vibes.',
    lead: [
      "Every number on this site is real, auditable, and approved by the client it belongs to. That policy has a cost: most of our case studies are operational but unpublished, because the clients haven't cleared their metrics yet, and we don't publish what we can't prove. So this page is shorter than our competitors' pages. We're comfortable with that trade.",
      'What we can tell you at brand level: every client from day one is still a client. Six systems run in production, from pipeline to research to brand. And nothing, ever, has shipped without an owner\'s yes.',
    ],
    ctaLabel: "Read Franck's case →", ctaHref: '/cases/first-client',
    microcopy: 'Case 01 · One system. One client. Three months. 139 qualified meetings.',
    blocks: [],
    final: { ...DEFAULT_FINAL, title: "Read Franck's case.", paras: ['One system. One client. Three months.'], ctaLabel: "Read Franck's case →", ctaHref: '/cases/first-client', note: undefined },
  },

  '/cases/first-client': {
    kicker: 'Case 01 · Interim management and executive search advisory',
    title: 'One system. One client. Three months. 139 qualified meetings.',
    microcopy: "For owner-led firms of 5 to 50. Three installable opportunities or it's free.",
    lead: [
      "Franck's business is his network. Twenty years of executives who take his calls. The problem was never the asset, it was the hours: between mandates, delivery, and travel, the network sat unworked. The people who could sign his next three deals hadn't heard from him in a year. He knew it. Knowing it didn't create the hours.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'prose', title: 'The install', paras: [
        "A visibility and network engine: SoFI watches the signals (role changes, funding, moves worth a call), Memo holds the full context on every relationship, Bob drafts every approach in Franck's voice. And one rule welded into the system before the first message: nothing leaves without Franck's yes, tapped in Telegram, wherever he is.",
      ] },
      { kind: 'stats', items: [
        { value: '139', label: 'qualified meetings booked' },
        { value: '24%', label: 'reply rate' },
        { value: '90', label: 'meetings held' },
        { value: '0', label: 'messages without approval' },
      ], note: "For scale: cold outreach averages a 3.4% reply rate across billions of sends (Instantly 2026 benchmark). Franck's system replies at 24%. The difference isn't magic, it's that every message went to someone specific, about something real, in a voice that's actually his, approved by the only person who could tell." },
      { kind: 'prose', title: 'The covenant in practice', paras: [
        "Franck approved every single message before it went out. Ten minutes a day, mostly between meetings. Some he rewrote. Some he killed. The system learned from both. That's the part no screenshot shows and the part that matters most: the machine did the work, the man kept the name.",
      ] },
      { kind: 'quote', text: 'In the last three months, the agent helped me book more than 90 qualified meetings with executives I would never have had time to reach, and I approved every single message before it went out. It works while I am in meetings.', attribution: 'Franck Euvrard, Partner, Asia-Connect Executive Partners' },
      { kind: 'callout', label: 'Status', paras: ['Still a client. Still approving every message. Next agent installs this quarter.'] },
    ],
    final: { ...DEFAULT_FINAL, paras: ['Your network has the same dust on it.', ...DEFAULT_FINAL.paras] },
  },

  '/pricing': {
    kicker: '№ 08 Pricing',
    title: 'Flat fees. Written gates. Skin in the game.',
    lead: [
      "You bill for judgment, so you know what pricing games look like from the inside. Here's ours, in full, before any call: fixed prices, a success gate signed before we build, and a slice of our pay riding on results we can prove. No hourly meters running quietly. No percentage of your ad spend, ever. No invoice you have to read twice.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'steps', items: [
        { n: 'STEP 1', title: 'The Leverage Assessment · 2 to 3 weeks', body: '$999, published, fixed. Your three installable opportunities, ranked by dollar impact, each with a scope and a draft success gate. Three or it\'s free, and the fee is fully credited toward your first install. The only scenario where you pay for the assessment and nothing else is the one where you take the map and walk. The door is open. Nobody has.' },
        { n: 'STEP 2', title: 'First agent install · 30 to 45 days', body: 'Typically $7,500 to $15,000. Fixed scope, fixed price, signed before we start. Your #1 leverage point goes live: one agent built on your processes, your team trained on it, the approval ledger running, and 30 days operated by us. Every install carries a written success gate agreed before we build. A number, not a vibe.' },
        { n: 'STEP 3', title: 'The partnership · 6-month minimum', body: 'From $5,000/month, plus a performance share on results we can prove. We operate the system: daily operation and human review, a monthly working session on the numbers, a new agent installed every quarter, and your team trained deeper each cycle. Your private, secured environment included: your data, your models if you prefer, no lock-in.' },
      ] },
      { kind: 'prose', title: 'Why the performance share', paras: [
        "Because flat retainers reward showing up and we'd rather be rewarded for moving numbers. The share only counts results the ledger can prove, which means we're financially allergic to vanity metrics. It also means our incentive and yours point the same direction: if the system stalls, our income stalls with it. Most agencies won't structure this. Ask them why.",
      ] },
      { kind: 'callout', label: "What you'll never pay us for", paras: [
        'A percentage of your ad spend. Hourly overruns. "Discovery" that discovers you need more discovery. Seats, per-user fees, or any pricing that punishes you for growing. Exit fees: the system runs in your environment, and if you leave, it leaves with you.',
      ] },
      { kind: 'qa', title: 'The questions that decide it', items: [
        { q: 'What if the install misses its gate?', a: "Then we fix it on our time until it passes, or we say plainly that we were wrong, and the partnership doesn't start. The gate exists to protect both of us from politeness." },
        { q: 'Who owns the system?', a: "You do. Your environment, your data, your processes encoded. We operate it; we don't hold it hostage." },
        { q: 'Can we pause?', a: "The partnership has a 6-month minimum because systems die without operation and we won't sell you a slow death. After that, you can pause, scale, or take it in-house. Phase four of our method literally trains you for that." },
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/about': {
    kicker: '№ 02 The operator',
    title: 'Operators first. Builders second.',
    microcopy: "For owner-led firms of 5 to 50. Three installable opportunities or it's free.",
    lead: ["I didn't start AI Jungle because AI is exciting. I started it because I was drowning."],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'prose', paras: [
        'Ten-plus years building and running businesses across Europe and India. A 25-million-euro industrialisation roadmap on my desk. Teams across cultures and time zones, a demanding job, a family, and the same 24 hours you get. The choice in front of me was the one in front of you: hire more people I\'d have to fund, train and manage, or build a system that carried the weight without diluting my name.',
        "I built the system. First for myself, because I needed it to survive my own life. MAIDA, my managed assistant, ran my days before it ran anyone else's. Then the firms around me started asking the only question that matters: does it actually work? So we productized the answer.",
      ] },
      { kind: 'prose', title: 'Why "Jungle"', paras: [
        "Because that's what the AI market is right now. Loud, overgrown, full of things that look impressive and will absolutely eat your budget. You don't survive a jungle with enthusiasm. You survive it with a guide who lives there. We live there: this site, our pipeline, our research, our follow-ups all run on the same twelve agents we install for clients. We eat here first.",
      ] },
      { kind: 'prose', title: 'Why approval-first', paras: [
        "Because owner-led firms are reputation businesses, and reputations don't die from missed opportunities. They die from one wrong message with your name on it. So we welded the rule into everything before we wrote our first line of client code: nothing ships without your yes. It slows the machine down by ten minutes a day. It's the ten minutes that lets you sleep.",
      ] },
      { kind: 'callout', label: 'The short version', paras: [
        "We rethink your strategy with AI. We build on your processes. We operate every day. We train your team to need us less. Every client from day one is still a client, and part of our pay rides on the numbers we can prove. That's the whole firm, in five sentences that don't require a single slide.",
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/book': {
    title: 'Thirty minutes. Your real week on the table.',
    lead: [
      'No slides, no pitch deck, no "let me tell you about our journey". You bring last week\'s calendar. We find the fifteen-hour leak together. If there\'s a fit, we\'ll tell you exactly what the next step costs. If there isn\'t, we\'ll tell you that too, and you\'ll have lost half an hour and gained a map of your own week. People have paid consultants for worse.',
    ],
    ctaLabel: 'Book my 30-min call', ctaHref: CAL,
    blocks: [
      { kind: 'steps', title: 'How the 30 minutes go', items: [
        { n: '0-3', title: 'The frame.', body: 'Diagnostic, not demo. You can hold us to it.' },
        { n: '3-15', title: 'The leak.', body: 'Your last week, hour by hour, until we find where the senior time bleeds.' },
        { n: '15-22', title: 'The math.', body: 'Hours times people times weeks. A number, not a vibe.' },
        { n: '22-30', title: 'The verdict.', body: "Fit or no fit, said out loud, with the price attached if it's yes." },
      ] },
      { kind: 'split',
        yes: { title: 'Bring', body: 'Last week\'s calendar and one task that made you think "a machine should be doing this by now."' },
        no: { title: "Don't book if", body: "You want AI to replace your judgment, you want unsupervised volume with your name on it, or you're shopping for a demo to forward. We'd be wasting your slot, and slots are the one thing we genuinely don't have many of." } },
      { kind: 'prose', title: 'Under the calendar', paras: [
        'Prefer to start async? The Leverage Assessment page has the full scope and the price in plain sight.',
      ], link: { label: 'Get my 3 installable opportunities →', href: '/assessment' } },
    ],
    final: { title: 'Thirty minutes. Your real week on the table.', paras: ['No slides. No toy demo. Thirty minutes, your real week on the table, and we find the leak.'], ctaLabel: 'Book my 30-min call', ctaHref: CAL, note: 'Prefer email? hello@welcometotheaijungle.com' },
  },

  '/agency': {
    title: 'A business performance agency. Not an automation shop.',
    microcopy: "For owner-led firms of 5 to 50. Three installable opportunities or it's free.",
    lead: [
      "The difference is the order of operations. Automation shops start with tools and go looking for problems. We start with your P&L and your calendar, find where the model leaks, and only then decide what to build. Rethink, Build, Operate, Train: the same arc as a consulting engagement, because that's what this is, with software that stays after the slides would have left.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'prose', title: 'What that looks like in practice', paras: [
        'An owner-led firm of 5 to 50, a Leverage Assessment that finds three installable opportunities or costs nothing, a first agent live in 30 to 45 days against a written success gate, a partnership where we operate daily and install a new agent every quarter, and a training arc that makes your team dangerous without us. Every output through one approval ledger. Every number verified. Every client from day one, still here.',
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/contact': {
    title: 'Talk to a human. We keep several.',
    lead: [
      "hello@welcometotheaijungle.com reaches a person, not a ticket queue. If it's about working together, the fastest path is the 30-minute call: your real week on the table, no slides. If it's press, partnerships, or you found a typo, email works, and yes, an agent will draft the reply, and yes, a human will approve it. We practice what we sell even when it's slower.",
    ],
    ctaLabel: 'Book my 30-min call', ctaHref: CAL,
    blocks: [],
    final: DEFAULT_FINAL,
  },

  '/ai-automation-consultant': {
    title: 'AI automation consultant for owner-led firms',
    lead: [
      "Most AI automation consultants hand you a workflow diagram and an invoice, then disappear before the system meets reality. We're the consultant who stays: we rethink the strategy first, build the automation on your firm's own processes, operate it daily, and train your team to run it. Four phases, one approval ledger, and a rule no automation is allowed to break: nothing ships without your yes.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'prose', paras: [
        "We work with owner-led firms of 5 to 50 in consulting, advisory, executive search and wealth management, where the real constraint isn't software, it's the founder's hours. The engagement starts with the Leverage Assessment: three installable automation opportunities ranked by dollar impact, or you pay nothing. Installs run $7,500 to $15,000 fixed. Ongoing operation from $5,000/month with a performance share on results we can prove.",
        'If you\'re comparing consultants, ask each one two questions: who operates this after launch, and what happens when it misses its number? Our answers are "we do, daily" and "we fix it on our time." Get theirs in writing.',
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/managed-ai-agent-service': {
    title: 'Managed AI agent service: installed, operated, approved by you',
    lead: [
      "A managed AI agent service means you don't buy software, you buy an outcome with an operator attached. We install agents built on your firm's processes, run them every day (human review, approval ledger, monthly working session on the numbers), and add a new agent every quarter. Your environment stays private, your data stays yours, and there's no lock-in: phase four of our method trains your team to run the system without us.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'prose', paras: [
        'The difference from "AI employee" platforms is the direction of adaptation. Platforms ship a generic persona and ask your firm to adapt to it. We map your process first, shape the agent to it, and weld in the covenant: every message, quote and post waits for the owner\'s yes in one Telegram ledger before it ships.',
        'Every client from day one is still a client. Six systems run in production, from pipeline to research to brand. Start with the Leverage Assessment: three installable opportunities or it\'s free.',
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/ai-agents-for-boutique-consulting-firms': {
    title: 'AI agents for boutique consulting firms',
    lead: [
      "Boutique consulting has a math problem: revenue scales with headcount, headcount scales with risk, and the founder's hours don't scale at all. AI agents break that line, but only if they're built on your methodology instead of a template, because your methodology is the product.",
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'prose', paras: [
        "That's the entire design principle here. During install, each agent is shaped to how your firm actually works: how you research, how you write, how you follow through. SoFI runs your desk research with every source labeled fact, inference or hypothesis. Memo makes your past engagements searchable and useful again. Bob works your dormant network in your voice. Eva turns meetings into follow-through. And a senior human signs everything, because a deliverable you can't defend is one you can't bill.",
        'We sell to consultants, so the proof standard is yours: verified numbers, a written success gate before any build, and a fee structure where part of our pay rides on results we can prove. Case level: one system booked 139 qualified meetings in three months at a 24% reply rate, with zero unapproved messages. Cold email averages 3.4% (Instantly 2026 benchmark). The gap is the methodology.',
      ] },
    ],
    final: DEFAULT_FINAL,
  },

  '/business-development-ai-agent': {
    title: 'A business development AI agent that never sends without you',
    lead: [
      'The market is full of BD agents that spray a thousand templated emails and torch your domain along with your reputation. Bob is built on the opposite bet: fewer messages, real context, your voice, and a hard gate. Every single approach holds in your approval ledger until you tap yes. You edit some, kill some, approve the rest, ten minutes a day, and the system learns from every decision.',
    ],
    ctaLabel: CTA, ctaHref: '/assessment',
    blocks: [
      { kind: 'prose', paras: [
        'Under the hood, Bob doesn\'t work alone. SoFI feeds it signals worth acting on (role changes, funding, moves that justify a call), and Memo holds the full history of every relationship, so no one gets a "great to connect" email from a firm they\'ve known for a decade. The result reads like you on a very organized day, because that\'s literally what it is.',
        'In production, this shape booked 139 qualified meetings in three months for an executive search partner, at a 24% reply rate against a 3.4% market average (Instantly 2026 benchmark), with zero messages sent unapproved. His network, his voice, his yes, multiplied.',
      ] },
    ],
    final: DEFAULT_FINAL,
  },
}

export const businessPagePaths: string[] = Object.keys(pages)

// Semantic, DOM-free rendering of the same page data, used at build time to
// give every route real content for agents and crawlers that never run JS.
export function staticPageHtml(path: string): string | null {
  const page = pages[path]
  if (!page) return null
  const parts: string[] = ['<main>']
  if (page.kicker) parts.push(`<p>${escapeHtml(page.kicker)}</p>`)
  parts.push(`<h1>${escapeHtml(page.title)}</h1>`)
  for (const paragraph of page.lead) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
  if (page.microcopy) parts.push(`<p>${escapeHtml(page.microcopy)}</p>`)
  if (page.ctaLabel) parts.push(`<p><a href="${escapeHtml(page.ctaHref ?? '/assessment')}">${escapeHtml(page.ctaLabel)}</a></p>`)
  for (const block of page.blocks) {
    if (block.kind === 'scene') parts.push(`<p>${escapeHtml(block.text)}</p>`)
    else if (block.kind === 'prose') {
      if (block.title) parts.push(`<h2>${escapeHtml(block.title)}</h2>`)
      for (const paragraph of block.paras) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
      if (block.link) parts.push(`<p><a href="${escapeHtml(block.link.href)}">${escapeHtml(block.link.label)}</a></p>`)
    } else if (block.kind === 'steps') {
      if (block.title) parts.push(`<h2>${escapeHtml(block.title)}</h2>`)
      for (const step of block.items) parts.push(`<h3>${escapeHtml(step.n)} · ${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p>`)
    } else if (block.kind === 'qa') {
      if (block.title) parts.push(`<h2>${escapeHtml(block.title)}</h2>`)
      for (const item of block.items) parts.push(`<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`)
    } else if (block.kind === 'stats') {
      parts.push(`<p>${block.items.map((stat) => `${escapeHtml(stat.value)} ${escapeHtml(stat.label)}`).join(' · ')}</p>`)
      if (block.note) parts.push(`<p>${escapeHtml(block.note)}</p>`)
    } else if (block.kind === 'quote') {
      parts.push(`<blockquote><p>${escapeHtml(block.text)}</p><footer>${escapeHtml(block.attribution)}</footer></blockquote>`)
    } else if (block.kind === 'split') {
      parts.push(`<h3>${escapeHtml(block.yes.title)}</h3><p>${escapeHtml(block.yes.body)}</p><h3>${escapeHtml(block.no.title)}</h3><p>${escapeHtml(block.no.body)}</p>`)
    } else if (block.kind === 'agents') {
      for (const agent of block.items) parts.push(`<h3>${escapeHtml(agent.name)} · ${escapeHtml(agent.animal)} · ${escapeHtml(agent.role)}</h3><p>${escapeHtml(agent.body)}</p><p>Starts with: ${escapeHtml(agent.starts)}</p>`)
    } else {
      parts.push(`<h2>${escapeHtml(block.label)}</h2>`)
      for (const paragraph of block.paras) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
    }
  }
  const final = page.final ?? DEFAULT_FINAL
  parts.push(`<h2>${escapeHtml(final.title)}</h2>`)
  for (const paragraph of final.paras) parts.push(`<p>${escapeHtml(paragraph)}</p>`)
  if (final.ctaLabel) parts.push(`<p><a href="${escapeHtml(final.ctaHref ?? '/assessment')}">${escapeHtml(final.ctaLabel)}</a></p>`)
  if (final.note) parts.push(`<p>${escapeHtml(final.note)}</p>`)
  parts.push('</main>')
  return parts.join('')
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function paragraphs(paras: string[]): string {
  return paras.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
}

function renderBlock(block: Block): string {
  if (block.kind === 'scene') {
    return `<section class="biz-block biz-scene rv"><p>${escapeHtml(block.text)}</p></section>`
  }
  if (block.kind === 'prose') {
    return `<section class="biz-block biz-prose rv">${block.title ? `<h2>${escapeHtml(block.title)}</h2>` : ''}${paragraphs(block.paras)}${
      block.link ? `<p><a class="prose-link" href="${escapeHtml(block.link.href)}">${escapeHtml(block.link.label)}</a></p>` : ''
    }</section>`
  }
  if (block.kind === 'steps') {
    return `<section class="biz-block biz-steps rv">${block.title ? `<h2>${escapeHtml(block.title)}</h2>` : ''}<ol class="steps-rail">${block.items
      .map((step, index) => `<li class="rv" style="transition-delay:${index * 90}ms"><span class="step-n">${escapeHtml(step.n)}</span><div><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.body)}</p></div></li>`)
      .join('')}</ol></section>`
  }
  if (block.kind === 'qa') {
    return `<section class="biz-block biz-qa rv">${block.title ? `<h2>${escapeHtml(block.title)}</h2>` : ''}<div class="qa-grid">${block.items
      .map((item, index) => `<article class="qa-card rv" style="transition-delay:${index * 70}ms"><h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p></article>`)
      .join('')}</div></section>`
  }
  if (block.kind === 'stats') {
    return `<section class="biz-block biz-stats rv"><div class="stat-strip">${block.items
      .map((stat, index) => `<div class="stat rv" style="transition-delay:${index * 90}ms"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`)
      .join('')}</div>${block.note ? `<p class="stat-note">${escapeHtml(block.note)}</p>` : ''}</section>`
  }
  if (block.kind === 'quote') {
    const isTrustpilotReview = block.attribution.includes('Franck Euvrard')
    return `<section class="biz-block biz-quote rv"><blockquote><p>${escapeHtml(block.text)}</p><footer>${escapeHtml(block.attribution)}${isTrustpilotReview ? ` · <a href="${TRUSTPILOT}" rel="noopener">Verified review on Trustpilot →</a>` : ''}</footer></blockquote></section>`
  }
  if (block.kind === 'split') {
    return `<section class="biz-block biz-split rv"><div class="split-grid"><article class="split-card split-yes rv"><h3>${escapeHtml(block.yes.title)}</h3><p>${escapeHtml(block.yes.body)}</p></article><article class="split-card split-no rv" style="transition-delay:90ms"><h3>${escapeHtml(block.no.title)}</h3><p>${escapeHtml(block.no.body)}</p></article></div></section>`
  }
  if (block.kind === 'agents') {
    return `<section class="biz-block biz-agents"><div class="agent-grid">${block.items
      .map((agent, index) => `<article class="agent-card rv" style="transition-delay:${(index % 3) * 80}ms"><img src="/brand/agents/${agent.img}-card.webp" alt="${escapeHtml(agent.animal)} illustration of ${escapeHtml(agent.name)}" loading="lazy" width="640" height="640"><p class="agent-role">${escapeHtml(agent.animal)} · ${escapeHtml(agent.role)}</p><h3>${escapeHtml(agent.name)}</h3><p>${escapeHtml(agent.body)}</p><p class="agent-starts"><span>Starts with:</span> ${escapeHtml(agent.starts)}</p></article>`)
      .join('')}</div></section>`
  }
  return `<section class="biz-block biz-callout rv"><p class="eyebrow">${escapeHtml(block.label)}</p>${paragraphs(block.paras)}</section>`
}

function renderFinal(final: FinalCall): string {
  return `<section class="final-call"><div class="site-shell"><div class="final-inner rv"><h2>${escapeHtml(final.title)}</h2>${paragraphs(final.paras)}${
    final.ctaLabel ? `<a class="button button-primary" href="${escapeHtml(final.ctaHref ?? '/assessment')}">${escapeHtml(final.ctaLabel)}</a>` : ''
  }${final.note ? `<p class="final-note">${escapeHtml(final.note)}</p>` : ''}<form class="newsletter-row" data-newsletter><label for="nl-email">One idea a week you can actually install. Real receipts from systems in production, no recycled AI hype. Unsubscribe anytime, no guilt trip.</label><div><input id="nl-email" name="email" type="email" placeholder="you@yourfirm.com" required><button class="button button-quiet" type="submit">Send me the next one</button></div><p class="nl-note" hidden>Locked in. The next one is on its way.</p></form></div></div></section>`
}

function revealObserver(root: HTMLElement): void {
  const targets = root.querySelectorAll<HTMLElement>('.rv')
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((element) => element.classList.add('in'))
    return
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in')
        observer.unobserve(entry.target)
      }
    }
  }, { threshold: 0.12 })
  targets.forEach((element) => observer.observe(element))
}

function wireNewsletter(root: HTMLElement, page: string): void {
  const form = root.querySelector<HTMLFormElement>('[data-newsletter]')
  if (!form) return
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const email = new FormData(form).get('email')
    if (typeof email !== 'string' || !email.includes('@')) return
    capture('newsletter_signup', { page })
    const note = form.querySelector<HTMLElement>('.nl-note')
    if (note) note.hidden = false
    // The newsletter lives on Substack; its subscribe page confirms and
    // double-opts-in, which is the same terminal step the legacy flow used.
    window.open(`https://welcometotheaijungle.substack.com/subscribe?email=${encodeURIComponent(email)}`, '_blank', 'noopener')
  })
}

export function renderBusinessPage(root: HTMLElement, path: string): void {
  const page = pages[path]
  if (!page) {
    renderNotFound(root)
    return
  }
  root.innerHTML = `<main class="business-page"><header class="biz-band">${siteNav('dark')}<div class="site-shell"><div class="biz-hero">${
    page.kicker ? `<p class="eyebrow">${escapeHtml(page.kicker)}</p>` : ''
  }<h1>${escapeHtml(page.title)}</h1>${page.lead.map((paragraph) => `<p class="biz-lead">${escapeHtml(paragraph)}</p>`).join('')}${
    page.ctaLabel ? `<a class="button button-primary" href="${escapeHtml(page.ctaHref ?? '/assessment')}">${escapeHtml(page.ctaLabel)}</a>` : ''
  }${page.microcopy ? `<p class="biz-microcopy">${escapeHtml(page.microcopy)}</p>` : ''}</div></div></header><div class="site-shell"><div class="biz-body">${page.blocks
    .map((block) => renderBlock(block))
    .join('')}</div></div>${renderFinal(page.final ?? DEFAULT_FINAL)}<div class="site-shell"><footer class="site-footer"><strong>Human-directed, AI-executed.</strong><span>We install and operate custom AI agent systems for owner-led firms of 5 to 50. Rethink, Build, Operate, Train. Nothing ships without your yes.</span><a href="/board">Board</a><a href="/rules">Rules</a><a href="/roast">Roast my site</a><button class="footer-action" data-action="improve">Improve this</button><a href="/">Play the Living Pitch →</a></footer></div></main>`
  bindNav(root)
  revealObserver(root)
  wireNewsletter(root, path)
  capture('business_page_view', { page: path })
}

export function renderNotFound(root: HTMLElement): void {
  root.innerHTML = `<main class="business-page not-found"><header class="biz-band">${siteNav('dark')}<div class="site-shell"><div class="biz-hero"><p class="eyebrow">404 · SYSTEM DRIFT</p><h1>This page leaked out of the system.</h1><p class="biz-lead">It's the only thing here that ships unapproved.</p><div class="actions"><a class="button button-quiet" href="/">Back to solid ground →</a><a class="button button-primary" href="/assessment">${CTA}</a></div></div></div></header></main>`
  bindNav(root)
  capture('page_not_found')
}
