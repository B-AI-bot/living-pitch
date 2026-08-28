import assert from 'node:assert/strict'

globalThis.window = {
  location: { pathname: '/' },
}

const leakyAnswers = {
  firm_type: 'exec-search', owner_led_confirmation: 'owner_led_yes', team_size: 'team_11_25',
  client_volume: 'clients_16_30', pipeline_visibility: 'pipeline_leaky', follow_through: 'follow_stalls',
  speed_to_lead: 'speed_unowned', memory_access: 'memory_rebuilt', cash_control: 'cash_surprises',
  actual_response_time: 'response_next_day_plus', client_systems: 'systems_unknown',
}

const worker = await import('../src/worker.js')
const fixedNow = new Date('2026-08-28T12:00:00.000Z')
const urls = worker.buildSlotsRequestUrls(fixedNow, 7)
const primary = new URL(urls.primary)
const fallback = new URL(urls.fallback)
assert.equal(primary.pathname, '/api/trpc/public/slots.getSchedule')
assert.equal(fallback.pathname, '/api/trpc/slots/getSchedule')
assert.deepEqual(JSON.parse(primary.searchParams.get('input')), {
  json: {
    isTeamEvent: false,
    usernameList: ['loic'],
    eventTypeSlug: 'assessment',
    startTime: '2026-08-28T12:00:00.000Z',
    endTime: '2026-09-04T12:00:00.000Z',
    timeZone: 'UTC',
  },
})

const availabilityFixture = {
  result: {
    data: {
      json: {
        slots: {
          '2026-08-31': [{ time: '2026-08-31T01:30:00.000Z' }],
          '2026-09-01': [{ time: '2026-09-01T17:00:00.000Z' }],
        },
      },
    },
  },
}
assert.deepEqual(worker.parseCalSlots(availabilityFixture), {
  slots: [
    { start: '2026-08-31T01:30:00.000Z' },
    { start: '2026-09-01T17:00:00.000Z' },
  ],
})
assert.throws(() => worker.parseCalSlots({ result: { data: { json: { slots: 'invalid' } } } }), /availability response/i)

const slotCalls = []
const fallbackResult = await worker.handleCalRequest(
  new Request('https://living.example/api/cal/slots?days=7'),
  {
    now: () => fixedNow,
    fetch: async (url) => {
      slotCalls.push(String(url))
      if (slotCalls.length === 1) return new Response('missing', { status: 404 })
      return Response.json(availabilityFixture)
    },
  },
)
assert.equal(fallbackResult.status, 200)
assert.deepEqual(await fallbackResult.json(), worker.parseCalSlots(availabilityFixture))
assert.equal(slotCalls.length, 2)
assert.equal(new URL(slotCalls[0]).pathname, '/api/trpc/public/slots.getSchedule')
assert.equal(new URL(slotCalls[1]).pathname, '/api/trpc/slots/getSchedule')

let failureCalls = 0
const upstreamFailure = await worker.handleCalRequest(
  new Request('https://living.example/api/cal/slots?days=7'),
  {
    now: () => fixedNow,
    fetch: async () => {
      failureCalls += 1
      return new Response('upstream failed', { status: 500 })
    },
  },
)
assert.equal(upstreamFailure.status, 502)
assert.equal(failureCalls, 1)

assert.deepEqual(worker.buildBookingPayload({
  start: '2026-09-01T17:00:00.000Z',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  notes: 'Bring last week\'s calendar.',
}), {
  start: '2026-09-01T17:00:00.000Z',
  eventTypeId: 7,
  eventTypeSlug: 'assessment',
  timeZone: 'UTC',
  language: 'en',
  user: 'loic',
  metadata: { source: 'living-pitch' },
  responses: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    notes: 'Bring last week\'s calendar.',
    location: { value: 'integrations:google:meet', optionValue: '' },
  },
})

const { tools } = await import('../src/webmcp.ts')
const state = await import('../src/engine/state.ts')
state.resetPitch()
const names = tools.map((tool) => tool.name)
for (const name of ['generate_preliminary_map', 'run_leverage_score', 'book_assessment_call', 'get_pitch_summary']) {
  assert.ok(names.includes(name), `${name} must be registered`)
}

const runScore = tools.find((tool) => tool.name === 'run_leverage_score')
assert.ok(runScore)
const scored = await runScore.execute({ answers: leakyAnswers })
assert.equal(scored.ok, true)
assert.equal(scored.result.score, 0)
assert.equal(scored.result.topLeak, 'pipeline')

const generateMap = tools.find((tool) => tool.name === 'generate_preliminary_map')
assert.ok(generateMap)
const mapped = await generateMap.execute({ domain: 'executive search' })
assert.equal(mapped.ok, true)
assert.equal(mapped.result.opportunities.length, 3)

const book = tools.find((tool) => tool.name === 'book_assessment_call')
assert.ok(book)
const start = '2026-09-01T17:00:00.000Z'
const awaiting = await book.execute({ start, name: 'Ada Lovelace', email: 'ada@example.com' })
assert.deepEqual(awaiting, { ok: true, result: { status: 'awaiting_human_confirmation' } })
assert.equal(state.getPitchState().booking.status, 'awaiting_human_confirmation')
state.markBookingBooked(start)
const repeated = await book.execute({ start, name: 'Ada Lovelace', email: 'ada@example.com' })
assert.deepEqual(repeated, { ok: true, result: { status: 'booked', start } })

const summaryTool = tools.find((tool) => tool.name === 'get_pitch_summary')
assert.ok(summaryTool)
const summary = await summaryTool.execute({})
assert.equal(summary.ok, true)
assert.equal(summary.result.booking.status, 'booked')
assert.equal(summary.result.nextStep.agentRole, 'The agent attends the webinar and writes the briefing.')

state.setContext({ industry: 'saas recruiting', size: 'team_5_10', style: 'numbers', source: 'human' })
const replayed = state.replayAsSomeoneElse()
assert.equal(replayed.context.industry, 'wealth-advisory')
assert.equal(replayed.context.source, 'replay')
assert.equal(replayed.booking.status, 'idle')
assert.equal(replayed.scene, 'basecamp')

console.log('Task 3 worker and WebMCP smoke ok')
