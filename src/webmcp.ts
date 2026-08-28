import { capture } from './analytics.ts'
import { proposeMutation, stageAgentMutation, type MutationType } from './colony.ts'
import { requestRoast, stageAgentRoast, type RoastIntensity } from './roast.ts'
import { isResidentEnabled, requestResident, residentSessionState } from './resident.ts'
import { getQuestion, validateScanAnswer, type ScorecardAnswers } from './scan/index.ts'
import { stageRender } from './engine/scenes.ts'
import {
  answerScanQuestion,
  applyResidentAction,
  choosePath,
  generateMap,
  getPitchState,
  getPitchSummary,
  offerFacts,
  recordResidentExchange,
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

export type WebMcpRegistryStatus = {
  status: 'unavailable' | 'installed' | 'partial'
  attempted: number
  registered: number
  failed: Array<{ tool: string; error: string }>
}

let registryStatus: WebMcpRegistryStatus = { status: 'unavailable', attempted: 0, registered: 0, failed: [] }

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

function isRoastIntensity(value: unknown): value is RoastIntensity {
  return value === 'gentle' || value === 'honest' || value === 'scorched'
}

function isMutationType(value: unknown): value is MutationType {
  return value === 'copy' || value === 'objection' || value === 'burn' || value === 'bug' || value === 'idea'
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
    description: 'Put an agent objection on stage with the agent\'s exact detail and answer it from the approved proof pool. It records the objection and never generates live copy.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['topic', 'detail'], properties: { topic: { type: 'string' }, detail: { type: 'string' } } },
    execute: (input) => timedCall('raise_objection', () => {
      const value = readObject(input, 'topic and detail are required. Use a visible canned objection label or id and include the agent\'s exact question.')
      if (typeof value.topic !== 'string' || typeof value.detail !== 'string' || value.detail.trim().length === 0) throw new Error('topic and detail are required. Include the agent\'s exact question.')
      const result = raiseObjection(value.topic, value.detail.trim(), 'agent')
      return {
        stage_render: stageRender(result.objection),
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
    name: 'talk_to_resident',
    description: 'Ask Baibot, the Living Pitch Resident, one grounded question for the human. It returns an answer for the agent, stages the exact question as "Your agent asks: ...", and never advances or books anything automatically. If the Resident is disabled, return the warming_up status honestly and use the visible canned objection chips.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['message'], properties: { message: { type: 'string', description: 'The exact question from the human or agent.' } } },
    execute: (input) => timedCall('talk_to_resident', async () => {
      const value = readObject(input, 'message is required.')
      if (typeof value.message !== 'string' || !value.message.trim()) throw new Error('message is required and must be a non-empty string.')
      const message = value.message.trim()
      if (!isResidentEnabled()) {
        const stage_render = `Your agent asks: ${message}`
        recordResidentExchange({ channel: 'agent', message, answer_for_agent: 'The resident is warming up. Here is what I can answer today.', stage_render, action: null })
        return { status: 'warming_up', fallback: 'canned', description: 'Baibot is disabled for tonight\'s red-team. Ask again when the Resident flag is enabled, or use a visible canned objection chip.' }
      }
      const response = await requestResident({ message, state: residentSessionState(getPitchState()), channel: 'agent' })
      if ('status' in response) {
        const stage_render = `Your agent asks: ${message}`
        recordResidentExchange({ channel: 'agent', message, answer_for_agent: 'The resident is warming up. Here is what I can answer today.', stage_render, action: null })
        return { status: response.status, fallback: response.fallback, description: 'Baibot is warming up. Use a visible canned objection chip while the Resident is disabled.' }
      }
      const stage_render = `Your agent asks: ${message}`
      if (response.action) applyResidentAction(response.action)
      recordResidentExchange({ channel: 'agent', message, answer_for_agent: response.answer_for_agent, stage_render, action: response.action })
      return { answer_for_agent: response.answer_for_agent, stage_render, action: response.action }
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
  {
    name: 'roast_my_site',
    description: 'Ask Goria to roast the human site with exact observed receipts. This reads the supplied public domain only, never invents evidence, and stages the result for the human.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['domain', 'intensity'],
      properties: { domain: { type: 'string' }, intensity: { type: 'string', enum: ['gentle', 'honest', 'scorched'] } },
    },
    execute: (input) => timedCall('roast_my_site', async () => {
      const value = readObject(input, 'domain and intensity are required.')
      if (typeof value.domain !== 'string' || !isRoastIntensity(value.intensity)) throw new Error('domain must be a string and intensity must be gentle, honest, or scorched.')
      const result = await requestRoast({ domain: value.domain.trim(), intensity: value.intensity })
      stageAgentRoast(result)
      return { ...result, rendered_for_human: 'Your agent asked for a roast of your own site. Brave.' }
    }),
  },
  {
    name: 'propose_mutation',
    description: 'Submit a community improvement as data for human review. Nothing ships automatically. Use type copy, objection, burn, bug, or idea.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['type', 'content', 'rationale'],
      properties: { type: { type: 'string', enum: ['copy', 'objection', 'burn', 'bug', 'idea'] }, content: { type: 'string' }, rationale: { type: 'string' }, handle: { type: 'string' } },
    },
    execute: (input) => timedCall('propose_mutation', async () => {
      const value = readObject(input, 'type, content, and rationale are required.')
      if (!isMutationType(value.type) || typeof value.content !== 'string' || typeof value.rationale !== 'string' || !value.content.trim() || !value.rationale.trim()) throw new Error('type, content, and rationale must be valid non-empty values.')
      if (value.handle !== undefined && typeof value.handle !== 'string') throw new Error('handle must be a string when supplied.')
      const result = await proposeMutation({ type: value.type, content: value.content.trim(), rationale: value.rationale.trim(), handle: typeof value.handle === 'string' ? value.handle.trim() : undefined })
      stageAgentMutation(result)
      return { ...result, rendered_for_human: 'Your agent proposed an improvement. It is waiting in the human approval ledger.' }
    }),
  },
]

export async function installWebMcpTools(pathname = '/'): Promise<boolean> {
  const modelContext = navigator.modelContext
  registryStatus = { status: 'unavailable', attempted: 0, registered: 0, failed: [] }
  if (!modelContext) return false
  const register = modelContext.registerTool ?? modelContext.register
  if (!register) return false
  const availableTools = pathname === '/'
    ? tools
    : tools.filter((tool) => tool.name !== 'book_assessment_call')
  registryStatus = { status: 'installed', attempted: availableTools.length, registered: 0, failed: [] }
  for (const tool of availableTools) {
    try {
      await register.call(modelContext, tool)
      registryStatus.registered += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      registryStatus.failed.push({ tool: tool.name, error: message })
      capture('webmcp_registry_error', { tool: tool.name, error: message, channel: 'agent' })
    }
  }
  registryStatus.status = registryStatus.failed.length === 0 ? 'installed' : 'partial'
  capture('webmcp_registry_status', { status: registryStatus.status, attempted: registryStatus.attempted, registered: registryStatus.registered, failed: registryStatus.failed.length, channel: 'agent' })
  return registryStatus.registered > 0
}

export function getWebMcpRegistryStatus(): WebMcpRegistryStatus {
  return { ...registryStatus, failed: registryStatus.failed.map((item) => ({ ...item })) }
}

export { tools as webMcpTools }
