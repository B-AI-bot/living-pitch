import {
  calculateLeverageScore,
  DIMENSION_WEIGHTS,
  WEEKS_PER_MONTH,
  type Dimension,
  type ScorecardAnswers,
} from '../scan/index.ts'
import type { Context } from './types.ts'

export type LeakDimension = 'pipeline' | 'follow-through' | 'speed' | 'memory' | 'cash'

export type SummitScore = {
  score: number
  topLeak: LeakDimension | null
  eurosPerWeek: { low: number; high: number }
  complete: boolean
  economicInputsComplete: boolean
  estimateFormula: string | null
  dimensions: Record<LeakDimension, number>
}

export type SystemShape = {
  number: number
  title: string
  shape: string
  agents: string[]
  humanGate: string
}

export type PreliminaryOpportunity = {
  rank: number
  leak: LeakDimension
  system: SystemShape
  fit: string
  impact: {
    scorePoints: { low: number; high: number }
    eurosPerWeek: { low: number; high: number }
    label: string
  }
}

export type PreliminaryMap = {
  status: 'preliminary_draft'
  title: 'Preliminary draft Leverage Map'
  domain: string
  score: SummitScore
  estimateLabel: string
  opportunities: PreliminaryOpportunity[]
  inputs: {
    context: Context | null
    answers: ScorecardAnswers
  }
}

export type MissingField = {
  id: string
  label: string
  options?: Array<{ value: string; label: string }>
}

export type MissingFieldsResult = {
  status: 'missing_fields'
  missing_fields: MissingField[]
}

type DimensionLink = {
  leak: LeakDimension
  source: Dimension
}

const DIMENSION_LINKS: DimensionLink[] = [
  { leak: 'pipeline', source: 'pipeline' },
  { leak: 'follow-through', source: 'followThrough' },
  { leak: 'speed', source: 'speedToLead' },
  { leak: 'memory', source: 'memory' },
  { leak: 'cash', source: 'cash' },
]

const SYSTEMS: SystemShape[] = [
  {
    number: 1,
    title: 'The visibility and network engine',
    shape: 'Signals watched daily, meeting briefs prepared, and the relationship record kept current.',
    agents: ['SoFI', 'Bob', 'Memo'],
    humanGate: 'Every outreach is drafted and waits for human approval.',
  },
  {
    number: 2,
    title: 'The process mapper',
    shape: 'The team is interviewed, the real workflow is mapped, and trapped expertise becomes an install plan.',
    agents: ['Memo', 'Eva'],
    humanGate: 'The partners validate every finding.',
  },
  {
    number: 3,
    title: 'The VIP-circle radar',
    shape: 'Role changes, deals, and signals worth a call are watched quietly around the people who matter.',
    agents: ['SoFI', 'Memo'],
    humanGate: 'The system raises alerts. The partner decides who to contact and when.',
  },
  {
    number: 4,
    title: 'The website that adapts to how you read',
    shape: 'The experience responds to how a visitor decides, with a visible toggle and a clean opt-out.',
    agents: ['Nestor', 'Memo'],
    humanGate: 'Every variant is approved before it ships.',
  },
  {
    number: 5,
    title: 'Consulting-grade desk research',
    shape: 'Partner-grade briefs use real consulting frameworks, with every source labeled fact, inference, or hypothesis.',
    agents: ['SoFI', 'Memo'],
    humanGate: 'A senior human signs every deliverable.',
  },
  {
    number: 6,
    title: 'The voice-faithful drafting agent',
    shape: 'Drafts use the principal\'s own appearances, positions, and voice instead of a generic persona.',
    agents: ['Hipo', 'Memo'],
    humanGate: 'Nothing goes out unapproved.',
  },
]

const DEFAULT_SYSTEMS: Record<LeakDimension, number[]> = {
  pipeline: [1, 3, 6, 4],
  'follow-through': [2, 1, 6],
  speed: [4, 3, 5],
  memory: [5, 2, 6, 1],
  cash: [2, 1, 5],
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function leakForDimension(dimension: Dimension | null): LeakDimension | null {
  if (dimension === null) return null
  return DIMENSION_LINKS.find((item) => item.source === dimension)?.leak ?? null
}

export function scoreSummit(answers: ScorecardAnswers): SummitScore {
  const result = calculateLeverageScore(answers)
  return {
    score: result.score,
    topLeak: leakForDimension(result.topTerritory),
    eurosPerWeek: {
      low: Math.round(result.eurosRecoverable.low / WEEKS_PER_MONTH),
      high: Math.round(result.eurosRecoverable.high / WEEKS_PER_MONTH),
    },
    complete: result.complete,
    economicInputsComplete: result.economicInputsComplete,
    estimateFormula: result.estimateFormula,
    dimensions: {
      pipeline: result.dimensionScores.pipeline,
      'follow-through': result.dimensionScores.followThrough,
      speed: result.dimensionScores.speedToLead,
      memory: result.dimensionScores.memory,
      cash: result.dimensionScores.cash,
    },
  }
}

function firmType(context: Context): string {
  if (context.industry === 'saas-recruiting') return 'exec-search'
  if (context.industry === 'wealth-advisory') return 'ma-corporate-advisory'
  return 'other-services'
}

function mergeContext(context: Context | null, answers: ScorecardAnswers): ScorecardAnswers {
  if (!context) return { ...answers }
  return {
    firm_type: firmType(context),
    team_size: context.size,
    ...answers,
  }
}

function domainLabel(context: Context | null, domain?: string): string {
  const provided = domain?.trim()
  if (provided) return provided
  if (context?.industry === 'saas-recruiting') return 'SaaS and recruiting'
  if (context?.industry === 'wealth-advisory') return 'wealth and advisory'
  return 'professional services'
}

function preferredSystems(leak: LeakDimension, context: Context | null, domain: string): number[] {
  const normalized = domain.toLowerCase()
  if (leak === 'pipeline' && (context?.industry === 'wealth-advisory' || normalized.includes('wealth') || normalized.includes('advis'))) {
    return [3, 1, 6, 4]
  }
  if (leak === 'pipeline' && (context?.industry === 'saas-recruiting' || normalized.includes('recruit'))) {
    return [1, 3, 6, 4]
  }
  if (leak === 'speed' && (context?.industry === 'saas-recruiting' || normalized.includes('recruit'))) {
    return [3, 4, 5]
  }
  return DEFAULT_SYSTEMS[leak]
}

function selectSystem(leak: LeakDimension, context: Context | null, domain: string, used: Set<number>): SystemShape {
  const candidates = preferredSystems(leak, context, domain)
  const number = candidates.find((candidate) => !used.has(candidate)) ?? candidates[0]
  const system = SYSTEMS.find((candidate) => candidate.number === number) ?? SYSTEMS[0]
  used.add(system.number)
  return {
    ...system,
    agents: [...system.agents],
  }
}

function opportunity(args: {
  rank: number
  link: DimensionLink
  context: Context | null
  domain: string
  score: SummitScore
  totalWeightedSeverity: number
  used: Set<number>
}): PreliminaryOpportunity {
  const dimensionSeverity = args.score.dimensions[args.link.leak]
  const weightedSeverity = dimensionSeverity * DIMENSION_WEIGHTS[args.link.source]
  const share = args.totalWeightedSeverity === 0 ? 0 : weightedSeverity / args.totalWeightedSeverity
  return {
    rank: args.rank,
    leak: args.link.leak,
    system: selectSystem(args.link.leak, args.context, args.domain, args.used),
    fit: `Adapt this proven system shape to ${args.domain} and the ${args.link.leak} leak shown in the answers.`,
    impact: {
      scorePoints: {
        low: round(weightedSeverity * 0.35),
        high: round(weightedSeverity * 0.6),
      },
      eurosPerWeek: {
        low: round(args.score.eurosPerWeek.low * share),
        high: round(args.score.eurosPerWeek.high * share),
      },
      label: 'Directional estimate from the preliminary score, not measured savings.',
    },
  }
}

export function generatePreliminaryMap(input: {
  context: Context | null
  answers: ScorecardAnswers
  domain?: string
}): PreliminaryMap {
  const answers = mergeContext(input.context, input.answers)
  const score = scoreSummit(answers)
  const domain = domainLabel(input.context, input.domain)
  const ranked = [...DIMENSION_LINKS].sort((left, right) => {
    const leftImpact = score.dimensions[left.leak] * DIMENSION_WEIGHTS[left.source]
    const rightImpact = score.dimensions[right.leak] * DIMENSION_WEIGHTS[right.source]
    return rightImpact - leftImpact
  })
  const totalWeightedSeverity = DIMENSION_LINKS.reduce(
    (total, item) => total + score.dimensions[item.leak] * DIMENSION_WEIGHTS[item.source],
    0,
  )
  const used = new Set<number>()
  return {
    status: 'preliminary_draft',
    title: 'Preliminary draft Leverage Map',
    domain,
    score,
    estimateLabel: 'Estimate based on the answers provided. Validate the workflow and success gate before an install.',
    opportunities: [
      opportunity({ rank: 1, link: ranked[0], context: input.context, domain, score, totalWeightedSeverity, used }),
      opportunity({ rank: 2, link: ranked[1], context: input.context, domain, score, totalWeightedSeverity, used }),
      opportunity({ rank: 3, link: ranked[2], context: input.context, domain, score, totalWeightedSeverity, used }),
    ],
    inputs: {
      context: input.context ? { ...input.context, priorities: [...input.context.priorities] } : null,
      answers,
    },
  }
}
