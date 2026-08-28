import assert from 'node:assert/strict'
import { tools } from '../src/webmcp.ts'
import { getPitchState, resetPitch } from '../src/engine/state.ts'

globalThis.window = {
  location: { pathname: '/' },
  posthog: { capture: () => undefined },
}
resetPitch()

const tool = (name: string) => {
  const found = tools.find((candidate) => candidate.name === name)
  assert.ok(found, `${name} must be registered`)
  return found
}

const readState = tool('get_pitch_state')
const contextTool = tool('provide_context')
const answerTool = tool('answer_scan_question')
const scoreTool = tool('run_leverage_score')
const mapTool = tool('generate_preliminary_map')

const blockedMap = await mapTool.execute({})
assert.equal(blockedMap.ok, true)
assert.equal(blockedMap.result.status, 'missing_fields')
assert.ok(blockedMap.result.missing_fields.some((field) => field.id === 'context'))

const first = await readState.execute({})
assert.equal(first.ok, true)
assert.equal(first.result.currentQuestion.question_id, 'provide_context')
assert.ok(first.result.currentQuestion.options.industry.length > 0)

const context = await contextTool.execute({
  industry: first.result.currentQuestion.options.industry[0].value,
  size: first.result.currentQuestion.options.size[1].value,
  role: 'owner',
  priorities: ['pipeline'],
  tone: first.result.currentQuestion.options.tone[0].value,
})
assert.equal(context.ok, true)

for (let step = 0; step < 20; step += 1) {
  const snapshot = await readState.execute({})
  assert.equal(snapshot.ok, true)
  const question = snapshot.result.currentQuestion
  if (question === null) break
  assert.equal(typeof question.question_id, 'string')
  assert.ok(Array.isArray(question.options) && question.options.length > 0)
  const answered = await answerTool.execute({ question_id: question.question_id, answer: question.options[0].value })
  assert.equal(answered.ok, true)
}

const complete = await readState.execute({})
assert.equal(complete.ok, true)
assert.equal(complete.result.remainingQuestions.length, 0)

const scored = await scoreTool.execute({})
assert.equal(scored.ok, true)
assert.equal(scored.result.complete, true)
assert.equal(scored.result.score, getPitchState().score)
assert.equal(getPitchState().scene, 'summit')

const mapped = await mapTool.execute({})
assert.equal(mapped.ok, true)
assert.equal(mapped.result.status, 'preliminary_draft')
assert.equal(mapped.result.opportunities.length, 3)

const persisted = await readState.execute({})
assert.equal(persisted.ok, true)
assert.equal(persisted.result.scene, 'summit')
assert.equal(persisted.result.score, scored.result.score)
console.log('cold-start agent smoke ok')
