import { capture } from '../analytics.ts'
import { calculateLeverageScore, getQuestion, validateScanAnswer } from '../scan/index.ts'
import { findObjection, objectionLog } from './scenes.ts'
import type { Context, Industry, PitchState, SceneId, Skin, Tone } from './types.ts'

const STORAGE_KEY = 'living-pitch-state-v1'
const listeners = new Set<(state: PitchState) => void>()

function hash(value: string): string {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(16)
}

export function normalizeIndustry(value: string): Industry {
  const normalized = value.toLowerCase()
  if (normalized.includes('saas') || normalized.includes('recruit')) return 'saas-recruiting'
  if (normalized.includes('wealth') || normalized.includes('advis')) return 'wealth-advisory'
  return 'other-services'
}

export function normalizeTone(value: string): Tone {
  const normalized = value.toLowerCase()
  if (normalized.includes('number') || normalized.includes('certainty') || normalized.includes('evidence')) return 'evidence-first'
  return 'story-reassurance'
}

function defaultSkin(): Skin {
  return { tone: 'story-reassurance', industry: 'other-services', seed: 'cold-start', generic: false }
}

function initialState(): PitchState {
  return {
    scene: 'basecamp',
    skin: defaultSkin(),
    context: null,
    answers: {},
    score: null,
    eurosRecoverable: { low: 0, high: 0 },
    objectionsRaised: [],
    beatsCovered: [],
    choicesLog: [],
    agentBriefed: false,
    genericMode: false,
  }
}

let state = loadState()

function loadState(): PitchState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initialState(), ...JSON.parse(raw) } as PitchState
  } catch {
    // Embedded browsers and private windows can reject session storage.
  }
  return initialState()
}

function save(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The experience remains usable without persistence.
  }
}

function emit(): void {
  save()
  listeners.forEach((listener) => listener(getPitchState()))
}

function applyScore(): void {
  const result = calculateLeverageScore(state.answers)
  const territoryAnswers = Object.keys(state.answers).filter((id) => {
    const question = getQuestion(id)
    return question && question.dimension !== 'context' && question.dimension !== 'style'
  })
  state.score = territoryAnswers.length === 0 ? null : result.score
  state.eurosRecoverable = result.eurosRecoverable
}

function cover(beat: string): void {
  if (!state.beatsCovered.includes(beat)) state.beatsCovered.push(beat)
}

export function getPitchState(): PitchState {
  return JSON.parse(JSON.stringify(state)) as PitchState
}

export function subscribe(listener: (next: PitchState) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setContext(input: {
  industry: string
  size: string
  role?: string
  priorities?: string[]
  tone?: string
  style?: string
  source?: 'human' | 'agent'
}): PitchState {
  const industry = normalizeIndustry(input.industry)
  const style = input.style ?? input.tone ?? 'team buy-in'
  const tone = normalizeTone(input.tone ?? style)
  const context: Context = {
    industry,
    size: input.size,
    role: input.role ?? 'owner-led decision maker',
    priorities: input.priorities ?? [],
    tone,
    style,
    source: input.source ?? 'human',
  }
  state.context = context
  state.skin = { tone, industry, seed: hash(JSON.stringify(context)), generic: state.genericMode }
  state.agentBriefed = context.source === 'agent'
  state.answers = {
    ...state.answers,
    firm_type: industry === 'saas-recruiting' ? 'exec-search' : industry === 'wealth-advisory' ? 'ma-corporate-advisory' : 'other-services',
    team_size: input.size,
  }
  cover('basecamp')
  applyScore()
  capture('pitch_context_set', { source: context.source, industry, tone })
  emit()
  return getPitchState()
}

export function choosePath(choiceId: string): PitchState {
  if (!['post', 'pitch', 'partner'].includes(choiceId)) throw new Error('Unknown path. Choose exactly one of post, pitch, or partner.')
  state.choicesLog.push({ choiceId, scene: state.scene, at: new Date().toISOString() })
  cover(`path:${choiceId}`)
  cover('pipeline')
  state.scene = 'follow-through'
  cover('follow-through')
  capture('pitch_choice', { choice_id: choiceId, scene: state.scene })
  emit()
  return getPitchState()
}

export function answerScanQuestion(questionId: string, answer: string): PitchState {
  const question = getQuestion(questionId)
  if (!question) throw new Error(`Unknown scan question "${questionId}". Call get_pitch_state and use a listed question id.`)
  if (!validateScanAnswer(questionId, answer)) throw new Error(`Invalid answer for "${questionId}". Use one of that question's exact option values.`)
  state.answers = { ...state.answers, [questionId]: answer }
  cover(question.dimension)
  applyScore()
  capture('scan_answer', { question_id: questionId, answer })
  emit()
  return getPitchState()
}

export function raiseObjection(topic: string, detail?: string): { state: PitchState; objection: ReturnType<typeof objectionLog> } {
  const match = findObjection(topic)
  if (!match) throw new Error('That objection is not in the canned pool. Use one of the objection labels shown on stage, then try again.')
  const entry = objectionLog(match, detail)
  state.objectionsRaised.push(entry)
  capture('objection_raised', { topic: entry.topic, channel: detail ? 'agent' : 'human' })
  emit()
  return { state: getPitchState(), objection: entry }
}

export function advanceScene(): PitchState {
  const next: Record<SceneId, SceneId> = {
    basecamp: 'pipeline',
    pipeline: 'follow-through',
    'follow-through': 'summit',
    summit: 'summit',
  }
  cover(state.scene)
  state.scene = next[state.scene]
  cover(state.scene)
  capture('pitch_scene_advance', { scene: state.scene })
  emit()
  return getPitchState()
}

export function setGenericMode(enabled: boolean): PitchState {
  state.genericMode = enabled
  state.skin = enabled
    ? { tone: 'story-reassurance', industry: 'other-services', seed: 'generic', generic: true }
    : state.context
      ? { tone: state.context.tone, industry: state.context.industry, seed: hash(JSON.stringify(state.context)), generic: false }
      : defaultSkin()
  capture('skin_generic_toggle', { enabled })
  emit()
  return getPitchState()
}

export function resetPitch(): PitchState {
  state = initialState()
  emit()
  capture('pitch_reset')
  return getPitchState()
}

export function offerFacts(topic?: string): Record<string, unknown> {
  return {
    topic: topic ?? 'full offer',
    what: 'A business performance system for owner-led firms: rethink strategy with AI, install and operate agents built on your processes, and train your team to run them.',
    method: ['Rethink: Leverage Assessment', 'Build: first install', 'Operate: partnership', 'Train: your team runs it'],
    who: 'Owner-led firms in consulting, advisory, executive search, wealth and professional services, 5 to 50 people.',
    pricing: {
      assessment: 'Published on /assessment. Three installable opportunities or it is free, and the fee comes off the first install.',
      install: 'Typically $7,500 to $15,000, fixed scope and fixed price.',
      partnership: 'From $5,000/month plus a performance share, with a six-month minimum.',
    },
    control: 'Nothing ships without your yes. Every message, quote, and post waits in one approval ledger in Telegram.',
    proof: '139 qualified meetings in 3 months, 24% reply rate, 90 held, 0 messages without approval.',
    anti_icp: 'Not for firms seeking unsupervised volume spam or AI that replaces their judgment.',
    next_step: 'Start with the Leverage Assessment or book a 30-minute call at https://cal.wtaij.com/loic/intro.',
  }
}

export function stateForAgent(): Record<string, unknown> {
  const result = getPitchState()
  return {
    ...result,
    availableChoices: result.scene === 'pipeline' ? ['post', 'pitch', 'partner'] : [],
    next: result.scene === 'summit' ? 'Review the estimate and choose the assessment or 30-minute call.' : 'Ask the human for missing context or use the visible choices, then call get_pitch_state again.',
  }
}
