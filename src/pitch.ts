import { capture } from './analytics.ts'
import { getQuestion } from './scan/index.ts'
import { objections, getIndustryLabel, getSceneCopy, sceneQuestions } from './engine/scenes.ts'
import {
  advanceScene,
  answerScanQuestion,
  choosePath,
  getPitchState,
  raiseObjection,
  setContext,
  setGenericMode,
  subscribe,
} from './engine/state.ts'
import type { PitchState, SceneId } from './engine/types.ts'

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

function formatEuros(value: number): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(value)
}

function sceneIndex(scene: SceneId): number {
  return ({ basecamp: 0, pipeline: 1, 'follow-through': 2, speed: 3, 'memory-cash': 4, summit: 5 })[scene]
}

function hud(state: PitchState): string {
  const contextLabel = state.context ? `${sizeLabel(state.context.size)} ${getIndustryLabel(state.skin.industry)}` : 'your firm'
  const toneLabel = state.skin.tone === 'evidence-first' ? 'evidence-first' : 'story-reassurance'
  const score = state.score === null ? 'building' : String(Math.round(state.score))
  const euroLabel = state.eurosRecoverable.high ? `€${formatEuros(state.eurosRecoverable.low)} to €${formatEuros(state.eurosRecoverable.high)}` : 'building'
  return `
    <aside class="hud" aria-label="Pitch progress">
      <div class="hud-top"><span class="hud-brand">THE LIVING PITCH</span><button class="hud-toggle" data-action="hud-toggle" aria-expanded="true">HUD</button></div>
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

function scanQuestion(questionId: string, state: PitchState): string {
  const question = getQuestion(questionId)
  if (!question) return ''
  const selected = state.answers[questionId]
  return `<fieldset class="scan-question"><legend>${escapeHtml(question.text)}</legend><div class="answer-grid">${question.options.map((option) => `<button class="answer-button ${selected === option.value ? 'is-selected' : ''}" data-answer-question="${questionId}" data-answer-value="${option.value}">${escapeHtml(option.label)}</button>`).join('')}</div></fieldset>`
}

function objectionsPanel(scene: SceneId, state: PitchState): string {
  const sceneObjections = objections.filter((objection) => objection.scenes.includes(scene)).slice(0, 3)
  const latest = state.objectionsRaised[state.objectionsRaised.length - 1]
  return `<section class="objection-panel"><div><p class="eyebrow">Ask the presenter</p><h2>Put it on stage.</h2><p class="muted">Humans can tap a concern. Agents can call <code>raise_objection</code>. Either way, the answer is recorded.</p></div><div class="chips">${sceneObjections.map((objection) => `<button class="chip" data-objection="${objection.id}">${escapeHtml(objection.label)}</button>`).join('')}</div>${latest ? `<div class="stage-answer"><p class="stage-question">${latest.detail ? 'Your agent asks:' : 'You ask:'} ${escapeHtml(latest.topic)}</p><p>${escapeHtml(latest.answer)}</p></div>` : ''}</section>`
}

function renderScene(state: PitchState): string {
  const copy = getSceneCopy(state.scene, state.skin)
  if (state.scene === 'basecamp') {
    return `<section class="scene scene-basecamp"><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.title}</h1><div class="narration" data-narration="${escapeHtml(copy.narration)}"></div><p class="proof-line">${copy.proof}</p>${contextPanel(state)}${objectionsPanel('basecamp', state)}</section>`
  }
  const questions = state.scene === 'pipeline' || state.scene === 'follow-through' || state.scene === 'speed' || state.scene === 'memory-cash'
    ? sceneQuestions[state.scene].map((id) => scanQuestion(id, state)).join('')
    : ''
  const controls = state.scene === 'pipeline'
    ? `<div class="path-choice"><p class="eyebrow">Choose the revenue path</p><div class="path-grid"><button data-path="post"><strong>Post</strong><span>Keep the signal alive.</span></button><button data-path="pitch"><strong>Pitch</strong><span>Open the right conversation.</span></button><button data-path="partner"><strong>Partner</strong><span>Build through the network.</span></button></div></div><button class="button button-primary" data-action="continue">Continue to follow-through</button>`
    : state.scene === 'follow-through'
      ? `<div class="ledger-demo"><p class="eyebrow">THE APPROVAL LEDGER, IN PRACTICE</p><h2>0 messages without approval.</h2><div class="queue" aria-label="Approval queue">${['Message draft', 'Quote draft', 'Post draft'].map((item) => `<button data-queue-item="${item}"><span>${item}</span><b>tap yes</b></button>`).join('')}</div><p class="muted">Every decision is logged, timestamped, and inspectable.</p></div><button class="button button-primary" data-action="continue">Continue to speed</button>`
      : state.scene === 'speed'
        ? `<section class="case-card"><p class="eyebrow">THE CASE CARD</p>${copy.caseCard?.map((line) => `<p>${escapeHtml(line)}</p>`).join('') ?? ''}<blockquote><p>${escapeHtml(copy.quote ?? '')}</p><footer>${escapeHtml(copy.attribution ?? '')}</footer></blockquote></section><button class="button button-primary" data-action="continue">Continue to memory & cash</button>`
        : state.scene === 'memory-cash'
          ? `<section class="offer-card"><p class="eyebrow">THE OFFER</p><div class="offer-steps">${copy.offerSteps?.map((step) => `<p>${escapeHtml(step)}</p>`).join('') ?? ''}</div></section><button class="button button-primary" data-action="continue">Take this to the summit</button>`
          : `<div class="summit-card"><p class="muted">${copy.proof}</p><a class="button button-primary" href="${state.skin.tone === 'evidence-first' ? 'https://cal.welcometotheaijungle.com/loic/intro' : '/assessment'}" data-action="cta">${state.skin.tone === 'evidence-first' ? 'Book the 30-min call' : 'Get my 3 installable opportunities →'}</a></div>`
  return `<section class="scene scene-${state.scene.replace('-', '')}"><p class="eyebrow">${copy.eyebrow}</p><h1>${copy.title}</h1><div class="narration" data-narration="${escapeHtml(copy.narration)}"></div><p class="proof-line">${copy.proof}</p>${questions}${controls}${objectionsPanel(state.scene, state)}</section>`
}

function streamNarration(root: HTMLElement): void {
  const target = root.querySelector<HTMLElement>('[data-narration]')
  if (!target) return
  const text = target.dataset.narration ?? ''
  target.removeAttribute('data-narration')
  let index = 0
  let timer: number | undefined
  const draw = () => {
    target.textContent = text.slice(0, index)
    if (index < text.length) {
      index += 1
      timer = window.setTimeout(draw, 30)
    }
  }
  target.addEventListener('click', () => {
    if (timer) window.clearTimeout(timer)
    target.textContent = text
  }, { once: true })
  draw()
}

function render(root: HTMLElement, state: PitchState): void {
  root.innerHTML = `${hud(state)}<main class="pitch-shell"><nav class="pitch-nav"><a href="/">AI JUNGLE</a><a href="/evolution">Public ledger ↗</a></nav>${renderScene(state)}<footer class="pitch-footer"><span>Human-directed, AI-executed.</span><a href="/method">Rethink · Build · Operate · Train</a></footer></main><div class="why-popover" hidden>We use your stated context to select copy, proof emphasis, section order, and CTA. The seed is reproducible. Turn tuning off to see a generic skin.</div>`
  streamNarration(root)
  root.querySelectorAll<HTMLButtonElement>('[data-choice-group]').forEach((button) => button.addEventListener('click', () => {
    const group = button.dataset.choiceGroup as keyof typeof contextChoices
    choices[group] = button.dataset.choiceValue
    capture('pitch_context_choice', { group, value: button.dataset.choiceValue })
    render(root, getPitchState())
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
  root.querySelectorAll<HTMLButtonElement>('[data-queue-item]').forEach((button) => button.addEventListener('click', () => { button.classList.add('is-cleared'); button.disabled = true; capture('approval_demo_tap', { item: button.dataset.queueItem }) }))
  root.querySelector<HTMLButtonElement>('[data-action="generic"]')?.addEventListener('click', () => setGenericMode(!state.genericMode))
  root.querySelector<HTMLButtonElement>('[data-action="why"]')?.addEventListener('click', () => { const popover = root.querySelector<HTMLElement>('.why-popover'); if (popover) popover.hidden = !popover.hidden })
  root.querySelector<HTMLButtonElement>('[data-action="hud-toggle"]')?.addEventListener('click', () => { const hudElement = root.querySelector<HTMLElement>('.hud'); const expanded = hudElement?.classList.toggle('is-collapsed') === false; buttonState(root, expanded) })
  root.querySelectorAll<HTMLAnchorElement>('[data-action="cta"]').forEach((link) => link.addEventListener('click', () => capture('pitch_cta_click', { href: link.href })))
}

function buttonState(root: HTMLElement, expanded: boolean): void {
  const button = root.querySelector<HTMLButtonElement>('[data-action="hud-toggle"]')
  button?.setAttribute('aria-expanded', String(expanded))
}

export function renderPitch(root: HTMLElement): void {
  const unsubscribe = subscribe((state) => render(root, state))
  render(root, getPitchState())
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') unsubscribe()
  }, { once: true })
  capture('pitch_view')
}
