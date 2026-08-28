import assert from 'node:assert/strict'
import { parseResidentPayload } from '../src/resident.ts'

const valid = parseResidentPayload({
  answer_for_agent: 'The next step is to name the workflow.',
  stage_render: 'Your agent asks: Who operates this?',
  action: { kind: 'open_view', target: 'offer' },
})
assert.equal(valid.answer_for_agent, 'The next step is to name the workflow.')
assert.equal(valid.action?.kind, 'open_view')
assert.deepEqual(parseResidentPayload({ status: 'warming_up', fallback: 'canned' }), { status: 'warming_up', fallback: 'canned' })
assert.throws(() => parseResidentPayload({ answer_for_agent: 'missing fields' }))
console.log('resident client parser smoke ok')
