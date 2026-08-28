import { DIMENSIONS, getDimensionQuestions, getQuestion, QUESTIONS, type Dimension, type ScorecardAnswers } from './questions.ts'

export type DimensionScores = Record<Dimension, number>

export const DIMENSION_WEIGHTS: Readonly<Record<Dimension, number>> = {
  pipeline: 0.24,
  followThrough: 0.21,
  speedToLead: 0.21,
  memory: 0.18,
  cash: 0.16,
}

export const WEEKS_PER_MONTH = 4.33

export type RecoverableRange = { low: number; high: number }

export type LeverageResult = {
  score: number
  dimensionScores: DimensionScores
  topTerritory: Dimension | null
  eurosRecoverable: RecoverableRange
  answersUsed: number
  complete: boolean
  economicInputsComplete: boolean
  estimateFormula: string | null
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

function numericRange(answers: ScorecardAnswers, questionId: string): { min: number; max: number } | null {
  return optionFor(questionId, answers)?.numericRange ?? null
}

function volumeRange(answers: ScorecardAnswers): { min: number; max: number } | null {
  const option = optionFor('client_volume', answers)
  return option?.numericRange ?? null
}

function calculateEuros(answers: ScorecardAnswers): RecoverableRange {
  const loadedRate = numericRange(answers, 'loaded_rate')
  const volume = volumeRange(answers)
  if (!loadedRate || !volume) return { low: 0, high: 0 }
  const leakSeverity = DIMENSIONS.reduce(
    (total, dimension) => total + (dimensionScore(answers, dimension) / 100) * DIMENSION_WEIGHTS[dimension],
    0,
  )
  return {
    low: round((loadedRate.min * volume.min * leakSeverity) / WEEKS_PER_MONTH),
    high: round((loadedRate.max * volume.max * leakSeverity) / WEEKS_PER_MONTH),
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
  const scored = DIMENSIONS.filter((dimension) => dimensionScores[dimension] >= 25)
  const topTerritory = scored.reduce<Dimension | null>(
    (top, dimension) => top === null || dimensionScores[dimension] > dimensionScores[top] ? dimension : top,
    null,
  )
  const answersUsed = Object.keys(answers).filter((id) => Boolean(getQuestion(id))).length
  const complete = QUESTIONS.filter((question) => question.dimension !== 'context' && question.dimension !== 'style')
    .every((question) => Boolean(optionFor(question.id, answers)))
  const economicInputsComplete = Boolean(numericRange(answers, 'loaded_rate') && volumeRange(answers))
  return {
    score: round(100 - leakSeverity),
    dimensionScores,
    topTerritory,
    eurosRecoverable: calculateEuros(answers),
    answersUsed,
    complete,
    economicInputsComplete,
    estimateFormula: economicInputsComplete
      ? 'weekly estimate = loaded hourly rate × new clients per month × weighted leak severity ÷ weeks per month'
      : null,
  }
}

export function scoreTerritory(answers: ScorecardAnswers, territory: Dimension): number {
  return dimensionScore(answers, territory)
}

export function validateScanAnswer(questionId: string, answer: string): boolean {
  return Boolean(getQuestion(questionId)?.options.some((option) => option.value === answer))
}

export const scoreAnswers = calculateLeverageScore
