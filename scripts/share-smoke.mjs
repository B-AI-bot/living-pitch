import assert from 'node:assert/strict'
import { buildSharePayload } from '../src/share.ts'

const expedition = buildSharePayload({
  score: 72,
  topLeak: 'pipeline',
  kind: 'expedition',
  origin: 'https://www.welcometotheaijungle.com',
})
assert.match(expedition.text, /72\/100/)
assert.match(expedition.text, /pipeline/)
assert.match(expedition.text, /What does YOUR agent see\?/)
assert.equal(expedition.url, 'https://www.welcometotheaijungle.com/?utm_source=share&utm_ref=anon')
assert.match(expedition.intentUrl, /https:\/\/x\.com\/intent\/post\?text=/)
assert.match(decodeURIComponent(expedition.intentUrl), /What does YOUR agent see\?/)

const roast = buildSharePayload({
  score: 0,
  topLeak: null,
  kind: 'roast',
  severity: 91,
  origin: 'https://www.welcometotheaijungle.com',
})
assert.match(roast.text, /91\/100/)
assert.match(roast.text, /get roasted →/)
assert.match(roast.url, /utm_source=share/)

console.log('share smoke ok')
