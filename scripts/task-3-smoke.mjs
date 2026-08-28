import assert from 'node:assert/strict'

const posthogEvents = []
const interruptedPrefill = {
  start: '2026-09-01T17:00:00.000Z',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  notes: 'Bring last week\'s calendar.',
}
globalThis.window = {
  location: { pathname: '/' },
  posthog: {
    capture: (event, properties) => posthogEvents.push({ event, properties }),
  },
}
globalThis.sessionStorage = {
  getItem: (key) => key === 'living-pitch-state-v1'
    ? JSON.stringify({
        booking: { status: 'booking', prefill: interruptedPrefill },
        bookingSlots: { status: 'loading' },
      })
    : null,
  setItem: () => undefined,
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

const bookingRequest = (ip) => new Request('https://living.example/api/cal/book', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
  body: JSON.stringify(interruptedPrefill),
})
const ambiguousBooking = await worker.handleCalRequest(
  bookingRequest('198.51.100.20'),
  {
    now: () => fixedNow,
    fetch: async () => Response.json({ error: { message: 'Slot is no longer available.' } }),
  },
)
assert.equal(ambiguousBooking.status, 502)
assert.match((await ambiguousBooking.json()).error, /invalid booking response/i)

const clearBooking = await worker.handleCalRequest(
  bookingRequest('198.51.100.21'),
  {
    now: () => fixedNow,
    fetch: async () => Response.json({ id: 42, uid: 'booking-uid-42' }),
  },
)
assert.equal(clearBooking.status, 200)
assert.deepEqual(await clearBooking.json(), { status: 'booked', start: interruptedPrefill.start })

const { installWebMcpTools, tools } = await import('../src/webmcp.ts')
const state = await import('../src/engine/state.ts')
const { renderSummit } = await import('../src/pitch.ts')
const { getSceneCopy } = await import('../src/engine/scenes.ts')
assert.deepEqual(state.getPitchState().booking, {
  status: 'awaiting_human_confirmation',
  prefill: interruptedPrefill,
})
assert.deepEqual(state.getPitchState().bookingSlots, { status: 'idle' })
state.resetPitch()

const emptySummit = renderSummit(state.getPitchState())
assert.match(emptySummit, /Complete the remaining scan questions/i)
assert.doesNotMatch(emptySummit, /class="score-number"/)
assert.doesNotMatch(emptySummit, /id="preliminary-map"/)

state.answerScanQuestion('pipeline_visibility', 'pipeline_leaky')
const partialSummit = renderSummit(state.getPitchState())
assert.match(partialSummit, /Complete the remaining scan questions/i)
assert.doesNotMatch(partialSummit, /class="score-number"/)
assert.doesNotMatch(partialSummit, /id="preliminary-map"/)
state.resetPitch()

state.setContext({ industry: 'wealth advisory', size: 'team_5_10', style: 'numbers', source: 'human' })
const evidenceCta = getSceneCopy('summit', state.getPitchState().skin).cta
assert.deepEqual(evidenceCta, { label: 'Book the 30-min call', href: '#booking-panel' })
const evidenceSummit = renderSummit(state.getPitchState())
assert.match(evidenceSummit, /href="#booking-panel" data-action="cta">Book the 30-min call<\/a>/)

state.setContext({ industry: 'wealth advisory', size: 'team_5_10', style: 'team buy-in', source: 'human' })
const storyCta = getSceneCopy('summit', state.getPitchState().skin).cta
assert.deepEqual(storyCta, { label: 'Get my 3 installable opportunities →', href: '/assessment' })
const storySummit = renderSummit(state.getPitchState())
assert.match(storySummit, /href="\/assessment" data-action="cta">Get my 3 installable opportunities →<\/a>/)
state.resetPitch()

const names = tools.map((tool) => tool.name)
for (const name of ['generate_preliminary_map', 'run_leverage_score', 'book_assessment_call', 'get_pitch_summary']) {
  assert.ok(names.includes(name), `${name} must be registered`)
}

const businessPageTools = []
globalThis.navigator.modelContext = {
  registerTool: (tool) => businessPageTools.push(tool.name),
}
assert.equal(await installWebMcpTools('/book'), true)
assert.equal(businessPageTools.includes('book_assessment_call'), false)

const pitchPageTools = []
globalThis.navigator.modelContext = {
  registerTool: (tool) => pitchPageTools.push(tool.name),
}
assert.equal(await installWebMcpTools('/'), true)
assert.equal(pitchPageTools.includes('book_assessment_call'), true)
globalThis.navigator.modelContext = undefined

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
state.markBookingSubmitting()
assert.deepEqual(posthogEvents.at(-1), {
  event: 'booking_confirmation_yes_click',
  properties: { channel: 'human', start, pathname: '/' },
})
state.markBookingError('Interrupted after the human click.')
state.dismissBooking()
assert.deepEqual(posthogEvents.at(-1), {
  event: 'booking_confirmation_no_click',
  properties: { channel: 'human', start, pathname: '/' },
})
await book.execute({ start, name: 'Ada Lovelace', email: 'ada@example.com' })
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
