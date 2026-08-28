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
  source: 'human' | 'agent'
}

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
  agentBriefed: boolean
  genericMode: boolean
}
