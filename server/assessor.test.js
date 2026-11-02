import assert from 'node:assert/strict'
import { test } from 'node:test'
import { InvalidAnswer } from './structured.js'
import { parseAssessRequest, validateAssessment, VERDICTS } from './assessor.js'

const step = { title: 'Light', goal: 'Goal', keyPoints: ['Plants use light'], checkQuestion: 'Why light?', expectedAnswer: 'Energy' }
const request = (overrides = {}) => ({
  step,
  passages: [{ id: 'p1', text: 'Plants make food from light.' }],
  messages: [{ role: 'assistant', content: 'Why light?' }],
  answer: '  It gives energy  ',
  ...overrides,
})
const rejected = (body) => {
  try {
    parseAssessRequest(body)
  } catch (error) {
    return { status: error.status, code: error.code }
  }
  assert.fail('expected the request to be rejected')
}

test('parseAssessRequest returns a clean request', () => {
  const result = parseAssessRequest(request())

  assert.equal(result.answer, 'It gives energy')
  assert.equal(result.step.checkQuestion, 'Why light?')
  assert.equal(result.messages.length, 1)
})

test('parseAssessRequest allows a missing chat history', () => {
  assert.deepEqual(parseAssessRequest(request({ messages: undefined })).messages, [])
})

test('parseAssessRequest rejects a bad answer, step, passages or chat with a 400', () => {
  const bad = { status: 400, code: 'bad_request' }

  assert.deepEqual(rejected(request({ answer: '   ' })), bad)
  assert.deepEqual(rejected(request({ answer: 'x'.repeat(2001) })), bad)
  assert.deepEqual(rejected(request({ step: { ...step, expectedAnswer: '' } })), bad)
  assert.deepEqual(rejected(request({ step: { ...step, keyPoints: [] } })), bad)
  assert.deepEqual(rejected(request({ passages: 'p1' })), bad)
  assert.deepEqual(rejected(request({ messages: [{ role: 'teacher', content: 'hi' }] })), bad)
  assert.deepEqual(rejected(undefined), bad)
})

test('validateAssessment accepts every known verdict', () => {
  for (const verdict of VERDICTS) assert.equal(validateAssessment({ verdict, feedback: ' ok ' }).verdict, verdict)
  assert.equal(validateAssessment({ verdict: 'wrong', feedback: ' ok ' }).feedback, 'ok')
})

test('validateAssessment rejects an unknown verdict and tolerates a missing feedback', () => {
  assert.throws(() => validateAssessment({ verdict: 'excellent', feedback: '' }), InvalidAnswer)
  assert.throws(() => validateAssessment(null), InvalidAnswer)
  assert.equal(validateAssessment({ verdict: 'correct' }).feedback, '')
})
