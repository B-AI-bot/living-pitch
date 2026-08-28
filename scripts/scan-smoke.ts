import assert from 'node:assert/strict'
import { calculateLeverageScore } from '../src/scan/engine.ts'

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
console.log('scan smoke ok')
