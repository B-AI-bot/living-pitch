import { capture } from '../analytics.ts'
import { getQuestion, getScanQuestions, validateScanAnswer } from '../scan/index.ts'
import { findObjection, objectionLog } from './scenes.ts'
import { generatePreliminaryMap, scoreSummit } from './summit.ts'
import type { ScorecardAnswers } from '../scan/index.ts'
import type { BookingPrefill, BookingSlot, BookingSlots, BookingStatus, Context, Industry, ObjectionLog, PitchState, ResidentAction, ResidentExchange, SceneId, Skin, Tone } from './types.ts'

const STORAGE_KEY = 'living-pitch-state-v2'
const SCHEMA_VERSION = 3 as const
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
    schemaVersion: SCHEMA_VERSION,
    scene: 'basecamp',
    skin: defaultSkin(),
    context: null,
    answers: {},
    score: null,
    scoreStatus: 'unavailable',
    eurosRecoverable: { low: 0, high: 0 },
    objectionsRaised: [],
    residentExchange: null,
    residentExchanges: [],
    beatsCovered: [],
    choicesLog: [],
    booking: { status: 'idle' },
    bookingSlots: { status: 'idle' },
    agentBriefed: false,
    genericMode: false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function storedBookingPrefill(value: unknown): BookingPrefill | null {
  if (!isRecord(value)) return null
  if (typeof value.start !== 'string' || typeof value.nonce !== 'string' || typeof value.name !== 'string' || typeof value.email !== 'string' || typeof value.notes !== 'string') return null
  const start = new Date(value.start)
  if (Number.isNaN(start.getTime()) || start.toISOString() !== value.start) return null
  return { start: value.start, nonce: value.nonce, name: value.name, email: value.email, notes: value.notes }
}

function storedBooking(value: unknown): BookingStatus | null {
  if (!isRecord(value) || typeof value.status !== 'string') return null
  if (value.status === 'idle') return { status: 'idle' }
  if (value.status === 'booked') {
    if (typeof value.start !== 'string') return null
    const start = new Date(value.start)
    return Number.isNaN(start.getTime()) || start.toISOString() !== value.start
      ? null
      : { status: 'booked', start: value.start }
  }
  const prefill = storedBookingPrefill(value.prefill)
  if (!prefill) return null
  if (value.status === 'booking_error' && typeof value.message === 'string') {
    return { status: 'booking_error', prefill, message: value.message }
  }
  if (value.status === 'booking' || value.status === 'awaiting_human_confirmation') {
    return { status: 'awaiting_human_confirmation', prefill }
  }
  return null
}

function storedBookingSlots(value: unknown): BookingSlots | null {
  if (!isRecord(value) || typeof value.status !== 'string') return null
  if (value.status === 'idle' || value.status === 'loading') return { status: value.status }
  if (value.status === 'error' && typeof value.message === 'string') return { status: 'error', message: value.message }
  if (value.status !== 'ready' || !Array.isArray(value.slots)) return null
  const slots: BookingSlot[] = []
  for (const item of value.slots) {
    if (!isRecord(item) || typeof item.start !== 'string' || typeof item.nonce !== 'string' || !isIsoDate(item.start) || item.nonce.length === 0) return null
    slots.push({ start: item.start, nonce: item.nonce })
  }
  return { status: 'ready', slots }
}

function isIsoDate(value: string): boolean {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
}

function isSceneId(value: unknown): value is SceneId {
  return typeof value === 'string' && ['basecamp', 'pipeline', 'follow-through', 'speed', 'memory-cash', 'summit'].includes(value)
}

function isAnswers(value: unknown): value is PitchState['answers'] {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([questionId, answer]) => typeof answer === 'string' && Boolean(getQuestion(questionId)) && validateScanAnswer(questionId, answer))
}

function isObjectionLog(value: unknown): value is ObjectionLog {
  return isRecord(value) && typeof value.topic === 'string' && (typeof value.detail === 'string' || value.detail === null)
    && typeof value.answer === 'string' && (value.source === 'human' || value.source === 'agent') && typeof value.at === 'string'
}

function isResidentExchange(value: unknown): value is ResidentExchange {
  if (!isRecord(value)) return false
  if (value.channel !== 'human' && value.channel !== 'agent') return false
  if (typeof value.message !== 'string' || typeof value.answer_for_agent !== 'string' || typeof value.stage_render !== 'string') return false
  if (value.action === null) return true
  if (!isRecord(value.action) || (value.action.kind !== 'advance_beat' && value.action.kind !== 'open_view' && value.action.kind !== 'propose_route') || typeof value.action.target !== 'string' || !value.action.target.trim()) return false
  return true
}

function isPitchState(value: unknown): value is PitchState {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION || !isSceneId(value.scene) || !isRecord(value.skin)) return false
  const skin = value.skin
  if (typeof skin.tone !== 'string' || !['story-reassurance', 'evidence-first'].includes(skin.tone) || typeof skin.industry !== 'string' || !['saas-recruiting', 'wealth-advisory', 'other-services'].includes(skin.industry) || typeof skin.seed !== 'string' || typeof skin.generic !== 'boolean') return false
  if (value.context !== null && !isRecord(value.context)) return false
  if (value.context !== null) {
    const context = value.context
    if (typeof context.source !== 'string' || !['human', 'agent', 'replay'].includes(context.source) || typeof context.tone !== 'string' || !['story-reassurance', 'evidence-first'].includes(context.tone) || typeof context.industry !== 'string' || !['saas-recruiting', 'wealth-advisory', 'other-services'].includes(context.industry) || typeof context.size !== 'string' || typeof context.role !== 'string' || typeof context.style !== 'string' || !Array.isArray(context.priorities) || !context.priorities.every((item) => typeof item === 'string')) return false
  }
  if (!isAnswers(value.answers) || (value.score !== null && typeof value.score !== 'number') || typeof value.scoreStatus !== 'string' || !['unavailable', 'partial', 'final'].includes(value.scoreStatus)) return false
  if (!isRecord(value.eurosRecoverable) || typeof value.eurosRecoverable.low !== 'number' || typeof value.eurosRecoverable.high !== 'number') return false
  if (!Array.isArray(value.objectionsRaised) || !value.objectionsRaised.every(isObjectionLog) || (value.residentExchange !== null && !isResidentExchange(value.residentExchange)) || !Array.isArray(value.residentExchanges) || !value.residentExchanges.every(isResidentExchange) || !Array.isArray(value.beatsCovered) || !value.beatsCovered.every((item) => typeof item === 'string') || !Array.isArray(value.choicesLog)) return false
  if (!value.choicesLog.every((item) => isRecord(item) && typeof item.choiceId === 'string' && isSceneId(item.scene) && typeof item.at === 'string')) return false
  return storedBooking(value.booking) !== null && storedBookingSlots(value.bookingSlots) !== null && typeof value.agentBriefed === 'boolean' && typeof value.genericMode === 'boolean'
}

let state = loadState()

function loadState(): PitchState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      const candidate = isRecord(parsed) && parsed.schemaVersion === 2
        ? { ...parsed, schemaVersion: SCHEMA_VERSION, residentExchange: null, residentExchanges: [] }
        : parsed
      if (isPitchState(candidate)) {
        const booking = storedBooking(candidate.booking)
        if (!booking) return initialState()
        return { ...candidate, booking, bookingSlots: { status: 'idle' } }
      }
    }
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
  const result = scoreSummit(state.answers)
  if (state.scene === 'summit') {
    state.score = result.score
    state.scoreStatus = result.complete ? 'final' : 'partial'
  }
  state.eurosRecoverable = result.economicInputsComplete ? result.eurosPerWeek : { low: 0, high: 0 }
}

function finalizeScore(): void {
  const result = scoreSummit(state.answers)
  state.score = result.score
  state.scoreStatus = result.complete ? 'final' : 'partial'
  state.eurosRecoverable = result.economicInputsComplete ? result.eurosPerWeek : { low: 0, high: 0 }
}

function cover(beat: string): void {
  if (!state.beatsCovered.includes(beat)) state.beatsCovered.push(beat)
}

function agentQuestion(question: ReturnType<typeof getQuestion>): Record<string, unknown> | null {
  if (!question) return null
  return {
    question_id: question.id,
    label: question.text,
    options: question.options.map((option) => ({ value: option.value, label: option.label })),
  }
}

function missingScanFields(answers: ScorecardAnswers, context: Context | null): Array<Record<string, unknown>> {
  const missing: Array<Record<string, unknown>> = []
  if (!context) missing.push({ id: 'context', label: 'Provide the human\'s firm context with provide_context.' })
  for (const question of getScanQuestions()) {
    if (question.dimension === 'style' || !context && question.dimension === 'context') continue
    if (!answers[question.id]) missing.push(agentQuestion(question) ?? { id: question.id, label: question.text })
  }
  return missing
}

export function getPitchState(): PitchState {
  return structuredClone(state)
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
  source?: 'human' | 'agent' | 'replay'
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

export function raiseObjection(topic: string, detail: string | null = null, source: 'human' | 'agent' = 'human'): { state: PitchState; objection: ReturnType<typeof objectionLog> } {
  const match = findObjection(topic)
  if (!match) throw new Error('That objection is not in the canned pool. Use one of the objection labels shown on stage, then try again.')
  const entry = objectionLog(match, detail, source)
  state.objectionsRaised.push(entry)
  capture('objection_raised', { topic: entry.topic, channel: source })
  emit()
  return { state: getPitchState(), objection: entry }
}

export function recordResidentExchange(exchange: ResidentExchange): PitchState {
  const entry = { ...exchange, action: exchange.action ? { ...exchange.action } : null }
  state.residentExchange = entry
  state.residentExchanges = [...state.residentExchanges, entry].slice(-20)
  capture('resident_exchange', { channel: exchange.channel })
  if (exchange.action) capture('resident_route_decision', { channel: exchange.channel, kind: exchange.action.kind, target: exchange.action.target })
  emit()
  return getPitchState()
}

export function applyResidentAction(action: ResidentAction): PitchState {
  const next: Record<SceneId, SceneId> = {
    basecamp: 'pipeline',
    pipeline: 'follow-through',
    'follow-through': 'speed',
    speed: 'memory-cash',
    'memory-cash': 'summit',
    summit: 'summit',
  }
  if (action.kind === 'advance_beat' && next[state.scene] === action.target && state.scene !== 'summit') return advanceScene()
  return getPitchState()
}

export function advanceScene(): PitchState {
  const next: Record<SceneId, SceneId> = {
    basecamp: 'pipeline',
    pipeline: 'follow-through',
    'follow-through': 'speed',
    speed: 'memory-cash',
    'memory-cash': 'summit',
    summit: 'summit',
  }
  cover(state.scene)
  if (state.scene === 'summit') finalizeScore()
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

export function runLeverageScore(answers: ScorecardAnswers = {}) {
  const mergedAnswers = { ...state.answers, ...answers }
  state.answers = mergedAnswers
  const result = scoreSummit(mergedAnswers)
  const missing = missingScanFields(mergedAnswers, state.context)
  if (missing.length > 0) {
    applyScore()
    emit()
    return { status: 'missing_fields' as const, missing_fields: missing }
  }
  state.score = result.score
  state.scoreStatus = result.complete ? 'final' : 'partial'
  state.eurosRecoverable = result.eurosPerWeek
  state.scene = 'summit'
  cover('summit')
  emit()
  return result
}

export function generateMap(domain?: string) {
  const missing = missingScanFields(state.answers, state.context)
  if (missing.length > 0) return { status: 'missing_fields' as const, missing_fields: missing }
  return generatePreliminaryMap({ context: state.context, answers: state.answers, domain })
}

export function requestBookingPrefill(input: Omit<BookingPrefill, 'notes' | 'nonce'>): BookingStatus {
  if (state.booking.status === 'booked' && state.booking.start === input.start) return structuredClone(state.booking)
  const slot = state.bookingSlots.status === 'ready' ? state.bookingSlots.slots.find((item) => item.start === input.start) : undefined
  if (!slot) throw new Error('That start is not one of the currently offered slots. Call get_pitch_state and use an exact slot.')
  state.booking = {
    status: 'awaiting_human_confirmation',
    prefill: { ...input, nonce: slot.nonce, notes: '' },
  }
  capture('booking_prefilled', { channel: 'agent', start: input.start })
  emit()
  return structuredClone(state.booking)
}

export function prefillHumanBooking(start: string): PitchState {
  const slot = state.bookingSlots.status === 'ready' ? state.bookingSlots.slots.find((item) => item.start === start) : undefined
  if (!slot) throw new Error('That slot is no longer available. Reload the available slots and try again.')
  state.booking = {
    status: 'awaiting_human_confirmation',
    prefill: { start, nonce: slot.nonce, name: '', email: '', notes: '' },
  }
  capture('booking_slot_selected', { channel: 'human', start })
  emit()
  return getPitchState()
}

export function updateBookingPrefill(prefill: BookingPrefill): PitchState {
  if (state.booking.status !== 'awaiting_human_confirmation' && state.booking.status !== 'booking_error') return getPitchState()
  state.booking = { status: 'awaiting_human_confirmation', prefill: { ...prefill } }
  emit()
  return getPitchState()
}

export function markBookingSubmitting(): PitchState {
  if (state.booking.status !== 'awaiting_human_confirmation' && state.booking.status !== 'booking_error') return getPitchState()
  capture('booking_confirmation_yes_click', { channel: 'human', start: state.booking.prefill.start })
  state.booking = { status: 'booking', prefill: { ...state.booking.prefill } }
  emit()
  return getPitchState()
}

export function markBookingBooked(start: string): PitchState {
  if (state.booking.status !== 'booking' || state.booking.prefill.start !== start) return getPitchState()
  state.booking = { status: 'booked', start }
  capture('booking_confirmed', { channel: 'human', start })
  emit()
  return getPitchState()
}

export function markBookingError(message: string): PitchState {
  if (state.booking.status !== 'booking') return getPitchState()
  state.booking = { status: 'booking_error', prefill: { ...state.booking.prefill }, message }
  capture('booking_failed', { channel: 'human' })
  emit()
  return getPitchState()
}

export function dismissBooking(): PitchState {
  if (state.booking.status === 'booked') return getPitchState()
  if (state.booking.status === 'awaiting_human_confirmation' || state.booking.status === 'booking_error' || state.booking.status === 'booking') {
    capture('booking_confirmation_no_click', { channel: 'human', start: state.booking.prefill.start })
  }
  state.booking = { status: 'idle' }
  emit()
  return getPitchState()
}

export function setBookingSlotsLoading(): PitchState {
  state.bookingSlots = { status: 'loading' }
  emit()
  return getPitchState()
}

export function setBookingSlots(slots: BookingSlot[]): PitchState {
  state.bookingSlots = { status: 'ready', slots: [...slots] }
  emit()
  return getPitchState()
}

export function setBookingSlotsError(message: string): PitchState {
  state.bookingSlots = { status: 'error', message }
  emit()
  return getPitchState()
}

export function replayAsSomeoneElse(): PitchState {
  const current = state.context?.industry
  const profiles: Record<Industry, { industry: Industry; size: string; style: string }> = {
    'saas-recruiting': { industry: 'wealth-advisory', size: 'team_11_25', style: 'team buy-in' },
    'wealth-advisory': { industry: 'other-services', size: 'team_5_10', style: 'speed' },
    'other-services': { industry: 'saas-recruiting', size: 'team_5_10', style: 'numbers' },
  }
  const profile = profiles[current ?? 'other-services']
  state = initialState()
  capture('pitch_replay', { industry: profile.industry })
  return setContext({ ...profile, source: 'replay' })
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
    next_step: 'Start with the Leverage Assessment or book a 30-minute call at https://cal.welcometotheaijungle.com/loic/intro.',
  }
}

export function stateForAgent(): Record<string, unknown> {
  const result = getPitchState()
  const scanQuestions = getScanQuestions()
    .filter((question) => question.dimension !== 'style' && !result.answers[question.id])
    .map((question) => agentQuestion(question))
    .filter((question): question is Record<string, unknown> => question !== null)
  const currentQuestion = result.context
    ? scanQuestions[0] ?? null
    : {
        question_id: 'provide_context',
        label: 'Ask the human for firm context before answering the scan.',
        fields: ['industry', 'size', 'role', 'priorities', 'tone'],
        options: {
          industry: [
            { value: 'saas-recruiting', label: 'SaaS / recruiting' },
            { value: 'wealth-advisory', label: 'Wealth / advisory' },
            { value: 'other-services', label: 'Other services' },
          ],
          size: [
            { value: 'team_1_4', label: '1 to 4 people' },
            { value: 'team_5_10', label: '5 to 10 people' },
            { value: 'team_11_25', label: '11 to 25 people' },
            { value: 'team_26_50', label: '26 to 50 people' },
          ],
          tone: [
            { value: 'evidence-first', label: 'Evidence first' },
            { value: 'story-reassurance', label: 'Story and reassurance' },
          ],
        },
      }
  return {
    ...result,
    currentQuestion,
    remainingQuestions: scanQuestions,
    availableChoices: result.scene === 'pipeline' ? ['post', 'pitch', 'partner'] : [],
    next: result.scene === 'summit' ? 'Review the estimate and choose the assessment or 30-minute call.' : 'Use the exact current question options, then call get_pitch_state again.',
  }
}

export function getPitchSummary(): Record<string, unknown> {
  const score = scoreSummit(state.answers)
  const leaks = Object.entries(score.dimensions)
    .map(([dimension, severity]) => ({ dimension, severity }))
    .sort((left, right) => right.severity - left.severity)
  const bookableSlot = state.booking.status === 'booked'
    ? state.booking.start
    : state.bookingSlots.status === 'ready'
      ? state.bookingSlots.slots[0] ?? null
      : null
  return {
    score,
    leaks,
    answers: { ...state.answers },
    objections: state.objectionsRaised.map((item) => ({ topic: item.topic, detail: item.detail, answer: item.answer })),
    residentExchanges: structuredClone(state.residentExchanges),
    offer: offerFacts(),
    booking: structuredClone(state.booking),
    nextStep: {
      action: state.booking.status === 'booked' ? 'Attend the confirmed assessment call.' : 'Choose a slot and confirm the assessment call in the visible modal.',
      bookableSlot,
      agentRole: 'The agent attends the webinar and writes the briefing.',
    },
  }
}
