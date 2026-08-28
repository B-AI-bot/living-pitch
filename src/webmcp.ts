import { capture } from './analytics'
import { calculateLeverageScore, getQuestion, validateScanAnswer, type LeverageResult, type ScorecardAnswers } from './scan'

type PitchState = {
  scene: string
  choices: string[]
  score: number | null
  eurosRecoverable: { low: number; high: number }
  covered: string[]
}

type ContextInput = {
  industry: string
  size: string
  role: string
  priorities: string[]
  tone: string
}

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
  interface Navigator {
    modelContext?: ModelContext
  }
}

const contextSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['industry', 'size', 'role', 'priorities', 'tone'],
  properties: {
    industry: {
      type: 'string',
      description: 'The visitor\'s industry, such as recruiting, advisory, or consulting.',
    },
    size: {
      type: 'string',
      description: 'The firm size in plain language, such as a small owner-led team.',
    },
    role: {
      type: 'string',
      description: 'The human decision-maker\'s role in the firm.',
    },
    priorities: {
      type: 'array',
      items: { type: 'string' },
      description: 'The outcomes the human wants to improve first.',
    },
    tone: {
      type: 'string',
      enum: ['evidence-first', 'story-reassurance'],
      description: 'How the human prefers the pitch to make its case.',
    },
  },
} as const

function getState(): PitchState {
  const result = calculateLeverageScore(scanAnswers)
  return {
    scene: 'basecamp',
    choices: [],
    score: result.answersUsed === 0 ? null : result.score,
    eurosRecoverable: result.eurosRecoverable,
    covered: [],
  }
}

let scanAnswers: ScorecardAnswers = {}

function answerScanQuestion(input: unknown): LeverageResult {
  if (!input || typeof input !== 'object') throw new Error('answer_scan_question expects question_id and answer.')
  const value = input as { question_id?: unknown; answer?: unknown }
  if (typeof value.question_id !== 'string' || typeof value.answer !== 'string') {
    throw new Error('answer_scan_question needs a question_id and an answer string.')
  }
  if (!getQuestion(value.question_id)) throw new Error(`Unknown scan question: ${value.question_id}.`)
  if (!validateScanAnswer(value.question_id, value.answer)) {
    throw new Error(`Answer is not one of the available choices for ${value.question_id}.`)
  }
  scanAnswers = { ...scanAnswers, [value.question_id]: value.answer }
  return calculateLeverageScore(scanAnswers)
}

function runLeverageScore(input: unknown): LeverageResult {
  if (input && typeof input === 'object' && 'answers' in input) {
    const answers = (input as { answers?: unknown }).answers
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new Error('run_leverage_score.answers must be an object keyed by scan question id.')
    }
    scanAnswers = { ...scanAnswers, ...(answers as ScorecardAnswers) }
  }
  return calculateLeverageScore(scanAnswers)
}

function storeContext(input: ContextInput): Record<string, unknown> {
  try {
    sessionStorage.setItem('living-pitch-context', JSON.stringify(input))
  } catch {
    // Private browsing and restricted embedded browsers can reject storage.
  }

  return {
    context: input,
    next: 'The site will use this context to choose a transparent pitch skin and order its proof.',
    human_control: 'The human can inspect or turn off the tuning. No action ships without a human yes.',
  }
}

async function timedCall(tool: string, action: () => unknown): Promise<unknown> {
  const started = performance.now()
  try {
    const result = await action()
    capture('webmcp_tool_call', {
      tool,
      ok: true,
      duration: Math.round(performance.now() - started),
    })
    return result
  } catch (error) {
    capture('webmcp_tool_call', {
      tool,
      ok: false,
      duration: Math.round(performance.now() - started),
    })
    throw error
  }
}

const tools: ToolDefinition[] = [
  {
    name: 'get_pitch_state',
    description:
      'Read the current Living Pitch state before deciding what to ask or do next. It returns the current scene, available human choices, the Leverage Score so far, recoverable euros, and the pitch beats already covered. Use this to re-anchor after any tool call.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    execute: () => timedCall('get_pitch_state', () => getState()),
  },
  {
    name: 'provide_context',
    description:
      'Give the site context after asking the human for permission: their industry, firm size, role, priorities, and preferred pitch tone. The site stores this only for the session, selects a transparent pitch skin, and reorders proof to fit. This does not submit a lead, book a call, or ship anything.',
    inputSchema: contextSchema,
    execute: (input) => timedCall('provide_context', () => storeContext(input as ContextInput)),
  },
  {
    name: 'answer_scan_question',
    description:
      'Record one answer from the five-territory Leverage Scan. Use the exact question_id and answer value returned in the scan question choices. The answer is stored for this session and returns updated territory scores, the global score, and the recoverable euro range. It does not submit a lead or book a call.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['question_id', 'answer'],
      properties: {
        question_id: { type: 'string', description: 'The id of the scan question being answered.' },
        answer: { type: 'string', description: 'The exact value of one option for that question.' },
      },
    },
    execute: (input) => timedCall('answer_scan_question', () => answerScanQuestion(input)),
  },
  {
    name: 'run_leverage_score',
    description:
      'Calculate the current deterministic Leverage Score from the answers collected so far. Optionally pass answers to merge them into the current session. Returns scores for Pipeline, Follow-through, Speed-to-lead, Memory, and Cash, plus a planning range of recoverable euros. It is a directional planning result, not a promise or a quote.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        answers: { type: 'object', description: 'Optional map of scan question ids to exact option values.' },
      },
    },
    execute: (input) => timedCall('run_leverage_score', () => runLeverageScore(input)),
  },
]

export async function installWebMcpTools(): Promise<boolean> {
  const modelContext = navigator.modelContext
  if (!modelContext) return false

  const register = modelContext.registerTool ?? modelContext.register
  if (!register) return false

  for (const tool of tools) {
    await register.call(modelContext, tool)
  }
  return true
}

export { tools as webMcpTools }
