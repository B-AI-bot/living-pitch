import { capture } from './analytics'

type PitchState = {
  scene: string
  choices: string[]
  score: null
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
  return {
    scene: 'basecamp',
    choices: [],
    score: null,
    covered: [],
  }
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
      'Read the current Living Pitch state before deciding what to ask or do next. It returns the current scene, available human choices, the leverage score so far, and the pitch beats already covered. In this v0 scaffold the score is honestly null and the scene is basecamp.',
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
