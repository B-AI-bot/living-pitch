import { capture } from './analytics.ts'
import { wireMutationAffordance } from './colony.ts'
import { isResidentEnabled, requestResident, residentSessionState } from './resident.ts'
import { getQuestion, QUESTIONS } from './scan/index.ts'
import { findObjection, objections, getIndustryLabel, getSceneCopy, sceneQuestions, stageRender } from './engine/scenes.ts'
import {
  advanceScene,
  applyResidentAction,
  answerScanQuestion,
  choosePath,
  dismissBooking,
  getPitchState,
  markBookingBooked,
  markBookingError,
  markBookingSubmitting,
  prefillHumanBooking,
  recordResidentExchange,
  raiseObjection,
  replayAsSomeoneElse,
  setBookingSlots,
  setBookingSlotsError,
  setBookingSlotsLoading,
  setContext,
  setGenericMode,
  subscribe,
  updateBookingPrefill,
} from './engine/state.ts'
import { generatePreliminaryMap, scoreSummit } from './engine/summit.ts'
import { buildSharePayload, copyText } from './share.ts'
import type { BookingPrefill, PitchState, ResidentExchange, SceneId } from './engine/types.ts'

const contextChoices = {
  industry: [
    ['saas-recruiting', 'SaaS / recruiting'],
    ['wealth-advisory', 'Wealth / advisory'],
    ['other-services', 'Other services'],
  ],
  size: [
    ['team_1_4', '1 to 4 people'],
    ['team_5_10', '5 to 10 people'],
    ['team_11_25', '11 to 25 people'],
    ['team_26_50', '26 to 50 people'],
  ],
  style: [
    ['speed', 'Speed'],
    ['team buy-in', 'Team buy-in'],
    ['certainty', 'Certainty'],
    ['numbers', 'The numbers'],
  ],
} as const

let choices: { industry?: string; size?: string; style?: string } = {}
let hudCollapsed = false
let narrationTimer: number | undefined
let narrationScene: SceneId | null = null
let bookingAbortController: AbortController | null = null

try {
  const storedHudChoice = sessionStorage.getItem('living-pitch-hud-collapsed-v1')
  hudCollapsed = storedHudChoice === null
    ? typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 759px)').matches
    : storedHudChoice === 'true'
} catch {
  hudCollapsed = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 759px)').matches
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function formatEuros(value: number): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function localSlot(start: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(start))
}

function sceneIndex(scene: SceneId): number {
  return ({ basecamp: 0, pipeline: 1, 'follow-through': 2, speed: 3, 'memory-cash': 4, summit: 5 })[scene]
}

function hud(state: PitchState): string {
  const contextLabel = state.context ? `${sizeLabel(state.context.size)} ${getIndustryLabel(state.skin.industry)}` : 'your firm'
  const toneLabel = state.skin.tone === 'evidence-first' ? 'evidence-first' : 'story-reassurance'
  const score = state.score === null
    ? state.scene === 'summit' ? 'partial' : 'building'
    : `${Math.round(state.score)}${state.scoreStatus === 'partial' ? ' · partial' : ''}`
  const euroLabel = state.eurosRecoverable.high ? `€${formatEuros(state.eurosRecoverable.low)} to €${formatEuros(state.eurosRecoverable.high)}` : 'add rate + volume'
  return `
    <aside class="hud ${hudCollapsed ? 'is-collapsed' : ''}" aria-label="Pitch progress">
      <div class="hud-top"><span class="hud-brand">THE LIVING PITCH</span><div class="hud-compact"><span>${sceneIndex(state.scene) + 1}/6 territories</span><strong>${score}</strong></div><button class="hud-toggle" data-action="hud-toggle" aria-expanded="${String(!hudCollapsed)}">HUD</button></div>
      <div class="hud-content">
        <div class="territory-map" aria-label="Territories">
          ${['BASECAMP', 'PIPELINE', 'FOLLOW-THROUGH', 'SPEED', 'MEMORY & CASH', 'SUMMIT'].map((label, index) => `<span class="territory ${index <= sceneIndex(state.scene) ? 'is-active' : ''} ${index === sceneIndex(state.scene) ? 'is-current' : ''}"><i>${String(index).padStart(2, '0')}</i>${label}</span>`).join('')}
        </div>
        <div class="hud-metrics"><div><strong>${score}</strong><span>Leverage Score</span></div><div><strong>${euroLabel}</strong><span>recoverable estimate</span></div></div>
        <div class="fingerprint"><span>Tuned for: ${escapeHtml(contextLabel)} · ${toneLabel} · ${state.objectionsRaised.length} objections raised</span><button data-action="why">see why</button><button data-action="generic">${state.genericMode ? 'turn on tuning' : 'turn off'}</button></div>
      </div>
    </aside>`
}

function sizeLabel(value: string): string {
  return contextChoices.size.find(([option]) => option === value)?.[1] ?? value
}

function choiceButtons(name: keyof typeof contextChoices): string {
  return contextChoices[name].map(([value, label]) => `<button class="choice-button ${choices[name] === value ? 'is-selected' : ''}" data-choice-group="${name}" data-choice-value="${value}">${label}</button>`).join('')
}

function contextPanel(state: PitchState): string {
  if (state.context?.source === 'replay') {
    return `<div class="agent-brief"><span class="agent-dot">RE</span><p>Replay profile selected: <strong>${escapeHtml(sizeLabel(state.context.size))} ${escapeHtml(getIndustryLabel(state.context.industry))}</strong>, ${escapeHtml(state.context.style)}.</p></div><button class="button button-primary" data-action="continue">Replay from the pipeline</button>`
  }
  if (state.context) {
    const intro = state.agentBriefed
      ? '<span class="agent-dot">AI</span><p>Your agent briefed us. Tuned for:'
      : '<p>Skin locked. Tuned for:'
    return `<div class="agent-brief">${intro} <strong>${escapeHtml(sizeLabel(state.context.size))} ${escapeHtml(getIndustryLabel(state.skin.industry))}</strong>, ${escapeHtml(state.context.tone)}.</p></div><button class="button button-primary" data-action="continue">Enter the pipeline</button>`
  }
  return `
    <div class="context-grid">
      <fieldset><legend>What kind of firm is this?</legend>${choiceButtons('industry')}</fieldset>
      <fieldset><legend>How many people are on the team?</legend>${choiceButtons('size')}</fieldset>
      <fieldset><legend>What makes this a win?</legend><p class="field-note">Your answer tunes the film.</p>${choiceButtons('style')}</fieldset>
    </div>
    <button class="button button-primary" data-action="lock-context" ${choices.industry && choices.size && choices.style ? '' : 'disabled'}>Lock the skin and continue</button>`
}

export function renderSummit(state: PitchState): string {
  const score = scoreSummit(state.answers)
  const cta = getSceneCopy('summit', state.skin).cta
  const resultSections = score.complete && score.economicInputsComplete && state.context
    ? (() => {
        const map = generatePreliminaryMap({ context: state.context, answers: state.answers })
        const dimensions = Object.entries(score.dimensions)
          .map(([dimension, severity]) => `<div><span>${escapeHtml(dimension)}</span><strong>${Math.round(severity)}</strong></div>`)
          .join('')
        const opportunities = map.opportunities.map((item) => `
          <article class="map-opportunity">
            <p class="eyebrow">#${item.rank} · ${escapeHtml(item.leak)}</p>
            <h3>${escapeHtml(item.system.title)}</h3>
            <p>${escapeHtml(item.system.shape)}</p>
            <p><strong>Agents:</strong> ${escapeHtml(item.system.agents.join(', '))}</p>
            <p><strong>Human gate:</strong> ${escapeHtml(item.system.humanGate)}</p>
            <p class="impact-range">Estimated impact: €${formatEuros(item.impact.eurosPerWeek.low)} to €${formatEuros(item.impact.eurosPerWeek.high)} per week</p>
          </article>`).join('')
        return `<section class="score-reveal">
          <p class="eyebrow">YOUR LEVERAGE SCORE</p>
          <div class="score-number"><strong>${Math.round(score.score)}</strong><span>/100</span></div>
          <p>Top leak: <strong>${escapeHtml(score.topLeak ?? 'none')}</strong></p>
          <p class="estimate">Estimate, from your answers: <strong>€${formatEuros(score.eurosPerWeek.low)} to €${formatEuros(score.eurosPerWeek.high)} per week</strong>.</p>
          <details><summary>See the math</summary><p>${escapeHtml(score.estimateFormula ?? '')}. The range uses the low and high ends of your selected rate and client-volume bands. It is directional, not measured savings.</p></details>
          <div class="dimension-grid">${dimensions}</div>
        </section>
        <section class="preliminary-map" id="preliminary-map">
          <p class="eyebrow">PRELIMINARY DRAFT MAP</p>
          <h2>Three system shapes ranked by impact.</h2>
          <p class="muted">${escapeHtml(map.estimateLabel)}</p>
          <div class="map-grid">${opportunities}</div>
          <button class="button ${state.skin.tone === 'story-reassurance' ? 'button-primary' : 'button-quiet'}" data-action="download-map">Download / print draft map</button>
        </section>`
      })()
    : `<section class="score-reveal score-partial">
        <p class="eyebrow">${score.complete ? 'YOUR LEVERAGE SCORE' : 'YOUR LEVERAGE SCORE · PARTIAL'}</p>
        <div class="score-number"><strong>${Math.round(score.score)}</strong><span>/100</span></div>
        <p>${score.complete ? 'Your ordinal score is final. Add the rate and volume answers for an honest euro estimate.' : 'The ordinal score is partial. Complete the remaining scan questions before reading a ranked map.'}</p>
        <div class="summit-missing-questions">${QUESTIONS
          .filter((question) => question.dimension !== 'style' && !state.answers[question.id])
          .map((question) => scanQuestion(question.id, state))
          .join('')}</div>
      </section>`
  const slots = state.bookingSlots.status === 'ready'
    ? state.bookingSlots.slots.map((slot) => `<button class="slot-button" data-booking-slot="${escapeHtml(slot.start)}"><span>${escapeHtml(localSlot(slot.start))}</span><small>shown in your local time</small></button>`).join('')
    : state.bookingSlots.status === 'loading'
      ? '<p class="muted">Loading the next seven days...</p>'
      : state.bookingSlots.status === 'error'
        ? `<p class="booking-error">${escapeHtml(state.bookingSlots.message)}</p><button class="button button-quiet" data-action="retry-slots">Try slots again</button>`
        : ''
  const bookingResult = state.booking.status === 'booked'
    ? `<div class="booking-success"><strong>Locked. The invite is on its way.</strong><span>${escapeHtml(localSlot(state.booking.start))}</span><p>Before the call, do one thing: pull up last week's calendar and find the moment you thought "a machine should be doing this by now." That moment is where we'll start. Thirty minutes, no slides, and you'll leave with a map of your own week either way.</p></div>`
    : `<div class="slot-grid">${slots}</div>`

  return `<div class="summit-card">
    ${resultSections}
    <section class="share-card"><p class="eyebrow">THE DIVERGENCE LOOP</p><h2>Show them what your expedition found.</h2><p class="muted">Your score and top leak travel with the question that brings the next visitor in.</p><div class="share-actions"><button class="button button-primary" data-action="share-expedition">Share my expedition</button><button class="button button-quiet" data-action="copy-expedition">Copy share text</button><span class="share-status" data-share-status aria-live="polite"></span></div></section>
    ${cta ? `<a class="button button-primary summit-cta" href="${escapeHtml(cta.href)}" data-action="cta">${escapeHtml(cta.label)}</a>` : ''}
    <section class="booking-panel" id="booking-panel" tabindex="-1">
      <p class="eyebrow">BOOK THE ASSESSMENT CALL</p>
      <h2>Thirty minutes. Your real week on the table.</h2>
      <p>Pick a time. Your agent can prefill this step, but only your click can book it.</p>
      ${bookingResult}
    </section>
    <button class="button button-quiet replay-button" data-action="replay">Replay and compare the film</button>
    <a class="button button-quiet" href="/roast">Roast my site</a>
    ${objectionsPanel('summit', state)}
  </div>`
}

function bookingModal(state: PitchState): string {
  if (state.booking.status === 'idle' || state.booking.status === 'booked') return ''
  const prefill = state.booking.prefill
  const busy = state.booking.status === 'booking'
  const error = state.booking.status === 'booking_error' ? `<p class="booking-error">${escapeHtml(state.booking.message)}</p>` : ''
  return `<div class="modal-backdrop" role="presentation">
    <section class="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <button class="modal-close" data-action="close-booking" aria-label="Cancel booking confirmation">×</button>
      <p class="eyebrow">HUMAN CONFIRMATION REQUIRED</p>
      <h2 id="booking-title">Nothing ships without your yes. Including this booking.</h2>
      <p class="selected-slot">${escapeHtml(localSlot(prefill.start))}</p>
      <ol class="minute-map">
        <li>Minutes 0 to 3: the frame. Diagnostic, not demo.</li>
        <li>Minutes 3 to 15: the leak. Your last week, hour by hour.</li>
        <li>Minutes 15 to 22: the math. Hours times people times weeks.</li>
        <li>Minutes 22 to 30: the verdict. Fit or no fit, said out loud.</li>
      </ol>
      <form data-booking-form>
        <label>Name<input name="name" value="${escapeHtml(prefill.name)}" required maxlength="160"></label>
        <label>Email<input name="email" type="email" value="${escapeHtml(prefill.email)}" required maxlength="254"></label>
        <label>Notes<textarea name="notes" maxlength="2000">${escapeHtml(prefill.notes)}</textarea></label>
        ${error}
        <button class="button button-primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Booking...' : 'Yes, book this call'}</button>
        <button class="button button-quiet" type="button" data-action="close-booking">Cancel</button>
      </form>
    </section>
  </div>`
}

function scanQuestion(questionId: string, state: PitchState): string {
  const question = getQuestion(questionId)
  if (!question) return ''
  const selected = state.answers[questionId]
  return `<fieldset class="scan-question"><legend>${escapeHtml(question.text)}</legend><div class="answer-grid">${question.options.map((option) => `<button class="answer-button ${selected === option.value ? 'is-selected' : ''}" data-answer-question="${questionId}" data-answer-value="${option.value}">${escapeHtml(option.label)}</button>`).join('')}</div></fieldset>`
}

function objectionsPanel(scene: SceneId, state: PitchState): string {
  const sceneObjections = objections.filter((objection) => objection.scenes.includes(scene)).slice(0, 3)
  const latest = state.objectionsRaised[state.objectionsRaised.length - 1]
  const resident = state.residentExchange
  const action = resident?.action ? `<p class="resident-action">Next control: ${escapeHtml(resident.action.kind)} · ${escapeHtml(resident.action.target)}</p>` : ''
  const answer = resident
    ? `<div class="stage-answer resident-answer"><p class="stage-question">${escapeHtml(resident.stage_render)}</p><p>${escapeHtml(resident.answer_for_agent)}</p>${action}</div>`
    : latest ? `<div class="stage-answer"><p class="stage-question">${escapeHtml(stageRender(latest))}</p><p>${escapeHtml(latest.answer)}</p></div>` : ''
  return `<section class="objection-panel"><div><p class="eyebrow">Ask the presenter</p><h2>Put it on stage.</h2><p class="muted">Ask Baibot anything. Canned answers land instantly. A live Resident answer stays grounded in this pitch and the session state.</p><form class="resident-form" data-resident-form><label for="resident-message">Ask the presenter anything</label><div class="resident-form-row"><input id="resident-message" name="message" type="text" maxlength="4000" placeholder="Who operates this after launch?" required><button class="button button-primary" type="submit">Ask Baibot</button></div></form></div><div class="chips">${sceneObjections.map((objection) => `<button class="chip" data-objection="${objection.id}">${escapeHtml(objection.label)}</button>`).join('')}</div>${answer}</section>`
}

function residentExchange(message: string, response: { answer_for_agent: string; stage_render: string; action: ResidentExchange['action'] }, channel: ResidentExchange['channel']): void {
  if (response.action) applyResidentAction(response.action)
  recordResidentExchange({ channel, message, answer_for_agent: response.answer_for_agent, stage_render: response.stage_render, action: response.action })
}

async function askResident(root: HTMLElement, message: string, channel: ResidentExchange['channel']): Promise<void> {
  const state = getPitchState()
  const canned = findObjection(message)
  if (canned) {
    raiseObjection(canned.id, message, channel)
    capture('resident_exchange', { channel, mode: 'canned' })
    return
  }
  if (!isResidentEnabled()) {
    residentExchange(message, { answer_for_agent: 'The resident is warming up. Here is what I can answer today.', stage_render: `${channel === 'agent' ? 'Your agent asks' : 'You ask'}: ${message}`, action: null }, channel)
    return
  }
  try {
    const response = await requestResident({ message, state: residentSessionState(state), channel })
    if (!('answer_for_agent' in response)) {
      residentExchange(message, { answer_for_agent: 'The resident is warming up. Here is what I can answer today.', stage_render: `${channel === 'agent' ? 'Your agent asks' : 'You ask'}: ${message}`, action: null }, channel)
      return
    }
    residentExchange(message, response, channel)
  } catch (error) {
    residentExchange(message, { answer_for_agent: error instanceof Error ? error.message : 'The Resident could not answer. Choose a visible objection chip while it warms back up.', stage_render: `${channel === 'agent' ? 'Your agent asks' : 'You ask'}: ${message}`, action: null }, channel)
  }
  root.querySelector<HTMLInputElement>('#resident-message')?.focus()
}

function sceneText(copy: ReturnType<typeof getSceneCopy>, tone: PitchState['skin']['tone']): string {
  const narration = `<div class="narration" data-narration="${escapeHtml(copy.narration)}"></div>`
  const proof = `<p class="proof-line">${copy.proof}</p>`
  return tone === 'evidence-first' ? `${proof}${narration}` : `${narration}${proof}`
}

function continueLabel(tone: PitchState['skin']['tone'], label: string): string {
  return tone === 'evidence-first' ? `See the proof → ${label}` : `Follow the thread → ${label}`
}

function renderScene(state: PitchState): string {
  const copy = getSceneCopy(state.scene, state.skin)
  if (state.scene === 'basecamp') {
    return `<section class="scene scene-basecamp"><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.title}</h1>${sceneText(copy, state.skin.tone)}${contextPanel(state)}${objectionsPanel('basecamp', state)}</section>`
  }
  const questions = state.scene === 'pipeline' || state.scene === 'follow-through' || state.scene === 'speed' || state.scene === 'memory-cash'
    ? sceneQuestions[state.scene].map((id) => scanQuestion(id, state)).join('')
    : ''
  const controls = state.scene === 'pipeline'
    ? `<div class="path-choice"><p class="eyebrow">Choose the revenue path</p><div class="path-grid"><button data-path="post"><strong>Post</strong><span>Keep the signal alive.</span></button><button data-path="pitch"><strong>Pitch</strong><span>Open the right conversation.</span></button><button data-path="partner"><strong>Partner</strong><span>Build through the network.</span></button></div></div><button class="button button-primary" data-action="continue">${continueLabel(state.skin.tone, 'Continue to follow-through')}</button>`
    : state.scene === 'follow-through'
      ? `<div class="ledger-demo"><p class="eyebrow">THE APPROVAL LEDGER, IN PRACTICE</p><h2>0 messages without approval.</h2><div class="queue" aria-label="Approval queue">${['Message draft', 'Quote draft', 'Post draft'].map((item) => `<button data-queue-item="${item}"><span>${item}</span><b>tap yes</b></button>`).join('')}</div><p class="muted">Every decision is logged, timestamped, and inspectable.</p></div><button class="button button-primary" data-action="continue">${continueLabel(state.skin.tone, 'Continue to speed')}</button>`
      : state.scene === 'speed'
        ? `<section class="case-card"><p class="eyebrow">THE CASE CARD</p>${copy.caseCard?.map((line) => `<p>${escapeHtml(line)}</p>`).join('') ?? ''}<blockquote><p>${escapeHtml(copy.quote ?? '')}</p><footer>${escapeHtml(copy.attribution ?? '')}</footer></blockquote></section><button class="button button-primary" data-action="continue">${continueLabel(state.skin.tone, 'Continue to memory & cash')}</button>`
        : state.scene === 'memory-cash'
          ? `<section class="offer-card"><p class="eyebrow">THE OFFER</p><div class="offer-steps">${copy.offerSteps?.map((step) => `<p>${escapeHtml(step)}</p>`).join('') ?? ''}</div></section><button class="button button-primary" data-action="continue">${continueLabel(state.skin.tone, 'Take this to the summit')}</button>`
          : renderSummit(state)
  return `<section class="scene scene-${state.scene.replace('-', '')}"><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.title}</h1>${sceneText(copy, state.skin.tone)}${questions}${controls}${objectionsPanel(state.scene, state)}</section>`
}

function cancelNarration(): void {
  if (narrationTimer !== undefined) window.clearTimeout(narrationTimer)
  narrationTimer = undefined
}

function streamNarration(root: HTMLElement, animate: boolean): void {
  cancelNarration()
  const target = root.querySelector<HTMLElement>('[data-narration]')
  if (!target) return
  const text = target.dataset.narration ?? ''
  target.removeAttribute('data-narration')
  if (!animate) {
    target.textContent = text
    return
  }
  let index = 0
  const draw = () => {
    target.textContent = text.slice(0, index)
    if (index < text.length) {
      index += 1
      narrationTimer = window.setTimeout(draw, 30)
    }
  }
  target.addEventListener('click', () => {
    cancelNarration()
    target.textContent = text
  }, { once: true })
  draw()
}

function render(root: HTMLElement, state: PitchState, roastDomain: string): void {
  const animateNarration = narrationScene !== state.scene
  cancelNarration()
  const roastContext = roastDomain ? `<div class="roast-context"><span class="agent-dot">ROAST CONTEXT</span><p>Goria just read <strong>${escapeHtml(roastDomain)}</strong>. Now let us map the leak behind the joke.</p></div>` : ''
  root.innerHTML = `${hud(state)}<main class="pitch-shell"><nav class="pitch-nav"><a href="/">AI JUNGLE</a><div><a href="/roast">Roast my site</a> <a href="/evolution">Public ledger ↗</a> <a href="/board">Board</a></div></nav>${roastContext}${renderScene(state)}<footer class="pitch-footer"><span>Human-directed, AI-executed.</span><a href="/roast">Roast my site</a><a href="/board">Board</a><a href="/rules">Rules</a><a href="/method">Rethink · Build · Operate · Train</a><button class="footer-action" data-action="improve">Improve this</button></footer></main><div class="why-popover" hidden>We use your stated context to select copy, proof emphasis, section order, and CTA. The seed is reproducible. Turn tuning off to see a generic skin.</div>${bookingModal(state)}`
  wireMutationAffordance(root)
  narrationScene = state.scene
  streamNarration(root, animateNarration)
  root.querySelectorAll<HTMLButtonElement>('[data-choice-group]').forEach((button) => button.addEventListener('click', () => {
    const group = button.dataset.choiceGroup as keyof typeof contextChoices
    choices[group] = button.dataset.choiceValue
    capture('pitch_context_choice', { group, value: button.dataset.choiceValue })
    render(root, getPitchState(), roastDomain)
  }))
  root.querySelector<HTMLButtonElement>('[data-action="lock-context"]')?.addEventListener('click', () => {
    if (!choices.industry || !choices.size || !choices.style) return
    setContext({ industry: choices.industry, size: choices.size, style: choices.style, source: 'human' })
    advanceScene()
  })
  root.querySelector<HTMLButtonElement>('[data-action="continue"]')?.addEventListener('click', () => advanceScene())
  root.querySelectorAll<HTMLButtonElement>('[data-path]').forEach((button) => button.addEventListener('click', () => choosePath(button.dataset.path ?? '')))
  root.querySelectorAll<HTMLButtonElement>('[data-answer-question]').forEach((button) => button.addEventListener('click', () => answerScanQuestion(button.dataset.answerQuestion ?? '', button.dataset.answerValue ?? '')))
  root.querySelectorAll<HTMLButtonElement>('[data-objection]').forEach((button) => button.addEventListener('click', () => raiseObjection(button.dataset.objection ?? '')))
  root.querySelector<HTMLFormElement>('[data-resident-form]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) return
    const message = new FormData(form).get('message')
    if (typeof message !== 'string' || !message.trim()) return
    void askResident(root, message.trim(), 'human')
  })
  root.querySelectorAll<HTMLButtonElement>('[data-queue-item]').forEach((button) => button.addEventListener('click', () => { button.classList.add('is-cleared'); button.disabled = true; capture('approval_demo_tap', { item: button.dataset.queueItem }) }))
  root.querySelector<HTMLButtonElement>('[data-action="generic"]')?.addEventListener('click', () => setGenericMode(!state.genericMode))
  root.querySelector<HTMLButtonElement>('[data-action="why"]')?.addEventListener('click', () => { const popover = root.querySelector<HTMLElement>('.why-popover'); if (popover) popover.hidden = !popover.hidden })
  root.querySelector<HTMLButtonElement>('[data-action="hud-toggle"]')?.addEventListener('click', () => {
    hudCollapsed = !hudCollapsed
    try { sessionStorage.setItem('living-pitch-hud-collapsed-v1', String(hudCollapsed)) } catch { /* HUD preference is optional. */ }
    const hudElement = root.querySelector<HTMLElement>('.hud')
    hudElement?.classList.toggle('is-collapsed', hudCollapsed)
    buttonState(root, !hudCollapsed)
  })
  root.querySelectorAll<HTMLButtonElement>('[data-booking-slot]').forEach((button) => button.addEventListener('click', () => {
    const start = button.dataset.bookingSlot
    if (start) prefillHumanBooking(start)
  }))
  root.querySelectorAll<HTMLButtonElement>('[data-action="close-booking"]').forEach((button) => button.addEventListener('click', () => cancelBooking()))
  root.querySelector<HTMLButtonElement>('[data-action="download-map"]')?.addEventListener('click', () => {
    capture('preliminary_map_download', { channel: 'human' })
    window.print()
  })
  root.querySelector<HTMLButtonElement>('[data-action="replay"]')?.addEventListener('click', () => replayAsSomeoneElse())
  root.querySelector<HTMLButtonElement>('[data-action="retry-slots"]')?.addEventListener('click', () => void loadBookingSlots())
  const bookingForm = root.querySelector<HTMLFormElement>('[data-booking-form]')
  bookingForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    const form = new FormData(bookingForm)
    const current = getPitchState().booking
    if (current.status !== 'awaiting_human_confirmation' && current.status !== 'booking_error') return
    const name = form.get('name')
    const email = form.get('email')
    const notes = form.get('notes')
    if (typeof name !== 'string' || typeof email !== 'string' || typeof notes !== 'string') return
    void confirmBooking({ start: current.prefill.start, nonce: current.prefill.nonce, name, email, notes })
  })
  root.querySelectorAll<HTMLAnchorElement>('[data-action="cta"]').forEach((link) => link.addEventListener('click', () => capture('pitch_cta_click', { href: link.href })))
  const summitScore = scoreSummit(state.answers)
  const share = buildSharePayload({ score: summitScore.score, topLeak: summitScore.topLeak, kind: 'expedition' })
  root.querySelector<HTMLButtonElement>('[data-action="share-expedition"]')?.addEventListener('click', () => {
    window.open(share.intentUrl, '_blank', 'noopener,noreferrer')
    capture('share_expedition', { score: Math.round(summitScore.score), top_leak: summitScore.topLeak })
  })
  root.querySelector<HTMLButtonElement>('[data-action="copy-expedition"]')?.addEventListener('click', () => {
    void copyText(share.text).then((copied) => {
      const status = root.querySelector<HTMLElement>('[data-share-status]')
      if (status) status.textContent = copied ? 'Copied.' : 'Select and copy the text from the share intent.'
      capture('share_expedition_copy', { copied })
    })
  })
  if (state.scene === 'summit' && state.bookingSlots.status === 'idle') void loadBookingSlots()
}

async function loadBookingSlots(): Promise<void> {
  setBookingSlotsLoading()
  try {
    const response = await fetch('/api/cal/slots?days=7', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
    const payload: unknown = await response.json()
    if (!response.ok || !isRecord(payload) || !Array.isArray(payload.slots)) throw new Error('Could not load booking slots.')
    const slots = payload.slots.flatMap((slot) => isRecord(slot) && typeof slot.start === 'string' && typeof slot.nonce === 'string' ? [{ start: slot.start, nonce: slot.nonce }] : [])
    if (slots.length !== payload.slots.length) throw new Error('The booking service returned invalid slots.')
    setBookingSlots(slots)
  } catch (error) {
    setBookingSlotsError(error instanceof Error ? error.message : 'Could not load booking slots.')
  }
}

async function confirmBooking(prefill: BookingPrefill): Promise<void> {
  updateBookingPrefill(prefill)
  markBookingSubmitting()
  const controller = new AbortController()
  bookingAbortController = controller
  try {
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
    const response = await fetch('/api/cal/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(prefill),
      signal,
    })
    const payload: unknown = await response.json()
    if (!response.ok) {
      const message = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'Cal.com rejected the booking.'
      throw new Error(message)
    }
    if (!isRecord(payload) || payload.status !== 'booked' || payload.start !== prefill.start) {
      throw new Error('The booking service returned an invalid confirmation.')
    }
    markBookingBooked(prefill.start)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError' && getPitchState().booking.status === 'idle') return
    if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      markBookingError('Booking timed out. Try again or choose another slot.')
      return
    }
    markBookingError(error instanceof Error ? error.message : 'Could not book this call.')
  } finally {
    if (bookingAbortController === controller) bookingAbortController = null
  }
}

function cancelBooking(): void {
  bookingAbortController?.abort()
  bookingAbortController = null
  dismissBooking()
}

function buttonState(root: HTMLElement, expanded: boolean): void {
  const button = root.querySelector<HTMLButtonElement>('[data-action="hud-toggle"]')
  button?.setAttribute('aria-expanded', String(expanded))
}

export function renderPitch(root: HTMLElement, roastDomain = ''): () => void {
  const renderState = (state: PitchState) => render(root, state, roastDomain)
  const activeUnsubscribe = subscribe(renderState)
  renderState(getPitchState())
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && getPitchState().booking.status !== 'idle' && getPitchState().booking.status !== 'booked') cancelBooking()
  }
  root.addEventListener('keydown', handleKeyDown)
  capture('pitch_view')
  return () => {
    cancelNarration()
    narrationScene = null
    activeUnsubscribe()
    root.removeEventListener('keydown', handleKeyDown)
  }
}
