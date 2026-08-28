import { capture } from './analytics.ts'
import { answerScanQuestion, choosePath, getPitchState, offerFacts, raiseObjection, setContext, stateForAgent } from './engine/state.ts'

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
    description: 'Read the current Living Pitch state before deciding what to ask or do next. This is the re-anchoring call: it returns the current scene, skin, answers, Leverage Score, recoverable euro estimate, available choices, covered beats, and objections already raised. It is safe to call at any time, including after an out-of-order tool call.',
    inputSchema: noInputSchema,
    execute: () => timedCall('get_pitch_state', () => stateForAgent()),
  },
  {
    name: 'provide_context',
    description: 'Ask the human first, then provide their context to tune this session. Use exact plain-language values for industry and size. This locks the transparent skin, skips the three Basecamp questions, and does not submit a lead, book a call, or ship anything. Call get_pitch_state afterwards to re-anchor.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['industry', 'size', 'role', 'priorities', 'tone'],
      properties: {
        industry: { type: 'string', description: 'The human firm industry: SaaS/recruiting, wealth/advisory, or other services.' },
        size: { type: 'string', description: 'The team size, for example team_5_10, or the human\'s plain-language answer.' },
        role: { type: 'string', description: 'The human decision-maker role.' },
        priorities: { type: 'array', items: { type: 'string' }, description: 'The outcomes the human wants to improve first.' },
        tone: { type: 'string', enum: ['evidence-first', 'story-reassurance'], description: 'Use evidence-first for numbers or certainty. Use story-reassurance for speed or team buy-in.' },
      },
    },
    execute: (input) => timedCall('provide_context', () => {
      if (!input || typeof input !== 'object') throw new Error('Provide an object with industry, size, role, priorities, and tone.')
      const value = input as Record<string, unknown>
      if (typeof value.industry !== 'string' || typeof value.size !== 'string') throw new Error('industry and size must be strings. Ask the human for both first.')
      return setContext({ industry: value.industry, size: value.size, role: typeof value.role === 'string' ? value.role : undefined, priorities: Array.isArray(value.priorities) ? value.priorities.filter((item): item is string => typeof item === 'string') : [], tone: typeof value.tone === 'string' ? value.tone : undefined, source: 'agent' })
    }),
  },
  {
    name: 'choose_path',
    description: 'Record the human\'s chosen revenue path in Pipeline. The only valid choices are post, pitch, or partner. This is a narrative choice, not permission to contact anyone. Use get_pitch_state after it to see the updated choices log.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['choice_id'], properties: { choice_id: { type: 'string', enum: ['post', 'pitch', 'partner'], description: 'One of the three visible Pipeline path ids.' } } },
    execute: (input) => timedCall('choose_path', () => {
      const choiceId = input && typeof input === 'object' ? (input as { choice_id?: unknown }).choice_id : undefined
      if (typeof choiceId !== 'string') throw new Error('choice_id is required. Choose post, pitch, or partner.')
      return choosePath(choiceId)
    }),
  },
  {
    name: 'answer_scan_question',
    description: 'Answer one Leverage Scan question using the exact question_id and option value shown on stage. Calls are accepted out of order and stored in this session. The response returns updated territory scores, the global Leverage Score, and an honest recoverable euro estimate. It does not make a claim about measured savings.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['question_id', 'answer'], properties: { question_id: { type: 'string', description: 'Exact id from the visible scan question.' }, answer: { type: 'string', description: 'Exact value of one visible option.' } } },
    execute: (input) => timedCall('answer_scan_question', () => {
      const value = input && typeof input === 'object' ? input as { question_id?: unknown; answer?: unknown } : {}
      if (typeof value.question_id !== 'string' || typeof value.answer !== 'string') throw new Error('question_id and answer are required strings. Read get_pitch_state and the visible choices.')
      return answerScanQuestion(value.question_id, value.answer)
    }),
  },
  {
    name: 'raise_objection',
    description: 'Put a human or agent objection on stage and answer it from the canned proof pool. Use one of the visible objection labels or ids. The rendered answer begins with Your agent asks when detail is supplied, is logged in the pitch state, and never generates live copy.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['topic'], properties: { topic: { type: 'string', description: 'Exact visible objection label or canned objection id.' }, detail: { type: 'string', description: 'Optional question context from the visiting agent. Supplying it marks the stage rendering as an agent question.' } } },
    execute: (input) => timedCall('raise_objection', () => {
      const value = input && typeof input === 'object' ? input as { topic?: unknown; detail?: unknown } : {}
      if (typeof value.topic !== 'string') throw new Error('topic is required. Use a visible canned objection label or id.')
      const result = raiseObjection(value.topic, typeof value.detail === 'string' ? value.detail : undefined)
      return { stage_render: `${value.detail ? 'Your agent asks' : 'You ask'}: ${result.objection.topic}`, answer: result.objection.answer, state: result.state }
    }),
  },
  {
    name: 'get_offer_facts',
    description: 'Return the machine-readable offer canon for a topic, without inventing facts. It includes who AI Jungle serves, Rethink/Build/Operate/Train, pricing, proof, privacy, the approval ledger, anti-ICP, and the next step. Use this to brief the human or answer a follow-up about the offer.',
    inputSchema: { type: 'object', additionalProperties: false, properties: { topic: { type: 'string', description: 'Optional topic such as pricing, method, proof, control, privacy, or fit.' } } },
    execute: (input) => timedCall('get_offer_facts', () => offerFacts(input && typeof input === 'object' && typeof (input as { topic?: unknown }).topic === 'string' ? (input as { topic: string }).topic : undefined)),
  },
  {
    name: 'run_leverage_score',
    description: 'Return the deterministic Leverage Score from answers already collected. Use get_pitch_state first. This is a planning estimate based on the human\'s answers, not measured revenue or a promise.',
    inputSchema: noInputSchema,
    execute: () => timedCall('run_leverage_score', () => getPitchState()),
  },
]

export async function installWebMcpTools(): Promise<boolean> {
  const modelContext = navigator.modelContext
  if (!modelContext) return false
  const register = modelContext.registerTool ?? modelContext.register
  if (!register) return false
  for (const tool of tools) await register.call(modelContext, tool)
  return true
}

export { tools as webMcpTools }
