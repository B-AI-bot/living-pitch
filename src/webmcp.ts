import { capture } from './analytics.ts'
import { getQuestion, validateScanAnswer, type ScorecardAnswers } from './scan/index.ts'
import {
  answerScanQuestion,
  choosePath,
  generateMap,
  getPitchSummary,
  offerFacts,
  raiseObjection,
  requestBookingPrefill,
  runLeverageScore,
  setContext,
  stateForAgent,
} from './engine/state.ts'

type ToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: unknown) => Promise<unknown>
}

type ModelContext = {
  registerTool?: (tool: ToolDefinition) => void | Promise<void>
  register?: (tool: ToolDefinition) => void | Promise<void>
}

declare global {
  interface Navigator { modelContext?: ModelContext }
}

const noInputSchema = { type: 'object', additionalProperties: false, properties: {} }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readObject(input: unknown, message: string): Record<string, unknown> {
  if (!isRecord(input)) throw new Error(message)
  return input
}

function readAnswers(value: unknown): ScorecardAnswers {
  if (value === undefined) return {}
  if (!isRecord(value)) throw new Error('answers must be an object of scan question ids and exact option values.')
  const answers: ScorecardAnswers = {}
  for (const [questionId, answer] of Object.entries(value)) {
    if (!getQuestion(questionId) || typeof answer !== 'string' || !validateScanAnswer(questionId, answer)) {
      throw new Error(`Invalid answer for "${questionId}". Use an exact question id and option value from get_pitch_state.`)
    }
    answers[questionId] = answer
  }
  return answers
}

function isIsoDate(value: string): boolean {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
}

function errorResult(tool: string, error: unknown): Record<string, unknown> {
  return {
    ok: false,
    error: {
      code: 'INVALID_TOOL_INPUT',
      message: error instanceof Error ? error.message : String(error),
      how_to_fix: `Read get_pitch_state, use the exact choices and ids it returns, then call ${tool} again.`,
    },
  }
}

async function timedCall(tool: string, action: () => unknown): Promise<unknown> {
  const started = performance.now()
  try {
    const result = await action()
    capture('webmcp_tool_call', { tool, ok: true, duration: Math.round(performance.now() - started), channel: 'agent' })
    return { ok: true, result }
  } catch (error) {
    capture('webmcp_tool_call', { tool, ok: false, duration: Math.round(performance.now() - started), channel: 'agent' })
    return errorResult(tool, error)
  }
}

export const tools: ToolDefinition[] = [
  {
    name: 'get_pitch_state',
    description: 'Read the current Living Pitch state before deciding what to ask or do next. It includes the scene, answers, score, objections, available choices, booking slots, and confirmation status. Call it again after a human booking decision.',
    inputSchema: noInputSchema,
    execute: () => timedCall('get_pitch_state', () => stateForAgent()),
  },
  {
    name: 'provide_context',
    description: 'Ask the human first, then provide their context to tune this session. This does not submit a lead, book a call, or ship anything.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['industry', 'size', 'role', 'priorities', 'tone'],
      properties: {
        industry: { type: 'string', description: 'The human firm industry: SaaS/recruiting, wealth/advisory, or other services.' },
        size: { type: 'string', description: 'The team size, for example team_5_10.' },
        role: { type: 'string', description: 'The human decision-maker role.' },
        priorities: { type: 'array', items: { type: 'string' }, description: 'The outcomes the human wants to improve first.' },
        tone: { type: 'string', enum: ['evidence-first', 'story-reassurance'] },
      },
    },
    execute: (input) => timedCall('provide_context', () => {
      const value = readObject(input, 'Provide an object with industry, size, role, priorities, and tone.')
      if (typeof value.industry !== 'string' || typeof value.size !== 'string') {
        throw new Error('industry and size must be strings. Ask the human for both first.')
      }
      const priorities = Array.isArray(value.priorities)
        ? value.priorities.filter((item): item is string => typeof item === 'string')
        : []
      return setContext({
        industry: value.industry,
        size: value.size,
        role: typeof value.role === 'string' ? value.role : undefined,
        priorities,
        tone: typeof value.tone === 'string' ? value.tone : undefined,
        source: 'agent',
      })
    }),
  },
  {
    name: 'choose_path',
    description: 'Record the human\'s chosen Pipeline path. Valid choices are post, pitch, or partner. This is not permission to contact anyone.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['choice_id'], properties: { choice_id: { type: 'string', enum: ['post', 'pitch', 'partner'] } } },
    execute: (input) => timedCall('choose_path', () => {
      const value = readObject(input, 'choice_id is required. Choose post, pitch, or partner.')
      if (typeof value.choice_id !== 'string') throw new Error('choice_id is required. Choose post, pitch, or partner.')
      return choosePath(value.choice_id)
    }),
  },
  {
    name: 'answer_scan_question',
    description: 'Answer one Leverage Scan question with an exact question_id and option value. The result is a planning estimate, not measured savings.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['question_id', 'answer'], properties: { question_id: { type: 'string' }, answer: { type: 'string' } } },
    execute: (input) => timedCall('answer_scan_question', () => {
      const value = readObject(input, 'question_id and answer are required strings.')
      if (typeof value.question_id !== 'string' || typeof value.answer !== 'string') {
        throw new Error('question_id and answer are required strings. Read get_pitch_state and use the visible choices.')
      }
      return answerScanQuestion(value.question_id, value.answer)
    }),
  },
  {
    name: 'raise_objection',
    description: 'Put a human or agent objection on stage and answer it from the approved proof pool. It records the objection and never generates live copy.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['topic'], properties: { topic: { type: 'string' }, detail: { type: 'string' } } },
    execute: (input) => timedCall('raise_objection', () => {
      const value = readObject(input, 'topic is required. Use a visible canned objection label or id.')
      if (typeof value.topic !== 'string') throw new Error('topic is required. Use a visible canned objection label or id.')
      const detail = typeof value.detail === 'string' ? value.detail : undefined
      const result = raiseObjection(value.topic, detail)
      return {
        stage_render: `${detail ? 'Your agent asks' : 'You ask'}: ${result.objection.topic}`,
        answer: result.objection.answer,
        state: result.state,
      }
    }),
  },
  {
    name: 'get_offer_facts',
    description: 'Return the machine-readable offer canon without inventing facts.',
    inputSchema: { type: 'object', additionalProperties: false, properties: { topic: { type: 'string' } } },
    execute: (input) => timedCall('get_offer_facts', () => {
      if (input === undefined) return offerFacts()
      const value = readObject(input, 'topic must be a string.')
      return offerFacts(typeof value.topic === 'string' ? value.topic : undefined)
    }),
  },
  {
    name: 'run_leverage_score',
    description: 'Merge optional exact scan answers with session answers and return score, topLeak, eurosPerWeek, and five leak dimensions. This is a directional estimate, not measured revenue or a promise.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: { answers: { type: 'object', additionalProperties: { type: 'string' } } },
    },
    execute: (input) => timedCall('run_leverage_score', () => {
      if (input === undefined) return runLeverageScore()
      const value = readObject(input, 'Input must be an object with optional answers.')
      return runLeverageScore(readAnswers(value.answers))
    }),
  },
  {
    name: 'generate_preliminary_map',
    description: 'Generate a deterministic preliminary draft Leverage Map from session context and answers. It returns three ranked opportunities based on proven system shapes and directional impact estimates.',
    inputSchema: { type: 'object', additionalProperties: false, properties: { domain: { type: 'string' } } },
    execute: (input) => timedCall('generate_preliminary_map', () => {
      if (input === undefined) return generateMap()
      const value = readObject(input, 'domain must be a string when supplied.')
      if (value.domain !== undefined && typeof value.domain !== 'string') throw new Error('domain must be a string when supplied.')
      return generateMap(typeof value.domain === 'string' ? value.domain : undefined)
    }),
  },
  {
    name: 'book_assessment_call',
    description: 'Sensitive confirmation-gated action available only on the Living Pitch route. Prefill the visible booking modal for the human. This tool never books. Only the human confirmation button can POST the booking. Call this tool again after the human decides to observe a booked result for the same start.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['start', 'name', 'email'],
      properties: { start: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } },
    },
    execute: (input) => timedCall('book_assessment_call', () => {
      const value = readObject(input, 'start, name, and email are required.')
      if (typeof value.start !== 'string' || !isIsoDate(value.start)) throw new Error('start must be an ISO timestamp from the visible bookable slots.')
      if (typeof value.name !== 'string' || value.name.trim().length === 0) throw new Error('name is required.')
      if (typeof value.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw new Error('email must be valid.')
      const booking = requestBookingPrefill({ start: value.start, name: value.name.trim(), email: value.email.trim() })
      return booking.status === 'booked'
        ? { status: 'booked', start: booking.start }
        : { status: 'awaiting_human_confirmation' }
    }),
  },
  {
    name: 'get_pitch_summary',
    description: 'Return the structured pitch memo with score, leaks, answers, objections and approved answers, offer, next step, bookable slot, and current booking status.',
    inputSchema: noInputSchema,
    execute: () => timedCall('get_pitch_summary', () => getPitchSummary()),
  },
]

export async function installWebMcpTools(pathname = '/'): Promise<boolean> {
  const modelContext = navigator.modelContext
  if (!modelContext) return false
  const register = modelContext.registerTool ?? modelContext.register
  if (!register) return false
  const availableTools = pathname === '/'
    ? tools
    : tools.filter((tool) => tool.name !== 'book_assessment_call')
  for (const tool of availableTools) await register.call(modelContext, tool)
  return true
}

export { tools as webMcpTools }
