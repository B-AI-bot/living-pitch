import type { PitchState, ResidentAction } from './engine/types.ts'

export type ResidentChannel = 'human' | 'agent'
export type ResidentResponse = { answer_for_agent: string; stage_render: string; action: ResidentAction | null }
export type ResidentWarmingUp = { status: 'warming_up'; fallback: 'canned' }
export type ResidentResult = ResidentResponse | ResidentWarmingUp

type BuildEnv = Record<string, string | undefined>

const BUILD_ENV: BuildEnv = Object.hasOwn(import.meta, 'env') ? import.meta.env : {}
const API_BASE = BUILD_ENV.VITE_API_BASE_URL ?? 'https://api.welcometotheaijungle.com'
const RESIDENT_ENABLED = BUILD_ENV.VITE_RESIDENT_ENABLED === '1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isResidentAction(value: unknown): value is ResidentAction {
  if (!isRecord(value) || typeof value.kind !== 'string' || typeof value.target !== 'string') return false
  return (value.kind === 'advance_beat' || value.kind === 'open_view' || value.kind === 'propose_route') && value.target.trim().length > 0
}

export function isResidentEnabled(): boolean {
  return RESIDENT_ENABLED
}

export function parseResidentPayload(value: unknown): ResidentResult {
  if (!isRecord(value)) throw new Error('The Resident service returned an invalid response.')
  if (value.status === 'warming_up' && value.fallback === 'canned' && Object.keys(value).length === 2) return { status: 'warming_up', fallback: 'canned' }
  if (Object.keys(value).length !== 3 || typeof value.answer_for_agent !== 'string' || !value.answer_for_agent.trim() || typeof value.stage_render !== 'string' || !value.stage_render.trim()) {
    throw new Error('The Resident service returned an invalid controller response.')
  }
  if (value.action !== null && !isResidentAction(value.action)) throw new Error('The Resident service returned an invalid action.')
  const action = value.action === null ? null : { kind: value.action.kind, target: value.action.target.trim() }
  return { answer_for_agent: value.answer_for_agent.trim(), stage_render: value.stage_render.trim(), action }
}

export function residentSessionState(state: PitchState): Pick<PitchState, 'skin' | 'scene' | 'score' | 'beatsCovered' | 'objectionsRaised'> {
  return {
    skin: state.skin,
    scene: state.scene,
    score: state.score,
    beatsCovered: [...state.beatsCovered],
    objectionsRaised: state.objectionsRaised.map((objection) => ({ ...objection })),
  }
}

export async function requestResident(input: { message: string; state: ReturnType<typeof residentSessionState>; channel: ResidentChannel }): Promise<ResidentResult> {
  if (!RESIDENT_ENABLED) return { status: 'warming_up', fallback: 'canned' }
  const response = await fetch(`${API_BASE}/resident`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30000),
  })
  const payload: unknown = await response.json()
  if (!response.ok && response.status !== 503) {
    const message = isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'The Resident service is unavailable.'
    throw new Error(message)
  }
  return parseResidentPayload(payload)
}
