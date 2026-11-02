import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HttpError } from './http.js'
import { parsePlanRequest, validatePlan } from './planner.js'

const passages = [
  { id: 'p1', text: 'Plants make food from light.' },
  { id: 'p2', text: 'Chlorophyll is green.' },
]

const step = (overrides = {}) => ({
  title: ' Light ',
  goal: 'Understand light',
  keyPoints: ['Plants use light'],
  checkQuestion: 'Why do plants need light?',
  expectedAnswer: 'It gives them energy',
  sourceIds: ['p1'],
  ...overrides,
})

const plan = (overrides = {}) => ({
  title: 'Photosynthesis',
  language: 'English',
  audience: '7th graders',
  style: 'Socratic',
  durationMinutes: 14.6,
  steps: [step()],
  ...overrides,
})

test('validatePlan cleans a good plan and gives each step an id', () => {
  const result = validatePlan(plan(), passages)

  assert.equal(result.durationMinutes, 15)
  assert.equal(result.steps[0].id, 'step-1')
  assert.equal(result.steps[0].title, 'Light')
})

test('validatePlan drops passage ids the model invented and removes duplicates', () => {
  const result = validatePlan(plan({ steps: [step({ sourceIds: ['p2', 'p9', 'p2'] })] }), passages)

  assert.deepEqual(result.steps[0].sourceIds, ['p2'])
})

test('validatePlan rejects a step that cites no real passage', () => {
  assert.throws(() => validatePlan(plan({ steps: [step({ sourceIds: ['p9'] })] }), passages), /cites no passage/)
})

test('validatePlan rejects missing fields', () => {
  assert.throws(() => validatePlan(plan({ title: '  ' }), passages), /title is missing/)
  assert.throws(() => validatePlan(plan({ steps: [step({ keyPoints: [] })] }), passages), /no key points/)
  assert.throws(() => validatePlan(plan({ steps: [step({ checkQuestion: '' })] }), passages), /check question is missing/)
  assert.throws(() => validatePlan(plan({ durationMinutes: 'soon' }), passages), /durationMinutes/)
})

test('validatePlan needs between 1 and 12 steps', () => {
  assert.throws(() => validatePlan(plan({ steps: [] }), passages), /between 1 and 12/)
  assert.throws(() => validatePlan(plan({ steps: Array.from({ length: 13 }, () => step()) }), passages), /between 1 and 12/)
  assert.throws(() => validatePlan(null, passages), /between 1 and 12/)
})

test('parsePlanRequest returns a trimmed request', () => {
  const result = parsePlanRequest({ teacherPrompt: '  Teach in French  ', passages })

  assert.equal(result.teacherPrompt, 'Teach in French')
  assert.equal(result.passages.length, 2)
})

test('parsePlanRequest rejects bad requests with a code the client can show', () => {
  const rejected = (body) => {
    try {
      parsePlanRequest(body)
    } catch (error) {
      assert.ok(error instanceof HttpError)
      return { status: error.status, code: error.code }
    }
    assert.fail('expected the request to be rejected')
  }

  assert.deepEqual(rejected({ teacherPrompt: '  ', passages }), { status: 400, code: 'bad_request' })
  assert.deepEqual(rejected({ teacherPrompt: 'x'.repeat(2001), passages }), { status: 400, code: 'prompt_too_long' })
  assert.deepEqual(rejected({ teacherPrompt: 'Teach', passages: [] }), { status: 400, code: 'bad_request' })
  assert.deepEqual(rejected({ teacherPrompt: 'Teach', passages: [{ id: 'p1', text: '  ' }] }), { status: 400, code: 'bad_request' })
  assert.deepEqual(rejected({ teacherPrompt: 'Teach', passages: [passages[0], passages[0]] }), { status: 400, code: 'bad_request' })
  assert.deepEqual(rejected({ teacherPrompt: 'Teach', passages: [{ id: 'p1', text: 'x'.repeat(300_001) }] }), { status: 413, code: 'source_too_large' })
  assert.deepEqual(rejected(undefined), { status: 400, code: 'bad_request' })
})
