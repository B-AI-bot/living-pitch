import assert from 'node:assert/strict'
import { calculateLeverageScore } from '../src/scan/engine.ts'
import { getQuestion } from '../src/scan/index.ts'
import { getSceneCopy, sceneQuestions } from '../src/engine/scenes.ts'

const clean = {
  firm_type: 'consulting', owner_led_confirmation: 'owner_led_yes', team_size: 'team_5_10',
  client_volume: 'clients_6_15', pipeline_visibility: 'pipeline_visible',
  follow_through: 'follow_systematic', speed_to_lead: 'speed_same_day', memory_access: 'memory_searchable',
  cash_control: 'cash_visible', actual_response_time: 'response_under_15m', client_systems: 'systems_one',
}
const leaky = {
  firm_type: 'exec-search', owner_led_confirmation: 'owner_led_yes', team_size: 'team_11_25',
  client_volume: 'clients_16_30', pipeline_visibility: 'pipeline_leaky', follow_through: 'follow_stalls',
  speed_to_lead: 'speed_unowned', memory_access: 'memory_rebuilt', cash_control: 'cash_surprises',
  actual_response_time: 'response_next_day_plus', client_systems: 'systems_unknown',
}

const cleanResult = calculateLeverageScore(clean)
const leakyResult = calculateLeverageScore(leaky)
assert.equal(cleanResult.score, 100)
assert.equal(cleanResult.eurosRecoverable.low, 0)
assert.equal(leakyResult.score, 0)
assert.equal(leakyResult.topTerritory, 'pipeline')
assert.deepEqual(calculateLeverageScore(leaky), leakyResult)

assert.equal(getQuestion('speed_to_lead')?.dimension, 'speedToLead')
assert.equal(getQuestion('actual_response_time')?.dimension, 'speedToLead')

const recruitingSpeed = getSceneCopy('speed', {
  tone: 'evidence-first',
  industry: 'saas-recruiting',
  seed: 'smoke',
  generic: false,
})
assert.match(recruitingSpeed.proof, /#1 visibility/)
assert.match(recruitingSpeed.proof, /#3 VIP radar/)
assert.match(recruitingSpeed.caseCard?.join(' ') ?? '', /One system\. One client\. Three months\./)
assert.match(recruitingSpeed.attribution ?? '', /Franck Euvrard, Partner, Asia-Connect Executive Partners · Verified review on Trustpilot/)

const advisorySpeed = getSceneCopy('speed', {
  tone: 'story-reassurance',
  industry: 'wealth-advisory',
  seed: 'smoke',
  generic: false,
})
assert.match(advisorySpeed.proof, /#2 process mapper/)
assert.match(advisorySpeed.proof, /#5 desk research/)

const genericSpeed = getSceneCopy('speed', {
  tone: 'story-reassurance',
  industry: 'other-services',
  seed: 'smoke',
  generic: true,
})
assert.match(genericSpeed.proof, /#4 the website that adapts to how you read/)
assert.match(genericSpeed.narration, /The same discipline runs on the site you are playing right now/)

assert.deepEqual(sceneQuestions['memory-cash'], ['memory_access', 'cash_control', 'loaded_rate', 'client_volume'])

const memoryCash = getSceneCopy('memory-cash', {
  tone: 'evidence-first',
  industry: 'wealth-advisory',
  seed: 'smoke',
  generic: false,
})
assert.match(memoryCash.eyebrow, /TERRITORY 04 · MEMORY & CASH/)
assert.match(memoryCash.narration, /Assessment \(credited\)/)
assert.match(memoryCash.narration, /First Install \$7,500-15,000 fixed/)
assert.match(memoryCash.narration, /Partnership from \$5,000\/month plus performance share/)
assert.match(memoryCash.proof, /Three installable opportunities\. Or you pay nothing\./)
assert.match(memoryCash.proof, /The fee comes off your first install/)
console.log('scan smoke ok')
