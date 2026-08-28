import type { LeverageResult, ScorecardAnswers } from '../scan/index.ts'

export type SceneId = 'basecamp' | 'pipeline' | 'follow-through' | 'speed' | 'memory-cash' | 'summit'
export type Tone = 'evidence-first' | 'story-reassurance'
export type Industry = 'saas-recruiting' | 'wealth-advisory' | 'other-services'

export type Skin = {
  tone: Tone
  industry: Industry
  seed: string
  generic: boolean
}

export type Context = {
  industry: Industry
  size: string
  role: string
  priorities: string[]
  tone: Tone
  style: string
  source: 'human' | 'agent' | 'replay'
}

export type BookingPrefill = {
  start: string
  name: string
  email: string
  notes: string
}

export type BookingStatus =
  | { status: 'idle' }
  | { status: 'awaiting_human_confirmation'; prefill: BookingPrefill }
  | { status: 'booking'; prefill: BookingPrefill }
  | { status: 'booking_error'; prefill: BookingPrefill; message: string }
  | { status: 'booked'; start: string }

export type BookingSlots =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; slots: string[] }
  | { status: 'error'; message: string }

export type ObjectionLog = {
  topic: string
  detail?: string
  answer: string
  at: string
}

export type ChoiceLog = {
  choiceId: string
  scene: SceneId
  at: string
}

export type PitchState = {
  scene: SceneId
  skin: Skin
  context: Context | null
  answers: ScorecardAnswers
  score: number | null
  eurosRecoverable: LeverageResult['eurosRecoverable']
  objectionsRaised: ObjectionLog[]
  beatsCovered: string[]
  choicesLog: ChoiceLog[]
  booking: BookingStatus
  bookingSlots: BookingSlots
  agentBriefed: boolean
  genericMode: boolean
}
