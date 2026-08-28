export const FIRM_TYPES = [
  'consulting',
  'exec-search',
  'ma-corporate-advisory',
  'agency',
  'other-services',
  'product-ecommerce-other',
] as const

export type FirmType = (typeof FIRM_TYPES)[number]
export type Dimension = 'pipeline' | 'followThrough' | 'speedToLead' | 'memory' | 'cash'
export type QuestionDimension = Dimension | 'context' | 'style'
export type ScorecardAnswers = Partial<Record<string, string>>

export type QuestionOption = {
  value: string
  label: string
  weight: number
  numericRange?: { min: number; max: number }
}

export type ScanQuestion = {
  id: string
  dimension: QuestionDimension
  text: string
  options: QuestionOption[]
}

const firmTypeOptions: QuestionOption[] = [
  { value: 'consulting', label: 'Consulting', weight: 0 },
  { value: 'exec-search', label: 'Executive search', weight: 0 },
  { value: 'ma-corporate-advisory', label: 'M&A or corporate advisory', weight: 0 },
  { value: 'agency', label: 'Agency', weight: 0 },
  { value: 'other-services', label: 'Other professional services', weight: 0 },
  { value: 'product-ecommerce-other', label: 'Product, e-commerce, or something else', weight: 0 },
]

const ownerLedOptions: QuestionOption[] = [
  { value: 'owner_led_yes', label: 'Yes', weight: 0 },
  { value: 'owner_led_no', label: 'No', weight: 0 },
]

const teamSizeOptions: QuestionOption[] = [
  { value: 'team_1_4', label: '1 to 4 people', weight: 0, numericRange: { min: 1, max: 4 } },
  { value: 'team_5_10', label: '5 to 10 people', weight: 0, numericRange: { min: 5, max: 10 } },
  { value: 'team_11_25', label: '11 to 25 people', weight: 0, numericRange: { min: 11, max: 25 } },
  { value: 'team_26_50', label: '26 to 50 people', weight: 0, numericRange: { min: 26, max: 50 } },
  { value: 'team_51_200', label: '51 to 200 people', weight: 0, numericRange: { min: 51, max: 200 } },
  { value: 'team_201_plus', label: 'More than 200 people', weight: 0, numericRange: { min: 201, max: 500 } },
]

const clientVolumeOptions: QuestionOption[] = [
  { value: 'clients_0_5', label: '0 to 5 new clients', weight: 0, numericRange: { min: 0, max: 5 } },
  { value: 'clients_6_15', label: '6 to 15 new clients', weight: 0, numericRange: { min: 6, max: 15 } },
  { value: 'clients_16_30', label: '16 to 30 new clients', weight: 0, numericRange: { min: 16, max: 30 } },
  { value: 'clients_31_plus', label: '31 or more new clients', weight: 0, numericRange: { min: 31, max: 60 } },
]

const pipelineOptions: QuestionOption[] = [
  { value: 'pipeline_visible', label: 'We see every live opportunity in one place', weight: 0 },
  { value: 'pipeline_some_gaps', label: 'Some opportunities are tracked inconsistently', weight: 1 },
  { value: 'pipeline_manual', label: 'Tracking depends on manual checks', weight: 3 },
  { value: 'pipeline_leaky', label: 'Several opportunities do not have a clear next step', weight: 4 },
]

const followThroughOptions: QuestionOption[] = [
  { value: 'follow_systematic', label: 'The next action is clear and assigned', weight: 0 },
  { value: 'follow_owner', label: 'A lead checks that work keeps moving', weight: 1 },
  { value: 'follow_chasing', label: 'Updates need regular manual follow-up', weight: 3 },
  { value: 'follow_stalls', label: 'The next step is often delayed after approval', weight: 4 },
]

const responseTimeOptions: QuestionOption[] = [
  { value: 'response_under_15m', label: 'Under 15 minutes', weight: 0 },
  { value: 'response_15_60m', label: '15 to 60 minutes', weight: 1 },
  { value: 'response_same_day', label: 'Later the same working day', weight: 3 },
  { value: 'response_next_day_plus', label: 'The next working day or later', weight: 4 },
]

const speedOptions: QuestionOption[] = [
  { value: 'speed_same_day', label: 'A useful reply goes out the same working day', weight: 0 },
  { value: 'speed_next_day', label: 'It usually takes until the next working day', weight: 1 },
  { value: 'speed_few_days', label: 'It can take several days when the team is busy', weight: 3 },
  { value: 'speed_unowned', label: 'No one clearly owns the first response', weight: 4 },
]

const memoryOptions: QuestionOption[] = [
  { value: 'memory_searchable', label: 'A teammate can find the answer without asking around', weight: 0 },
  { value: 'memory_somewhere', label: 'The answer exists, but it takes some digging', weight: 1 },
  { value: 'memory_people', label: 'Important context lives with a few key people', weight: 3 },
  { value: 'memory_rebuilt', label: 'We rebuild the same context for each new piece of work', weight: 4 },
]

const clientSystemsOptions: QuestionOption[] = [
  { value: 'systems_one', label: 'One main system', weight: 0 },
  { value: 'systems_two_three', label: 'Two or three systems', weight: 1 },
  { value: 'systems_four_plus', label: 'Four or more systems', weight: 3 },
  { value: 'systems_unknown', label: 'It depends on the person', weight: 4 },
]

const cashOptions: QuestionOption[] = [
  { value: 'cash_visible', label: 'Invoices, scope, and next payment are easy to track', weight: 0 },
  { value: 'cash_light_chasing', label: 'A little payment chasing is normal', weight: 1 },
  { value: 'cash_manual', label: 'The owner keeps a manual eye on overdue work', weight: 3 },
  { value: 'cash_surprises', label: 'Cash surprises arrive after the work is done', weight: 4 },
]

const styleOptions: QuestionOption[] = [
  { value: 'style_speed', label: 'Speed', weight: 0 },
  { value: 'style_team_buy_in', label: 'Team buy-in', weight: 0 },
  { value: 'style_certainty', label: 'Certainty', weight: 0 },
  { value: 'style_numbers', label: 'The numbers', weight: 0 },
]

export const QUESTIONS: ScanQuestion[] = [
  { id: 'firm_type', dimension: 'context', text: 'What kind of firm do you run?', options: firmTypeOptions },
  { id: 'owner_led_confirmation', dimension: 'context', text: 'Are you an owner-led firm that sells a service?', options: ownerLedOptions },
  { id: 'team_size', dimension: 'context', text: 'How many people are on the team today?', options: teamSizeOptions },
  { id: 'client_volume', dimension: 'context', text: 'How many new clients do you typically start in a month?', options: clientVolumeOptions },
  { id: 'pipeline_visibility', dimension: 'pipeline', text: 'When a new opportunity appears, how reliably does it make it into your pipeline?', options: pipelineOptions },
  { id: 'follow_through', dimension: 'followThrough', text: 'After someone says yes to the next step, how consistently does the work keep moving?', options: followThroughOptions },
  { id: 'speed_to_lead', dimension: 'speedToLead', text: 'How quickly does a useful first response reach a new enquiry?', options: speedOptions },
  { id: 'memory_access', dimension: 'memory', text: 'If a key person is away, how easy is it to recover client context?', options: memoryOptions },
  { id: 'cash_control', dimension: 'cash', text: 'How visible is the path from completed work to collected cash?', options: cashOptions },
  { id: 'actual_response_time', dimension: 'speedToLead', text: 'In the last month, how long did a new enquiry usually wait for a useful first reply?', options: responseTimeOptions },
  { id: 'client_systems', dimension: 'memory', text: 'How many tools or systems hold client information today?', options: clientSystemsOptions },
  { id: 'style_win', dimension: 'style', text: 'When a project goes well, what made it a win?', options: styleOptions },
]

export const DIMENSIONS: Dimension[] = ['pipeline', 'followThrough', 'speedToLead', 'memory', 'cash']

export function getQuestion(id: string): ScanQuestion | undefined {
  return QUESTIONS.find((question) => question.id === id)
}

export function getScanQuestions(): ScanQuestion[] {
  return QUESTIONS.map((question) => ({
    ...question,
    options: question.options.map((option) => ({ ...option })),
  }))
}

export function getDimensionQuestions(dimension: Dimension): ScanQuestion[] {
  return QUESTIONS.filter((question) => question.dimension === dimension)
}

