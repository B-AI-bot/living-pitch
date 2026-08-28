import assert from 'node:assert/strict'
import { generatePreliminaryMap, scoreSummit } from '../src/engine/summit.ts'

const leakyAnswers = {
  firm_type: 'exec-search', owner_led_confirmation: 'owner_led_yes', team_size: 'team_11_25',
  client_volume: 'clients_16_30', pipeline_visibility: 'pipeline_leaky', follow_through: 'follow_stalls',
  speed_to_lead: 'speed_unowned', memory_access: 'memory_rebuilt', cash_control: 'cash_surprises',
  actual_response_time: 'response_next_day_plus', client_systems: 'systems_unknown',
}

const score = scoreSummit(leakyAnswers)
assert.deepEqual(score, {
  score: 0,
  topLeak: 'pipeline',
  eurosPerWeek: { low: 384, high: 1232 },
  dimensions: {
    pipeline: 100,
    'follow-through': 100,
    speed: 100,
    memory: 100,
    cash: 100,
  },
})

const input = {
  context: {
    industry: 'saas-recruiting' as const,
    size: 'team_11_25',
    role: 'partner',
    priorities: ['pipeline'],
    tone: 'evidence-first' as const,
    style: 'numbers',
    source: 'human' as const,
  },
  answers: leakyAnswers,
  domain: 'executive search',
}
const firstMap = generatePreliminaryMap(input)
const repeatedMap = generatePreliminaryMap(input)
assert.deepEqual(repeatedMap, firstMap)
assert.equal(firstMap.status, 'preliminary_draft')
assert.equal(firstMap.title, 'Preliminary draft Leverage Map')
assert.equal(firstMap.domain, 'executive search')
assert.equal(firstMap.opportunities.length, 3)
assert.deepEqual(firstMap.opportunities.map((item) => item.rank), [1, 2, 3])
assert.deepEqual(firstMap.opportunities.map((item) => item.leak), ['pipeline', 'follow-through', 'speed'])
assert.equal(new Set(firstMap.opportunities.map((item) => item.system.number)).size, 3)
assert.ok(firstMap.opportunities.every((item) => item.system.agents.length > 0 && item.system.humanGate.length > 0))
assert.ok(firstMap.opportunities[0].impact.eurosPerWeek.high >= firstMap.opportunities[1].impact.eurosPerWeek.high)
assert.ok(firstMap.opportunities[1].impact.eurosPerWeek.high >= firstMap.opportunities[2].impact.eurosPerWeek.high)
assert.match(firstMap.estimateLabel, /estimate/i)

console.log('summit smoke ok')
