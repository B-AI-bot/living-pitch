import { DIMENSIONS, getDimensionQuestions, getQuestion, QUESTIONS, type Dimension, type ScorecardAnswers } from './questions.ts'

export type DimensionScores = Record<Dimension, number>

export const DIMENSION_WEIGHTS: Readonly<Record<Dimension, number>> = {
  pipeline: 0.24,
  followThrough: 0.21,
  speedToLead: 0.21,
  memory: 0.18,
  cash: 0.16,
}

export const HOURLY_RATE_EUR: Readonly<Record<string, number>> = {
  consulting: 140,
  'exec-search': 160,
  'ma-corporate-advisory': 190,
  agency: 110,
  'other-services': 100,
  'product-ecommerce-other': 100,
}

export const MINUTES_PER_CLIENT: Readonly<Record<Dimension, number>> = {
  pipeline: 18,
  followThrough: 28,
  speedToLead: 14,
  memory: 16,
  cash: 20,
}

export const WEEKS_PER_MONTH = 4.33
export const RECOVERY_PERCENT = { low: 35, high: 60 } as const

const TEAM_MULTIPLIER: Readonly<Record<string, number>> = {
  team_1_4: 0.8,
  team_5_10: 1,
  team_11_25: 1.1,
  team_26_50: 1.2,
  team_51_200: 1.3,
  team_201_plus: 1.4,
}

const FIRM_MULTIPLIER: Readonly<Record<string, number>> = {
  consulting: 1,
  'exec-search': 1.05,
  'ma-corporate-advisory': 1.15,
  agency: 0.9,
  'other-services': 0.85,
  'product-ecommerce-other': 0.85,
}

export type RecoverableRange = { low: number; high: number }

export type LeverageResult = {
  score: number
  dimensionScores: DimensionScores
  topTerritory: Dimension | null
  eurosRecoverable: RecoverableRange
  answersUsed: number
  complete: boolean
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function optionFor(questionId: string, answers: ScorecardAnswers) {
  const question = getQuestion(questionId)
  return question?.options.find((option) => option.value === answers[questionId])
}

function dimensionScore(answers: ScorecardAnswers, dimension: Dimension): number {
  const selectedScores = getDimensionQuestions(dimension).flatMap((question) => {
    const selected = optionFor(question.id, answers)
    if (!selected) return []
    const maxWeight = Math.max(...question.options.map((option) => option.weight), 1)
    return [(selected.weight / maxWeight) * 100]
  })
  if (selectedScores.length === 0) return 0
  return round(selectedScores.reduce((total, value) => total + value, 0) / selectedScores.length)
}

function volumeRange(answers: ScorecardAnswers): { min: number; max: number } {
  const option = optionFor('client_volume', answers)
  return option?.numericRange ?? { min: 6, max: 15 }
}

function leakRatio(answers: ScorecardAnswers, dimension: Dimension): number {
  const selected = getDimensionQuestions(dimension).flatMap((question) => {
    const answer = optionFor(question.id, answers)
    return answer ? [answer.weight / 4] : []
  })
  if (selected.length === 0) return 0
  return selected.reduce((total, value) => total + value, 0) / selected.length
}

function calculateEuros(answers: ScorecardAnswers): RecoverableRange {
  const firmType = answers.firm_type ?? 'other-services'
  const teamMultiplier = TEAM_MULTIPLIER[answers.team_size ?? 'team_5_10'] ?? 1
  const firmMultiplier = FIRM_MULTIPLIER[firmType] ?? FIRM_MULTIPLIER['other-services']
  const volume = volumeRange(answers)
  const modeledMinutes = DIMENSIONS.reduce(
    (total, dimension) => {
      const ratio = leakRatio(answers, dimension)
      return {
        low: total.low + MINUTES_PER_CLIENT[dimension] * volume.min * ratio * teamMultiplier * firmMultiplier,
        high: total.high + MINUTES_PER_CLIENT[dimension] * volume.max * ratio * teamMultiplier * firmMultiplier,
      }
    },
    { low: 0, high: 0 },
  )
  const hoursLow = round((modeledMinutes.low * (RECOVERY_PERCENT.low / 100)) / 60 / WEEKS_PER_MONTH)
  const hoursHigh = round((modeledMinutes.high * (RECOVERY_PERCENT.high / 100)) / 60 / WEEKS_PER_MONTH)
  const hourlyRate = HOURLY_RATE_EUR[firmType] ?? HOURLY_RATE_EUR['other-services']
  return {
    low: round(hoursLow * WEEKS_PER_MONTH * hourlyRate),
    high: round(Math.max(hoursLow, hoursHigh) * WEEKS_PER_MONTH * hourlyRate),
  }
}

export function calculateLeverageScore(answers: ScorecardAnswers): LeverageResult {
  const dimensionScores = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, dimensionScore(answers, dimension)]),
  ) as DimensionScores
  const leakSeverity = round(DIMENSIONS.reduce(
    (total, dimension) => total + dimensionScores[dimension] * DIMENSION_WEIGHTS[dimension],
    0,
  ))
  const scored = DIMENSIONS.filter((dimension) => dimensionScores[dimension] > 25)
  const topTerritory = scored.reduce<Dimension | null>(
    (top, dimension) => top === null || dimensionScores[dimension] > dimensionScores[top] ? dimension : top,
    null,
  )
  const answersUsed = Object.keys(answers).filter((id) => Boolean(getQuestion(id))).length
  return {
    score: round(100 - leakSeverity),
    dimensionScores,
    topTerritory,
    eurosRecoverable: calculateEuros(answers),
    answersUsed,
    complete: QUESTIONS.filter((question) => question.dimension !== 'context' && question.dimension !== 'style')
      .every((question) => Boolean(optionFor(question.id, answers))),
  }
}

export function scoreTerritory(answers: ScorecardAnswers, territory: Dimension): number {
  return dimensionScore(answers, territory)
}

export function validateScanAnswer(questionId: string, answer: string): boolean {
  return Boolean(getQuestion(questionId)?.options.some((option) => option.value === answer))
}

export const scoreAnswers = calculateLeverageScore
